# 3 Hono でバックエンドを作る

この章では API だけを作ります。[2章](02_frontend.md)で作ったフロントエンドとは、まだ接続しません。

## 3.1 Cloudflare アカウント作成 / `wrangler login`

このチュートリアルでは、バックエンドを Cloudflare Workers 上で動かし、データベースに Cloudflare D1 を使います。`wrangler` は Cloudflare が提供する CLI で、ローカル開発とデプロイの両方に使います。

アカウントを作成します。メールアドレスとパスワードだけで登録でき、確認メールのリンクを踏めば完了です。以下のリンクを開いてください。

https://dash.cloudflare.com/sign-up

次に、CLI からアカウントに接続します。`wrangler` は [3.2](#32-npm-create-honolatest) でプロジェクトを作ると一緒に入るので、ここではまだ実行できません。**[3.2](#32-npm-create-honolatest) を終えてから、リポジトリのルートで以下を実行してください。**

```bash
npx wrangler login
```

ブラウザが開き、アクセスを許可すると認証が完了します。

`npx wrangler whoami` が自分のアカウント情報を表示すれば成功です。

**無料枠**

このチュートリアルで作るものは、いずれも無料枠に収まります。執筆時点の Workers Free プランは以下の通りです。

| 項目 | 無料枠 |
|---|---|
| リクエスト数 | 100,000 / 日 |
| CPU 時間 | 10 ミリ秒 / 呼び出し |
| D1: 読み取り行数 | 500 万行 / 日 |
| D1: 書き込み行数 | 100,000 行 / 日 |
| D1: ストレージ | 合計 5 GB |

参照:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/

**つまずきポイント**

> [!TIP]
> - **ログインが必要になるのは、実際にはもっと後です。** ローカルの開発サーバー（[3.3](#33-最初のエンドポイント-health) 以降の `wrangler dev`）とローカルの D1（[3.6](#36-drizzle--d1-で-posts-テーブルを作る)）は、ログインしていなくても動きます。アカウントが要るのは、本番の D1 を作るときと、[5章](05_deploy.md)でデプロイするときです。先に済ませておくほうが後で詰まりませんが、急ぎでなければ後回しでも進められます
> - WSL からは Windows 側のブラウザが開きます。開かない場合はターミナルに表示される URL を手動でコピーしてください
> - 無料枠の範囲ではクレジットカードの登録は不要ですが、有料プランの機能に触れる操作をすると登録を求められます

## 3.2 `npm create hono@latest`

Hono は軽量な Web フレームワークです。Cloudflare Workers 上で動くことを主眼に設計されており、Node.js やその他のランタイムでも動きます。

リポジトリのルートで実行し、Cloudflare Workers 向けのテンプレートを選択します。

```bash
npm create hono@latest apps/api -- -t cloudflare-workers -p npm
```

`-t` はテンプレート、`-p` はパッケージマネージャの指定です。テンプレートには `cloudflare-workers` のほか `cloudflare-workers+vite`、`nodejs`、`bun`、`deno`、`aws-lambda`、`vercel` などがあります（`npm create hono@latest -- --help` で一覧できます）。この記事では素の `cloudflare-workers` を使います。

途中で **「Do you want to install project dependencies?」** と聞かれます。**`n` と答えてください。** 依存のインストールは、あとでルートから `npm install` を実行して workspace 全体でまとめて行います。

**生成されるもの**

| ファイル | 中身 |
|---|---|
| `src/index.ts` | `Hello Hono!` を返すだけの最小構成 |
| `package.json` | `hono` と `wrangler`、`dev` / `deploy` / `cf-typegen` スクリプト |
| `wrangler.jsonc` | Worker の設定。`name`、`main`、`compatibility_date` が入り、D1 や KV の設定例がコメントで並んでいる |
| `tsconfig.json` | Workers 向けの TypeScript 設定 |
| `.gitignore` | Node 向けの一般的な内容に `.wrangler` と `.dev.vars` を足したもの |
| `README.md` | 上記スクリプトの使い方 |

生成後、ルートで依存をインストールします。

```bash
npm install
```

`npm run dev -w apps/api` で開発サーバーが起動し、`http://localhost:8787` にアクセスして `Hello Hono!` が表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - **生成された `apps/api/package.json` には `"private": true` が入っていません。** [1.8](01_setup.md#18-リポジトリと-workspace-を作る) で説明した理由から、手で追加してください
> - **`wrangler.jsonc` の `"$schema"` のパスを直してください。** 生成されるのは `node_modules/wrangler/config-schema.json` ですが、workspace では依存がルートにまとめられる（[2.1](02_frontend.md#21-npm-create-vitelatest)）ため、`apps/api/node_modules/` は作られません。`"../../node_modules/wrangler/config-schema.json"` にします。**動作には影響しませんが、エディタでの補完と検証が効きません**
> - 生成された `apps/api/.gitignore` は、ルートの `.gitignore` と内容が重複します。どちらかに寄せて構いませんが、**ルート側の記述は残してください**
> - **`npm install` で `install-scripts` の警告が出ることがあります。** npm 12 以降は、インストール時に実行されるスクリプトを既定でブロックします（[1.4](01_setup.md#14-サプライチェーン攻撃の対策) のサプライチェーン攻撃への対策の一種です）。`npm install-scripts ls` でブロックされたパッケージを確認できます。この記事の構成では、ブロックされたままでも `wrangler dev` もビルドも動きます

## 3.3 最初のエンドポイント `/health`

サーバーが生きているかを確認するためのエンドポイントです。実運用でも監視や死活監視に使われます。ここでは Hono のルーティングの書き方を覚えるのが目的です。

テンプレートが生成した `apps/api/src/index.ts` は `Hello Hono!` を返すだけの形です。これを書き換えます。

```ts
import { Hono } from 'hono'

const app = new Hono().get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

`get` の第1引数がパス、第2引数が**ハンドラ**（そのパスにリクエストが来たときに実行される関数）です。

ハンドラが受け取る `c` は **Context** と呼ばれるもので、**リクエストの情報とレスポンスを作る道具が、1つにまとまったもの**です。リクエストは `c.req`、レスポンスは `c.json` などで作ります。

| 書き方 | Content-Type | 使う場面 |
|---|---|---|
| `c.json({ status: 'ok' })` | `application/json` | API のレスポンス |
| `c.text('ok')` | `text/plain` | 単純な文字列 |
| `c.body(null, 204)` | なし | 本文を返さないとき（削除の成功など） |

**ステータスコードは第2引数で指定します。** 省略すると 200 です。

```ts
c.json(row, 201)                       // 作成した
c.json({ message: 'Not Found' }, 404)  // 見つからない
```

`npm run dev -w apps/api` を起動して `http://localhost:8787/health` を開き、`{"status":"ok"}` が表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - **ルーティングはメソッドチェーンで書いてください。** [6.4](06_api-integration.md#64-hono-rpc-で型安全に呼ぶ) で Hono RPC を使う際、型がハンドラの定義から導出されます。`app.get(...)` と `app.post(...)` を別々の文として書くと型が繋がりません
>
>   ```ts
>   // これ
>   const app = new Hono()
>     .get('/health', ...)
>     .get('/posts', ...)
>
>   // ではなく、これは RPC で型が取れない
>   const app = new Hono()
>   app.get('/health', ...)
>   app.get('/posts', ...)
>   ```

## 3.4 ブラウザと curl から叩く

API はブラウザで開くだけでは十分に確認できません。POST や PUT、ヘッダーの指定を伴うリクエストを送る手段が必要です。

**ブラウザのアドレスバーから送れるのは GET だけです。** POST や PUT、ヘッダーを付けたリクエストは送れません。ターミナルから `curl` で叩けるようにしておきます。

```bash
curl http://localhost:8787/health
```

```
{"status":"ok"}
```

**ステータスコードとヘッダーも見る**には `-i` を付けます。

```bash
curl -i http://localhost:8787/health
```

```
HTTP/1.1 200 OK
Content-Length: 15
Content-Type: application/json

{"status":"ok"}
```

**API がおかしいと思ったら、まず `-i` を付けてください。** 本文だけを見ていると、401 なのか 404 なのか 500 なのかが分かりません。

**メソッドとボディを指定する**には `-X` と `-d` を使います。

```bash
curl -i -X POST http://localhost:8787/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"買い物","content":"たまごを買う"}'
```

| オプション | 意味 |
|---|---|
| `-X` | HTTP メソッド（省略時は GET。`-d` を付けると POST になります） |
| `-H` | ヘッダーを足す。JSON を送るときは `Content-Type` が必要です |
| `-d` | リクエストボディ |
| `-i` | レスポンスヘッダーも表示する |
| `-v` | 接続の様子や送ったヘッダーまで表示する |

**HTTP メソッド**

| メソッド | 意味 |
|---|---|
| GET | 取得する。何度実行しても状態が変わらない |
| POST | 作成する |
| PUT | 置き換える（この記事では更新に使います） |
| DELETE | 削除する |

**ステータスコード**

| 番号 | 意味 | この記事で出てくる場面 |
|---|---|---|
| 200 | 成功 | 取得・更新 |
| 201 | 作成した | メモの作成（[3.8](#38-posts-の-crud-エンドポイント)） |
| 204 | 成功したが本文は無い | メモの削除（[3.8](#38-posts-の-crud-エンドポイント)） |
| 400 | リクエストが不正 | バリデーション違反（[3.7](#37-入力バリデーション)） |
| 401 | 認証されていない | トークンが無い（[3.10](#310-better-auth-を導入しposts-をユーザーに紐づける)） |
| 404 | 見つからない | 存在しない id、他人の非公開メモ（[3.10](#310-better-auth-を導入しposts-をユーザーに紐づける)） |
| 500 | サーバー側のエラー | 想定外の例外 |

**先頭の数字だけでも覚えてください。** 2xx は成功、**4xx は呼び出した側の問題、5xx はサーバー側の問題**です。4xx なら自分のリクエストを疑い、5xx ならサーバーのログを見る、という切り分けができます。

定義していないパスやメソッドには、Hono が 404 を返します。

```
HTTP/1.1 404 Not Found
Content-Length: 13
Content-Type: text/plain; charset=UTF-8
```

`curl` で `/health` を叩き、ステータスコードとレスポンスボディを確認できれば成功です。

## 3.5 環境変数とシークレット

API キーやデータベースの接続情報をコードに直接書くと、リポジトリに公開されてしまいます。環境ごとに値を切り替える仕組みも必要です。

**扱うこと**

- ローカル開発用の `.dev.vars`
- 本番用の `wrangler secret put`
- 「環境変数」と「シークレット」の違い
- Workers では、リクエストのコンテキスト（`c.env`）経由で環境変数にアクセスすること
- 型定義の生成

**設定の書き方**

秘密でない値は `wrangler.jsonc` の `vars` に書きます。**このファイルはコミットされるので、秘密の値を書いてはいけません。**

```jsonc
{
  "vars": {
    "CORS_ORIGIN": "http://localhost:5173",
    "BETTER_AUTH_URL": "http://localhost:8787"
  }
}
```

秘密の値は、ローカルでは `apps/api/.dev.vars` に書きます。

```
BETTER_AUTH_SECRET="local-development-secret-do-not-use-in-production"
```

本番には `wrangler secret put` で登録します（[5.1](05_deploy.md#51-環境変数シークレットの置き場所を決める) で扱います）。

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

**読み方**

Workers では、環境変数はリクエストのコンテキスト経由で渡されます。Hono では `c.env` です。

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>().get('/health', (c) => {
  return c.json({ status: 'ok', origin: c.env.CORS_ORIGIN })
})
```

**型定義の生成**

`wrangler` が `wrangler.jsonc` と `.dev.vars` を読んで型を生成します。[3.2](#32-npm-create-honolatest) で生成された `cf-typegen` スクリプトがこれです。

```bash
npm run cf-typegen -w apps/api
```

`apps/api/worker-configuration.d.ts` が作られ、`CloudflareBindings` に以下のような定義が入ります。

```ts
interface __BaseEnv_CloudflareBindings {
  CORS_ORIGIN: "http://localhost:5173"
  BETTER_AUTH_URL: "http://localhost:8787"
  BETTER_AUTH_SECRET: string
}
```

**この時点では `DB` は入りません。** D1 のバインディングを足すのは [3.6](#36-drizzle--d1-で-posts-テーブルを作る) なので、そのときに `cf-typegen` を実行し直すと `DB: D1Database` が増えます。

`vars` の値は**リテラル型**（値そのものが型になる）、`.dev.vars` のキーは `string` 型になります。前者は「`wrangler.jsonc` に書いたその値しか入らない」という意味の型なので、本番で別の値を入れる前提のものを厳密に比較するようなコードを書くと、意図しない型エラーになることがあります。

**シークレットが読めているかを確かめるときは、値そのものを返さないでください。** 一時的に真偽値だけを返して確認し、確認できたら消します。

```ts
// 確認用。値そのものは返さない。確認できたら消す
return c.json({ hasAuthSecret: c.env.BETTER_AUTH_SECRET.length > 0 })
```

`{"hasAuthSecret":true}` が返れば、`.dev.vars` が読めています。

**つまずきポイント**

> [!TIP]
> - **`.dev.vars` は絶対にコミットしないでください。** [1.8](01_setup.md#18-リポジトリと-workspace-を作る) で `.gitignore` に追加済みですが、`git status` で確認する習慣を付けてください
> - **環境変数は `process.env` ではなく `c.env` から読みます。** Workers の設定によっては `process.env` も使えますが、**D1 のようなバインディングは `c.env` からしか取れません。** 読み方を1つに統一しておくほうが混乱しません
> - **`wrangler.jsonc` を変更したら `cf-typegen` を実行し直してください。** [3.6](#36-drizzle--d1-で-posts-テーブルを作る) で D1 のバインディングを足したときに `c.env.DB` が型エラーになりますが、原因はこれです
> - 生成された `worker-configuration.d.ts` はコミットして構いません。ただし手で編集しても次の生成で消えます
> - 誤ってコミットしてしまった場合、履歴から消しても流出したものとして扱い、値をローテーションしてください

## 3.6 Drizzle + D1 で `posts` テーブルを作る

Drizzle は TypeScript で書ける ORM です。スキーマを TypeScript のコードとして定義し、そこからマイグレーションと型を生成します。D1 は Cloudflare が提供する SQLite ベースのデータベースです。

**用語**

| 用語 | 意味 | この章での例 |
|---|---|---|
| テーブル | 表。行と列でできている | `posts`、`user` |
| 行 (レコード) | 表の1行。1件のデータ | 1つのメモ |
| 列 (カラム) | 表の1列。各行が持つ項目 | `title`、`content` |
| 主キー | その行を一意に決める列。重複できない | `posts.id` |
| 外部キー | 別のテーブルの主キーを指す列 | `posts.user_id` は `user.id` を指す |
| スキーマ | どんなテーブルがどんな列を持つか、という定義 | `src/db/schema.ts` |
| マイグレーション | スキーマの変更を、データベースに適用するための手順書 | `drizzle/0000_init_posts.sql` |
| ORM | テーブルの操作を、SQL ではなくコードで書けるようにする道具 | Drizzle |

**スキーマを書くこととテーブルを作ることは、別の工程です。** `schema.ts` を書いただけではデータベースは変わりません。そこから**マイグレーション（SQL のファイル）を生成し、それをデータベースに適用**して、初めてテーブルができます。2段階になっているのは、**本番のデータベースにも同じ変更を、同じ順序で適用できるようにする**ためです。

**外部キーが防ぐのは、宙に浮いた行です。** `posts.user_id` に存在しないユーザーの id を入れようとすると、データベースが拒否します。

**テーブル定義**

`posts` テーブル

| カラム | 型 | 必須 | 備考 |
|---|---|---|---|
| `id` | text | ○ | 主キー |
| `user_id` | text | ○ | 外部キー（[3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) で追加） |
| `title` | text | ○ | |
| `content` | text | ○ | 本文 |
| `is_public` | integer (boolean) | ○ | **既定値 false** |
| `created_at` | integer | ○ | |
| `updated_at` | integer | ○ | |

`is_public` が true のメモは、ログインしていないユーザーからも閲覧できます。**既定値を false にしているのは、公開が明示的な操作でなければならないためです。** 既定で公開になっていると、意図しない情報が漏れます。

**扱うこと**

- Drizzle のスキーマ定義
- D1 データベースの作成とバインディング
- マイグレーションの生成と適用
- ローカル D1 と本番 D1 の違い
- Drizzle Studio でのデータ確認

**インストール**

```bash
npm i -w apps/api drizzle-orm
npm i -D -w apps/api drizzle-kit
```

> 公式ドキュメントの一部は `drizzle-orm@rc`（v1 系のリリース候補）を案内していますが、この記事では安定版を使います。学習中に RC 特有の問題を踏むのは避けたいためです。

**データベースを作る**

```bash
npx wrangler d1 create memo-app-db
```

作成すると、`wrangler.jsonc` に貼り付けるための設定が出力されます。`database_id` は自分のものに置き換えてください。`migrations_dir` は自分で足します。

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "memo-app-db",
      "database_id": "<出力された ID>",
      "migrations_dir": "drizzle"
    }
  ]
}
```

`binding` の `DB` が、コードから `c.env.DB` として見える名前です。**変更したら [3.5](#35-環境変数とシークレット) の `cf-typegen` を実行し直してください。**

> ローカルだけで進める場合、`wrangler d1 create`（＝ Cloudflare のアカウント）は必須ではありません。`database_id` に仮の文字列を入れておけば、ローカルの D1 は動きます。本番にデプロイする [5章](05_deploy.md)までには作っておいてください。

**スキーマ定義**

`apps/api/src/db/schema.ts` を作ります。

```ts
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})
```

**TypeScript 側はキャメルケース、データベース側はスネークケース**という対応になっています。`text('user_id')` の引数が実際の列名です。

`{ mode: 'boolean' }` と `{ mode: 'timestamp_ms' }` が、SQLite の integer をどう解釈するかの指定です。前者は 0 / 1 を `boolean` として、後者はミリ秒のタイムスタンプを `Date` として扱います。`user_id` の外部キー制約は、ユーザーのテーブルができる [3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) で足します。

**マイグレーションの生成と適用**

`apps/api/drizzle.config.ts` を作ります。

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
```

**スクリプトを足す**

これ以降、データベースの操作を何度も行います。`apps/api/package.json` の `scripts` に登録しておきます。**登録しておけば、どのディレクトリにいてもリポジトリのルートから `-w apps/api` を付けて実行できます。**

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:migrate:remote": "wrangler d1 migrations apply DB --remote",
    "typecheck": "tsc --noEmit"
  }
}
```

`typecheck` も一緒に入れています。[2.10](02_frontend.md#210-oxlint--oxfmt-のセットアップ) でフロント側に入れたものと同じ役割で、[5.2](05_deploy.md#52-github-actions-を構築する) の CI から実行します。

**マイグレーションを作って適用する**

スキーマから SQL を生成します。

```bash
npm run db:generate -w apps/api -- --name init_posts
```

`apps/api/drizzle/0000_init_posts.sql` が生成されます。**`--name` を付けないと `0000_fixed_the_stranger.sql` のようなランダムな名前になります。** 後から履歴を追うときに困るので、付ける習慣を付けてください。

生成された SQL をローカルの D1 に適用します。

```bash
npm run db:migrate:local -w apps/api
```

本番に適用するときは `db:migrate:remote` を使います（[5章](05_deploy.md)）。

**確認**

```bash
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table'" --cwd apps/api
```

`posts` が含まれていれば成功です。

**任意) Drizzle Studio**

ブラウザでテーブルの中身を見られるツールです。ローカルの D1 に繋ぐには、SQLite ドライバと、ファイルの場所を指した設定が要ります。

```bash
npm i -D -w apps/api @libsql/client
```

`apps/api/drizzle-studio.config.ts` を作ります。ローカル D1 のファイル名はハッシュなので、実行時に探す形にしています。

```ts
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'drizzle-kit'

const stateDir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
const file = readdirSync(stateDir).find(
  (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
)

if (file === undefined) {
  throw new Error(
    'ローカルの D1 が見つかりません。先に `npm run db:migrate:local -w apps/api` を実行してください',
  )
}

export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './drizzle',
  dbCredentials: { url: join(stateDir, file) },
})
```

この設定ファイルは `node:fs` と `node:path` を使うので、`apps/api/tsconfig.json` に型定義の指定を足します。

```jsonc
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

**足さないと、`npm run typecheck -w apps/api` だけが `Cannot find name 'node:fs'` で落ちます。** 開発サーバーもテストも動くので気づきにくい箇所です。

`package.json` に `"db:studio": "drizzle-kit studio --config drizzle-studio.config.ts"` を足し、`npm run db:studio -w apps/api` で起動します。

ローカルの D1 に `posts` テーブルが作られ、`wrangler d1 execute` で確認できれば成功です。

**つまずきポイント**

> [!TIP]
> - **SQLite には boolean 型がありません。** `is_public` は integer の 0 / 1 として保存されます。上記の `{ mode: 'boolean' }` がその変換を担当します
> - **`Date` は JSON になるとき ISO 文字列になります。** API のレスポンスでは `"2026-08-20T12:02:29.498Z"` の形で返ります。[6.4](06_api-integration.md#64-hono-rpc-で型安全に呼ぶ) で型を共有すると、フロント側の型も `string` になります
> - ローカルの D1 は本番とは別物です。ローカルで入れたデータは本番には反映されません
> - **SQLite では、後から外部キー制約を足すとテーブルの作り直しになります。** [3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) で `posts.user_id` に制約を足しますが、そのとき既存の行が制約を満たしていないと `FOREIGN KEY constraint failed` でマイグレーションが失敗します。開発中であれば `rm -rf apps/api/.wrangler/state/v3/d1` でローカルのデータベースを消してから適用し直すのが手早いです
> - **D1 はインタラクティブなトランザクションに対応していません。** 複数の書き込みをまとめたい場合はバッチ処理の API を使います

## 3.7 入力バリデーション

クライアントから送られてくるデータが期待した形とは限りません。不正なデータをそのままデータベースに入れると、後続の処理が壊れます。

また、[6.4](06_api-integration.md#64-hono-rpc-で型安全に呼ぶ) で Hono RPC を使う際、**バリデータを通していないとリクエストの型がクライアント側に伝わりません。** RPC の恩恵を受けるためにも必要な工程です。

**扱うこと**

- zod によるスキーマ定義
- Hono のバリデータミドルウェア
- バリデーションエラー時のレスポンス設計
- 「サーバー側のバリデーションは必須」であること（クライアント側のチェックは UX のためのもので、セキュリティ上の防御にはならない）

**インストール**

```bash
npm i -w apps/api zod @hono/zod-validator
```

`@hono/zod-validator` が、Hono と zod をつなぐミドルウェアです。**zod 3 系と 4 系のどちらでも動きます**（このバージョンの `peerDependencies` は `^3.25.0 || ^4.0.0`）。この記事では 4 系を使います。

**使い方**

スキーマを定義し、`zValidator` をハンドラの手前に挟みます。

```ts
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const postInput = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  isPublic: z.boolean().optional(),
})

// 3.3 で作った app に、チェーンで足していきます
const app = new Hono()
  .get('/health', (c) => c.json({ status: 'ok' }))

  .post('/posts', zValidator('json', postInput), async (c) => {
    const input = c.req.valid('json')
    // input は { title: string; content: string; isPublic?: boolean } として型が付く
    return c.json(input, 201)
  })
```

**`const app` を2回書かないでください。** [3.3](#33-最初のエンドポイント-health) で宣言済みなので、そこに `.post(...)` を繋げます。

`zValidator` の第1引数は検証する場所です。`'json'` のほか `'query'`、`'param'`、`'header'`、`'form'` を指定できます。

**`c.req.valid('json')` が、この節のもう一つの目的です。** 検証を通った値が、スキーマから導かれた型付きで取り出せます。`c.req.json()` を直接呼ぶと `any` 相当のままです。

**エラーの形**

検証に失敗すると、既定では 400 と以下のような JSON が返ります。

```json
{
  "success": false,
  "error": {
    "name": "ZodError",
    "message": "[{\"code\":\"too_small\",\"path\":[\"title\"],\"message\":\"Too small: expected string to have >=1 characters\"}]"
  }
}
```

`message` が文字列化された JSON になっている点に注意してください。読みやすい形で返したい場合は、`zValidator` の第3引数にハンドラを渡して自分で整形します。この記事では既定のまま進めます。

不正な形式のリクエストを送って、`HTTP/1.1 400 Bad Request` とエラーの内容が返れば成功です。

```bash
curl -i -X POST http://localhost:8787/posts -H 'Content-Type: application/json' -d '{"title":"","content":"x"}'
```

## 3.8 `posts` の CRUD エンドポイント

作成・取得・更新・削除の一通りを実装します。

**エンドポイント**

| メソッド | パス | 認証 | 内容 |
|---|---|---|---|
| GET | `/posts` | 必須 | 自分のメモ一覧（公開・非公開の両方） |
| POST | `/posts` | 必須 | 作成（`is_public` の既定は false） |
| GET | `/posts/:id` | 任意 | 所有者なら常に取得可。それ以外は `is_public` が true のときのみ |
| PUT | `/posts/:id` | 必須 | 所有者のみ |
| DELETE | `/posts/:id` | 必須 | 所有者のみ |

この節では認証をまだ実装していないため、**まず認証なしで全件を返す形で実装し、[3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) で認証と認可を被せます。**

`posts` テーブルの `user_id` は `NOT NULL` なので、この段階では仮の値を入れておきます。

```ts
// 3.10 で認証を入れるまでの仮の値
const CURRENT_USER_ID = 'local-user'
```

**先に `async` / `await` について**

ここからのコードには `async` と `await` が出てきます。**データベースへの問い合わせは、結果が返るまで時間がかかる**ためです。

```ts
const rows = await db.select().from(posts).all()
```

`await` は「この行の結果が出るまで待ってから、次に進む」という意味です。`await` を書ける関数には `async` を付けます。**`await` を忘れると、データの代わりに「いずれ結果が入る箱」（Promise）がそのまま入り**、`c.json()` に渡しても中身が出てきません。

いまはこれだけ分かれば進めます。仕組みそのものは [6.1](06_api-integration.md#61-async--await-と-promise) で扱います。

**コード**

`apps/api/src/index.ts` に、[3.3](#33-最初のエンドポイント-health) の `/health` に続けて書いていきます。import はこれだけ必要です。

```ts
import { zValidator } from '@hono/zod-validator'
import { desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { z } from 'zod'
import { posts } from './db/schema'
```

```ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
  .get('/health', (c) => c.json({ status: 'ok' }))

  .get('/posts', async (c) => {
    const db = drizzle(c.env.DB)
    const rows = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.updatedAt))
      .all()

    return c.json(rows)
  })

  .post('/posts', zValidator('json', postInput), async (c) => {
    const input = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const now = new Date()

    const row = {
      id: crypto.randomUUID(),
      userId: CURRENT_USER_ID,
      title: input.title,
      content: input.content,
      isPublic: input.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(posts).values(row)
    return c.json(row, 201)
  })

  .get('/posts/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const row = await db
      .select()
      .from(posts)
      .where(eq(posts.id, c.req.param('id')))
      .get()

    if (row === undefined) {
      return c.json({ message: 'Not Found' }, 404)
    }
    return c.json(row)
  })

  .put('/posts/:id', zValidator('json', postInput), async (c) => {
    const input = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const updated = await db
      .update(posts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(posts.id, c.req.param('id')))
      .returning()
      .get()

    if (updated === undefined) {
      return c.json({ message: 'Not Found' }, 404)
    }
    return c.json(updated)
  })

  .delete('/posts/:id', async (c) => {
    const db = drizzle(c.env.DB)

    const deleted = await db
      .delete(posts)
      .where(eq(posts.id, c.req.param('id')))
      .returning()
      .get()

    if (deleted === undefined) {
      return c.json({ message: 'Not Found' }, 404)
    }
    return c.body(null, 204)
  })
```

**読み方**

| 書き方 | 意味 |
|---|---|
| `drizzle(c.env.DB)` | D1 のバインディングから Drizzle のインスタンスを作る。**リクエストごとに作ります** |
| `.get()` | 結果を**1件**取り出す。無ければ `undefined` |
| `.all()` | 結果を**配列**で取り出す |
| `.returning()` | 更新・削除した行そのものを返させる |
| `c.req.param('id')` | URL の `:id` の部分 |

**`.returning().get()` が `undefined` かどうかで 404 を判定しています。** 「存在するか確認してから更新する」という2段階にせず、**更新して何も返らなければ無かった**とみなす形です。この書き方が [3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) の認可でそのまま効いてきます。条件に「所有者であること」を足すだけで、他人のメモへの更新が自然と 404 になります。

**ステータスコードは、作成が 201、削除が 204 です。** 削除は返す本文が無いので `c.body(null, 204)` を使います。

**動作確認**

```bash
# 作成（201 と、作られた行が返る）
curl -i -X POST http://localhost:8787/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"買い物","content":"たまごを買う"}'

# 一覧
curl http://localhost:8787/posts

# 個別（<id> は上で返ってきた id）
curl -i http://localhost:8787/posts/<id>

# 更新
curl -i -X PUT http://localhost:8787/posts/<id> \
  -H 'Content-Type: application/json' \
  -d '{"title":"買い物（更新）","content":"たまごと牛乳"}'

# 削除（204 で本文なし）
curl -i -X DELETE http://localhost:8787/posts/<id>

# 存在しない id は 404
curl -i http://localhost:8787/posts/does-not-exist
```

5つのエンドポイントが期待どおりに動き、存在しない id で 404 が返れば成功です。

**つまずきポイント**

> [!TIP]
> - ルーティングの定義順に注意してください。パラメータを含むパスは、固定のパスより後に定義します
> - 更新時に `updated_at` を更新し忘れがちです

## 3.9 認証・認可の基礎

実装の前に概念を整理します。ここを曖昧にしたまま実装すると、何を作っているのか分からなくなります。

**認証 (Authentication) と認可 (Authorization)**

| | 何を決めるか | 失敗したときの応答 |
|---|---|---|
| **認証** | **誰であるか**を確かめる | 401 Unauthorized |
| **認可** | その人が**何をしてよいか**を決める | 403 Forbidden、または 404 |

「ログインできるか」が認証、「他人のメモを消せるか」が認可です。**2つは別の問題で、実装する場所も違います。** 認証は入り口で一度だけ、認可は操作のたびに判断します。

**ログイン状態をどう覚えるか**

**混同しやすい2つの軸があります。** どちらを選ぶかは別々に決まります。

| 軸 | 選択肢 |
|---|---|
| **サーバーが状態を持つか** | セッションを保存する（消せば即座に無効） / 持たない（JWT のように、トークン自体に情報を入れる） |
| **どうやって運ぶか** | Cookie / `Authorization` ヘッダー |

**この記事は「サーバーに保存したセッションを、`Authorization` ヘッダーで運ぶ」構成です。** Better Auth がセッションを `session` テーブルに保存し、リクエストのたびに照合します。**ログアウトすればサーバー側で無効にできます。**

ヘッダーで運ぶのは、フロントエンドと API を別のドメインにデプロイするためです。Cookie を使うとクロスドメインの設定が増えます。この判断が効いてくるのは [6.2](06_api-integration.md#62-cors) の CORS と [6.6](06_api-integration.md#66-認証情報の受け渡し) です。

送り方はこうなります。

```
Authorization: Bearer <トークン>
```

`Bearer`（持参人）は「このトークンを持っている人を、その本人として扱う」という意味です。**裏を返せば、盗まれた時点で本人になりすませます。** トークンをどこに保存するかが問題になるのはこのためで、[6.6](06_api-integration.md#66-認証情報の受け渡し) で改めて扱います。

**パスワードは元に戻せない形で保存する**

パスワードはそのまま保存しません。**ハッシュ化**という、元に戻せない変換をかけた結果を保存します。

- ログイン時は、送られてきたパスワードを同じ手順で変換し、保存してある値と一致するかを見る
- データベースが漏れても、そこからパスワードは復元できない

**「復元できない」ことが要件です。** 暗号化（鍵があれば戻せる）ではなく、ハッシュ化を使うのはそのためです。加えて、利用者ごとに異なる値（ソルト）を混ぜ、意図的に時間のかかる計算を使います。総当たりを現実的でなくするためです。

**認証を自分で実装しない**

上に書いたことは、認証の入り口にすぎません。実際にはこれだけの要素があります。

- パスワードのハッシュ化と、その手法の選定・更新
- セッションやトークンの発行・失効・有効期限
- 総当たり攻撃への対策
- メールアドレスの確認、パスワードの再設定
- ソーシャルログイン、二要素認証

**どれも「動いているように見えるが安全ではない」状態になりやすい領域です。** しかも間違いはテストで見つかりにくく、漏れたときの被害が大きい。**認証は、実績のあるライブラリに任せるのが定石です。** この記事では [3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) で Better Auth を使います。

一方、**認可は自分で書く必要があります。** 「誰がどのメモを見てよいか」はアプリごとの仕様で、ライブラリが決められないためです。

**このアプリの認可ルール**

```
閲覧できる条件: 所有者である || is_public が true
編集・削除できる条件: 所有者である
```

条件が2つ以上の論理式になった時点で、認可はテストすべき対象になります。[4.2](04_test.md#42-バックエンドのテスト) と [8章](08_e2e.md)で実際に検証します。

## 3.10 Better Auth を導入し、`posts` をユーザーに紐づける

Better Auth は TypeScript 向けの認証ライブラリです。ユーザー登録、ログイン、セッション管理を提供します。

**構成**

- データベースアダプタ: **Drizzle アダプタ**（[3.6](#36-drizzle--d1-で-posts-テーブルを作る) で使った Drizzle のスキーマと統一するため）
- 認証方式: **bearer トークン**（[6章](06_api-integration.md)でクロスオリジンの API 呼び出しを行うため）
- `posts` テーブルに `user_id` を追加し、ユーザーに紐づける

> **Better Auth は 1.5 から Cloudflare D1 を組み込みでサポートしています。** `database: env.DB` と書くだけで済み、アダプタの設定は要りません。それでもこの記事が Drizzle アダプタを選ぶのは、(1) マイグレーションを drizzle-kit の一本に統一できる、(2) [3.11](#311-公開用のエンドポイント) でユーザーのテーブルと `posts` を join するため、どのみち Drizzle 側にユーザーのテーブル定義が必要になる、の2点からです。**Drizzle を使わない構成なら、組み込みの D1 サポートのほうが簡単です。**

**ユーザーの識別子**

Better Auth が生成する内部 ID とは別に、URL で使う識別子を持たせます。

| 項目 | 仕様 |
|---|---|
| ユーザー ID | サインアップ時に**入力させる**。**変更不可** |
| 形式 | 英小文字・数字・ハイフンのみ、長さ制限あり |
| 予約語 | `public`、`posts`、`users`、`api`、`health` などを除外 |
| 表示名 `name` | 別カラムとして持つ。変更可能。日本語も可 |

**変更不可にする理由**は、[7.4](07_features.md#74-ユーザーページ-usersuserid) で `/users/:userId` という URL を公開するためです。変更できると、共有された URL が壊れます。

**予約語の除外は忘れやすい箇所です。** ユーザー ID に `public` を取られると紛らわしい URL が生まれますし、将来 `/:userId` 形式のパスに変更したくなったときにも効いてきます。

**2種類の認証ミドルウェア**

| 種類 | 用途 | 挙動 |
|---|---|---|
| 必須 | `/posts`、`PUT`、`DELETE` など | トークンが無ければ 401 |
| 任意 | `GET /posts/:id` | トークンがあれば誰か分かる。無くても通す |

「任意」が必要なのは、公開メモを未ログインでも閲覧できるようにするためです。ログインしていれば「所有者かどうか」の判定ができ、していなければ `is_public` だけで判定します。

**扱うこと**

- Better Auth のセットアップ
- 認証用テーブルのマイグレーション
- ユーザー ID のバリデーションと重複チェック
- サインアップ・ログインのエンドポイント
- 認証ミドルウェア（必須・任意の2種類）
- `posts` の各エンドポイントに認可を適用する

**認可の確認**

**2人分のユーザーを作らないと、認可は確認できません。** サインアップのレスポンスヘッダー `set-auth-token` に入っているトークンを、それぞれ控えてください（`curl -i` で見えます）。

```bash
ALICE=<alice のトークン>
BOB=<bob のトークン>

# alice が非公開メモを作る（201。返ってきた id を控える）
curl -i -X POST http://localhost:8787/posts \
  -H "Authorization: Bearer $ALICE" \
  -H 'Content-Type: application/json' \
  -d '{"title":"alice の秘密","content":"ひみつ"}'

ID=<上で返ってきた id>

# トークンなし → 401
curl -i http://localhost:8787/posts

# alice 自身 → 200
curl -i http://localhost:8787/posts/$ID -H "Authorization: Bearer $ALICE"

# bob からの取得 → 404（403 ではない）
curl -i http://localhost:8787/posts/$ID -H "Authorization: Bearer $BOB"

# bob からの更新 → 404
curl -i -X PUT http://localhost:8787/posts/$ID \
  -H "Authorization: Bearer $BOB" \
  -H 'Content-Type: application/json' \
  -d '{"title":"乗っ取り","content":"書き換え"}'

# bob からの削除 → 404
curl -i -X DELETE http://localhost:8787/posts/$ID -H "Authorization: Bearer $BOB"

# 未ログインで公開メモを取得 → 200（isPublic: true のメモで試す）
curl -i http://localhost:8787/posts/<公開メモの id>
```

次の4つが確認できれば成功です。

- サインアップとログインができ、トークンが取得できる
- トークンなしで `GET /posts` にアクセスすると 401 が返る
- 他人の非公開メモは取得も更新も削除もできない（**すべて 404**）
- 他人の公開メモは、未ログインでも `GET /posts/:id` で取得できる

**つまずきポイント**

> [!TIP]
> - **他人の非公開メモにアクセスされたときは、403 ではなく 404 を返してください。** 403 は「そこに何かが存在するが権限がない」という情報を漏らします。id を総当たりされたときに、存在する id を特定されます
> - **Cloudflare Workers では、D1 のバインディングがリクエストのコンテキスト経由でしか取れません。** そのため Better Auth のインスタンスをモジュールのトップレベルで作ることができず、リクエストごとに生成する形になります。この点は Node.js 向けのサンプルコードと構成が異なります
> - 認可の実装漏れは、動作確認では気づきにくい種類のバグです。「他人のデータが取れないこと」を明示的に確認してください
> - **`drizzleAdapter` には `schema` を渡してください。** 渡さないと、サインアップ時に `The model "user" was not found in the schema object` というエラーで 500 になります
> - **Better Auth の CLI は、`auth` という名前（またはデフォルト）で export されたインスタンスを探します。** `createAuth` のような関数だけを export していると `Couldn't read your auth config` で止まります。上のコードで CLI 用のインスタンスを別に置いているのはこのためです
> - `BETTER_AUTH_URL`（`baseURL`）を設定しないと、起動のたびに警告が出ます。リダイレクトやコールバックの URL がリクエスト由来になるためで、本番では必ず設定してください
> - **ユーザーのテーブルには `user_id` という列が2つの意味で現れます。** `user.user_id` はこの記事で足した「URL に出るユーザー ID」、`session.user_id` は「`user.id` への外部キー」です。紛らわしいので、コードを読むときは注意してください

**インストール**

```bash
npm i -w apps/api better-auth
```

**設定を書く**

`apps/api/src/auth.ts` を作ります。要点は3つです。

1. 設定（`options`）と、インスタンスを作る関数（`createAuth`）を分ける
2. `createAuth` は `env` を受け取る。**D1 のバインディングはリクエストのコンテキスト経由でしか取れないため、トップレベルでインスタンスを作れません**
3. スキーマ生成の CLI 用に、`auth` という名前のインスタンスも export する

```ts
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import * as schema from './db/auth-schema'

// URL に出るユーザー ID。予約語は将来のパス追加とぶつかるため除外する
const RESERVED_USER_IDS = ['auth', 'api', 'health', 'posts', 'public', 'users']

export const userIdSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9-]+$/, '英小文字・数字・ハイフンのみ使えます')
  .refine((value) => !RESERVED_USER_IDS.includes(value), '予約語は使えません')

const options = {
  basePath: '/auth',
  emailAndPassword: { enabled: true },
  plugins: [bearer()],
  user: {
    additionalFields: {
      userId: { type: 'string', required: true, input: true, unique: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user: Record<string, unknown>) => {
          const result = userIdSchema.safeParse(user.userId)
          if (!result.success) {
            throw new APIError('BAD_REQUEST', {
              message: result.error.issues[0].message,
            })
          }
        },
      },
    },
  },
} satisfies BetterAuthOptions

export const createAuth = (env: CloudflareBindings) =>
  betterAuth({
    ...options,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: 'sqlite',
      schema,
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
  })

// Better Auth CLI がスキーマ生成のために読み込む定義。リクエスト処理には使いません
export const auth = betterAuth({
  ...options,
  database: drizzleAdapter(drizzle({} as D1Database, { schema }), {
    provider: 'sqlite',
    schema,
  }),
})
```

`user.additionalFields` が、ユーザーのテーブルに独自カラムを足す指定です。`input: true` でサインアップ時に受け取れるようになり、`unique: true` で一意制約が付きます。**表示名 `name` は Better Auth が最初から持っているので、追加は不要です。**

ユーザー ID の検証は `databaseHooks.user.create.before` で行います。ここで `APIError` を投げると、サインアップが 400 で止まります。

**作成時だけでなく、更新も塞ぐ必要があります。** `input: true` は「利用者が値を入れられる」という指定で、**サインアップ時だけでなく更新時にも効きます。** そのままにすると、`POST /auth/update-user` から `userId` を変えられます。表示名 `name` は変更できてよいので、`userId` だけを拒否します。

```ts
databaseHooks: {
  user: {
    create: { /* 上のとおり */ },

    // userId は URL に出るため変更させない。
    // input: true は更新時の入力も許可するので、ここで塞がないと
    // /auth/update-user から予約語や不正な形式に変えられてしまう
    update: {
      before: async (user: Record<string, unknown>) => {
        if ('userId' in user) {
          throw new APIError('BAD_REQUEST', {
            message: 'ユーザー ID は変更できません',
          })
        }
      },
    },
  },
},
```

**これを入れないと、[7.4](07_features.md#74-ユーザーページ-usersuserid) で公開する `/users/:userId` の URL が壊れます。** さらに、更新の経路には作成時の検証（予約語の除外、英小文字のみ）が効かないため、`public` や `Akira` のような値にも変えられてしまいます。

**テーブルを作る**

Better Auth の CLI で、Drizzle のスキーマを生成します。

```bash
cd apps/api
npx auth@latest generate --output src/db/auth-schema.ts -y
cd ../..
```

**このコマンドは `auth.ts` を読み込んで動きます。** 上の `auth.ts` は `./db/auth-schema` を import しているので、**生成前は import 先が存在せず、CLI が設定を読めません。** 先に空のファイルを作っておいてください（生成時に上書きされます）。

```bash
touch apps/api/src/db/auth-schema.ts
```

`user` / `session` / `account` / `verification` の4テーブルが生成されます。**このファイルは生成物なので、手で編集しないでください。** カラムを足したいときは `auth.ts` の `additionalFields` を書き換えて生成し直します。

生成したスキーマを drizzle-kit に認識させます。`drizzle.config.ts` の `schema` を配列にしてください。

```ts
schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
```

`posts` から `user` への外部キーも張ります。

```ts
import { user } from './auth-schema'

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // 以下は 3.6 と同じ
})
```

マイグレーションを生成して適用します。

```bash
npm run db:generate -w apps/api -- --name add_auth_tables
npm run db:migrate:local -w apps/api
```

**エンドポイントを生やす**

Hono に Better Auth のハンドラを繋ぎます。`basePath` に合わせたパスに、GET と POST をまとめて流します。

```ts
const app = new Hono<Env>().on(['GET', 'POST'], '/auth/*', (c) =>
  createAuth(c.env).handler(c.req.raw),
)
```

これだけで、サインアップ・ログイン・ログアウトなどのエンドポイントが生えます。

```bash
# サインアップ
curl -i -X POST http://localhost:8787/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@example.com","password":"password1234","name":"あきら","userId":"akira"}'

# ログイン
curl -i -X POST http://localhost:8787/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@example.com","password":"password1234"}'
```

**トークンは、レスポンスの `set-auth-token` ヘッダーに入って返ってきます。**

```
access-control-expose-headers: set-auth-token
set-auth-token: g9wZeE98ovAkM2LSq7lkfJ9mfBmAPF6K.E2VrIGBZVz0zYtYsAGwlQRzud00ZsZFBVcIbSr9DelQ=
```

これを `Authorization: Bearer <トークン>` として送ると、リクエストの持ち主が分かるようになります。`access-control-expose-headers` が一緒に付いているのは、クロスオリジンではブラウザの JavaScript から読めるヘッダーが制限されるためです（[6.2](06_api-integration.md#62-cors) で扱います）。

**認証ミドルウェア**

セッションは `auth.api.getSession()` にリクエストのヘッダーを渡して取得します。

```ts
const getUser = async (c: { env: CloudflareBindings; req: { raw: Request } }) => {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (session === null) return null

  const { id, name, userId } = session.user as AuthUser
  return { id, name, userId }
}

// 認証必須。トークンが無ければ 401
const requireAuth = createMiddleware<Env>(async (c, next) => {
  const authUser = await getUser(c)
  if (authUser === null) {
    return c.json({ message: 'Unauthorized' }, 401)
  }
  c.set('user', authUser)
  await next()
})

// 任意認証。トークンがあれば誰か分かる。無くても通す
const optionalAuth = createMiddleware<Env>(async (c, next) => {
  c.set('user', await getUser(c))
  await next()
})
```

`Env` は Hono の型引数で、`Bindings`（`c.env` の型）と `Variables`（`c.set` / `c.get` の型）を持ちます。

```ts
type AuthUser = { id: string; userId: string; name: string }
type Env = {
  Bindings: CloudflareBindings
  Variables: { user: AuthUser | null }
}
```

**認可を適用する**

[3.8](#38-posts-の-crud-エンドポイント) で書いた `posts` のエンドポイントに、ミドルウェアと所有者の条件を足します。import が2つ増えます。

```ts
import { and, desc, eq } from 'drizzle-orm'   // and を追加
import { createMiddleware } from 'hono/factory'
```


```ts
.get('/posts', requireAuth, async (c) => {
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, c.get('user')!.id))   // 自分のものだけ
    .all()
  return c.json(rows)
})

.put('/posts/:id', requireAuth, zValidator('json', postInput), async (c) => {
  const updated = await db
    .update(posts)
    .set({ ...c.req.valid('json'), updatedAt: new Date() })
    .where(
      and(eq(posts.id, c.req.param('id')), eq(posts.userId, c.get('user')!.id)),
    )
    .returning()
    .get()

  if (updated === undefined) {
    return c.json({ message: 'Not Found' }, 404)   // 他人のメモもここに落ちる
  }
  return c.json(updated)
})
```

**「所有者かどうか」を `where` の条件に混ぜているのがポイントです。** 他人のメモを更新しようとすると該当行が0件になり、そのまま 404 になります。「取得してから所有者を比較して 403 を返す」という書き方をしないので、**403 と 404 を書き分けるミスがそもそも起きません。**

削除も同じ形です。**ここを直し忘れると、他人のメモを削除できるままになります。**

```ts
.delete('/posts/:id', requireAuth, async (c) => {
  const deleted = await db
    .delete(posts)
    .where(
      and(eq(posts.id, c.req.param('id')), eq(posts.userId, c.get('user')!.id)),
    )
    .returning()
    .get()

  if (deleted === undefined) {
    return c.json({ message: 'Not Found' }, 404)
  }
  return c.body(null, 204)
})
```

作成は、**[3.8](#38-posts-の-crud-エンドポイント) で置いた仮の値をログイン中のユーザーに差し替えます。**

```ts
.post('/posts', requireAuth, zValidator('json', postInput), async (c) => {
  const row = {
    id: crypto.randomUUID(),
    userId: c.get('user')!.id,   // CURRENT_USER_ID から差し替える
    // 以下は 3.8 と同じ
  }
  // ...
})
```

**`CURRENT_USER_ID` の定義は削除してください。** 残したまま使うと、`user` テーブルに存在しない id を入れることになり、外部キー制約で失敗します。

閲覧だけは条件が違います（所有者 || 公開）。

```ts
.get('/posts/:id', optionalAuth, async (c) => {
  const row = await db.select().from(posts).where(eq(posts.id, c.req.param('id'))).get()

  const authUser = c.get('user')
  if (row === undefined || (row.userId !== authUser?.id && row.isPublic === false)) {
    return c.json({ message: 'Not Found' }, 404)
  }
  return c.json(row)
})
```

## 3.11 公開用のエンドポイント

[7章](07_features.md)で作る公開ページのための API です。いずれも認証は不要です。

**エンドポイント**

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/public/posts` | 全体公開されているメモの一覧 |
| GET | `/users/:userId/posts` | そのユーザーが公開しているメモの一覧 |

**全体の公開一覧**

```ts
.get('/public/posts', async (c) => {
  const db = drizzle(c.env.DB)
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      updatedAt: posts.updatedAt,
      author: { userId: user.userId, name: user.name },
    })
    .from(posts)
    .innerJoin(user, eq(posts.userId, user.id))
    .where(eq(posts.isPublic, true))
    .orderBy(desc(posts.updatedAt))
    .limit(50)
    .all()

  return c.json(rows)
})
```

**`select()` に返す列を1つずつ書いているのが、この節でいちばん重要な点です。** [3.8](#38-posts-の-crud-エンドポイント) では `select()` を引数なしで呼び、`posts` の全列を返していました。ここで同じことをすると、`innerJoin` した `user` テーブルの中身、つまり**メールアドレスや認証に関わる情報まで、誰でも読める API から返ってしまいます。**

`author: { userId: user.userId, name: user.name }` のように書くと、レスポンスの中で入れ子のオブジェクトになります。

```json
[
  {
    "id": "...",
    "title": "公開する日記",
    "content": "みんなに見せる",
    "updatedAt": "2026-08-20T12:02:29.498Z",
    "author": { "userId": "akira", "name": "あきら" }
  }
]
```

**`limit(50)` を付けているのは、このエンドポイントが誰でも叩けるためです。** 件数が増えたときに全件返すと、データベースにも回線にも負荷がかかります。本来はページネーション（続きを取得する仕組み）を用意しますが、この記事では扱わないので上限だけ設けています。

**ユーザーごとの公開一覧**

```ts
.get('/users/:userId/posts', async (c) => {
  const db = drizzle(c.env.DB)
  const author = await db
    .select({ userId: user.userId, name: user.name, id: user.id })
    .from(user)
    .where(eq(user.userId, c.req.param('userId')))
    .get()

  if (author === undefined) {
    return c.json({ message: 'Not Found' }, 404)
  }

  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(and(eq(posts.userId, author.id), eq(posts.isPublic, true)))
    .orderBy(desc(posts.updatedAt))
    .limit(50)
    .all()

  return c.json({
    author: { userId: author.userId, name: author.name },
    posts: rows,
  })
})
```

**ユーザーを先に引いているのは、2つの id を突き合わせるためです。** URL に出てくる `:userId` は[3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) で読者が決めるユーザー ID（`akira` など）で、`posts.user_id` が指しているのは Better Auth が発行した内部の id です。**まず `user` テーブルから内部の id を引き、それで `posts` を絞ります。**

ユーザーが存在しなければ 404 を返します。**メモが0件のユーザーと、存在しないユーザーは別物です。** 前者は空の一覧、後者は 404 です。

**確認**

[3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) で取得したトークンを使って、公開メモを1件作ってから確認します。

```bash
TOKEN=<サインアップで返ってきたトークン>

# 公開メモを作る
curl -i -X POST http://localhost:8787/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"公開する日記","content":"みんなに見せる","isPublic":true}'

# 非公開メモも作っておく（一覧に出ないことの確認用）
curl -i -X POST http://localhost:8787/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"秘密のメモ","content":"ひみつ"}'

# 認証なしで公開一覧（200。公開メモだけが投稿者名付きで返る）
curl -i http://localhost:8787/public/posts

# ユーザーごとの公開一覧（200）
curl -i http://localhost:8787/users/akira/posts

# 存在しないユーザー（404）
curl -i http://localhost:8787/users/no-such-user/posts
```

次の3つが確認できれば成功です。

- 認証なしで `/public/posts` を叩くと、公開メモだけが投稿者名付きで返る
- 非公開メモ（`秘密のメモ`）が1件も含まれていない
- 存在しないユーザー ID では 404 になる

**つまずきポイント**

> [!TIP]
> - **join したときに、ユーザーテーブルの余計な情報（メールアドレス、パスワードハッシュなど）を返さないよう注意してください。** 必要なカラムだけを明示的に選択します。これは実際に起きやすい情報漏洩の形です
> - 公開一覧は誰でも叩けるため、件数を制限しないと負荷の原因になります

**次の章**: [4 テストを書く](04_test.md)
