# 3 Hono でバックエンドを作る

この章では API だけを作ります。[2章](02_frontend.md)で作ったフロントエンドとは、まだ接続しません。

## 3.1 Cloudflare アカウント作成 / `wrangler login`

このチュートリアルでは、バックエンドを Cloudflare Workers 上で動かし、データベースに Cloudflare D1 を使います。`wrangler` は Cloudflare が提供する CLI で、ローカル開発とデプロイの両方に使います。

アカウントを作成します。メールアドレスとパスワードだけで登録でき、確認メールのリンクを踏めば完了です。

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

参考: https://developers.cloudflare.com/workers/platform/pricing/ / https://developers.cloudflare.com/d1/platform/pricing/

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
> - **生成された `apps/api/package.json` には `"private": true` が入っていません。** [2.1](02_frontend.md#21-リポジトリと-workspace-を作る) で説明した理由から、手で追加してください
> - 生成された `apps/api/.gitignore` は、ルートの `.gitignore` と内容が重複します。どちらかに寄せて構いませんが、**ルート側の記述は残してください**
> - **`npm install` で `install-scripts` の警告が出ることがあります。** npm 12 以降は、インストール時に実行されるスクリプトを既定でブロックします（[1.4](01_setup.md#14-safe-chain) のサプライチェーン攻撃への対策の一種です）。`npm install-scripts ls` でブロックされたパッケージを確認できます。この記事の構成では、ブロックされたままでも `wrangler dev` もビルドも動きます

## 3.3 最初のエンドポイント `/health`

サーバーが生きているかを確認するためのエンドポイントです。実運用でも監視や死活監視に使われます。ここでは Hono のルーティングの書き方を覚えるのが目的です。

**扱うこと**

- `app.get()` によるルーティング
- レスポンスの返し方（`c.json()`、`c.text()`）
- ステータスコードの指定

`/health` にアクセスして JSON が返れば成功です。

**つまずきポイント**

> [!TIP]
> - **ルーティングはメソッドチェーンで書いてください。** [6.3](06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) で Hono RPC を使う際、型がハンドラの定義から導出されます。`app.get(...)` と `app.post(...)` を別々の文として書くと型が繋がりません
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

**扱うこと**

- ブラウザで開けるのは GET だけであること
- `curl` の基本（`-X`、`-H`、`-d`、`-i`、`-v`）
- HTTP のメソッドとステータスコードの意味

`curl` で `/health` を叩き、ステータスコードとレスポンスボディを確認できれば成功です。

## 3.5 環境変数とシークレット

API キーやデータベースの接続情報をコードに直接書くと、リポジトリに公開されてしまいます。環境ごとに値を切り替える仕組みも必要です。

**扱うこと**

- ローカル開発用の `.dev.vars`
- 本番用の `wrangler secret put`
- 「環境変数」と「シークレット」の違い
- Workers では `process.env` ではなく、リクエストのコンテキスト経由で環境変数にアクセスすること
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
  DB: D1Database
  CORS_ORIGIN: "http://localhost:5173"
  BETTER_AUTH_URL: "http://localhost:8787"
  BETTER_AUTH_SECRET: string
}
```

`vars` の値は**リテラル型**（値そのものが型になる）、`.dev.vars` のキーは `string` 型になります。前者は「`wrangler.jsonc` に書いたその値しか入らない」という意味の型なので、本番で別の値を入れる前提のものを厳密に比較するようなコードを書くと、意図しない型エラーになることがあります。

`.dev.vars` に書いた値が、ローカルで動かした API から読めれば成功です。

**つまずきポイント**

> [!TIP]
> - **`.dev.vars` は絶対にコミットしないでください。** [2.1](02_frontend.md#21-リポジトリと-workspace-を作る) で `.gitignore` に追加済みですが、`git status` で確認する習慣を付けてください
> - **Cloudflare Workers では `process.env` が使えません。** Node.js の常識が通用しない箇所です
> - **`wrangler.jsonc` を変更したら `cf-typegen` を実行し直してください。** [3.6](#36-drizzle--d1-で-posts-テーブルを作る) で D1 のバインディングを足したときに `c.env.DB` が型エラーになりますが、原因はこれです
> - 生成された `worker-configuration.d.ts` はコミットして構いません。ただし手で編集しても次の生成で消えます
> - 誤ってコミットしてしまった場合、履歴から消しても流出したものとして扱い、値をローテーションしてください

## 3.6 Drizzle + D1 で `posts` テーブルを作る

Drizzle は TypeScript で書ける ORM です。スキーマを TypeScript のコードとして定義し、そこからマイグレーションと型を生成します。D1 は Cloudflare が提供する SQLite ベースのデータベースです。

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

スキーマから SQL を生成します。`apps/api` で実行してください。

```bash
npx drizzle-kit generate --name init_posts
```

`drizzle/0000_init_posts.sql` が生成されます。**`--name` を付けないと `0000_fixed_the_stranger.sql` のようなランダムな名前になります。** 後から履歴を追うときに困るので、付ける習慣を付けてください。

生成された SQL をローカルの D1 に適用します。

```bash
npx wrangler d1 migrations apply DB --local
```

本番に適用するときは `--local` を `--remote` に変えます（[5章](05_deploy.md)）。

**確認**

```bash
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table'"
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

export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './drizzle',
  dbCredentials: { url: join(stateDir, file!) },
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

`npx drizzle-kit studio --config drizzle-studio.config.ts` で起動します。

ローカルの D1 に `posts` テーブルが作られ、`wrangler d1 execute` で確認できれば成功です。

**つまずきポイント**

> [!TIP]
> - **SQLite には boolean 型がありません。** `is_public` は integer の 0 / 1 として保存されます。上記の `{ mode: 'boolean' }` がその変換を担当します
> - **`Date` は JSON になるとき ISO 文字列になります。** API のレスポンスでは `"2026-08-20T12:02:29.498Z"` の形で返ります。[6.3](06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) で型を共有すると、フロント側の型も `string` になります
> - ローカルの D1 は本番とは別物です。ローカルで入れたデータは本番には反映されません
> - **SQLite では、後から外部キー制約を足すとテーブルの作り直しになります。** [3.10](#310-better-auth-を導入しposts-をユーザーに紐づける) で `posts.user_id` に制約を足しますが、そのとき既存の行が制約を満たしていないと `FOREIGN KEY constraint failed` でマイグレーションが失敗します。開発中であれば `rm -rf apps/api/.wrangler/state/v3/d1` でローカルのデータベースを消してから適用し直すのが手早いです
> - **D1 はインタラクティブなトランザクションに対応していません。** 複数の書き込みをまとめたい場合はバッチ処理の API を使います

## 3.7 入力バリデーション

クライアントから送られてくるデータが期待した形とは限りません。不正なデータをそのままデータベースに入れると、後続の処理が壊れます。

また、[6.3](06_api-integration.md#63-hono-rpc-で型安全に呼ぶ) で Hono RPC を使う際、**バリデータを通していないとリクエストの型がクライアント側に伝わりません。** RPC の恩恵を受けるためにも必要な工程です。

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

const app = new Hono().post('/posts', zValidator('json', postInput), async (c) => {
  const input = c.req.valid('json')
  // input は { title: string; content: string; isPublic?: boolean } として型が付く
})
```

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

不正な形式のリクエストを送って、400 とエラー内容が返れば成功です。

```bash
curl -X POST http://localhost:8787/posts -H 'Content-Type: application/json' -d '{"title":"","content":"x"}'
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

**扱うこと**

- Drizzle によるクエリの書き方
- 存在しない id を指定されたときの 404
- ステータスコードの選び方（201、204 など）
- エラーハンドリングの共通化

`curl` で5つのエンドポイントをすべて叩き、期待どおりに動けば成功です。

**つまずきポイント**

> [!TIP]
> - ルーティングの定義順に注意してください。パラメータを含むパスは、固定のパスより後に定義します
> - 更新時に `updated_at` を更新し忘れがちです

## 3.9 認証・認可の基礎

実装の前に概念を整理します。ここを曖昧にしたまま実装すると、何を作っているのか分からなくなります。

**扱うこと**

- **認証 (Authentication)**: 誰であるかを確かめること
- **認可 (Authorization)**: 何をしてよいかを決めること
- セッションベースとトークンベースの違い
- Cookie と `Authorization` ヘッダー
- パスワードをハッシュ化して保存する理由
- なぜ認証を自前で実装すべきでないのか

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
| 形式 | 英数字とハイフンのみ、長さ制限あり |
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

次の4つが確認できれば成功です。

- サインアップとログインができ、トークンが取得できる
- トークンなしで `GET /posts` にアクセスすると 401 が返る
- 他人の非公開メモは取得も更新も削除もできない
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

**テーブルを作る**

Better Auth の CLI で、Drizzle のスキーマを生成します。

```bash
cd apps/api
npx auth@latest generate --output src/db/auth-schema.ts -y
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
npx drizzle-kit generate --name add_auth_tables
npx wrangler d1 migrations apply DB --local
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

これを `Authorization: Bearer <トークン>` として送ると、リクエストの持ち主が分かるようになります。`access-control-expose-headers` が一緒に付いているのは、クロスオリジンではブラウザの JavaScript から読めるヘッダーが制限されるためです（[6.1](06_api-integration.md#61-cors) で扱います）。

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

[3.8](#38-posts-の-crud-エンドポイント) で書いた `posts` のエンドポイントに、ミドルウェアと所有者の条件を足します。

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

**扱うこと**

- `is_public` が true のものだけを返すクエリ
- `posts` とユーザーテーブルの join（投稿者の表示名を返すため）
- 存在しない `userId` を指定されたときの 404
- ページネーション（またはその必要性の説明）

次の2つが確認できれば成功です。

- 認証なしで `/public/posts` を叩くと、公開メモだけが投稿者名付きで返る
- 非公開メモが1件も含まれていない

**つまずきポイント**

> [!TIP]
> - **join したときに、ユーザーテーブルの余計な情報（メールアドレス、パスワードハッシュなど）を返さないよう注意してください。** 必要なカラムだけを明示的に選択します。これは実際に起きやすい情報漏洩の形です
> - 公開一覧は誰でも叩けるため、件数を制限しないと負荷の原因になります

---

---

**この章のコード**: `chapter-03` ブランチ
