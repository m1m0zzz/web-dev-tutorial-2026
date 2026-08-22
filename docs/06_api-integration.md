# 6 フロントから API を呼ぶ

ここで[2章](02_frontend.md)と[3章](03_backend.md)の成果物を接続します。**この章ではページを増やしません。** [2章](02_frontend.md)で作った画面を、そのまま API に繋ぐことに専念します。

この章を終えると、「認証付きの、自分専用のメモアプリ」として一度完成します。

## 6.1 `async` / `await` と Promise

ネットワーク通信は、結果が返ってくるまで時間がかかります。JavaScript ではこれを Promise という仕組みで扱い、`async` / `await` で読みやすく書きます。[2.2](02_frontend.md#22-モダン-javascript-の前提知識) で扱わなかったのは、実際に使う場面がここまで無かったためです。

**扱うこと**

- 同期処理と非同期処理
- Promise の3つの状態
- `async` 関数と `await`
- `try` / `catch` によるエラー処理

## 6.2 CORS

フロントエンドとバックエンドは別のドメインにデプロイされています。ブラウザは、あるオリジンから別のオリジンへのリクエストを既定で制限します。この制限を明示的に緩める設定が CORS です。

**扱うこと**

- 同一オリジンポリシーとは何か、なぜ存在するのか
- オリジンの定義（スキーム + ホスト + ポート）
- プリフライトリクエスト
- Hono の CORS ミドルウェア
- 許可するオリジンを環境変数で切り替える
- `Authorization` ヘッダーを許可する設定

**実装**

Hono の CORS ミドルウェアを、すべてのルートの手前に置きます。許可するオリジンは [3.5](03_backend.md#35-環境変数とシークレット) で用意した環境変数から読みます。

```ts
import { cors } from 'hono/cors'

const app = new Hono<Env>()
  // フロントは別オリジンにデプロイするため、明示的に許可する
  .use('*', (c, next) =>
    cors({
      origin: c.env.CORS_ORIGIN,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['set-auth-token'],
      credentials: true,
    })(c, next),
  )
```

`cors()` を直接 `use` に渡さず、`(c, next) => cors({...})(c, next)` と包んでいるのは、**`c.env` がリクエストのコンテキスト経由でしか取れないため**です（[3.5](03_backend.md#35-環境変数とシークレット)）。設定を組み立てるのもリクエストごとになります。

`exposeHeaders` に `set-auth-token` を入れるのを忘れないでください。**クロスオリジンでは、ブラウザの JavaScript から読めるレスポンスヘッダーが既定で制限されており、明示しないとトークンを取り出せません。**

**Better Auth 側にも設定が要ります**

CORS を通しただけでは、まだサインアップもログインもできません。Better Auth は、リクエストの `Origin` が自分の `baseURL` と異なる場合、**`Invalid origin` として 403 で弾きます。** フロントのオリジンを信頼する設定を足します。

```ts
betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  // 登録しないと、ブラウザからのサインアップ・ログインが "Invalid origin" で失敗する
  trustedOrigins: [env.CORS_ORIGIN],
  // ...
})
```

**`curl` では再現しません。** `curl` は `Origin` ヘッダーを送らないためです。ブラウザから初めて叩いたときに気づく種類の設定です。

ブラウザの開発者ツールに CORS エラーが出ない状態で、フロントから API を呼べれば成功です。

**つまずきポイント**

> [!TIP]
> - **CORS はブラウザの制限です。** `curl` では成功するのにブラウザでは失敗する、という現象はここが原因です
> - `Access-Control-Allow-Origin: *` は手軽ですが、本番では使わないでください。許可するオリジンを明示します
> - ローカル開発時のオリジン（`http://localhost:5173`）と本番のオリジンは異なります。両方を許可する設定が必要です

## 6.3 素の fetch で呼ぶ

まず最小の形で接続します。この段階では、キャッシュもローディング状態の管理も自前で書くことになります。**この不便さを体感しておくことが、[6.5](#65-react-query-に載せる) で React Query を導入する動機になります。**

**扱うこと**

- `fetch` の基本
- `useEffect` の中で非同期処理を行う
- ローディング状態とエラー状態を自前で管理する
- [2章](02_frontend.md)で作った「メモリ上の配列」を API 呼び出しに置き換える

ページをリロードしてもデータが消えず、API から取得したメモが表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - `useEffect` のコールバック関数に直接 `async` を付けることはできません。中で非同期関数を定義して呼びます
> - 同じデータを複数のコンポーネントで使うと、それぞれが個別にリクエストを送ります
> - コンポーネントがアンマウントされたあとに `setState` が呼ばれると警告が出ます
> - 型が付きません。`fetch` の戻り値は `any` 相当で、レスポンスの形を手で書くことになります → [6.4](#64-hono-rpc-で型安全に呼ぶ) で解決します

## 6.4 Hono RPC で型安全に呼ぶ

バックエンドのハンドラの定義から、クライアント側の型を自動的に導出します。API のパスやリクエストの形を変更したとき、フロント側の型エラーとして検出できるようになります。

**扱うこと**

- バックエンドから `AppType` を型としてエクスポートする
- `apps/web` から `apps/api` を workspace の依存として参照する
- `hc` クライアントの生成
- 型が効いていることの確認（存在しないパスを叩くと型エラーになる）

エディタ上で API のパスとリクエストボディが補完されれば成功です。バックエンドのスキーマを変更すると、フロント側で型エラーが出ます。

**つまずきポイント**

> [!TIP]
> - **`import type` を使ってください。** 通常の `import` で書くと、バックエンドの実装コードがフロントエンドのバンドルに含まれてしまいます
> - **[3.3](03_backend.md#33-最初のエンドポイント-health) で触れた通り、ルーティングをメソッドチェーンで書いていないと型が導出されません**
> - **[3.7](03_backend.md#37-入力バリデーション) のバリデータを通していないと、リクエストボディの型が付きません**
> - ルート数が増えると型推論が重くなり、エディタの補完が遅くなることがあります

**workspace をまたいで型を参照する**

必要なのは `tsconfig` の `paths` だけです。**project references もビルド手順の追加も要りません。**

`apps/web/tsconfig.app.json` に追記します。

```jsonc
{
  "compilerOptions": {
    "paths": {
      "api": ["../api/src/index.ts"]
    }
  },
  "include": ["src", "../api/worker-configuration.d.ts"]
}
```

`include` に `worker-configuration.d.ts` を足しているのは、`apps/api` のコードが `CloudflareBindings`（[3.5](03_backend.md#35-環境変数とシークレット) で生成した型）をグローバルに参照しているためです。これが無いと、フロント側で型解決に失敗します。

**Vite の設定は変更不要です。** 型だけを `import type` で読むので、バンドラはこの import を見る前に消してしまいます。

**クライアントを作る**

`apps/web` に `hono` を入れます（`hono/client` を使うため）。

```bash
npm i -w apps/web hono
```

`apps/web/src/lib/api.ts`:

```ts
import { hc } from 'hono/client'
import type { AppType } from 'api'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export const TOKEN_KEY = 'memo-app-token'

export const client = hc<AppType>(API_URL, {
  // オブジェクトで渡すと生成時の値で固定されるため、関数で渡す
  headers: (): Record<string, string> => {
    const token = localStorage.getItem(TOKEN_KEY)
    return token === null ? {} : { Authorization: `Bearer ${token}` }
  },
})
```

呼び出しは、パスがそのままプロパティになります。

```ts
await client.posts.$get()
await client.posts.$post({ json: { title, content } })
await client.posts[':id'].$put({ param: { id }, json: { title, content } })
await client.posts[':id'].$delete({ param: { id } })
await client.users[':userId'].posts.$get({ param: { userId } })
```

**レスポンスの型を再利用する**

`InferResponseType` で、API のレスポンスから型を取り出せます。フロント側で `Post` 型を手書きする必要がなくなります。

```ts
import type { InferResponseType } from 'hono/client'
import type { client } from './lib/api'

export type Post = InferResponseType<typeof client.posts.$get>[number]
```

**この型の `createdAt` は `Date` ではなく `string` です。** [3.6](03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) で触れた通り、JSON になる過程で ISO 文字列に変わるからです。**型がその事実を正しく伝えている**ことが、RPC の分かりやすい利点です。

エディタ上で API のパスとリクエストボディが補完されれば成功です。存在しないパス（`client.nosuchpath`）を書くと型エラーになります。

**追加のつまずきポイント**

> [!TIP]
> - **Better Auth のエンドポイント（`/auth/*`）は RPC の型に乗りません。** ワイルドカードで登録しているためです。サインアップ・ログインは素の `fetch` で呼びます（[6.6](#66-認証情報の受け渡し)）

## 6.5 React Query に載せる

[6.3](#63-素の-fetch-で呼ぶ) で自前で書いたローディング管理、エラー処理、重複リクエストの排除を、ライブラリに任せます。加えて、401 が返ったときの処理を一箇所にまとめられます。

**扱うこと**

- `useQuery` によるデータ取得
- `useMutation` による更新
- キャッシュと再取得のタイミング
- 更新後にキャッシュを無効化する
- 401 が返ったときにログイン画面へ遷移させる共通処理

[6.3](#63-素の-fetch-で呼ぶ) と同じ動作のまま、コードから手書きのローディング管理が消えていれば成功です。同じデータを複数のコンポーネントで使っても、リクエストは1回にまとまります。

**自動リトライを止める**

React Query は、失敗したクエリを既定で3回まで自動的に再試行します。**このアプリでは切ってください。**

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 404 や 401 は「取得し直せば直る」ものではないので、既定の自動リトライを止める。
      // 付けたままだと、見つからないメモの画面が数秒間「読み込み中…」で止まる
      retry: false,
    },
  },
})
```

このアプリでクエリが失敗する主な原因は 404（存在しない・権限がない）と 401（未ログイン）で、どちらも再試行しても結果は変わりません。[7.2](07_features.md#72-未ログインでも見られるページの土台を作る) で作る「非公開メモに未ログインでアクセスしたときの画面」が、リトライを待つ数秒間ずっと「読み込み中…」のままになるのを防げます。

**つまずきポイント**

> [!TIP]
> - クエリキーの設計が重要です。キーが同じなら同じキャッシュを参照します
> - 更新後にキャッシュを無効化しないと、画面が古いままになります

## 6.6 認証情報の受け渡し

[3.10](03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) で実装した認証を、フロントエンドから使えるようにします。

**構成**

- トークンは **localStorage** に保存する
- リクエストの `Authorization: Bearer <token>` ヘッダーに付与する

**扱うこと**

- サインアップ画面（メールアドレス、パスワード、**ユーザー ID**、**表示名**）
- ログイン画面
- ログイン時にトークンを保存する
- `hc` クライアントにヘッダーを付与する
- ログアウト時にトークンを削除する
- 未ログイン時のリダイレクト

ログインすると自分のメモだけが表示され、ログアウトするとログイン画面に戻れば成功です。リロードしてもログイン状態が維持されることも確認してください。

**つまずきポイント**

> [!TIP]
> - **`hc` の `headers` は関数で渡してください。** オブジェクトで渡すと、クライアントを生成した時点の値で固定され、ログイン直後にトークンが反映されません
> - **ログアウトで `queryClient.clear()` だけを呼ぶと、画面が切り替わりません。** トークンは消えるのに、表示中のページはログイン済みのままになります。`clear()` は購読先の query ごと消すだけで、**購読している `useSession()` に「変わった」ことが伝わらない**ためです。セッションを明示的に書き換えてから、残したくないキャッシュを消してください
>
>   ```ts
>   clearToken()
>   queryClient.setQueryData(sessionKey, null) // ここで再描画が起きる
>   queryClient.removeQueries({ queryKey: postsKey })
>   ```
> - **エラーレスポンスの本文は、空のことがあります。** `await res.json()` を無条件に呼ぶと、画面に出るのが `Unexpected end of JSON input` という無関係なエラーになり、本当の原因（サーバーが 500 を返していること）が見えなくなります。`await res.text()` で受けて、空ならステータスコードを表示してください
>
>   ```ts
>   if (!res.ok) {
>     const body = await res.text()
>     throw new Error(body === '' ? `エラーが発生しました (${res.status})` : body)
>   }
>   ```
> - トークンが失効したときの挙動を決めておかないと、401 が返り続けて画面が固まります
> - ユーザー ID は変更不可なので、サインアップ画面でその旨を明示してください

### localStorage に保存することのリスク

**localStorage に保存したトークンは、JavaScript から読み取れます。** つまり、XSS の脆弱性が1つでもあれば、トークンは盗まれます。

HttpOnly 属性を付けた Cookie であれば JavaScript からは読めないため、この点では安全です。今回 localStorage を選んだのは、クロスオリジンの Cookie に伴う制約（`SameSite=None; Secure` の要求、ブラウザのトラッキング防止機能の影響）を避け、構成を単純に保つためです。

**学習用の構成としては妥当ですが、実務でこれを選ぶ場合は以下がセットで必要です。**

- XSS 対策の徹底（React は既定でエスケープするが、`dangerouslySetInnerHTML` などの抜け道がある）
- 依存パッケージの管理（[1.4](01_setup.md#14-サプライチェーン攻撃の対策) のサプライチェーン攻撃の話がここに繋がります。侵害されたパッケージが1つ入るだけで、localStorage の中身は外部に送信されます）
- トークンの有効期限を短くする設計

「トークンをどこに置くか」に絶対的な正解はなく、それぞれにトレードオフがあります。この記事の構成が唯一の選択肢ではないことは理解しておいてください。

## 6.7 環境変数を追加して再デプロイ

フロントエンドから API を呼ぶには、API の URL を知っている必要があります。ローカルと本番で異なるため、環境変数で切り替えます。

**扱うこと**

- Vite の環境変数（`VITE_` 接頭辞と `import.meta.env`）
- ローカル用の `.env.local` と本番用の設定
- GitHub Actions のビルド時に環境変数を渡す
- CORS の許可オリジンに本番のフロントエンドの URL を追加する

デプロイした本番環境で、サインアップ・ログイン・メモの CRUD が一通り動けば成功です。

**つまずきポイント**

> [!TIP]
> - **`VITE_` 接頭辞の環境変数は、ビルド成果物に平文で埋め込まれます。** ブラウザの開発者ツールから読めるので、シークレットを入れてはいけません。API の URL のような公開情報のみを入れます
> - 本番のフロントエンドの URL を CORS の許可リストに追加し忘れると、ローカルでは動くのに本番で動かない状態になります
