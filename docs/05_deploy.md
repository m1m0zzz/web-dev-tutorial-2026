# 5 デプロイする

ここまでに作ったものを Cloudflare にデプロイし、`git push` したら自動で反映される状態を作ります。

**注記**: この時点ではフロントとバックエンドはまだ接続されていません。まず動く状態のものをデプロイし、[6章](06_api-integration.md)で接続したあとに再度デプロイします。早い段階で一度デプロイしておくことで、以降の変更が自動で反映される体験が得られます。

## 5.1 環境変数・シークレットの置き場所を決める

**何のために**

ローカル、CI、本番の3箇所で、同じ設定をどこにどう置くかを整理します。

**扱うこと**

| 場所 | 環境変数 | シークレット |
|---|---|---|
| ローカル | `.dev.vars` | `.dev.vars` |
| CI (GitHub Actions) | workflow の `env` | GitHub Secrets |
| 本番 (Cloudflare) | `wrangler.jsonc` の `vars` | `wrangler secret put` |

- Cloudflare API トークンの発行と、必要な権限の絞り込み
- GitHub Secrets への登録

**躓きポイント**

- **Cloudflare API トークンには必要最小限の権限だけを与えてください。** 全権限のトークンを GitHub に置くのは避けます
- フロントエンドのビルド時に埋め込まれる環境変数（`VITE_` 接頭辞のもの）は、**ビルド成果物に平文で含まれます。** シークレットを入れてはいけません。この点は [6.6](06_api-integration.md#66-環境変数を追加して再デプロイ) でも再度触れます

## 5.2 GitHub Actions を構築する

**何のために**

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

**完了条件**

`main` に push すると自動でデプロイされ、公開された URL で `/health` にアクセスできる。

**躓きポイント**

- `npm ci` はロックファイルと `package.json` が一致していないと失敗します。ローカルで `npm install` した結果のロックファイルを必ずコミットしてください
- `paths` フィルタを使う場合、共通ファイル（ルートの `package.json`、ロックファイル）の変更時にどちらも動くよう設定が必要です

**フロントエンドも Worker としてデプロイする**

`apps/web` はビルドすると静的ファイルの集まりになります。これを配信する Worker の設定を `apps/web/wrangler.jsonc` に置きます。

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
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

**ワークフローの構成**

**1つのファイル `.github/workflows/ci.yml` にまとめます。** 検査とデプロイをジョブとして並べ、`needs` で順序を決めます。

| ジョブ | 起動条件 | 内容 |
|---|---|---|
| `check` | PR と `main` への push | Lint、整形チェック、型チェック、単体テスト |
| `e2e` | 同上 | E2E テスト（8章で追加します） |
| `changes` | `main` への push のみ | どちら側が変わったかを差分から判定する |
| `deploy-api` | `check` `e2e` `changes` の後 | D1 のマイグレーション適用 → デプロイ |
| `deploy-web` | 同上 | ビルド → デプロイ |

**デプロイを別のワークフローファイルに分けてはいけません。** ワークフローどうしには順序関係がなく、`push` で両方が同時に走ります。つまり**テストの結果を待たずにデプロイされます**。同じワークフローに置いて `needs` で繋ぐことが、順序を保証する唯一の方法です。

`ci.yml` の要点です。

```yaml
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc   # ローカルと同じバージョンを使う
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

**`node-version-file: .nvmrc` で、[2.1](02_frontend.md#21-リポジトリと-workspace-を作る) で作ったファイルを CI でも使い回しています。** バージョンの指定場所が1つで済みます。

safe-chain のインストールスクリプトは、URL にバージョンが入り、チェックサムも一緒に配布されています。**公式 README の最新のコマンドをそのまま貼り付けてください**（ここに載せたものは執筆時点のものです）。

**変更のあった側だけをデプロイする**

`paths` フィルタはワークフロー単位でしか書けないので、**ジョブに分けた時点で使えません。** 代わりに、push の差分から判定するジョブを置きます。

```yaml
  changes:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0        # 差分を取るので履歴が要る

      - id: filter
        run: |
          base='${{ github.event.before }}'
          if ! git cat-file -e "$base^{commit}" 2>/dev/null; then
            # force push などで前のコミットが辿れないときは、両方デプロイする
            echo "api=true" >> "$GITHUB_OUTPUT"
            echo "web=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          changed=$(git diff --name-only "$base" HEAD)

          # 共通ファイルが変わったときは、どちらもデプロイし直す
          if echo "$changed" | grep -qE '^(package\.json|package-lock\.json|\.github/workflows/ci\.yml)$'; then
            echo "api=true" >> "$GITHUB_OUTPUT"
            echo "web=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          echo "api=$(echo "$changed" | grep -q '^apps/api/' && echo true || echo false)" >> "$GITHUB_OUTPUT"
          echo "web=$(echo "$changed" | grep -q '^apps/web/' && echo true || echo false)" >> "$GITHUB_OUTPUT"
```

デプロイ側は、この出力を見て動くかどうかを決めます。

```yaml
  deploy-api:
    needs: [check, changes]     # 8章で e2e を足したら [check, e2e, changes] にする
    if: needs.changes.outputs.api == 'true'
```

**`needs` に挙げたジョブが1つでも失敗すると、デプロイのジョブは実行されません。** PR では `changes` が動かないため、デプロイのジョブもスキップされます。

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

**マイグレーションはデプロイの前に流します。** 逆にすると、新しいコードが存在しない列を触る瞬間が生まれます。

フロント側は、ビルド時に API の URL を埋め込んでからデプロイします。

```yaml
      # VITE_ の環境変数はビルド時に埋め込まれる。シークレットを入れてはいけない
      - run: npm run build -w apps/web
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
```

`secrets` ではなく `vars`（GitHub の Variables）を使っているのは、この値が公開されるものだからです。**シークレットではないものをシークレットに入れると、「秘密にすべきもの」の境界が曖昧になります。**

**必要なシークレット**

| 名前 | 種類 | 中身 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | Workers と D1 の編集権限を持つ API トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare のアカウント ID |
| `VITE_API_URL` | Variable | デプロイした API の URL |

`BETTER_AUTH_SECRET` は GitHub には登録しません。**Cloudflare 側に `wrangler secret put` で入れておけば、デプロイしても消えません。**

---

---

**この章のコード**: `chapter-05` ブランチ
