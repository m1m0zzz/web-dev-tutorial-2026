# 5 デプロイする

ここまでに作ったものを Cloudflare にデプロイし、`git push` したら自動で反映される状態を作ります。

**注記**: この時点ではフロントとバックエンドはまだ接続されていません。まず動く状態のものをデプロイし、[6章](06_api-integration.md)で接続したあとに再度デプロイします。早い段階で一度デプロイしておくことで、以降の変更が自動で反映される体験が得られます。

## 5.1 環境変数・シークレットの置き場所を決める

ローカル、CI、本番の3箇所で、同じ設定をどこにどう置くかを整理します。

| | 環境変数 | シークレット |
|---|---|---|
| **API・ローカル** | `apps/api/wrangler.jsonc` の `vars` | `apps/api/.dev.vars` |
| **API・本番** | `apps/api/wrangler.jsonc` の `env.production.vars`（[6.7](06_api-integration.md#67-環境変数を追加して再デプロイ)） | `wrangler secret put` |
| **フロント・ローカル** | `apps/web/.env.local`（[6.7](06_api-integration.md#67-環境変数を追加して再デプロイ)） | 置けません |
| **フロント・本番** | GitHub の Variables（ビルド時に埋め込む） | 置けません |
| **CI** | workflow の `env` | GitHub Secrets |

**フロントエンドにシークレットを置く場所はありません。** ビルド結果はブラウザに配られるので、埋め込んだものは必ず読めます。

**API の `vars` は、同じキーでもローカルと本番で値を変えられます。** `wrangler.jsonc` のトップレベルに書いた値がローカル用で、本番用は `env.production` という別のまとまりに書きます（[6.7](06_api-integration.md#67-環境変数を追加して再デプロイ)）。**この分け方をしないと、本番の URL に書き換えた瞬間にローカルの開発が動かなくなります。**

**環境変数とシークレットの違いは、漏れたときに困るかどうかです。** API の URL は漏れても困りませんが、`BETTER_AUTH_SECRET` は Better Auth が署名や暗号化に使う鍵で、**漏れると認証まわりのデータを偽造・復号される恐れがあります。** **困るほうは、リポジトリにも、ビルド成果物にも、ログにも残さない**のが原則です。

**Cloudflare の API トークン**

CI からデプロイするには、Cloudflare を操作する権限をトークンの形で GitHub に預けます。以下のリンクを開いてください。

https://dash.cloudflare.com/profile/api-tokens

**テンプレートは使わず、「カスタムトークンを作成する」から作ってください。** 「Edit Cloudflare Workers」テンプレートは Workers KV・R2・Queues・ゾーンの設定など、このチュートリアルでは触らないものまで含みます。必要なのは2つだけです。

```
アクセス許可
├─ アカウント / Workers スクリプト / 編集
└─ アカウント / D1                  / 編集

アカウントリソース
└─ 含める / 特定のアカウント / （自分のアカウント）
```

**`Workers スクリプト` が `wrangler deploy` に、`D1` が `d1 migrations apply --remote` に対応します。** どちらかが欠けると、片方のステップだけが失敗します。

**全権限のトークンを作らないでください。** GitHub Secrets は漏れにくい仕組みですが、漏れたときの被害はトークンの権限の広さで決まります。**権限を絞ることは、事故が起きる確率ではなく、起きたときの大きさを下げる対策です。**

**GitHub Secrets への登録**

リポジトリの Settings → Secrets and variables → Actions から登録します。

| 名前 | 種類 | 中身 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | 上で作ったトークン |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | 下のコマンドで表示されるアカウント ID |

アカウント ID は `wrangler` が教えてくれます。

```bash
npx wrangler whoami
```

```
┌─────────────────┬──────────────────────────────────┐
│ Account Name    │ Account ID                       │
├─────────────────┼──────────────────────────────────┤
│ your-account    │ 2a7eea2b05321190…                │
└─────────────────┴──────────────────────────────────┘
```

**`VITE_API_URL`（API の URL）は、ここではまだ登録しません。** API をデプロイするまで値が存在しないうえ、フロントがこれを使い始めるのは [6.7](06_api-integration.md#67-環境変数を追加して再デプロイ) だからです。そこで Variable（秘密でない値）として登録します。**ビルド成果物に埋め込まれて誰でも読める値なので、Secret にしても意味がありません。** Secret にすると、かえって「秘密である」という誤解を招きます。

**`BETTER_AUTH_SECRET` は GitHub に登録しません。** これは Cloudflare 側に直接置きます（[5.2](#52-github-actions-を構築する) の末尾）。CI が知る必要のない値だからです。

**つまずきポイント**

> [!TIP]
> - **`D1` の権限を入れ忘れると、`Apply D1 migrations` のステップで止まります。** このワークフローはマイグレーションを先に流すので（[5.2](#52-github-actions-を構築する)）、デプロイまで進みません。**「Workers の権限しか付けていない」ことに気づきにくいので、失敗したステップ名を見てください**
> - フロントエンドのビルド時に埋め込まれる環境変数（`VITE_` 接頭辞のもの）は、**ビルド成果物に平文で含まれます。** シークレットを入れてはいけません。この点は [6.7](06_api-integration.md#67-環境変数を追加して再デプロイ) でも再度触れます

## 5.2 GitHub Actions を構築する

`git push` したら自動でテストが走り、`main` にマージされたら自動でデプロイされる状態を作ります。

**構成**

- フロントエンド (`apps/web`) とバックエンド (`apps/api`) を別々の Worker としてデプロイする
- `paths` フィルタで、変更があった側だけをデプロイする
- Pull Request ではテストのみ、`main` へのマージでデプロイ

**扱うこと**

- workflow ファイルの構成
- `actions/setup-node` と `node-version-file: .nvmrc`
- npm workspaces 環境での `npm ci`
- Cloudflare へのデプロイ
- CI 環境での safe-chain の設定（`--ci` フラグ）

`main` に push すると3つのワークフローが動き、公開された URL で `/health` にアクセスできれば成功です。

**つまずきポイント**

> [!TIP]
> - `npm ci` はロックファイルと `package.json` が一致していないと失敗します。ローカルで `npm install` した結果のロックファイルを必ずコミットしてください
> - `paths` フィルタを使う場合、共通ファイル（ルートの `package.json`、ロックファイル）の変更時にどちらも動くよう設定が必要です

**フロントエンドも Worker としてデプロイする**

`apps/web` はビルドすると静的ファイルの集まりになります。これを配信する Worker の設定を `apps/web/wrangler.jsonc` に置きます。

```jsonc
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "memo-app-web",
  "compatibility_date": "2026-08-20",
  "assets": {
    "directory": "./dist",
    // SPA なので、どのパスに来ても index.html を返す
    "not_found_handling": "single-page-application"
  }
}
```

**`not_found_handling` の指定は必須です。** これが無いと、`/posts/xxx` を直接開いたときに 404 になります。SPA ではルーティングをブラウザ側の JavaScript が担当するため、サーバーはどのパスでも同じ `index.html` を返す必要があります。

`apps/web` にも `wrangler` を入れ、`deploy` スクリプトを足してください。

```bash
npm i -D -w apps/web wrangler
```

```json
{
  "scripts": {
    "deploy": "wrangler deploy"
  }
}
```

**ワークフローの構成**

3つのファイルに分けます。**デプロイを別ファイルにするのは、`paths` フィルタがワークフロー単位でしか書けないためです。**

| ファイル | 起動条件 | 内容 |
|---|---|---|
| `.github/workflows/ci.yml` | PR と `main` への push | Lint、整形チェック、型チェック、単体テスト（E2E は [8章](08_e2e.md)で足します） |
| `.github/workflows/deploy-api.yml` | `main` への push（`apps/api/**` が変わったとき） | 検査 → D1 のマイグレーション適用 → デプロイ |
| `.github/workflows/deploy-web.yml` | `main` への push（`apps/web/**` が変わったとき） | 検査 → ビルド → デプロイ |

**ワークフローどうしには順序関係がありません。** `main` に push すると `ci.yml` とデプロイのワークフローが同時に走り出します。**同じ push から独立して起動する3つのワークフローの間では、`needs` で「`ci.yml` が通るまで待つ」ことができません**（`needs` は同じワークフロー内のジョブにしか使えません）。何もしなければ、テストが落ちているのにデプロイは完了する、という状態になります。

対策として、**デプロイのワークフローの中で、同じ検査をもう一度実行してからデプロイします。**

```yaml
      - run: npm ci

      # デプロイの前に CI と同じ検査を通す。
      # ワークフローどうしには順序関係がないため、ci.yml の結果は待てない
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck -w apps/web
      - run: npm run typecheck -w apps/api
      - run: npm test -w apps/web
      - run: npm test -w apps/api
```

**E2E も同じようにデプロイの前に通しますが、それは [8.4](08_e2e.md#84-ci-で実行する) で足します。** この章ではまだ E2E テストを書いていません。

Lint とテストが `ci.yml` とデプロイ側で二重に走ることになりますが、**「検査を通っていないものはデプロイされない」ほうが重要です。** 同じジョブの中のステップとして並んでいるので、途中で失敗すればそこで止まり、デプロイのステップには到達しません。

> 別のやり方として、すべてを1つのワークフローにまとめ、ジョブ間を `needs` で繋ぐ方法もあります。二重実行は避けられますが、`paths` フィルタがワークフロー単位の設定なので使えなくなり、「どちら側が変わったか」を push の差分から自分で判定するジョブが必要になります。この記事では記述が単純な前者を採ります。

**`.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

# GITHUB_TOKEN の権限を最小にする（リポジトリの既定値に依存させない）
permissions:
  contents: read

jobs:
  check:
    name: Lint / 型 / 単体テスト
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm

      # 1.4 で入れた safe-chain を CI でも効かせる（--ci でシムを PATH に置く）
      - name: Install safe-chain
        run: |
          curl -fsSL https://github.com/AikidoSec/safe-chain/releases/download/1.5.15/install-safe-chain.sh -o /tmp/install-safe-chain.sh
          echo "de0565e3d6346407a604e84e639e95fea8758748063da2216bbfdca5feda5dd2  /tmp/install-safe-chain.sh" | sha256sum -c -
          sh /tmp/install-safe-chain.sh --ci
          rm /tmp/install-safe-chain.sh

      - run: npm ci

      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck -w apps/web
      - run: npm run typecheck -w apps/api
      - run: npm test -w apps/web
      - run: npm test -w apps/api
```

`on` が起動条件、`jobs` の下がやることです。**`runs-on: ubuntu-latest` は「GitHub が用意した Ubuntu のマシンで動かす」という意味**で、そこは毎回まっさらな状態から始まります。だから `checkout`（コードを取ってくる）と `setup-node`（Node.js を入れる）が最初に要ります。

**`node-version-file: .nvmrc` で、[1.8](01_setup.md#18-リポジトリと-workspace-を作る) で作ったファイルを CI でも使い回しています。** バージョンの指定場所が1つで済みます。

`workflow_dispatch` は、GitHub の画面から手動で実行できるようにする指定です。

**`.github/workflows/deploy-api.yml`**

```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      # 共通ファイルが変わったときもデプロイし直す
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/deploy-api.yml'

# GITHUB_TOKEN の権限を最小にする（リポジトリの既定値に依存させない）
permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm

      # ci.yml と同じく safe-chain を通す。
      # Cloudflare のトークンを扱うジョブなので、ここを素通しにはしない
      - name: Install safe-chain
        run: |
          curl -fsSL https://github.com/AikidoSec/safe-chain/releases/download/1.5.15/install-safe-chain.sh -o /tmp/install-safe-chain.sh
          echo "de0565e3d6346407a604e84e639e95fea8758748063da2216bbfdca5feda5dd2  /tmp/install-safe-chain.sh" | sha256sum -c -
          sh /tmp/install-safe-chain.sh --ci
          rm /tmp/install-safe-chain.sh

      - run: npm ci

      # デプロイの前に CI と同じ検査を通す。
      # ワークフローどうしには順序関係がないため、ci.yml の結果は待てない
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck -w apps/web
      - run: npm run typecheck -w apps/api
      - run: npm test -w apps/web
      - run: npm test -w apps/api

      # 本番の D1 にマイグレーションを適用してからデプロイする
      - name: Apply D1 migrations
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: d1 migrations apply DB --remote

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: deploy --minify
```

**マイグレーションはデプロイの前に流します。** 逆にすると、新しいコードが存在しない列を触る瞬間が生まれます。

**safe-chain は3つのワークフローすべてに入れます。** [1.4](01_setup.md#14-サプライチェーン攻撃の対策) で手元に入れたものと同じです。**Cloudflare のトークンを扱うデプロイのジョブこそ、依存のインストールを素通しにしてはいけません。**

**`permissions: contents: read` を明示しているのは、[5.1](#51-環境変数シークレットの置き場所を決める) の「必要最小限の権限」と同じ理由です。** 書かないと、リポジトリの既定値（書き込み権限が付いていることがあります）が使われます。

**`.github/workflows/deploy-web.yml`**

`paths` と最後のデプロイ先が違うだけで、構造は API 側と同じです。ビルドのステップが加わります。

```yaml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/deploy-web.yml'

# GITHUB_TOKEN の権限を最小にする
permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm

      # ci.yml と同じく safe-chain を通す
      - name: Install safe-chain
        run: |
          curl -fsSL https://github.com/AikidoSec/safe-chain/releases/download/1.5.15/install-safe-chain.sh -o /tmp/install-safe-chain.sh
          echo "de0565e3d6346407a604e84e639e95fea8758748063da2216bbfdca5feda5dd2  /tmp/install-safe-chain.sh" | sha256sum -c -
          sh /tmp/install-safe-chain.sh --ci
          rm /tmp/install-safe-chain.sh

      - run: npm ci

      # デプロイの前に CI と同じ検査を通す
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck -w apps/web
      - run: npm run typecheck -w apps/api
      - run: npm test -w apps/web
      - run: npm test -w apps/api

      - run: npm run build -w apps/web

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/web
          command: deploy
```

safe-chain のインストールスクリプトは、URL にバージョンが入り、チェックサムも一緒に配布されています。**公式 README の最新のコマンドをそのまま貼り付けてください**（ここに載せたものは執筆時点のものです）。

デプロイは Cloudflare 公式の action を使います。

```yaml
      - name: Apply D1 migrations
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: d1 migrations apply DB --remote

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: deploy --minify
```

**必要なシークレット**

| 名前 | 種類 | 中身 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | Workers と D1 の編集権限を持つ API トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare のアカウント ID |

フロントに渡す `VITE_API_URL` は [6.7](06_api-integration.md#67-環境変数を追加して再デプロイ) で足します。**API をデプロイするまで値が決まらないためです。**

`BETTER_AUTH_SECRET` は GitHub には登録しません。**Cloudflare 側に直接入れておけば、デプロイしても消えません。**

```bash
openssl rand -base64 32                                   # 値を作る
npx wrangler secret put BETTER_AUTH_SECRET --cwd apps/api  # 貼り付ける
```

**[3.5](03_backend.md#35-環境変数とシークレット) でローカル用に作ったものとは別の値にしてください。** ローカルと本番で同じ鍵を使う理由はありません。

`npx wrangler secret list --cwd apps/api` に `BETTER_AUTH_SECRET` が並べば設定できています（値そのものは表示されません）。**これは Worker をデプロイしたあとに実行してください。** Worker がまだ無いと登録先がありません。

**動かす**

ファイルを作っただけでは何も起きません。コミットして push します。

```bash
git add .
git commit -m "ci: GitHub Actions でテストとデプロイを行う"
git push origin main
```

GitHub のリポジトリの **Actions** タブを開くと、実行中のワークフローが並びます。**初回は3つとも動きます**（共通ファイルが変わっているため）。失敗したらそのジョブをクリックし、赤くなったステップを開いてログを読んでください。

**デプロイ先の URL は、`Deploy Worker` ステップのログに出ます。** `https://memo-app-api.<サブドメイン>.workers.dev` のような形です。

**この章で確認できること**

| 対象 | 確認 |
|---|---|
| API | `https://<API の URL>/health` を開いて `{"status":"ok"}` |
| フロント | トップページが表示される（ログイン画面に飛びます） |
| フロント | `/posts/test` を直接開いて、**Cloudflare の 404 ではなく React の画面**が出る（`not_found_handling` が効いている） |

**この時点では、本番のログインやメモの操作はまだ動きません。** フロントは API の URL を知らず（[6.7](06_api-integration.md#67-環境変数を追加して再デプロイ) で渡します）、API 側の `CORS_ORIGIN` と `BETTER_AUTH_URL` もローカルのままだからです。**5章で確認するのは、デプロイの仕組みが動くことだけです。**

**次の章**: [6 フロントから API を呼ぶ](06_api-integration.md)
