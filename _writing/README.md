# 執筆者向け

このディレクトリには、記事を書く側だけが使うものが入っています。**記事の手順には出てきません。** 学習者はここを読む必要はありません。

| ファイル | 中身 |
|---|---|
| [`AGENTS.md`](AGENTS.md) | 執筆時の指示（節の書式、参照リンク、調査の原則など）。`CLAUDE.md` はこれへのシンボリックリンク |
| [`sync-chapters.sh`](sync-chapters.sh) | 章ブランチを `main` の履歴に合わせて付け直す |

## 最初に: `.mode` を作る

リポジトリのルートに `.mode` を置くと、AI エージェント（Claude Code）が執筆者として振る舞います。

```bash
echo author > .mode
```

`author` なら執筆者、`user` またはファイルが無ければ学習者です。判定はルートの [`../AGENTS.md`](../AGENTS.md) の冒頭に書いてあります。**学習者の手元には存在しない**ので、`.gitignore` に入れてコミットしません。

## 履歴とブランチのモデル

`main` は **「1章 = 1コミット」の直線的な履歴**です。章ブランチはその途中を指しているだけで、独自のコミットは持ちません。

```
c0ffee0  chore: 1章 リポジトリと workspace を用意する    <- chapter-01
41189ab  feat(web): 2章 React でフロントエンドを作る    <- chapter-02
7591c42  feat(api): 3章 Hono でバックエンドを作る        <- chapter-03
ba0398f  test: 4章 テストを書く                          <- chapter-04
3f02f85  ci: 5章 デプロイする                            <- chapter-05
0720344  feat(web): 6章 フロントから API を呼ぶ          <- chapter-06
242f4d5  feat(web): 7章 機能を拡張する                   <- chapter-07
01d1750  test: 8章 E2E テストを行う                      <- chapter-08
5143330  docs: 記事を章ごとのファイルに分割する           <- main
```

**章ブランチを直接編集しないでください。** 編集すると `main` の履歴から外れ、次に付け直したときに消えます。

## どのコミットに入れるか

判断の基準は **「そのファイルが記事に出てくるか」** です。

| ファイル | 入れる場所 | 理由 |
|---|---|---|
| `apps/**` | その章のコミット | 章のコードそのもの |
| `.nvmrc`、`.gitignore`、ルートの `package.json` | 1章のコミット | 記事 1.8 で読者が作る |
| `.oxlintrc.json`、`.oxfmtrc.json` | 2章のコミット | 記事 2.10 で読者が作る |
| `.github/workflows/*.yml` | 5章のコミット | 記事 5.2 で読者が作る |
| `playwright.config.ts`、`tests/e2e/**` | 8章のコミット | 記事 8章で読者が作る |
| `package.json`、`package-lock.json` | 依存を追加した章のコミット | 記事の手順で `npm i` するタイミング |
| `docs/**`、`README.md`、`_writing/**`、`renovate.json` | **先端**（ケース1） | 記事に出てこない。章ブランチには含まれない |
| `AGENTS.md`、`CLAUDE.md` | **1章のコミット**（ケース5） | 記事に出てこないが、どの章ブランチでもエージェントに読ませたい |

`.gitignore` の `.mode` の行だけは例外で、**先端**に入れてあります。記事に出てこない、執筆者だけのファイルだからです。そのぶん章ブランチでは `.mode` が無視されません（下の `git add -A` の注意を参照）。

**`chapter-01` はリポジトリの骨組みだけです。** 1.8 で作る `.nvmrc`、`.gitignore`、ルートの `package.json` の3つで、依存はまだ入れないので `package-lock.json` もありません。CI もこのブランチだけは `npm ci` を打たず、`npm pkg get workspaces` が通ることだけを見ています。

**章ブランチに入っているのは、記事に出てくるファイルと `AGENTS.md` / `CLAUDE.md` だけです。** `README.md` や `docs/**` を直しても章ブランチは変わりませんし、変える必要もありません。

**各章のツリーは、その時点で `npm run lint` と `npm run format:check` が通る状態にしてください。** CI の `chapters` ジョブが章ブランチごとに両方を実行します。章のコミットを直したあとは、その章以降のツリーで `oxfmt --check` が落ちていないかを確認してください（以前は `format:check` を回していなかったため、章のツリーに未整形のファイルが残っていました）。

### 例: Node.js の LTS が上がったとき

`.nvmrc` は記事 1.8 で作るファイルなので、**1章のコミットを直します**（ケース2）。3章以降は積み直されるだけで、個別の作業は要りません。記事側の記述（1.8 の LTS バージョンの説明）は、先端に別コミットで入れます。

### 例: 依存パッケージを更新するとき

Renovate の PR は `main` にだけ入ります。**章ブランチは、記事を書いた時点のバージョンのまま**です。これは意図した状態で、記事に書いてあるバージョンと手元のコードが一致します。

ただし差が開くと、記事の記述（「`create-vite` 9系の生成物は…」など）と実際のコードがずれていきます。**記事がバージョンを明記している箇所と食い違ってきたら、その更新を該当章のコミットに取り込んで（ケース2）、記事も直してください。**

## ケース1: 記事だけを直す

**ブランチ操作は不要です。** 普通にコミットして push してください。

```bash
vim docs/03_backend.md
git add docs/03_backend.md
git commit -m "docs: 3.6 のマイグレーション手順を補足する"
git push origin main
```

## ケース2: ある章のコードを直す

例として、**2章の `PostForm` にラベルを追加する**とします。2章のコミットを直すので、それ以降の章（3〜8）のコミットは自動的に積み直されます。

```bash
# 1. 2章のコミットで止める
git rebase -i --root main
```

エディタが開くので、2章の行を `pick` から `edit` に変えて保存します。

```
edit 41189ab feat(web): 2章 React でフロントエンドを作る
pick 7591c42 feat(api): 3章 Hono でバックエンドを作る
...
```

```bash
# 2. その時点のコードを直す
vim apps/web/src/components/PostForm.tsx
git add apps/web/src/components/PostForm.tsx
git commit --amend --no-edit

# 3. 残りの章を積み直す
git rebase --continue
```

3章以降で同じ箇所を触っていれば、ここで衝突します。**衝突は「後の章がその変更をどう引き継ぐか」の判断そのものなので、内容を見て解決してください。**

```bash
vim <衝突したファイル>
git add <衝突したファイル>
git rebase --continue        # ← ここで --amend は使わない
```

> **衝突の解決中に `git commit --amend` を打たないでください。** rebase が commit を作る前の状態なので、`--amend` は**1つ前の章のコミット**を書き換えます。適用中だったコミットは独立した存在ではなくなり、**その章のコミットが消えます**（中身は前の章のコミットに混ざります）。
>
> 「その章のコミットの内容を変えたい」場合は、todo で `edit` を指定して**適用が完了して停止したあと**に `--amend` してください。
>
> 消してしまったときの復旧:
>
> ```bash
> git rebase --abort                # rebase の途中なら、これで元に戻る
> git reset --hard origin/main      # push 前で rebase を終えてしまったなら、リモートの状態に戻す
> ```
>
> **`git add -A` にも注意してください。** 章のコミットを直しているときの `.gitignore` は「その章の時点」の内容です。あとの章で無視するようになった生成物が手元にあると、巻き込んでコミットしてしまいます。`git status` を見て、意図したファイルだけを `git add` してください。
>
> この事故は実際に起きました（`test-results/.last-run.json` が5章のコミットに混入）。対策として、あとの章で出てくる生成物の無視設定は**2章のコミットにまとめてあります**。新しい生成物が増えたときも、8章ではなく2章の `.gitignore` に足してください。
>
> 同じ理由で、**章のコミットを直している間は `.mode` も無視されません**（`.gitignore` のその行は先端にしかないため）。気になるなら `.git/info/exclude` にも `.mode` を書いておくと、どのコミットにいても無視されます。
>
> **`./_writing/sync-chapters.sh` が検出器になります。** 章のコミットが 1 件に定まらないと `main に "8章" のコミットが 0 件見つかりました` と表示して停止するので、**push する前に必ず一度実行してください。**

```bash
# 4. 章ブランチを付け直す（--push を付けなければローカルの付け直しだけ）
./_writing/sync-chapters.sh

# chapter-02: 41189ab -> 9c31a02
# chapter-03: 7591c42 -> 4f80b11
# ...

# 5. 問題なければ push
./_writing/sync-chapters.sh --push
```

```bash
# 6. 各章が壊れていないか CI で確認する
gh workflow run ci.yml
gh run watch
```

`chapters` ジョブが `chapter-02` 〜 `chapter-08` をそれぞれ checkout して、`npm ci` / lint / 型チェック / テスト / ビルドを回します（`chapter-01` は依存が無いので別ジョブです）。**上流の章を直した結果、後の章が壊れていないかはここで分かります。**

## ケース3: 記事とコードを同時に直す

**コードは該当章のコミットに、記事は先端に別コミットで**入れてください。記事を章のコミットに混ぜると、章ブランチに古い記事が同梱されることになります。

```bash
git rebase -i --root main        # コードだけを直す（ケース2 の手順1〜3）
./_writing/sync-chapters.sh --push

vim docs/02_frontend.md          # 記事は普通のコミットで
git commit -am "docs: 2.7 のコンポーネント分離を実装に合わせる"
git push origin main
```

## ケース4: 新しい章を足す

1. `main` に「N章」を含むコミットメッセージでコードをコミットする
2. `_writing/sync-chapters.sh` の `CHAPTERS` 配列に番号を足す
3. `.github/workflows/ci.yml` の `chapters` ジョブの matrix に `chapter-0N` を足す
4. `README.md` と `docs/00_introduction.md` の対応表に行を足す

## ケース5: AGENTS.md を直す

`AGENTS.md` は**1章のコミットに入れてあります**。`CLAUDE.md` はそれへのシンボリックリンクです。1章のコミットは全章ブランチの祖先なので、`git checkout chapter-05` のように途中の章に移動しても、エージェントがそのまま読める状態になります。

> [!NOTE]
> 「GitHub から取ってくる」案もありましたが、採りませんでした。Claude Code も codex も、**作業ツリーにあるファイルしか自動では読みません**。手元に無いものを読ませるには学習者が毎回指示する必要があり、置いておく意味がなくなります。
>
> 代わりに、直すたびにルートのコミットを書き換えるコストを払っています。`AGENTS.md` は先端には存在しません（1章のコミットから引き継がれているだけです）。

```bash
# 1章のコミットを edit にする
git rebase -i --root

$EDITOR AGENTS.md
git add AGENTS.md
git commit --amend --no-edit
git rebase --continue

./_writing/sync-chapters.sh --push
```

**先端で `AGENTS.md` を直してコミットしないでください。** 一見それで動きますが、その変更は章ブランチには届きません。

## sync-chapters.sh

```bash
./_writing/sync-chapters.sh          # ローカルの章ブランチを付け直して結果を表示
./_writing/sync-chapters.sh --push   # そのまま force-with-lease で push
```

コミットメッセージの「N章」で各章のコミットを探します。以下の場合は**何もせずに終了**します。

- 作業ツリーに未コミットの変更がある
- 「N章」を含むコミットが `main` に 0 件、または 2 件以上ある

`--push` は `main` と章ブランチ 7 本をまとめて force push します（`--force-with-lease`）。**章ブランチは共同作業用ではなく公開スナップショットなので、force push して構いません。** 読者は clone し直すか、`git fetch --all` で追随できます。


## 確認済みの事項

以下は実機で動かして確認済みです（2026年8月時点）。バージョンが上がったら再確認してください。

| 章 | 確認したこと |
|---|---|
| 全体 | 完成コードはこのリポジトリ。章ごとのブランチ（`chapter-01` 〜）を順次追加 |
| 全体 | この記事の範囲は Cloudflare の無料プランに収まる。Workers 100,000 リクエスト/日、D1 は読み取り 500 万行/日・書き込み 100,000 行/日・容量 5 GB、静的ファイルの配信は無制限（[Workers の料金](https://developers.cloudflare.com/workers/platform/pricing/) / [D1 の料金](https://developers.cloudflare.com/d1/platform/pricing/) で確認） |
| 2 | Node.js の LTS は 24。`create-vite` 9系の生成物（Vite 8 / React 19 / TS 6、Lint は oxlint） |
| [2.9](../docs/02_frontend.md#29-react-router-でページを分ける) | React Router v8。モードの呼称（Framework / Data / Declarative）は変わっていない |
| [2.10](../docs/02_frontend.md#210-oxlint--oxfmt-のセットアップ) | oxlint 1.79 / oxfmt 0.64。`create-vite` が入れるのは oxlint だけで、oxfmt も `oxlint-tsgolint` も入らない。oxlint は既定で `correctness` カテゴリのみ、react プラグインは off。型情報を使うルールには `oxlint-tsgolint` + `--type-aware` が要る。`overrides` の `plugins` は既定のプラグインを置き換えず足し算になる |
| [3.2](../docs/03_backend.md#32-npm-create-honolatest) | `create-hono` 0.19 系の生成物。`"private": true` は入っていない |
| [3.5](../docs/03_backend.md#35-環境変数とシークレット) | `wrangler types` が `vars` をリテラル型、`.dev.vars` のキーを `string` として生成する |
| [3.6](../docs/03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) | Drizzle 0.45 / drizzle-kit 0.31。ローカル D1 は `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` |
| [3.7](../docs/03_backend.md#37-入力バリデーション) | `@hono/zod-validator` 0.9 + zod 4 |
| [3.10](../docs/03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) | Better Auth 1.7。D1 の組み込みサポートはあるが、この記事は Drizzle アダプタを使う。`drizzleAdapter` には `schema` を渡す必要がある。トークンは `set-auth-token` ヘッダー |
| 4 | Vitest 4 + Testing Library 16 / `@cloudflare/vitest-pool-workers` 0.22（`cloudflareTest` プラグイン形式） |
| [6.4](../docs/06_api-integration.md#64-hono-rpc-で型安全に呼ぶ) | RPC の型共有は `tsconfig` の `paths` だけで足りる（project references 不要） |
| [6.2](../docs/06_api-integration.md#62-cors) | CORS に加えて Better Auth の `trustedOrigins` が必要 |
| 8 | Playwright 1.62。`webServer` は `globalSetup` より先に起動する |
| [3.2](../docs/03_backend.md#32-npm-create-honolatest) | 生成される `name` はディレクトリ名そのままの `api`。Worker 名はデプロイ先の URL になるので `memo-app-api` に直す |
| [3.6](../docs/03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) | `wrangler d1 create` が出力する `binding` はデータベース名から作られる（`memo_app_db`）。`DB` に直さないと、`db:migrate:local` が `No migrations present at .../apps/api/migrations` で失敗する（`migrations_dir` の指定ごと無視されるため） |
| 5 | Worker の名前は Cloudflare のダッシュボードで変更できる（`wrangler` にリネームのコマンドは無い）。リネームすると `workers.dev` の URL も割り当て直され、シークレットとバインディングはそのまま残る |
| [6.7](../docs/06_api-integration.md#67-環境変数を追加して再デプロイ) | URL の末尾スラッシュは付けない。`VITE_API_URL` に付けると `auth.ts` の手書き `fetch` だけが二重スラッシュになり 404（Hono RPC 側は正規化されるので気づきにくい）。`CORS_ORIGIN` に付けると `Origin` ヘッダーと一致せず `Access-Control-Allow-Origin` が返らない |
| [6.7](../docs/06_api-integration.md#67-環境変数を追加して再デプロイ) | wrangler の環境（`env.production`）では、`vars` と `d1_databases` は**継承されない**（書かないと本番から D1 が消える）。`name` も環境内に書かないと Worker 名が `<name>-production` になり URL が変わる。`wrangler types` は環境をまたいだ union 型を生成する |
| 8 | E2E は `.dev.vars` に依存させない。`.dev.vars` は gitignore されていて CI に存在しないため、`vars` に本番の値を置くと CI だけ CORS で全滅する |

## 未確認の事項

**「出力を控える」ではなく「記事の手順を実際に通し、書いてある主張を1つずつ確かめる」リストです。** 最初に作ったものは前者だったため、実際にデプロイを進めて出た不備（生成物の既定値が記事の前提と違う、環境変数の形式、コミットの置き場所）を1つも拾えませんでした。

見る観点は5つです。

1. **生成物の既定値が、記事の前提と一致しているか**（`name`、`binding` はここで外れた）
2. **記事が「自分のものに置き換えてください」としか書いていない値**に、具体的な注意が要らないか
3. **記事に書いた確認方法（「〜と表示されれば成功です」）が、実際にその通りになるか**
4. **順序と依存**（先に何が無いと失敗するか）
5. **権限と料金**（最小セットで足りるか、無料枠に収まるか）

### 3章

- [ ] [3.1](../docs/03_backend.md#31-cloudflare-アカウント作成--wrangler-login) `npx wrangler login` の画面遷移と、`npx wrangler whoami` の出力
- [ ] [3.2](../docs/03_backend.md#32-npm-create-honolatest) 生成物についての主張3つ: `"private": true` が入らない / `$schema` が `node_modules/wrangler/config-schema.json` になる / `install-scripts` の警告が出る
- [ ] [3.5](../docs/03_backend.md#35-環境変数とシークレット) Worker をデプロイする前に `wrangler secret put` を実行すると何が起きるか（5.2 の「デプロイしたあとに実行してください」の根拠）
- [ ] [3.6](../docs/03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) `npm run db:migrate:remote -w apps/api` が本番の D1 に通り、`wrangler d1 execute DB --remote` で確認できること

### 5章

- [ ] [5.1](../docs/05_deploy.md#51-環境変数シークレットの置き場所を決める) 「Edit Cloudflare Workers」テンプレートに **D1 の編集権限が含まれるか**。含まれないなら、画面上の正確な権限名
- [ ] [5.1](../docs/05_deploy.md#51-環境変数シークレットの置き場所を決める) その最小セットで、`deploy` と `d1 migrations apply --remote` の**両方**が通ること
- [ ] [5.1](../docs/05_deploy.md#51-環境変数シークレットの置き場所を決める) アカウント ID の取得場所（`wrangler whoami` で足りるなら、そう書く）
- [ ] [5.2](../docs/05_deploy.md#52-github-actions-を構築する) 初回に3つのワークフローが**すべて**動くこと（記事の主張）
- [ ] [5.2](../docs/05_deploy.md#52-github-actions-を構築する) `/health` が `{"status":"ok"}` を返すこと
- [ ] [5.2](../docs/05_deploy.md#52-github-actions-を構築する) `/posts/test` を直接開いて、Cloudflare の 404 ではなく React の画面が出ること（`not_found_handling`）
- [ ] [5.2](../docs/05_deploy.md#52-github-actions-を構築する) `wrangler secret list` に `BETTER_AUTH_SECRET` が並ぶこと
- [ ] [5.2](../docs/05_deploy.md#52-github-actions-を構築する) safe-chain の48時間ルールに当たらないか（[確認済みの事項](#確認済みの事項)を参照）

### 6章

- [ ] [6.7](../docs/06_api-integration.md#67-環境変数を追加して再デプロイ) Variables に登録しただけでは反映されず、**再デプロイが要る**こと
- [ ] [6.7](../docs/06_api-integration.md#67-環境変数を追加して再デプロイ) `vars` を本番の値にしたあと、`.dev.vars` の上書きでローカル開発が壊れないこと
- [ ] [6.7](../docs/06_api-integration.md#67-環境変数を追加して再デプロイ) 本番でサインアップ・ログイン・メモの CRUD・公開/非公開の切り替えが通ること
- [ ] [6.7](../docs/06_api-integration.md#67-環境変数を追加して再デプロイ) `CORS_ORIGIN` だけ直して `trustedOrigins` を直さないと **403 / `Invalid origin`** になる、という記述（この構成では1箇所で済むはずなので、再現するかを含めて確認）

### 7章

- [ ] [7.5](../docs/07_features.md#75-csr-の限界) 本番のフロントに `curl` を投げ、**初期 HTML に本文が含まれない**こと。`<div id="root">` がほぼ空であること

### 0章と横断

- [ ] [0章](../docs/00_introduction.md) 完成版アプリの公開 URL（本文に `TODO(執筆時)` を置いてある）
- [ ] [0章](../docs/00_introduction.md) ここまでの作業が**無料枠に収まっている**こと（Cloudflare のダッシュボードで実測する）
- [ ] **記事に書いてある手順だけで、一度も手が止まらずに通るか。** 記事に書いていない操作（UI でのリネーム、値の形式の調整など）が要ったら、それは記事の穴

### その他

- [ ] [2.8](../docs/02_frontend.md#28-css-基礎) 図の作成（必要な図の一覧は本文に記載済み）
