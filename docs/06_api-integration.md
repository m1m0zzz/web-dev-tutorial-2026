# 6 フロントから API を呼ぶ

ここで[2章](02_frontend.md)と[3章](03_backend.md)の成果物を接続します。**この章ではページを増やしません。** [2章](02_frontend.md)で作った画面を、そのまま API に繋ぐことに専念します。

この章を終えると、「認証付きの、自分専用のメモアプリ」として一度完成します。

## 6.1 `async` / `await` と Promise

ネットワーク通信は、結果が返ってくるまで時間がかかります。JavaScript ではこれを Promise という仕組みで扱い、`async` / `await` で読みやすく書きます。[2.2](02_frontend.md#22-モダン-javascript-の前提知識) で扱わなかったのは、実際に使う場面がここまで無かったためです。

**同期と非同期**

これまで書いてきたコードは、上から順に1行ずつ実行されていました（同期処理）。ネットワーク通信は違います。**リクエストを送ってから結果が返るまで、数十ミリ秒から数秒かかります。** その間ずっと止まっていると、画面は固まったままになります。

そこで JavaScript は、**「今すぐには結果がないが、いずれ結果が入るもの」**を返します。これが **Promise** です。

**Promise の3つの状態**

| 状態 | 意味 |
|---|---|
| pending | まだ結果が出ていない |
| fulfilled | 成功して値が入った |
| rejected | 失敗した |

pending から始まり、いずれ fulfilled か rejected のどちらかになります。**一度決まると、もう変わりません。**

**`async` / `await`**

`await` は、**Promise が決着するまでその行で待ち、中身の値を取り出す**書き方です。

```ts
const res = await fetch('http://localhost:8787/health')
const data = await res.json()
console.log(data)   // { status: 'ok' }
```

`await` を書けるのは `async` を付けた関数の中だけです。

```ts
const load = async () => {
  const res = await fetch('http://localhost:8787/posts')
  const posts = await res.json()
  return posts
}
```

**`async` を付けた関数は、必ず Promise を返します。** 上の `load()` は「メモの配列」ではなく「メモの配列を返す Promise」を返します。呼ぶ側もまた `await` する必要があります。

`await` を書き忘れると、値の代わりに Promise がそのまま入ります。`console.log` に `Promise { <pending> }` と出たら、たいていこれです。

**エラー処理**

失敗（rejected）は例外として投げられるので、`try` / `catch` で受けます。

```ts
try {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return await res.json()
} catch (e) {
  console.error(e)
}
```

**`fetch` は、404 や 500 が返ってきても失敗しません。** 通信そのものは成功しているためです。`catch` に入るのは、ネットワークが繋がらなかったときや URL が不正なときです。**ステータスコードの確認は `res.ok`（200番台かどうか）で自分で行います。** ここは間違えやすい箇所です。

## 6.2 CORS

フロントエンドとバックエンドは別のドメインにデプロイされています。ブラウザは、あるオリジンから別のオリジンへのリクエストを既定で制限します。この制限を明示的に緩める設定が CORS です。

**オリジンとは、スキーム・ホスト・ポートの3つ組です。** 1つでも違えば別のオリジンになります。

| | オリジン |
|---|---|
| フロント | `http://localhost:5173` |
| API | `http://localhost:8787` |

**同じ `localhost` でも、ポートが違うので別オリジンです。** ブラウザは既定で、あるオリジンのページから別オリジンへのリクエストの**結果を読ませません**（同一オリジンポリシー）。悪意のあるページが、ログイン済みの別サイトのデータを勝手に読めてしまうのを防ぐためです。

**API 側が「このオリジンからは読んでよい」と返すことで、初めて許可されます。** これが CORS で、**許可を出すのはサーバー側**です。フロント側で回避することはできません。

**単純ではないリクエストには、事前確認が入ります。** JSON を POST する、`Authorization` ヘッダーを付ける、といった場合、ブラウザは本番のリクエストの前に `OPTIONS` メソッドで「このメソッドとヘッダーを使ってよいか」を尋ねます（プリフライトリクエスト）。**`allowMethods` と `allowHeaders` は、この問い合わせへの答えです。** ここに書き漏らすと、本番のリクエストが送られる前に失敗します。

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

設定できたかは [6.3](#63-素の-fetch-で呼ぶ) で実際に呼んでから確認します。**確認するのはブラウザの開発者ツールです。** Network タブに `OPTIONS` と本番のリクエストが並び、どちらも成功していて、Console に CORS のエラーが出ていなければ成功です。

**つまずきポイント**

> [!TIP]
> - **CORS はブラウザの制限です。** `curl` では成功するのにブラウザでは失敗する、という現象はここが原因です
> - `Access-Control-Allow-Origin: *` は手軽ですが、本番では使わないでください。許可するオリジンを明示します
> - ローカル開発時のオリジン（`http://localhost:5173`）と本番のオリジンは異なります。両方を許可する設定が必要です

## 6.3 素の fetch で呼ぶ

まず最小の形で接続します。この段階では、キャッシュもローディング状態の管理も自前で書くことになります。**この不便さを体感しておくことが、[6.5](#65-react-query-に載せる) で React Query を導入する動機になります。**

> [!IMPORTANT]
> **自分のメモ（`GET /posts`）は、まだ取得できません。** [3.10](03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) で認証を必須にしたため、トークンを送らないと 401 が返ります。トークンを送れるようにするのは [6.6](#66-認証情報の受け渡し) です。
>
> **この節では、認証の要らない `GET /public/posts`（[3.11](03_backend.md#311-公開用のエンドポイント)）で `fetch` の形を確認します。** 表示するデータが無ければ、[3.11](03_backend.md#311-公開用のエンドポイント) の `curl` で公開メモを1件作っておいてください。

```tsx
const [posts, setPosts] = useState<PublicPost[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  // useEffect のコールバックに直接 async は付けられないので、中で定義して呼ぶ
  const load = async () => {
    try {
      const res = await fetch('http://localhost:8787/public/posts')
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }
      setPosts(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  load()
}, [])

if (loading) return <p>読み込み中...</p>
if (error !== null) return <p>{error}</p>
```

**状態が3つに増えたことに注目してください。** データそのもの (`posts`) に加えて、**読み込み中かどうか (`loading`)** と **失敗したかどうか (`error`)** を自分で管理することになります。API を呼ぶたびに、この3つ組を書くことになります。

書き込みも形は同じです。**`res.ok` の確認を忘れないでください。**

```tsx
const addPost = async (values: { title: string; content: string }) => {
  const res = await fetch('http://localhost:8787/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)   // 401 の本文を追加してしまわないように
  }
  const created = await res.json()
  setPosts((prev) => [...prev, created])
}
```

**`fetch` の第2引数で、メソッド・ヘッダー・ボディを指定します。** [3.4](03_backend.md#34-ブラウザと-curl-から叩く) で `curl` に付けた `-X` / `-H` / `-d` と同じものです。ボディは文字列にする必要があるので `JSON.stringify` を通します。

**このコードは、認証が無いのでまだ 401 になります。** それでも `res.ok` を確認していれば、**エラーのレスポンスをメモとして画面に並べてしまう**ことは防げます。

公開メモの一覧が表示され、ブラウザの開発者ツールの Console に CORS のエラーが出ていなければ成功です（[6.2](#62-cors)）。

**この書き方の問題**

動きはしますが、次の節に進む前に、何が不便かを見ておきます。

- **同じデータを複数の場所で使うと、それぞれが個別にリクエストを送ります。** 一覧ページと詳細ページで同じ `posts` が必要なら、2回取りに行くことになります
- **サーバーの状態と手元の配列が、ずれる余地があります。** 上の `addPost` は、サーバーが返した値を手元にも足すことで整合させています。1箇所でも忘れると表示が古くなります
- **同じ3つ組（データ・loading・error）を、呼び出しのたびに書くことになります**
- 型が付きません。`res.json()` の戻り値は `any` で、`Post[]` だと保証するものは何もありません

**この4つを解決するのが、[6.4](#64-hono-rpc-で型安全に呼ぶ) と [6.5](#65-react-query-に載せる) です。**

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
- 同じ workspace 内にある `apps/api` の型を、`tsconfig` の `paths` で参照する
- `hc` クライアントの生成
- 型が効いていることの確認（存在しないパスを叩くと型エラーになる）

エディタ上で API のパスとリクエストボディが補完されれば成功です。バックエンドのスキーマを変更すると、フロント側で型エラーが出ます。

**つまずきポイント**

> [!TIP]
> - **`import type` を使ってください。** 通常の `import` で書くと、バックエンドの実装コードがフロントエンドのバンドルに含まれてしまいます
> - **[3.3](03_backend.md#33-最初のエンドポイント-health) で触れた通り、ルーティングをメソッドチェーンで書いていないと型が導出されません**
> - **[3.7](03_backend.md#37-入力バリデーション) のバリデータを通していないと、リクエストボディの型が付きません**
> - ルート数が増えると型推論が重くなり、エディタの補完が遅くなることがあります

**API 側で型を公開する**

`apps/api/src/index.ts` の末尾に1行足します。

```ts
export default app
export type AppType = typeof app   // これを追加
```

`typeof app` は、**メソッドチェーンで組み立てたルーティングの形そのもの**です。パスもリクエストの型もレスポンスの型も、ここに入っています。

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

export const client = hc<AppType>(API_URL)
```

**認証ヘッダーは [6.6](#66-認証情報の受け渡し) で足します。** ここではまだ付けません。

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

[6.3](#63-素の-fetch-で呼ぶ) で自前で書いたローディング管理、エラー処理、キャッシュを、ライブラリに任せます。

**インストールと設定**

```bash
npm i -w apps/web @tanstack/react-query
```

アプリ全体を `QueryClientProvider` で囲みます。`apps/web/src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 404 や 401 は「取得し直せば直る」ものではないので、既定の自動リトライを止める。
      // 付けたままだと、見つからないメモの画面が数秒間「読み込み中…」で止まる
      retry: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

**`QueryClientProvider` で囲まないと、`useQuery` は「QueryClient が見つからない」というエラーで落ちます。**

React Query は、失敗したクエリを既定で3回まで自動的に再試行します。このアプリでクエリが失敗する主な原因は 404（存在しない・権限がない）と 401（未ログイン）で、**どちらも再試行しても結果は変わりません。** [7.2](07_features.md#72-未ログインでも見られるページの土台を作る) で作る「非公開メモに未ログインでアクセスしたときの画面」が、リトライを待つ数秒間ずっと「読み込み中…」のままになるのを防げます。

**データ取得と更新を hook にまとめる**

`apps/web/src/hooks/usePosts.ts` を作ります。**API を呼ぶ場所をここに集めると、ページ側は「どのデータが欲しいか」だけを書けばよくなります。**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '../lib/api'

export const postsKey = ['posts'] as const

export const usePosts = () =>
  useQuery({
    queryKey: postsKey,
    queryFn: async () => {
      const res = await client.posts.$get()
      if (!res.ok) throw new Error('メモの取得に失敗しました')
      return await res.json()
    },
  })

export const usePost = (id: string) =>
  useQuery({
    queryKey: [...postsKey, id],
    queryFn: async () => {
      const res = await client.posts[':id'].$get({ param: { id } })
      if (!res.ok) throw new Error('メモが見つかりませんでした')
      return await res.json()
    },
  })

export const useCreatePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      const res = await client.posts.$post({ json: input })
      if (!res.ok) throw new Error('メモの作成に失敗しました')
      return await res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postsKey }),
  })
}
```

更新と削除も同じ形です（`useUpdatePost` / `useDeletePost`）。**`onSuccess` の `invalidateQueries` が、この節でいちばん重要な行です。**

**`useQuery` は「読む」、`useMutation` は「書く」**という役割分担です。

| | `useQuery` | `useMutation` |
|---|---|---|
| いつ動くか | 画面に出た時点で自動 | 呼び出したとき（`mutate` / `mutateAsync`） |
| 返すもの | `data` / `isPending` / `isError` | 実行する関数と、その状態 |

**`queryKey` は、そのデータの住所です。** `invalidateQueries({ queryKey: postsKey })` は「この住所のデータは古くなった」と伝えるもので、**その住所を見ている画面が自動で取り直します。** メモを追加したあとに一覧が更新されるのは、`useCreatePost` の `onSuccess` がこれを呼んでいるからです。**これを書き忘れると、追加したのに一覧が変わりません。**

**ページ側の変更**

`App` が `posts` の状態を持つ必要はなくなります。各ページが必要な hook を直接呼びます。

```tsx
// 変更前: App から Props で受け取っていた
export function PostListPage({ posts, onAdd, onDelete }: Props) {

// 変更後: 自分で取りに行く
export function PostListPage() {
  const { data: posts, isPending, isError } = usePosts()
  const createPost = useCreatePost()
  const deletePost = useDeletePost()
```

**`App.tsx` から `useState<Post[]>`、`addPost`、`updatePost`、`deletePost` を削除してください。** サーバーが持っているデータを、ブラウザ側でも二重に管理する必要がなくなります。

[6.3](#63-素の-fetch-で呼ぶ) と同じ動作のまま、コードから手書きのローディング管理が消えていれば成功です。

このアプリでクエリが失敗する主な原因は 404（存在しない・権限がない）と 401（未ログイン）で、どちらも再試行しても結果は変わりません。[7.2](07_features.md#72-未ログインでも見られるページの土台を作る) で作る「非公開メモに未ログインでアクセスしたときの画面」が、リトライを待つ数秒間ずっと「読み込み中…」のままになるのを防げます。

**つまずきポイント**

> [!TIP]
> - クエリキーの設計が重要です。キーが同じなら同じキャッシュを参照します
> - 更新後にキャッシュを無効化しないと、画面が古いままになります
> - **「リクエストが1回にまとまる」とは限りません。** 同時に走る同じクエリは1本にまとめられますが、既定ではデータはすぐ古い (stale) 扱いになり、別の画面を開いたときやウィンドウに戻ったときに取り直されます。頻度を抑えたい場合は `staleTime` を設定します
> - **401 になったときにログイン画面へ飛ばす共通処理は、この記事では作っていません。** トークンが失効すると「メモの取得に失敗しました」と表示されるだけで、ログイン画面には戻りません。実務では `QueryCache` のエラーハンドラなどで一箇所にまとめます

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

**トークンを保存して、リクエストに付ける**

[6.4](#64-hono-rpc-で型安全に呼ぶ) で作った `apps/web/src/lib/api.ts` に、認証ヘッダーを足します。

```diff
+export const TOKEN_KEY = 'memo-app-token'
+
-export const client = hc<AppType>(API_URL)
+export const client = hc<AppType>(API_URL, {
+  // オブジェクトで渡すと生成時の値で固定されるため、関数で渡す
+  headers: (): Record<string, string> => {
+    const token = localStorage.getItem(TOKEN_KEY)
+    return token === null ? {} : { Authorization: `Bearer ${token}` }
+  },
+})
```

**`headers` を関数にしているのが要点です。** オブジェクトで渡すと、`client` を作った瞬間の値（＝まだログインしていないので空）が固定され、ログインしてもヘッダーが付きません。**関数なら、リクエストのたびに呼ばれます。**

**サインアップとログイン**

Better Auth のエンドポイントは `/auth/*` にワイルドカードで登録しているため、[6.4](#64-hono-rpc-で型安全に呼ぶ) の RPC の型には乗りません。ここは素の `fetch` で書きます。`apps/web/src/lib/auth.ts` を新しく作ります。

```ts
import { TOKEN_KEY } from './api'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export type SessionUser = {
  id: string
  name: string
  userId: string
  email: string
}

const authFetch = async (path: string, body: unknown) => {
  const res = await fetch(`${API_URL}/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    // エラーのレスポンスは、本文が空のこともある
    const body = await res.text()
    const message = body === '' ? `エラーが発生しました (${res.status})` : body
    throw new Error(message)
  }

  // bearer プラグインは、このヘッダーにトークンを載せて返す
  const token = res.headers.get('set-auth-token')
  if (token !== null) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  return (await res.json()) as { user: SessionUser }
}

export const signUp = (input: {
  email: string
  password: string
  name: string
  userId: string
}) => authFetch('/sign-up/email', input)

export const signIn = (input: { email: string; password: string }) =>
  authFetch('/sign-in/email', input)

export const signOut = () => {
  const token = localStorage.getItem(TOKEN_KEY)

  // 画面は即座に切り替えたいので、手元のトークンを先に消す
  localStorage.removeItem(TOKEN_KEY)
  if (token === null) return

  // サーバー側のセッションも無効にする。
  // これを呼ばないと、漏れたトークンが有効期限まで使えてしまう。
  // 失敗しても手元は消えているので、結果は待たない
  void fetch(`${API_URL}/auth/sign-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
}
```

**手元のトークンを消すだけでは足りません。** それだけだと**サーバー側のセッションが有効期限まで生き続ける**ので、そのトークンが他人の手に渡っていた場合、ログアウトしても使われ続けます。`/auth/sign-out` を呼んで無効にします。

**結果を待たない (`void`) のは、画面の切り替えを止めないためです。** 通信が失敗しても手元のトークンは既に消えているので、その端末からは操作できません。

**トークンは `set-auth-token` レスポンスヘッダーで返ってきます**（[3.10](03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) で確認したものです）。サインアップとログインで処理が同じなので、1つの関数にまとめています。

**ログイン状態を知る**

保存したトークンが有効かどうかは、サーバーに聞きます。

```ts
export const getSession = async (): Promise<SessionUser | null> => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token === null) return null

  const res = await fetch(`${API_URL}/auth/get-session`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null

  const session = (await res.json()) as { user: SessionUser } | null
  return session?.user ?? null
}
```

これを React Query に載せると、**アプリのどこからでも同じログイン状態を参照できます。**

```ts
export const sessionKey = ['session'] as const

export const useSession = () =>
  useQuery({
    queryKey: sessionKey,
    queryFn: getSession,
    staleTime: 60_000,
  })
```

**ログイン画面**

`apps/web/src/pages/LoginPage.tsx` を作ります。

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { signIn } from '../lib/auth'
import { sessionKey } from '../hooks/useSession'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await signIn({ email, password })
      await queryClient.invalidateQueries({ queryKey: sessionKey })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました')
    }
  }

  return (
    <main>
      <h1>ログイン</h1>
      <form className="post-form" onSubmit={handleSubmit}>
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error !== null && <p role="alert">{error}</p>}

        <button type="submit">ログイン</button>
      </form>
      <p>
        アカウントがない場合は <Link to="/signup">新規登録</Link>
      </p>
    </main>
  )
}
```

**`e.preventDefault()` を忘れないでください。** `<form>` の既定の動作はページ全体の再読み込みで、これが走ると入力も状態もすべて失われます。

**`invalidateQueries({ queryKey: sessionKey })` が、ログイン直後に効きます。** トークンを保存しただけでは、`useSession()` は前の結果（未ログイン）を持ったままです。**「セッションの情報が古くなった」と伝えて取り直させます。**

`<label htmlFor="email">` と `<input id="email">` を対応させているのは、**テストがこの対応を使って入力欄を探すため**でもあります（[8章](08_e2e.md)の `getByLabel`）。

**サインアップ画面**

`apps/web/src/pages/SignUpPage.tsx` も同じ形です。入力欄が4つ（メールアドレス、パスワード、表示名、ユーザー ID）になり、`signIn` の代わりに `signUp` を呼びます。

**ユーザー ID の入力欄には、あとから変更できないことを明記してください**（[3.10](03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける)）。公開ページの URL に使われます。

**ルートを足す**

`App.tsx` に2つのルートを足します。

```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/signup" element={<SignUpPage />} />
```

**未ログインのときにメモ一覧へ来たらログイン画面へ送る**処理は、[7.2](07_features.md#72-未ログインでも見られるページの土台を作る) の `RequireAuth` で入れます。この章では、`useSession()` の結果が `null` なら `<Navigate to="/login" replace />` を返す、という単純な形で構いません。

**ログアウト**

```ts
export const useSignOut = () => {
  const queryClient = useQueryClient()

  return () => {
    clearToken()
    queryClient.setQueryData(sessionKey, null)
    queryClient.removeQueries({ queryKey: postsKey })
  }
}
```

**トークンを消すだけでは画面が切り替わりません。** 表示中のコンポーネントは `useSession()` の結果を見ているので、そこに「ログアウトした」ことを伝える必要があります。詳しくは下のつまずきポイントを見てください。

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

**Vite の環境変数**

Vite は、`VITE_` で始まる環境変数だけを `import.meta.env` 経由でコードに渡します。

```ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'
```

`??` を付けているので、**設定しなければローカルの API を指します。** 開発中は何もしなくて構いません。

ローカルで別の値を使いたい場合は、`apps/web/.env.local` に書きます。このファイルは Git に入れません（[1.8](01_setup.md#18-リポジトリと-workspace-を作る) の `.gitignore` に `.env` 系が入っています）。

```
VITE_API_URL=http://localhost:8787
```

**本番の値は、GitHub の Variables に登録します。** [5.2](05_deploy.md#52-github-actions-を構築する) のワークフローが、ビルドのステップでこれを読みます。

```yaml
      - run: npm run build -w apps/web
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
```

リポジトリの Settings → Secrets and variables → Actions → **Variables** タブで登録します。

| 名前 | 値 |
|---|---|
| `VITE_API_URL` | デプロイした API のオリジン（`https://memo-app-api.<サブドメイン>.workers.dev`） |

**末尾にスラッシュを付けないでください。** `https://memo-app-api.<サブドメイン>.workers.dev/` と登録すると、`apps/web/src/lib/auth.ts` が組み立てる URL が `https://...//auth/sign-in/email` と二重スラッシュになり、**ログイン・サインアップ・ログアウトだけが 404 になります。**

**登録しただけでは反映されません。** 値が埋め込まれるのはビルド時なので、**フロントを再デプロイする必要があります。** `apps/web` を変更して push するか、Actions の画面から `Deploy Web` を再実行してください。

**API 側の設定**

**ここまで `wrangler.jsonc` の `vars` はローカルの値でした。** 本番では別の値にしたいので、`env.production` という環境を足します。

| キー | 本番の値 |
|---|---|
| `CORS_ORIGIN` | **本番フロントエンド**の URL |
| `BETTER_AUTH_URL` | **本番 API 自身**の URL |

**この2つは別のものです。** 前者は「どこからのリクエストを許すか」、後者は「自分自身がどの URL で公開されているか」です。

```jsonc
{
  // トップレベルはローカル用。npm run dev と E2E がこれを使う
  "vars": {
    "CORS_ORIGIN": "http://localhost:5173",
    "BETTER_AUTH_URL": "http://localhost:8787",
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "memo-app-db",
      // 本番の ID は env.production へ移す
      "database_id": "local",
      "migrations_dir": "drizzle",
    },
  ],

  "env": {
    "production": {
      "name": "memo-app-api",
      "vars": {
        "CORS_ORIGIN": "https://memo-app-web.<サブドメイン>.workers.dev",
        "BETTER_AUTH_URL": "https://memo-app-api.<サブドメイン>.workers.dev",
      },
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "memo-app-db",
          "database_id": "<3.6 で作ったもの>",
          "migrations_dir": "drizzle",
        },
      ],
    },
  },
}
```

**`name` と `d1_databases` を環境の中にもう一度書いているのは、書き忘れを防ぐためではなく、書かないと消えるからです。** `vars` や各種バインディングは**環境に継承されません**。`d1_databases` を書き忘れると `wrangler` が警告を出し、本番の Worker から D1 が消えます。

`name` はさらに厄介で、**書かないと Worker 名が `memo-app-api-production` になります**（環境名が末尾に付く仕様です）。名前が変われば `workers.dev` の URL も変わるので、必ず書いてください。

**トップレベルの `database_id` は仮の値に戻してください。** [3.6](03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) で貼り付けた本物の ID は `env.production` へ移します。本番の値を1箇所に集めるためですが、**もう1つ、事故を防ぐ効果があります。**

```
$ npx wrangler d1 execute DB --remote --command "SELECT 1" --cwd apps/api
✘ [ERROR] Invalid property: databaseId => Invalid uuid [code: 7400]
```

**`--env production` を付け忘れたコマンドが、本番のデータベースに届かなくなります。** 本物の ID を残しておくと、付け忘れたコマンドが黙って本番に当たります。**仮の値が壁になります。**

`apps/api/package.json` のスクリプトにも `--env production` を足してください。

```json
"db:migrate:remote": "wrangler d1 migrations apply DB --remote --env production"
```

**`database_id` を変えると、ローカルの D1 の保存先も変わります。** miniflare はこの値ごとに別のファイルを使うため、**それまで手元に入れていたデータは見えなくなります。** `npm run db:migrate:local -w apps/api` でテーブルを作り直してください。

デプロイするときに `--env production` を付けると、この環境の値が使われます。`.github/workflows/deploy-api.yml` の2箇所を直してください。

```yaml
          command: d1 migrations apply DB --remote --env production
```

```yaml
          command: deploy --minify --env production
```

書き換えたら型を生成し直します。

```bash
npm run cf-typegen -w apps/api
```

**`vars` の型が、環境をまたいだ union になります。** [3.5](03_backend.md#35-環境変数とシークレット) で見たリテラル型が、`"https://memo-app-web..." | "http://localhost:5173"` の形になり、「どちらかの値が入る」という意味になります。

**CORS と `trustedOrigins` の両方に効くことを確認してください。** どちらか片方だけ直すと、**CORS は通るのに Better Auth が 403 を返し、本文が `Invalid origin` になる**という分かりにくい状態になります（[3.10](03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) の `trustedOrigins` は `CORS_ORIGIN` を見ているので、この記事の構成では1箇所で済みます）。

デプロイした本番環境で、サインアップ・ログイン・メモの CRUD が一通り動けば成功です。

**この章を終える前に**

**[4.1](04_test.md#41-フロントエンドのテスト) で書いたテストは、そのままでは通りません。** `App` が React Query と認証に依存するようになったためです（`QueryClientProvider` が無い、ログイン画面に飛ぶ）。

**`App.test.tsx` は削除し、`PostForm` と `PostList` のような、API に依存しないコンポーネント単位のテストに置き換えてください。** 完成形は `chapter-06` にあります。**5章のデプロイのワークフローはテストを実行してからデプロイするので、ここを直さないと本番に反映されません。**

```bash
npm test -w apps/web
npm test -w apps/api
```

**つまずきポイント**

> [!TIP]
> - **デプロイのコマンドに `--env production` を付け忘れると、本番にローカルの値が入ります。** `wrangler deploy` は環境を指定しないとトップレベルの `vars` を使うので、`CORS_ORIGIN` が `http://localhost:5173` のまま上書きされます。エラーにはならず、**ブラウザからのリクエストが全部 CORS で弾かれる**形で出ます
> - **`VITE_API_URL` と `CORS_ORIGIN` には、末尾のスラッシュを付けないでください。** `VITE_API_URL` は Hono RPC 経由の呼び出しだけが URL を正規化するため、**「メモの一覧は出るのにログインできない」**という切り分けにくい壊れ方をします。`CORS_ORIGIN` のほうは、ブラウザが送る `Origin` ヘッダーに末尾スラッシュが付かないので一致せず、`Access-Control-Allow-Origin` が返らなくなります。`BETTER_AUTH_URL` も揃えてください
> - **`VITE_` 接頭辞の環境変数は、ビルド成果物に平文で埋め込まれます。** ブラウザの開発者ツールから読めるので、シークレットを入れてはいけません。API の URL のような公開情報のみを入れます
> - 本番のフロントエンドの URL を CORS の許可リストに追加し忘れると、ローカルでは動くのに本番で動かない状態になります

**次の章**: [7 機能を拡張する](07_features.md)
