# 7 機能を拡張する

[6章](06_api-integration.md)までで、自分専用のメモアプリが動いています。ここに公開機能を追加します。

## 7.1 公開・非公開の切り替え

[3.6](03_backend.md#36-drizzle--d1-で-posts-テーブルを作る) で `is_public` カラムを作りましたが、まだ UI から操作できません。個別ページに切り替えの UI を追加します。

**切り替えの UI**

`PostDetailPage` の編集フォーム（`PostEditor`）に、現在の状態と切り替えボタンを足します。

```tsx
const handleTogglePublic = async () => {
  const nextIsPublic = !post.isPublic
  if (
    nextIsPublic &&
    !window.confirm(
      'このメモを公開します。公開メモの一覧に載り、ログインしていない人でも読めるようになります。',
    )
  ) {
    return
  }

  await updatePost.mutateAsync({
    id: post.id,
    title,
    content,
    isPublic: nextIsPublic,
  })
}
```

```tsx
<p>
  状態: {post.isPublic ? '公開中' : '非公開'}{' '}
  <button onClick={handleTogglePublic}>
    {post.isPublic ? '非公開にする' : '公開する'}
  </button>
</p>
```

**確認を挟むのは「公開する」ときだけです。** 非公開に戻すのは安全側への操作なので、そのまま実行します。**危険な方向にだけ確認を置く**という考え方です。

**更新は [6.5](06_api-integration.md#65-react-query-に載せる) で作った `useUpdatePost` を使いますが、無効化するキャッシュを増やす必要があります。**

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: postsKey })
  // 公開状態やタイトルの変更は、公開一覧とユーザーページにも影響する。
  // ここを忘れると、非公開に戻したメモが /public に残って見える
  queryClient.invalidateQueries({ queryKey: publicPostsKey })
  queryClient.invalidateQueries({ queryKey: ['user-posts'] })
},
```

**`['user-posts']` だけを渡しているのは、前方一致で消せるからです。** ユーザーごとのキーは `['user-posts', userId]` なので、この指定でどのユーザーのぶんも対象になります。

`publicPostsKey` と `userPostsKey` は [7.3](#73-公開一覧ページ-public) と [7.4](#74-ユーザーページ-usersuserid) で作るので、そちらを先に読んでも構いません。

**共有用の URL**

公開中のときだけ、URL をコピーできるようにします。

```tsx
const [copied, setCopied] = useState(false)

const shareUrl = `${window.location.origin}/posts/${post.id}`

const handleCopy = async () => {
  await navigator.clipboard.writeText(shareUrl)
  setCopied(true)
}
```

**`window.location.origin` を使うと、ローカルと本番で自動的に切り替わります。** ただし**開発中にコピーされるのは `http://localhost:5173/...` で、他人の端末からは開けません。** 実際に共有できるのは、デプロイした環境でコピーした URL です。

```tsx
{post.isPublic && (
  <p className="share">
    <input readOnly value={shareUrl} aria-label="共有 URL" />
    <button onClick={handleCopy}>URL をコピー</button>
    {copied && <span>コピーしました</span>}
  </p>
)}
```

**一覧での表示**

`PostItem` にバッジを足し、一覧を見ただけで公開状態が分かるようにします。

```tsx
<span className={post.isPublic ? 'badge is-public' : 'badge'}>
  {post.isPublic ? '公開中' : '非公開'}
</span>
```

**公開したことを忘れる、という事故を防ぐための表示です。** 切り替えの UI が個別ページにしかないと、一覧を見ても状態が分かりません。

**CSS**

この節で増えたクラスに、`apps/web/src/index.css` でスタイルを当てます。

```css
.post-item a {
  margin-right: auto;
}

.badge {
  padding: 2px 8px;
  border: 1px solid #d0d7de;
  border-radius: 999px;
  color: #59636e;
  font-size: 12px;
}

.badge.is-public {
  border-color: #1f883d;
  color: #1f883d;
}

.post-content {
  white-space: pre-wrap;
}

.share {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share input {
  flex: 1;
}
```

**`white-space: pre-wrap` は、本文の改行を保つ指定です。** これが無いと、`<p>` の中の改行が普通の空白として詰められ、書いたとおりに表示されません（[2.8](02_frontend.md#28-css-基礎)）。

個別ページで公開に切り替えると、一覧にも公開中であることが表示されれば成功です。リロードしても状態が維持されることも確認してください。

**つまずきポイント**

> [!TIP]
> - **公開に切り替えるのは、意図しないと起きない操作にしてください。** 確認を挟むか、公開状態を明確に表示するかのどちらかは必要です
> - 更新後にキャッシュを無効化しないと、一覧の表示が古いままになります

## 7.2 未ログインでも見られるページの土台を作る

[6.6](06_api-integration.md#66-認証情報の受け渡し) の時点で、`/login` と `/signup` だけは未ログインでも開けるようになっています。**ここでやるのは、「メモを見せるページ」を未ログインでも開けるようにすることです。** `/posts/:id` を認証必須の外へ出し、公開ページ用のルートを足します。

**共通のヘッダーを `Layout` にまとめる**

どのページにも同じヘッダーを出したいので、`apps/web/src/components/Layout.tsx` を作ります。ヘッダーの中身は、ログインしているかどうかで変わります。

```tsx
import { Link, Outlet } from 'react-router'
import { useSession, useSignOut } from '../hooks/useSession'

function Header() {
  const { data: user, isPending } = useSession()
  const signOut = useSignOut()

  if (isPending) return null

  return (
    <header className="app-header">
      <Link to="/public">公開メモ</Link>

      {user === null || user === undefined ? (
        <Link to="/login">ログイン</Link>
      ) : (
        <>
          <Link to="/">自分のメモ</Link>
          <span>{user.name}</span>
          <button onClick={signOut}>ログアウト</button>
        </>
      )}
    </header>
  )
}

// Outlet には、このレイアウトの中に入るページが描画される
export function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
```

**`<Outlet />` は「ここに子のルートを描画する」という目印です。** React Router では `<Route>` を入れ子にでき、外側の `element` が `<Outlet />` を置いた場所に、内側のページが入ります。共通の見た目を1か所に書いて、ページごとに繰り返さずに済ませるための仕組みです。

**ルートを2種類に分ける**

`App.tsx` を、認証が必要なページとそうでないページに分けます。**ログインを必須にする判定も、同じ入れ子の仕組みに載せます。** [6.6](06_api-integration.md#66-認証情報の受け渡し) で書いた「未ログインならログイン画面へ送る」処理を、`<Outlet />` を返すコンポーネントにしてください。

```tsx
function RequireAuth() {
  const { data: user, isPending } = useSession()

  if (isPending) return <main>読み込み中…</main>
  if (user === null || user === undefined)
    return <Navigate to="/login" replace />

  return <Outlet />
}
```

こうしておくと、**守りたいページが増えても `<Route>` を1行足すだけ**になります。ページを1つずつ `<RequireAuth>` で包む必要はありません。

**`isPending` の分岐を飛ばさないでください。** セッションの確認は非同期なので、**ログイン済みでも最初の一瞬は「ユーザーが未確定」の状態**になります。ここで未ログインとして扱うと、リロードのたびにログイン画面へ飛ばされます。

`<Navigate to="/login" replace />` の `replace` は、履歴を残さずに置き換える指定です。付けないと、ブラウザの「戻る」で元のページに戻ろうとして、またリダイレクトされる、という繰り返しになります。

`App.tsx` はルートの定義だけを持つ形になります。`/posts/:id` を認証必須の外へ出し、`/public` と `/users/:userId` を足します。import には `Layout` と、新しい2つのページを追加してください。

```tsx
<Routes>
  <Route element={<Layout />}>
    {/* 未ログインでも見られるページ */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignUpPage />} />
    <Route path="/public" element={<PublicPostsPage />} />
    <Route path="/users/:userId" element={<UserPage />} />
    <Route path="/posts/:id" element={<PostDetailPage />} />

    {/* ログインが必要なページ */}
    <Route element={<RequireAuth />}>
      <Route path="/" element={<PostListPage />} />
    </Route>
  </Route>
</Routes>
```

**`path` を持たない `<Route>` は、URL には現れません。** `Layout` と `RequireAuth` の2つがそれで、「この中のページに共通で何かをかぶせる」ためだけに存在します（レイアウトルートと呼ばれます）。`/` を開いたときに描画されるのは、`Layout` → `RequireAuth` → `PostListPage` という入れ子です。

**ヘッダーは `<Routes>` の外に置かないでください。** [6.6](06_api-integration.md#66-認証情報の受け渡し) までは `<Routes>` の外に並べていましたが、そこは React Router の管理下ではないので、あとで「ヘッダーを出さないページ」を作りたくなっても出し分けられません。ルートの木に入れておけば、そのページの `<Route>` を `Layout` の外へ移すだけで済みます。

**同じページを、見る人によって出し分ける**

`/posts/:id` は、**所有者なら編集画面、それ以外なら読むだけの画面**になります。API 側は [3.10](03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) の「任意認証」で、非公開メモなら 404 を返してくれます。フロントは返ってきたメモの持ち主を見るだけです。

```tsx
export function PostDetailPage() {
  const { id } = useParams()
  const { data: post, isPending, isError } = usePost(id!)
  // セッションの確認が終わる前に所有者を判定すると、
  // 所有者にも一瞬だけ閲覧専用の画面が見えてしまう
  const { data: user, isPending: isSessionPending } = useSession()

  if (isPending || isSessionPending) return <main>読み込み中…</main>
  if (isError || post === undefined) {
    return (
      <main>
        <p>メモが見つかりませんでした。</p>
        <Link to="/public">公開メモ一覧へ</Link>
      </main>
    )
  }

  // 所有者だけが編集できる。それ以外（未ログイン含む）は読むだけ
  if (user === null || user === undefined || user.id !== post.userId) {
    return (
      <main>
        <h1>{post.title}</h1>
        <p className="post-content">{post.content}</p>
      </main>
    )
  }

  return <PostEditor key={post.id} post={post} />
}
```

**この分岐は表示の都合であって、防御ではありません。** 他人のメモを編集できないことを保証しているのは、[3.10](03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) の `where` 句です。**フロント側の分岐は、ブラウザの開発者ツールから簡単に迂回できます。** 画面に出さないことと、サーバーが拒否することは、別々に必要です。

次の3つが確認できれば成功です。

- ログアウトした状態で `/posts/:id`（公開メモ）にアクセスすると、閲覧できる
- 同じ URL に所有者がログインした状態でアクセスすると、編集できる
- 非公開メモの URL に未ログインでアクセスすると、404 相当の画面になる

**つまずきポイント**

> [!TIP]
> - **「未ログインならログイン画面へリダイレクト」という単純な処理は、ここで成立しなくなります。** ページごとに扱いが違うためです
> - 未ログイン時に API を呼ぶ際、`Authorization` ヘッダーに `Bearer undefined` のような値を送らないよう注意してください

## 7.3 公開一覧ページ `/public`

全体公開されているメモの一覧を表示します。[3.11](03_backend.md#311-公開用のエンドポイント) で作った `GET /public/posts` を使います。

**データの取得**

`usePosts.ts` に、公開一覧用のフックを足します。認証は不要なので、そのまま呼ぶだけです。

```ts
export const usePublicPosts = () =>
  useQuery({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const res = await client.public.posts.$get()
      if (!res.ok) throw new Error('公開メモの取得に失敗しました')
      return await res.json()
    },
  })
```

**`queryKey` を `['posts']` と別にしているのが重要です。** 自分のメモの一覧とは、中身も、見える範囲も違います。同じキーにすると、ログアウトしたときに消したいキャッシュと、消したくないキャッシュが混ざります。

**ページ**

`apps/web/src/pages/PublicPostsPage.tsx` を新しく作ります。

```tsx
import { Link } from 'react-router'
import { usePublicPosts } from '../hooks/usePosts'

export function PublicPostsPage() {
  const { data: posts, isPending, isError } = usePublicPosts()

  return (
    <main>
      <h1>公開メモ</h1>

      {isPending && <p>読み込み中…</p>}
      {isError && <p role="alert">公開メモの取得に失敗しました</p>}

      <ul className="post-list">
        {posts?.map((post) => (
          <li key={post.id} className="post-item">
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
            <Link to={`/users/${post.author.userId}`}>{post.author.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

**投稿者名は、そのユーザーのページ（[7.4](#74-ユーザーページ-usersuserid)）へのリンクにします。** 表示するのは表示名 (`name`)、URL に使うのはユーザー ID (`userId`) です。

件数は API 側で 50 件に制限してあります（[3.11](03_backend.md#311-公開用のエンドポイント)）。**ページネーションはこの記事では扱いません。**

ログアウトした状態で `/public` にアクセスして、公開メモの一覧が投稿者名付きで表示されれば成功です。非公開メモが含まれていないことも確認してください。

## 7.4 ユーザーページ `/users/:userId`

特定のユーザーが公開しているメモの一覧を表示します。[3.11](03_backend.md#311-公開用のエンドポイント) で作った `GET /users/:userId/posts` を使います。

**データの取得**

URL のユーザー ID を引数に取るフックにします。**`queryKey` に `userId` を含めるのを忘れないでください。** 含めないと、別のユーザーのページを開いても前のユーザーのキャッシュが表示されます。

```ts
export const useUserPosts = (userId: string) =>
  useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      const res = await client.users[':userId'].posts.$get({
        param: { userId },
      })
      if (!res.ok) throw new Error('ユーザーが見つかりませんでした')
      return await res.json()
    },
  })
```

`client.users[':userId'].posts.$get({ param: { userId } })` という書き方は、[6.4](06_api-integration.md#64-hono-rpc-で型安全に呼ぶ) の RPC のものです。**パスの `:userId` の部分は、文字列を組み立てるのではなく `param` で渡します。**

**ページ**

`apps/web/src/pages/UserPage.tsx` を新しく作ります。

```tsx
import { Link, useParams } from 'react-router'
import { useUserPosts } from '../hooks/usePosts'

export function UserPage() {
  const { userId } = useParams()
  const { data, isPending, isError } = useUserPosts(userId!)

  if (isPending) return <main>読み込み中…</main>
  if (isError || data === undefined) {
    return (
      <main>
        <p>ユーザーが見つかりませんでした。</p>
        <Link to="/public">公開メモ一覧へ</Link>
      </main>
    )
  }

  return (
    <main>
      {/* URL には変更されない ID を、画面には表示名を出す */}
      <h1>{data.author.name} の公開メモ</h1>
      <p>@{data.author.userId}</p>

      <ul className="post-list">
        {data.posts.map((post) => (
          <li key={post.id} className="post-item">
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

**表示名とユーザー ID を、両方出しています。** 表示名は変更できるので、それだけだと誰のページなのか確定しません。**URL と `@userId` が、変わらない側の情報です。**

`/users/<ユーザーID>` にアクセスして、そのユーザーの公開メモだけが表示されれば成功です。存在しない ID では 404 相当の画面になります。

**この章のコードを確認する**

見た目の確認だけでは、import の漏れや型の不整合が残ります。7.5 に進む前に実行してください。

```bash
npm run typecheck -w apps/web
npm run lint
npm run format:check
```

> [!NOTE]
> **「見つかりません」の表示は、404 以外の失敗でも出ます。** API が落ちている、CORS の設定が違う、ネットワークが繋がらない、といった場合も同じ画面になります。**手元で「見つかりません」が出たら、まずブラウザの開発者ツールの Network を見てください。** 実務では 404 とその他の失敗を分けて表示します。



**つまずきポイント**

> [!TIP]
> - ユーザー ID は変更不可にしているため、この URL は安定して共有できます。もし変更可能にしていたら、共有された URL が壊れることになります

## 7.5 CSR の限界

ここまでで、公開メモアプリとして機能するものができました。しかし、この構成には満たせない要件があります。**それを実際に確認します。**

**手を動かして確認すること**

`curl` で HTML を取得し、中身を見ます。**`<` と `>` はシェルのリダイレクト記号なので、そのまま貼り付けるとエラーになります。** 変数に入れてから実行してください。

```bash
# ローカルの開発サーバーで確認する場合（npm run dev -w apps/web を起動しておく）
POST_ID=公開メモのID
curl "http://localhost:5173/posts/$POST_ID"
```

本番で確認したい場合は、**この章の変更を先に反映する必要があります。**

```bash
git add .
git commit -m "feat(web): 公開ページを追加する"
git push origin main
```

`Deploy Web` の完了を待ってから、デプロイ先の URL に対して同じことをします。

```bash
FRONTEND_URL=https://memo-app-web.<サブドメイン>.workers.dev
curl "$FRONTEND_URL/posts/$POST_ID"
```

返ってくる HTML に、メモの本文が含まれていないことを確認してください。ブラウザで「ページのソースを表示」しても同じです。表示されているのは、ほぼ空の `<div id="root">` だけのはずです。

**何が起きているのか**

CSR (Client Side Rendering) では、サーバーが返すのは空の HTML と JavaScript です。コンテンツは、ブラウザが JavaScript を実行し、API からデータを取得してから描画されます。

この性質は、以下の場面で問題になります。

- **検索エンジン**: 主要な検索エンジンは JavaScript を実行しますが、クロールの予算やレンダリングの遅延という制約があります。通常の HTML より不利です
- **SNS のリンクプレビュー**: SNS のクローラーは基本的に JavaScript を実行しません。`<title>` や OGP を JavaScript で書き換えても、プレビューには反映されません。**公開メモを共有しても、そのメモのタイトルや本文はプレビューに出ず、`index.html` に書いた全ページ共通のタイトルが使われるか、プレビュー自体が作られません**

つまり、**「公開メモアプリ」を名乗りながら、公開したメモを共有したときの体験が良くない**という状態です。

**解決するには何が必要か**

必要なのは、**最初のレスポンスに、そのメモ固有の HTML が含まれている**ことです。[2.12](02_frontend.md#212-任意-csr--ssg--ssr--isr) で見た方式のうち、次のどれかを選ぶことになります。

| 方式 | このアプリに当てはめると |
|---|---|
| SSR | リクエストのたびにサーバーで HTML を作る。投稿がすぐ反映される |
| SSG | ビルド時に作るので、**メモを1件追加するたびに再ビルドと再デプロイが要る** |
| ISR | 一定時間ごとに作り直す。反映は遅れるが、SSG の再ビルド問題は避けられる |

React Router なら Framework mode、他に Next.js などの選択肢があります。**Framework mode にすれば自動的に SSR になるわけではなく、SSR にするか、あらかじめ HTML を作っておくかを、構成として選びます。**

**ただし、それはこのチュートリアルの構成を作り直すことを意味します。**

| 変わるもの | 影響 |
|---|---|
| ルーティングの書き方 | [2.9](02_frontend.md#29-react-router-でページを分ける) の内容が別物になる |
| データ取得の仕組み | `loader` / `action` が加わり、React Query との住み分けが必要（[6.5](06_api-integration.md#65-react-query-に載せる)） |
| デプロイ構成 | SSR を選ぶなら、フロント側もリクエストを処理するサーバーになる（[5.2](05_deploy.md#52-github-actions-を構築する)） |
| CORS の前提 | 同一オリジンにできる可能性（[6.2](06_api-integration.md#62-cors)） |
| 認証トークンの置き場所 | サーバー側から読めない localStorage は見直しが必要（[6.6](06_api-integration.md#66-認証情報の受け渡し)） |

[2章](02_frontend.md)・[5章](05_deploy.md)・[6章](06_api-integration.md)の判断を同時に覆すことになります。だからこの記事では扱いません。

**この節で持ち帰ってほしいこと**

技術選定は、最初の判断が後から効いてきます。「まず CSR で作って、後から SSR にする」は、言葉ほど簡単ではありません。

同時に、「常に SSR を選ぶべき」でもありません。ログインが前提のアプリなら、この問題はそもそも発生しません。**今回のアプリで問題が表に出たのは、[2章](02_frontend.md)で CSR を選んだあとに、この章で公開ページを作ったからです。** 公開ページは最初から予定にありましたが（[0章](00_introduction.md)）、**制約が形になって現れるのは、実際にその画面を作ったときです。**

次に何かを作るときは、この判断を最初に行ってみてください。

**次の章**: [8 E2E テストを行う](08_e2e.md)
