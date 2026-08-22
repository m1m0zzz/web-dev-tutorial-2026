# 2 React でフロントエンドを作る

この章では UI だけを作ります。データはブラウザのメモリ上に持ち、サーバーとは通信しません。バックエンドとの接続は [6章](06_api-integration.md)で行います。

**この章の時点では「公開」という概念は登場しません。** 見せる相手がいないためです。公開機能は [7章](07_features.md)で追加します。

作業は [1.8](01_setup.md#18-リポジトリと-workspace-を作る) で作ったリポジトリの中で行います。断りがない限り、コマンドはすべてリポジトリのルートで実行します。

## 2.1 `npm create vite@latest`

Vite は開発サーバーとビルドツールです。React のプロジェクトを一から設定するには、TypeScript のコンパイル、JSX の変換、開発サーバー、本番ビルドなど多数の設定が必要ですが、Vite のテンプレートはこれらを揃えた状態で生成してくれます。

https://ja.vite.dev/guide/

リポジトリのルートで実行します。

```bash
npm create vite@latest apps/web -- --template react-ts
npm install
npm run dev -w apps/web
```

ブラウザで `http://localhost:5173` を開き、Vite + React の初期画面が表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - **`npm install` はルートで実行してください。** `apps/web` に `cd` して実行すると workspace の解決が壊れます。以降この記事では、断りがない限りすべてリポジトリのルートで作業します
> - 依存関係は原則としてルートの `node_modules/` にまとめられます（hoisting）。`apps/web/node_modules/` はそもそも作られないことがあります。異常ではありません
> - パッケージを追加するときは `-w` でワークスペースを指定します。例: `npm i -w apps/web react-router`
> - スクリプトの実行も同様です。例: `npm run dev -w apps/web`
> - 生成された `apps/web/package.json` には `"private": true` が既に入っているはずです。無ければ追加してください
> - WSL から起動した開発サーバーには、Windows 側のブラウザからそのままアクセスできます

### 生成されたファイルを読む

主なファイルの役割を確認しておきます。

| ファイル | 役割 |
|---|---|
| `index.html` | エントリポイント。`<div id="root">` に React が描画される |
| `src/main.tsx` | React の起動処理。`index.html` の `#root` にアプリをマウントする |
| `src/App.tsx` | 最初のコンポーネント。ここから書き換えていく |
| `src/index.css` / `src/App.css` | スタイル。[2.8](#28-css-基礎) で書き換えます |
| `public/` | そのまま配信される静的ファイル（`favicon.svg` など） |
| `src/assets/` | コードから `import` して使う画像。バンドラを通ります |
| `vite.config.ts` | Vite の設定 |
| `tsconfig.json` | 他の2つを参照するだけのファイル（Project References） |
| `tsconfig.app.json` | アプリ本体（`src/`）向けの TypeScript 設定 |
| `tsconfig.node.json` | `vite.config.ts` など、Node.js 側で動くファイル向けの設定 |
| `.oxlintrc.json` | oxlint（Lint ツール）の設定。[2.10](#210-任意-oxlint--oxfmt-のセットアップ) でルートに移します |
| `README.md` | テンプレートの説明。`apps/web` を単体で扱う前提の内容なので、[2.10](#210-任意-oxlint--oxfmt-のセットアップ) で消します |

`public/` と `src/assets/` の違いは、**バンドラを通るかどうか**です。`src/assets/` の画像は `import` して使い、ビルド時にハッシュ付きのファイル名に変換されます。`public/` のファイルはパスをそのまま書いて参照します。

> 執筆時点では `create-vite` 9系が動き、Vite 8 / React 19 / TypeScript 6 の構成が生成されました。バージョンが上がっていても、上記のファイル構成は概ね変わりません。

## 2.2 モダン JavaScript の前提知識

React のコードは、比較的新しい JavaScript の記法を前提に書かれています。この節は通読する必要はありません。各項目に「どこで使うか」を書いてあるので、実際に詰まったときに戻ってきてください。

**扱う項目**

| 項目 | 最初に出てくる場所 |
|---|---|
| `const` / `let` | [2.4](#24-カウンター) カウンター |
| アロー関数 | [2.4](#24-カウンター) カウンター（イベントハンドラ） |
| 分割代入（配列） | [2.4](#24-カウンター) カウンター（`useState` の戻り値） |
| 分割代入（オブジェクト） | [2.7](#27-コンポーネント分離) コンポーネント分離（Props の受け取り） |
| スプレッド構文 | [2.6](#26-編集可能なリスト-メモリスト) メモリスト（配列への追加、オブジェクトの更新） |
| `import` / `export` | [2.7](#27-コンポーネント分離) コンポーネント分離 |
| テンプレートリテラル | [2.5](#25-タイマー) タイマー（時間の表示） |
| 配列メソッド（`map` / `filter`） | [2.6](#26-編集可能なリスト-メモリスト) メモリスト |

**扱わないもの**

- クラス構文、`this`、プロトタイプ（このチュートリアルでは登場しません）
- `async` / `await` と Promise（[6.1](06_api-integration.md#61-async--await-と-promise) で扱います）

網羅的に学びたい場合は MDN を参照してください。

https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide

**この先の章に実際に出てくる形**

```ts
// const / let（2.4）— 再代入しない変数は const。この記事のコードはほぼ const だけで書けます
const [count, setCount] = useState(0)

// アロー関数（2.4）— イベントハンドラとして渡す関数
const increment = () => {
  setCount((prev) => prev + 1)
}

// 分割代入・配列（2.4）— useState は [値, 更新関数] の2要素の配列を返します
const [posts, setPosts] = useState<Post[]>([])

// 分割代入・オブジェクト（2.7）— Props を受け取るときの形
export function PostList({ posts, onDelete }: Props) {

// スプレッド構文（2.6）— 配列に追加する / オブジェクトの一部だけを差し替える
setPosts((prev) => [...prev, newPost])
setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, ...values } : post)))

// import / export（2.7）
import { PostItem } from './PostItem'
export function PostList(props: Props) {

// テンプレートリテラル（2.5, 2.7）— `` で囲み、${} の中に式を書きます
`経過時間: ${seconds} 秒`
<Link to={`/posts/${post.id}`}>

// 配列メソッド map / filter（2.6）
posts.map((post) => post.title)      // 各要素を変換した新しい配列
posts.filter((post) => post.id !== id) // 条件に合う要素だけの新しい配列
```

**`map` と `filter` は、元の配列を変更せず新しい配列を返します。** React で状態を更新するときに、この性質がそのまま効いてきます（[2.6](#26-編集可能なリスト-メモリスト) のつまずきポイント）。

## 2.3 TypeScript と JSX の読み方

JSX は JavaScript の中に HTML のような記法を書ける拡張構文です。TypeScript は JavaScript に型を追加した言語です。React では両者を組み合わせて書きます。

この節も索引として使ってください。

**扱う項目**

| 項目 | 最初に出てくる場所 |
|---|---|
| JSX の基本（`{}` 埋め込み、`className`、単一ルート、自己閉じタグ） | [2.4](#24-カウンター) カウンター |
| 型注釈の基本（`string` / `number` / `boolean`） | [2.4](#24-カウンター) カウンター |
| `useState` のジェネリクスと型推論 | [2.4](#24-カウンター) カウンター |
| `type` によるオブジェクト型の定義 | [2.6](#26-編集可能なリスト-メモリスト) メモリスト |
| Props の型定義 | [2.7](#27-コンポーネント分離) コンポーネント分離 |
| 配列の型（`Post[]`） | [2.6](#26-編集可能なリスト-メモリスト) メモリスト |
| `key` とリスト描画 | [2.6](#26-編集可能なリスト-メモリスト) メモリスト |

**扱わないもの**

- ジェネリクスの自作、条件型、`keyof` などの型レベル操作
- `enum`、名前空間、デコレータ

網羅的に学びたい場合は TypeScript Handbook を参照してください。

https://www.typescriptlang.org/ja/docs/handbook/intro.html

**つまずきポイント**

> [!TIP]
> - HTML の `class` は JSX では `className` になります。`class` が JavaScript の予約語のためです
> - 同様に `for` は `htmlFor` になります
> - JSX は単一のルート要素しか返せません。複数並べたい場合は `<>...</>`（フラグメント）で囲みます

**この先の章に実際に出てくる形**

```tsx
// JSX の {} 埋め込みと className（2.4, 2.8）
<p>現在の値: {count}</p>
<li className="post-item">

// 自己閉じタグ（2.6）— 子要素を持たない要素は /> で閉じます
<textarea value={content} onChange={(e) => setContent(e.target.value)} />

// useState のジェネリクスと型推論（2.4, 2.6）
const [count, setCount] = useState(0)          // 初期値 0 から number と推論される
const [posts, setPosts] = useState<Post[]>([]) // [] からは推論できないので <Post[]> で明示する

// type によるオブジェクト型の定義（2.6）
type Post = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

// Props の型定義（2.7）— 関数を受け取る Props も型で書けます
type Props = {
  posts: Post[]                    // 配列の型
  onDelete: (id: string) => void   // 「string を1つ受け取り、何も返さない関数」
}

// key とリスト描画（2.6）
{posts.map((post) => (
  <PostItem key={post.id} post={post} onDelete={onDelete} />
))}

// import type（2.7）— 型だけを import するときの書き方。6.4 で重要になります
import type { Post } from '../types'
```

## 2.4 カウンター

React の中心的な概念である「状態 (state)」を理解します。ボタンを押すと数字が増える、という最小のアプリを作ります。

**扱うこと**

- `useState` による状態の宣言
- イベントハンドラ（`onClick`）
- 状態が変わると再描画されるという仕組み
- 状態を直接書き換えてはいけない理由

ボタンを押すと画面の数字が増え、リセットボタンで 0 に戻れば成功です。

**つまずきポイント**

> [!TIP]
> - `count = count + 1` のように直接代入しても画面は更新されません。必ず `setCount` を使います
> - `setCount(count + 1)` を連続で呼んでも、期待通りに 2 増えるとは限りません。前の値を使う場合は `setCount(prev => prev + 1)` の形を使います
> - `onClick={handleClick()}` と書くと、レンダリング時に即座に実行されてしまいます。`onClick={handleClick}` が正しい形です

**コード**

まず、テンプレートに含まれるサンプルを片付けます。

```bash
rm -rf apps/web/src/assets apps/web/src/App.css
```

`apps/web/src/index.css` は中身を空にしてください（[2.8](#28-css-基礎) で書きます）。そのうえで `apps/web/src/App.tsx` を全文置き換えます。

```tsx
import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  const increment = () => {
    setCount((prev) => prev + 1)
  }

  const reset = () => {
    setCount(0)
  }

  return (
    <div>
      <h1>カウンター</h1>
      <p>現在の値: {count}</p>
      <button onClick={increment}>+1</button>
      <button onClick={reset}>リセット</button>
    </div>
  )
}

export default App
```

`useState(0)` が返すのは `[現在の値, 更新関数]` の2要素の配列で、それを分割代入で `count` と `setCount` に受けています。`setCount` を呼ぶと React がこのコンポーネントをもう一度実行し、新しい `count` で画面を描き直します。

`increment` が `setCount(count + 1)` ではなく `setCount((prev) => prev + 1)` になっているのは、つまずきポイントの2つ目に備えた形です。**「今の状態を元に次の状態を決める」ときは、常にこの関数形式で書いておくと安全です。**

## 2.5 タイマー

「時間の経過」という、React の外側で起きる変化をどう扱うかを学びます。ここで `useEffect` と、後片付け (cleanup) の概念が出てきます。

**扱うこと**

- `useEffect` による副作用の記述
- `setInterval` の登録と解除
- 依存配列
- クリーンアップ関数を返さないとどうなるか

スタートボタンで経過秒数が増え、ストップで止まり、リセットで 0 に戻れば成功です。ページを離れたあとにタイマーが動き続けていないことも確認してください。

**つまずきポイント**

> [!TIP]
> - **クリーンアップ関数を返し忘れると、`setInterval` が解除されずに残り続けます。** コンポーネントが再描画されるたびに新しいインターバルが増え、カウントが加速します。この現象を実際に体験してもらう構成にします
> - 依存配列を空にするか、値を入れるかで挙動が変わります。空配列は「マウント時に一度だけ」を意味します
> - React の開発モードでは `useEffect` が意図的に2回実行されます。これはバグを見つけるための機能で、本番ビルドでは1回です

**コード**

[2.4](#24-カウンター) の `App.tsx` を、以下のように書き換えます。

```diff
-import { useState } from 'react'
+import { useEffect, useState } from 'react'

 function App() {
-  const [count, setCount] = useState(0)
+  const [seconds, setSeconds] = useState(0)
+  const [running, setRunning] = useState(false)
```

`useEffect` の部分は初出なので全文で示します。`App` の中、`return` の手前に置きます。

```tsx
useEffect(() => {
  if (!running) return

  const id = setInterval(() => {
    setSeconds((prev) => prev + 1)
  }, 1000)

  return () => {
    clearInterval(id)
  }
}, [running])
```

読み方は3つに分かれます。

| 部分 | 意味 |
|---|---|
| `useEffect(() => { ... })` の中身 | 描画のあとに実行される処理 |
| `return () => { ... }` | **クリーンアップ関数**。次に同じ effect が走る前と、コンポーネントが消えるときに実行される |
| `[running]` | **依存配列**。この配列の中身が変わったときだけ、effect を実行し直す |

`running` が `false` のあいだは何もせずに戻り、`true` になった瞬間に `setInterval` を登録します。`running` が `false` に戻ると、React はまずクリーンアップ関数を呼んでインターバルを解除してから、新しい effect（何もせず戻る）を実行します。

画面部分は以下のようになります。

```tsx
return (
  <div>
    <h1>タイマー</h1>
    <p>{`経過時間: ${seconds} 秒`}</p>
    <button onClick={() => setRunning(true)}>スタート</button>
    <button onClick={() => setRunning(false)}>ストップ</button>
    <button onClick={reset}>リセット</button>
  </div>
)
```

`reset` は `setRunning(false)` と `setSeconds(0)` を続けて呼ぶだけの関数です。

**クリーンアップ関数を消すと何が起きるか、一度試してください。** `return () => { clearInterval(id) }` の行を消してストップ・スタートを何度か押すと、解除されなかったインターバルが積み重なり、秒数が2倍、3倍の速さで進みます。

## 2.6 編集可能なリスト (メモリスト)

配列の状態を扱います。追加・編集・削除という、この先ずっと出てくる操作の基本形です。ここからがアプリの本体になります。

**データ構造**

```ts
type Post = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}
```

**扱うこと**

- 配列を状態として持つ
- `map` によるリスト描画と `key`
- 入力フォームと制御コンポーネント（`value` + `onChange`）
- スプレッド構文による追加、`filter` による削除、`map` による更新

タイトルと本文を入力してメモを追加でき、各項目を編集・削除できれば成功です。

**つまずきポイント**

> [!TIP]
> - **`key` にインデックスを使わないでください。** 並び替えや削除をしたときに、React が要素を取り違えて表示が壊れます。一意な id を持たせます
> - **配列を直接変更してはいけません。** `posts.push(newPost)` は状態の変更として認識されません。`setPosts((prev) => [...prev, newPost])` のように新しい配列を作ります
> - 入力欄に `value` を指定したのに `onChange` を書かないと、文字が入力できなくなります

**id の生成**

`crypto.randomUUID()` を使います。ブラウザに標準で入っている関数で、ライブラリは不要です。

```ts
const newPost: Post = {
  id: crypto.randomUUID(),
  title,
  content,
  createdAt: now,
  updatedAt: now,
}
```

**この関数は「安全なコンテキスト」でのみ使えます。** HTTPS のページと `http://localhost` は安全なコンテキストとして扱われるため、開発サーバーでも本番でも問題ありません。ただし、スマートフォンなどから `http://192.168.x.x:5173` の形でアクセスすると安全なコンテキストにならず、`crypto.randomUUID is not a function` になります。

参考: https://developer.mozilla.org/ja/docs/Web/API/Crypto/randomUUID

なお、この id は [3章](03_backend.md)以降サーバー側で生成するようになります。ここでの id はブラウザのメモリ上にしか存在しません。

**コード**

`App.tsx` の主要部分です。状態は3つ（メモの配列、入力中のタイトル、入力中の本文）持ちます。

```tsx
const [posts, setPosts] = useState<Post[]>([])
const [title, setTitle] = useState('')
const [content, setContent] = useState('')

const addPost = () => {
  if (title === '' || content === '') return

  const now = Date.now()
  const newPost: Post = {
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: now,
    updatedAt: now,
  }

  setPosts((prev) => [...prev, newPost])
  setTitle('')
  setContent('')
}

const updatePost = (id: string, values: { title?: string; content?: string }) => {
  setPosts((prev) =>
    prev.map((post) =>
      post.id === id ? { ...post, ...values, updatedAt: Date.now() } : post,
    ),
  )
}

const deletePost = (id: string) => {
  setPosts((prev) => prev.filter((post) => post.id !== id))
}
```

追加・更新・削除が、それぞれスプレッド構文・`map`・`filter` に対応しています。**どれも元の配列を変更せず、新しい配列を作って `setPosts` に渡している**ことを確認してください。

3つとも `setPosts((prev) => ...)` の関数形式で書いています。[2.4](#24-カウンター) で触れたとおり、**今の状態を元に次の状態を決めるときは常にこの形にします。** `setPosts([...posts, newPost])` と書くと、この関数が作られた時点の `posts` を見るため、1回の操作で複数回更新したときに取りこぼします。

描画側は `map` でリストを作り、各要素に `key` を付けます。

```tsx
<ul>
  {posts.map((post) => (
    <li key={post.id}>
      <input
        value={post.title}
        onChange={(e) => updatePost(post.id, { title: e.target.value })}
      />
      <textarea
        value={post.content}
        onChange={(e) => updatePost(post.id, { content: e.target.value })}
      />
      <button onClick={() => deletePost(post.id)}>削除</button>
    </li>
  ))}
</ul>
```

## 2.7 コンポーネント分離

[2.6](#26-編集可能なリスト-メモリスト) の時点では、すべてが1つのファイルに入っています。これを役割ごとに分割し、React の「コンポーネント」という単位で考えられるようにします。

**扱うこと**

- コンポーネントの切り出しと `export` / `import`
- Props によるデータの受け渡し
- Props の型定義
- コールバックを Props として渡す（子から親への通知）
- どこで分割すべきかの判断基準

見た目と挙動は [2.6](#26-編集可能なリスト-メモリスト) と変わらないまま、`PostList`、`PostItem`、`PostForm` などに分割できていれば成功です。

**つまずきポイント**

> [!TIP]
> - 分割しすぎると、Props をバケツリレーする形になって逆に読みにくくなります。まず動くものを作ってから分割する順番を推奨します
> - Props は読み取り専用です。子コンポーネントの中で書き換えても親には反映されません。親の状態を変えたい場合は、親から関数を渡します

## 2.8 CSS 基礎

ここまで見た目には手を付けていません。CSS の基本的な考え方を押さえます。React に固有の話ではなく、Web 全般の話です。

**扱うこと**

- `display` の違い: `block` / `inline` / `inline-block`
- Flexbox（1次元のレイアウト）
- Grid（2次元のレイアウト）
- `position`: `static` / `relative` / `absolute` / `fixed` / `sticky`
- ボックスモデルと `box-sizing`

メモアプリが意図した配置で表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - `inline` 要素には `width` と `height` が効きません。`margin` と `padding` も上下方向は期待通りに効きません。ここが最も引っかかる箇所です
> - `position: absolute` の基準は「最も近い `position` が `static` 以外の祖先」です。基準にしたい要素に `position: relative` を付けるのが定石です
> - Flexbox の `justify-content` と `align-items` は、`flex-direction` によって向きが入れ替わります

参考: https://developer.mozilla.org/ja/docs/Learn_web_development/Core/CSS_layout

**必要な図**

この節は文章だけでは伝わりにくいため、以下の5点は図を用意します。

| 図 | 示すもの |
|---|---|
| ボックスモデル | content / padding / border / margin の入れ子と、`box-sizing: border-box` で `width` の意味がどう変わるか |
| `display` の違い | `block` / `inline` / `inline-block` の3つを並べ、幅・高さ・改行の挙動を比較する |
| Flexbox の軸 | `flex-direction: row` と `column` で主軸と交差軸が入れ替わること |
| `justify-content` / `align-items` | 上の図と対応させ、どちらがどの軸方向の指定かを示す |
| `position` の基準 | `absolute` が「最も近い `static` 以外の祖先」を基準にすること |

**コード**

`apps/web/src/index.css` に書きます。この記事では CSS Modules などは使わず、クラス名を直接書く方式で進めます。

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
}
```

`box-sizing: border-box` を全要素に指定するのは定番の設定です。既定の `content-box` では `width: 100%` に `padding` と `border` が足された分だけ幅がはみ出します。

## 2.9 React Router でページを分ける

ここまでは1画面のアプリでした。複数のページを持ち、URL で行き来できるようにします。

**構成**

React Router の **Declarative mode**（`<BrowserRouter>` + `<Routes>`）を使います。

| パス | 内容 |
|---|---|
| `/` | メモ一覧・個別ページへのリンク・新規作成ボタン・削除ボタン |
| `/posts/:id` | 個別ページ。編集・更新ボタン・削除ボタン |

**扱うこと**

- `<BrowserRouter>` / `<Routes>` / `<Route>`
- `<Link>` によるページ遷移（`<a>` との違い）
- `useParams` による URL パラメータの取得
- `useNavigate` によるプログラムからの遷移
- 複数ページで状態を共有する方法

`/` で一覧が表示され、項目をクリックすると `/posts/:id` に遷移して編集できれば成功です。ブラウザの戻るボタンが正しく動くことも確認してください。

**つまずきポイント**

> [!TIP]
> - `<a href>` を使うとページ全体が再読み込みされ、状態がすべて失われます。`<Link to>` を使ってください
> - 状態はメモリ上にあるため、リロードすると消えます。これは [6章](06_api-integration.md)でバックエンドに繋ぐまでの一時的な制約です
> - **React Router には複数のモードがあります。** 検索して出てくる記事が Framework mode を前提にしていることがあり、`loader` や `action` の話が出てきたらそれは別のモードの話です

参考: https://reactrouter.com/start/declarative/installation

**バージョンとモードの呼称**

執筆時点の最新は **React Router v8** です。公式ドキュメントは v8 の時点でも **Framework / Data / Declarative** の3モードを掲げており、この記事が使う Declarative mode の呼称も API も変わっていません。パッケージ名は `react-router` です（`react-router-dom` は v7 以降不要になりました）。

```bash
npm i -w apps/web react-router
```

**コード**

`main.tsx` でアプリ全体を `<BrowserRouter>` で囲みます。

```tsx
import { BrowserRouter } from 'react-router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

`App.tsx` は、状態を持ったままルートの定義だけを行う形になります。

```tsx
function App() {
  const [posts, setPosts] = useState<Post[]>([])

  // 入力欄は PostForm に移ったので、addPost は値を引数で受け取る形になります
  const addPost = (values: { title: string; content: string }) => {
    const now = Date.now()
    const newPost: Post = {
      id: crypto.randomUUID(),
      title: values.title,
      content: values.content,
      createdAt: now,
      updatedAt: now,
    }
    setPosts((prev) => [...prev, newPost])
  }

  // updatePost / deletePost は 2.6 と同じ

  return (
    <Routes>
      <Route
        path="/"
        element={<PostListPage posts={posts} onAdd={addPost} onDelete={deletePost} />}
      />
      <Route
        path="/posts/:id"
        element={
          <PostDetailPage posts={posts} onUpdate={updatePost} onDelete={deletePost} />
        }
      />
    </Routes>
  )
}
```

**複数ページで状態を共有する方法**が、ここに現れています。`posts` を持っているのは `App` だけで、各ページは Props として受け取ります。状態を持つ場所を、それを使うページより上に置く形です。

個別ページでは、URL の `:id` を `useParams` で受け取り、`posts` から該当するメモを探します。

```tsx
const { id } = useParams()
const navigate = useNavigate()
const post = posts.find((p) => p.id === id)

if (post === undefined) {
  return <p>メモが見つかりませんでした。</p>
}
```

`useParams` の戻り値は `string | undefined` です。**URL は利用者が自由に書き換えられるため、「見つからなかった場合」の分岐は必ず必要になります。** [7.2](07_features.md#72-未ログインでも見られるページの土台を作る) で、この分岐が「非公開メモに未ログインでアクセスしたとき」の表示に繋がります。

削除や更新のあとに一覧へ戻るには `useNavigate` を使います。

```tsx
const handleDelete = () => {
  onDelete(post.id)
  navigate('/')
}
```

## 2.10 任意) oxlint / oxfmt のセットアップ

oxlint はコードの問題を検出するツール、oxfmt は整形するツールです。役割が異なるので併用します。整形に関することは oxfmt に任せ、oxlint はバグの原因になりうる書き方の検出に集中させます。どちらも [Oxc](https://oxc.rs/) という同じプロジェクトのツールです。

**構成**

設定は workspace のルートに1箇所だけ置き、`apps/web` と `apps/api`（[3章](03_backend.md)で作る）の両方を対象にします。フロントとバックでルールがずれる状態を避けるためです。

**テンプレートが入れた oxlint をルートに移す**

[2.1](#21-npm-create-vitelatest) の `create-vite` は、Lint ツールとして oxlint を入れ、`apps/web/.oxlintrc.json` を置いていきます。**入っているのは `apps/web` の中だけ**なので、ルートに入れ直します。

```bash
npm uninstall -w apps/web oxlint
npm i -D oxlint oxfmt
mv apps/web/.oxlintrc.json .oxlintrc.json
rm apps/web/README.md
```

`apps/web/package.json` の `"lint": "oxlint"` も削除してください。ルートから両方の workspace をまとめて実行します。

`apps/web/README.md` も一緒に消しています。テンプレートが置いていく説明文で、`apps/web` を単体のプロジェクトとして扱う前提の内容です。**残しておくと、この記事の構成と食い違ったものが手元に残ります。**

> ESLint と Prettier という組み合わせも広く使われています。情報量は今でもそちらのほうが多く、独自のルールを書く仕組みも揃っています。この記事が oxlint / oxfmt を選ぶのは、テンプレートが最初から oxlint を入れてくること、設定が JSON ファイル1つで済むこと、Lint と整形の設定が衝突しないことによります。**この選択は好みの範囲です。** ESLint の設定から乗り換えるときは `npx @oxlint/migrate` で `.oxlintrc.json` を生成できます。

**oxlint の設定**

ルートに移した `.oxlintrc.json` を書き換えます。

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "ignorePatterns": ["**/dist", "**/.wrangler", "**/worker-configuration.d.ts"],
  "rules": {
    "typescript/no-explicit-any": "error"
  },
  "overrides": [
    {
      "files": ["apps/web/**/*.{ts,tsx}"],
      "plugins": ["react"],
      "env": { "browser": true },
      "rules": {
        "react/rules-of-hooks": "error",
        "react/exhaustive-deps": "error",
        "react/only-export-components": ["warn", { "allowConstantExport": true }]
      }
    }
  ]
}
```

**oxlint はルールを「カテゴリ」で管理します。** 既定で有効なのは `correctness`（明らかに間違っている、または無意味な書き方）だけです。`suspicious`（間違いの可能性が高い）や `pedantic`（厳しめ。誤検出もある）を足すこともできますが、増やすほど「直すべきか無視すべきか」の判断を迫られる警告が増えます。まずは既定のままで十分です。

`rules` に書いたのは、カテゴリに入っていないルールを個別に有効にする例です。`typescript/no-explicit-any` は `any` を禁止します。型を諦めた箇所が見えるようになります。

`overrides` で React 向けのルールを `apps/web/**` に限定しているのは、`apps/api` に React が無いためです。**`plugins` に `react` を足しても、既定で有効なプラグイン（TypeScript など）が無効になることはありません。** 足し算です。

| ルール | 何を防ぐか |
|---|---|
| `react/rules-of-hooks` | 条件分岐の中で `useState` を呼ぶなど、フックの呼び出し順が実行ごとに変わる書き方 |
| `react/exhaustive-deps` | `useEffect` の依存配列の書き漏らし |
| `react/only-export-components` | 開発時のホットリロードが壊れる書き方（同じファイルからコンポーネント以外も export する） |

`env: { "browser": true }` は、`window` や `document` をグローバル変数として認識させる指定です。これが無いと「そんな変数は無い」と言われます。

**`ignorePatterns` に入れている `worker-configuration.d.ts` は、[3.5](03_backend.md#35-環境変数とシークレット) で `wrangler` が自動生成するファイルです。** 生成物を Lint しても直しようがありません。

**oxfmt の設定**

ルートに `.oxfmtrc.json` を作ります。

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "semi": false,
  "singleQuote": true,
  "printWidth": 80,
  "sortPackageJson": false,
  "ignorePatterns": ["dist", ".wrangler", "package-lock.json"]
}
```

`semi`（行末のセミコロン）と `singleQuote`（文字列の引用符）は好みです。この記事のコードは、この2つの設定で整形したものに揃えてあります。`printWidth` は折り返す行の長さで、oxfmt の既定は 100 です。

`sortPackageJson` を `false` にしているのは、**既定では `package.json` のキーを決まった順序に並び替えるためです。** npm が書いた内容が整形のたびに動くと、自分で足した行がどれなのか分かりにくくなります。

**スクリプト**

ルートの `package.json` にスクリプトを追加します。

```json
{
  "scripts": {
    "lint": "oxlint",
    "format": "oxfmt",
    "format:check": "oxfmt --check"
  }
}
```

どちらもパスを渡さなければカレントディレクトリ以下が対象です。`format:check` は書き換えずに確認だけを行います。[5.2](05_deploy.md#52-github-actions-を構築する) で CI から実行します。

ルートで `npm run lint` と `npm run format` が実行でき、両方ともエラーなく終われば成功です。

**つまずきポイント**

> [!TIP]
> - **導入した直後は、既存のコードに警告が出ることがあります。** これは正常です。`npm run lint -- --fix` で自動修正できるものは直ります
> - `npm run format` は対象ファイルを**書き換えます**。実行前に変更をコミットしておくと、何が変わったかを `git diff` で確認できます
> - **`.oxlintrc.json` を `apps/web` に残さないでください。** oxlint は下位ディレクトリの設定ファイルも自動で読むため、両方に置くとどちらが効いているのか分からなくなります
> - **型情報が必要なルールは、既定では動きません。** 「Promise を await していない」のような、型を見ないと判断できない指摘には `oxlint-tsgolint` の追加インストールと `--type-aware` が必要です。この記事では使いません
> - VS Code で保存時に自動整形させるには、`.vscode/settings.json` の設定と拡張機能のインストールが必要です

## 2.11 任意) React の仕組み / なぜ SPA なのか

ここまで React を「そういうもの」として使ってきました。裏で何が起きているのかを補います。

**扱うこと**

- 仮想 DOM と差分更新
- 再レンダリングのトリガーは何か
- SPA (Single Page Application) とは何か、従来のサーバーサイドレンダリングとの違い
- SPA の利点と欠点

## 2.12 任意) CSR / SSG / SSR / ISR

このチュートリアルで作るのは CSR (Client Side Rendering) のアプリです。他にも選択肢があることを知っておきます。

**扱うこと**

- CSR: ブラウザで JavaScript を実行して描画する（今回の構成）
- SSG: ビルド時に HTML を生成しておく
- SSR: リクエストのたびにサーバーで HTML を生成する
- ISR: SSG と SSR の中間。一定時間ごとに再生成する
- それぞれが向いているケース

**注記**

この節は概念の紹介に留めます。今回は Declarative mode を使うため、実際にレンダリング方式を切り替える機会はありません。この選択が何をもたらすかは、[7.5](07_features.md#75-csr-の限界) で実際に確認します。
