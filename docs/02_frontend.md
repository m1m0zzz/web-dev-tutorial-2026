# 2 React でフロントエンドを作る

この章では UI だけを作ります。データはブラウザのメモリ上に持ち、サーバーとは通信しません。バックエンドとの接続は [6章](06_api-integration.md)で行います。

作業は [1.8](01_setup.md#18-リポジトリと-workspace-を作る) で作ったリポジトリの中で行います。断りがない限り、コマンドはすべてリポジトリのルートで実行します。

## 2.1 `npm create vite@latest`

Vite は開発サーバーとビルドツールです。React のプロジェクトを一から設定するには、TypeScript のコンパイル、JSX の変換、開発サーバー、本番ビルドなど多数の設定が必要ですが、Vite のテンプレートはこれらを揃えた状態で生成してくれます。

参照: https://ja.vite.dev/guide/

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
> - **`npm run dev` は起動したままになります。** 「コマンドが終わらない」のではなく、それが正常な状態です。**以降のコマンドは別のターミナルで実行してください。** 止めるときは `Ctrl+C`、再開は同じコマンドです

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
| `.oxlintrc.json` | oxlint（Lint ツール）の設定。[2.10](#210-oxlint--oxfmt-のセットアップ) でルートに移します |
| `README.md` | テンプレートの説明。`apps/web` を単体で扱う前提の内容なので、[2.10](#210-oxlint--oxfmt-のセットアップ) で消します |

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

網羅的に学びたい場合は MDN が使えます。

参照: https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide

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

網羅的に学びたい場合はサバイバル TypeScript が使えます。

参照: https://typescriptbook.jp/

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

`apps/web/src/index.css` は中身を空にしてください（[2.8](#28-css-基礎) で書きます）。

`apps/web/index.html` も2箇所直しておきます。**日本語のページなので `lang` を `ja` にします**（スクリーンリーダーの読み上げや、ブラウザの翻訳の判断に使われます）。`<title>` はブラウザのタブに出る文字です。

```diff
-<html lang="en">
+<html lang="ja">
-    <title>web</title>
+    <title>メモ</title>
```

そのうえで `apps/web/src/App.tsx` を全文置き換えます。

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

スタートボタンで経過秒数が増え、ストップで止まり、リセットで 0 に戻れば成功です。

**つまずきポイント**

> [!TIP]
> - **クリーンアップ関数を返し忘れると、`setInterval` が解除されずに残り続けます。** ストップとスタートを繰り返すたびに、解除されなかったインターバルが積み重なり、カウントが加速します。この現象は下で実際に試します
> - 依存配列を空にするか、値を入れるかで挙動が変わります。空配列は「マウント時に一度だけ」を意味します
> - **React の開発モード（Strict Mode）では、コンポーネントが最初に表示されるときに effect が「実行 → クリーンアップ → もう一度実行」の順で走ります。** クリーンアップの書き忘れを見つけるための機能で、本番ビルドでは1回だけです

**コード**

[2.4](#24-カウンター) の `App.tsx` を、丸ごと置き換えます。カウンターの `count` と `increment` は使わなくなります。

```tsx
import { useEffect, useState } from 'react'

function App() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return

    const id = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(id)
    }
  }, [running])

  const reset = () => {
    setRunning(false)
    setSeconds(0)
  }

  return (
    <div>
      <h1>タイマー</h1>
      <p>{`経過時間: ${seconds} 秒`}</p>
      <button onClick={() => setRunning(true)}>スタート</button>
      <button onClick={() => setRunning(false)}>ストップ</button>
      <button onClick={reset}>リセット</button>
    </div>
  )
}

export default App
```

`useEffect` の部分を、あらためて見ます。

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

**クリーンアップ関数を消すと何が起きるか、一度試してください。** `return () => { clearInterval(id) }` の行を消して**ストップとスタートを何度か押す**と、解除されなかったインターバルが積み重なり、秒数が2倍、3倍の速さで進みます。**依存配列が `[running]` なので、増えるのは `running` を切り替えたときです。**

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

参照: https://developer.mozilla.org/ja/docs/Web/API/Crypto/randomUUID

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

描画側は、入力フォームと一覧の2つです。`map` でリストを作り、各要素に `key` を付けます。

```tsx
return (
  <div>
    <h1>メモ</h1>

    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="本文"
      />
      <button onClick={addPost}>追加</button>
    </div>

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
  </div>
)
```

**`App.tsx` はタイマーから全面的に置き換わります。** `import { useState } from 'react'` から始まり、`type Post` の定義、上に挙げた3つの状態と3つの操作、この `return` という並びです。`useEffect` と `setInterval` はもう使いません。

入力欄が `value` と `onChange` の組になっていることに注目してください。**React では、入力欄の値も状態として持ちます**（制御コンポーネント）。`value` だけ指定して `onChange` を書かないと、状態が変わらないので文字を打っても何も起きません。

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
> - **Props は書き換えてはいけません。** 言語の仕組みとして禁止されているわけではありませんが、書き換えると**親が持っているデータを裏で壊したうえに、React には変更が伝わらない**（再描画されない）という、いちばん厄介な壊れ方をします。親の状態を変えたいときは、親から渡された関数を呼びます

**どこで分割するか**

判断基準を先に決めておきます。この記事では次の2つで分けています。

- **役割が違うもの**（入力フォームと一覧は別の仕事をしている）
- **繰り返し描かれるもの**（一覧の1行は `map` の中で何度も描かれる）

`apps/web/src/` を次の形にします。

```
src/
├── App.tsx              状態を持ち、全体を組み立てる
├── types.ts             型の定義
└── components/
    ├── PostForm.tsx     入力欄と「追加」ボタン
    ├── PostList.tsx     メモの一覧
    └── PostItem.tsx     一覧の1行
```

**型を切り出す**

`Post` 型は複数のファイルから使うので、独立したファイルにします。`apps/web/src/types.ts`:

```ts
export type Post = {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}
```

**入力フォーム**

`apps/web/src/components/PostForm.tsx`:

```tsx
import { useState } from 'react'

type Props = {
  onAdd: (values: { title: string; content: string }) => void
}

export function PostForm({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleAdd = () => {
    if (title === '' || content === '') return

    onAdd({ title, content })
    setTitle('')
    setContent('')
  }

  return (
    <div className="post-form">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="本文"
      />
      <button onClick={handleAdd}>追加</button>
    </div>
  )
}
```

**入力中の値は `PostForm` の中に閉じ込めています。** [2.6](#26-編集可能なリスト-メモリスト) では `title` と `content` を `App` が持っていましたが、この2つを使うのは入力欄だけです。**状態は、それを使うコンポーネントのうち一番下に置きます。** 上に置くほど、関係のないコンポーネントまで再描画の対象になります。

追加されたことは親に伝える必要があるので、`onAdd` という関数を Props で受け取って呼びます。**これが「子から親への通知」です。** 子は「追加ボタンが押され、内容はこれです」と伝えるだけで、配列を実際に変更するのは状態を持っている `App` の仕事です。

**一覧の1行**

`apps/web/src/components/PostItem.tsx`:

```tsx
import type { Post } from '../types'

type Props = {
  post: Post
  onUpdate: (id: string, values: { title?: string; content?: string }) => void
  onDelete: (id: string) => void
}

export function PostItem({ post, onUpdate, onDelete }: Props) {
  return (
    <li className="post-item">
      <input
        value={post.title}
        onChange={(e) => onUpdate(post.id, { title: e.target.value })}
      />
      <textarea
        value={post.content}
        onChange={(e) => onUpdate(post.id, { content: e.target.value })}
      />
      <button onClick={() => onDelete(post.id)}>削除</button>
    </li>
  )
}
```

**Props の型は `type Props = { ... }` で定義し、引数の位置で分割代入して受け取ります。** `({ post, onUpdate, onDelete }: Props)` は「Props という型のオブジェクトを1つ受け取り、その3つのプロパティを取り出す」という意味です。

**一覧**

`apps/web/src/components/PostList.tsx`:

```tsx
import type { Post } from '../types'
import { PostItem } from './PostItem'

type Props = {
  posts: Post[]
  onUpdate: (id: string, values: { title?: string; content?: string }) => void
  onDelete: (id: string) => void
}

export function PostList({ posts, onUpdate, onDelete }: Props) {
  if (posts.length === 0) {
    return <p>まだメモがありません。</p>
  }

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <PostItem
          key={post.id}
          post={post}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}
```

**「メモが1件も無いとき」の表示をここに置いています。** 一覧を描く責任を持つコンポーネントが、空の場合も引き受ける形です。`App` 側に `posts.length === 0 ? ... : ...` を書かずに済みます。

**組み立てる**

`App.tsx` は、状態と3つの操作を持ち、あとは組み立てるだけになります。

```tsx
import { useState } from 'react'
import { PostForm } from './components/PostForm'
import { PostList } from './components/PostList'
import type { Post } from './types'

function App() {
  const [posts, setPosts] = useState<Post[]>([])

  // 入力欄が PostForm に移ったので、addPost は値を引数で受け取る形になります
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

  // updatePost と deletePost は 2.6 のままです

  return (
    <main>
      <h1>メモ</h1>
      <PostForm onAdd={addPost} />
      <PostList posts={posts} onUpdate={updatePost} onDelete={deletePost} />
    </main>
  )
}

export default App
```

**`App` は状態を持つだけになり、見た目を組み立てる部分は3行になりました。** どのコンポーネントも、自分が何を受け取って何を返すかだけを見れば読めます。

`className` は [2.8](#28-css-基礎) で書くスタイルの当て先です。この時点では見た目は変わりません。

## 2.8 CSS 基礎

ここまで見た目には手を付けていません。CSS の基本的な考え方を押さえます。React に固有の話ではなく、Web 全般の話です。

**ボックスモデル**

**すべての要素は長方形の箱です。** 箱は内側から順に、内容 (content)、余白の内側 (padding)、枠線 (border)、余白の外側 (margin) の4層でできています。

TODO(執筆時) 図: ボックスモデルの4層と、`box-sizing` による `width` の意味の違い

問題になるのは `width` がどこまでを指すかです。既定の `box-sizing: content-box` では、`width` は**内容の幅だけ**を指します。つまり `width: 100%` に `padding: 8px` と `border: 1px` を足すと、実際の幅は `100% + 18px` になり、親からはみ出します。

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

`border-box` にすると、`width` が**枠線までを含んだ幅**になります。指定した数字がそのまま見た目の幅になるので、計算が要りません。**全要素にこれを指定するのは定番の設定です。**（`margin` は含まれません。外側の余白は常に別勘定です）

**`display`: 箱の並び方**

| 値 | 並び方 | `width` / `height` |
|---|---|---|
| `block` | 縦に積まれ、横幅いっぱいに広がる（`div`、`p`、`h1`、`ul`、`li`） | 効く |
| `inline` | 文章の中に流れ込み、内容の幅しか取らない（`span`、`a`、`strong`） | **効かない** |
| `inline-block` | 文章の中に流れ込むが、箱としての幅と高さを持つ | 効く |

TODO(執筆時) 図: `block` / `inline` / `inline-block` の3つを並べ、幅・高さ・改行の挙動を比較する

**`inline` に `width` と `height` が効かないことが、最初にぶつかる壁です。** 上下方向の `margin` と `padding` も、期待どおりには効きません（`padding` は描画されますが、行の高さを押し広げません）。リンクやボタンに大きさを持たせたいときは `inline-block` にするか、後述の Flexbox の子にします。

**Flexbox: 1次元の並べ方**

親に `display: flex` を指定すると、**子要素を1本の軸に沿って並べられます。**

```css
.post-item {
  display: flex;
  align-items: center;       /* 交差軸（縦）の位置 */
  justify-content: space-between;  /* 主軸（横）の配り方 */
  gap: 16px;                 /* 子どうしの間隔 */
}
```

軸は2本あります。`flex-direction: row`（既定）なら**主軸が横、交差軸が縦**です。`column` にすると、この2つが入れ替わります。

TODO(執筆時) 図: `flex-direction: row` と `column` で主軸と交差軸が入れ替わること。`justify-content` と `align-items` がどちらの軸を指すか

| プロパティ | どちらの軸 | よく使う値 |
|---|---|---|
| `justify-content` | 主軸 | `flex-start` / `center` / `space-between` |
| `align-items` | 交差軸 | `stretch`（既定）/ `center` / `flex-start` |
| `gap` | 両方 | 長さ |

**`justify-content` が「横方向」だと覚えないでください。** `flex-direction: column` にした瞬間に縦方向の指定になります。**「主軸」「交差軸」で覚えるのが唯一の近道です。**

`gap` は子どうしの間隔です。以前は `margin` で調整していましたが、`gap` なら「最後の要素にだけ余白が余る」といった調整が要りません。

**Grid: 2次元の並べ方**

行と列の両方を同時に扱いたいときは `display: grid` です。

```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;  /* 1列目は固定、2列目は残り全部 */
  gap: 16px;
}
```

`1fr` は「余った領域の1つぶん」を意味する Grid 専用の単位です。**「1列に並べたい」なら Flexbox、「表のような格子に置きたい」なら Grid** という使い分けで、まずは足ります。**このメモアプリは Flexbox だけで組めるので、Grid と次の `position` は、この章では書きません。** どちらも自分で画面を作るときに必ず要るので、ここで頭に入れておいてください。

**`position`: 通常の流れから外す**

| 値 | 挙動 |
|---|---|
| `static` | 既定。通常の流れのまま。`top` などは効かない |
| `relative` | 通常の流れに場所を残したまま、そこからずらす |
| `absolute` | **流れから外れ**、最も近い「`static` 以外の祖先」を基準に配置される |
| `fixed` | 流れから外れ、画面（ビューポート）を基準に固定される |
| `sticky` | 通常は流れのまま。スクロールで指定位置に達すると、そこに貼り付く |

TODO(執筆時) 図: `absolute` が「最も近い `static` 以外の祖先」を基準にすること

**`absolute` の基準は親要素ではありません。** 祖先をたどって、最初に見つかった `position` が `static` 以外の要素です。見つからなければページ全体が基準になります。そのため、**基準にしたい要素に `position: relative` を付けておく**のが定石です（`relative` は付けるだけでは見た目が変わりません）。バッジや閉じるボタンを右上に重ねる、といった配置はこの組み合わせで作ります。

メモアプリが意図した配置で表示されれば成功です。

**つまずきポイント**

> [!TIP]
> - **`inline` 要素には `width` と `height` が効きません。** `margin` と `padding` も上下方向は期待通りに効きません。ここが最も引っかかる箇所です
> - **`position: absolute` の基準は「最も近い `position` が `static` 以外の祖先」です。** 基準にしたい要素に `position: relative` を付けるのが定石です
> - **Flexbox の `justify-content` と `align-items` は、`flex-direction` によって向きが入れ替わります**
> - 思ったところに要素が無いときは、ブラウザの開発者ツールで要素を選び、ボックスモデルの図（content / padding / border / margin が色分けされたもの）を見てください。どの層が効いているかがそのまま見えます

参照: https://developer.mozilla.org/ja/docs/Learn_web_development/Core/CSS_layout

**コード**

[2.4](#24-カウンター) で空にした `apps/web/src/index.css` に書きます。この記事では CSS Modules などは使わず、クラス名を直接書く方式で進めます。

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: #1f2328;
  background-color: #ffffff;
}

main {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px;
}

h1 {
  font-size: 1.5rem;
}

input,
textarea {
  width: 100%;
  padding: 8px;
  font: inherit;
  border: 1px solid #d0d7de;
  border-radius: 6px;
}

textarea {
  min-height: 96px;
  resize: vertical;
}

button {
  padding: 8px 16px;
  font: inherit;
  color: #ffffff;
  background-color: #1f6feb;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background-color: #1a5fd0;
}

.post-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.post-form button,
.actions {
  align-self: flex-start;
}

.actions {
  display: flex;
  gap: 8px;
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

**上半分は、要素そのものへの指定です。** クラスを付けずに `body` や `input` を直接指定しているのは、アプリ全体で見た目を揃えるためです。`font: inherit` を入れているのは、**フォームの部品だけブラウザ既定のフォントになってしまうのを防ぐ**ためです。

**下半分が、[2.7](#27-コンポーネント分離) で付けたクラスへの指定です。** `.post-form` は縦並び、`.post-item` は横並びで両端に寄せる、という使い分けになっています。どちらも Flexbox です。

`align-self: flex-start` は、**Flexbox の子が交差軸方向に引き伸ばされるのを止める**指定です。これが無いと、縦並びの `.post-form` の中でボタンが横幅いっぱいに広がります。

本文が 720px の幅で中央に寄り、メモが枠付きのカードのように並べば成功です。

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

参照: https://reactrouter.com/start/declarative/installation

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

**編集の場所が変わります。** [2.7](#27-コンポーネント分離) までは一覧の中の入力欄で直接編集していましたが、ここからは一覧はタイトルのリンクだけになり、編集は個別ページで行います。`PostItem` はリンクと削除ボタンだけになります。

```tsx
import { Link } from 'react-router'
import type { Post } from '../types'

type Props = {
  post: Post
  onDelete: (id: string) => void
}

export function PostItem({ post, onDelete }: Props) {
  return (
    <li className="post-item">
      <Link to={`/posts/${post.id}`}>{post.title}</Link>
      <button onClick={() => onDelete(post.id)}>削除</button>
    </li>
  )
}
```

`PostList` からも `onUpdate` が不要になるので、Props と `PostItem` への受け渡しから外します。

**ページを作る**

`src/pages/` を作り、ルートに対応するコンポーネントを置きます。`apps/web/src/pages/PostListPage.tsx` は、[2.7](#27-コンポーネント分離) の `App` が持っていた見た目をそのまま引き取る形です。

```tsx
import { PostForm } from '../components/PostForm'
import { PostList } from '../components/PostList'
import type { Post } from '../types'

type Props = {
  posts: Post[]
  onAdd: (values: { title: string; content: string }) => void
  onDelete: (id: string) => void
}

export function PostListPage({ posts, onAdd, onDelete }: Props) {
  return (
    <main>
      <h1>メモ</h1>
      <PostForm onAdd={onAdd} />
      <PostList posts={posts} onDelete={onDelete} />
    </main>
  )
}
```

`apps/web/src/pages/PostDetailPage.tsx` では、URL の `:id` を `useParams` で受け取り、`posts` から該当するメモを探します。

```tsx
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Post } from '../types'

type Props = {
  posts: Post[]
  onUpdate: (id: string, values: { title: string; content: string }) => void
  onDelete: (id: string) => void
}

export function PostDetailPage({ posts, onUpdate, onDelete }: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const post = posts.find((p) => p.id === id)

  if (post === undefined) {
    return (
      <main>
        <p>メモが見つかりませんでした。</p>
        <Link to="/">一覧に戻る</Link>
      </main>
    )
  }

  return (
    <PostEditor
      key={post.id}
      post={post}
      onUpdate={onUpdate}
      onDelete={onDelete}
      navigate={navigate}
    />
  )
}
```

`useParams` の戻り値は `string | undefined` です。**URL は利用者が自由に書き換えられるため、「見つからなかった場合」の分岐は必ず必要になります。** [7.2](07_features.md#72-未ログインでも見られるページの土台を作る) で、この分岐が「非公開メモに未ログインでアクセスしたとき」の表示に繋がります。

編集フォームは、同じファイルの中で別のコンポーネントに分けています。

```tsx
type EditorProps = {
  post: Post
  onUpdate: (id: string, values: { title: string; content: string }) => void
  onDelete: (id: string) => void
  navigate: (to: string) => void
}

function PostEditor({ post, onUpdate, onDelete, navigate }: EditorProps) {
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)

  const handleUpdate = () => {
    onUpdate(post.id, { title, content })
    navigate('/')
  }

  const handleDelete = () => {
    onDelete(post.id)
    navigate('/')
  }

  return (
    <main>
      <Link to="/">一覧に戻る</Link>
      <h1>メモの編集</h1>
      <div className="post-form">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="actions">
          <button onClick={handleUpdate}>更新</button>
          <button onClick={handleDelete}>削除</button>
        </div>
      </div>
    </main>
  )
}
```

**入力中の値を `useState(post.title)` で初期化しているため、`post` が変わっても入力欄は初期値のままになります。** これを解決しているのが、呼び出し側の `key={post.id}` です。**`key` が変わると React はそのコンポーネントを作り直す**ので、別のメモを開いたときに `useState` の初期値から始まります。`key` は[2.6](#26-編集可能なリスト-メモリスト) でリスト描画に使ったものと同じ仕組みですが、ここでは「状態をリセットする道具」として使っています。

**編集を「入力のたびに反映」から「更新ボタンを押したときだけ反映」に変えています。** そのため `onUpdate` が受け取る値は `{ title, content }` の両方が揃った形になり、[2.6](#26-編集可能なリスト-メモリスト) の `{ title?: string; content?: string }`（どちらか一方だけ渡せる形）から変わります。`App` 側の型も合わせて直してください。

**ルートを定義する**

`App.tsx` は、状態を持ったままルートの定義だけを行う形になります。

```tsx
import { useState } from 'react'
import { Route, Routes } from 'react-router'
import { PostDetailPage } from './pages/PostDetailPage'
import { PostListPage } from './pages/PostListPage'
import type { Post } from './types'

function App() {
  const [posts, setPosts] = useState<Post[]>([])

  // addPost は 2.7 と同じ

  const updatePost = (
    id: string,
    values: { title: string; content: string },
  ) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, ...values, updatedAt: Date.now() } : post,
      ),
    )
  }

  // deletePost は 2.6 と同じ

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PostListPage posts={posts} onAdd={addPost} onDelete={deletePost} />
        }
      />
      <Route
        path="/posts/:id"
        element={
          <PostDetailPage
            posts={posts}
            onUpdate={updatePost}
            onDelete={deletePost}
          />
        }
      />
    </Routes>
  )
}
```

**複数ページで状態を共有する方法**が、ここに現れています。`posts` を持っているのは `App` だけで、各ページは Props として受け取ります。状態を持つ場所を、それを使うページより上に置く形です。

## 2.10 oxlint / oxfmt のセットアップ

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
  "ignorePatterns": ["dist", ".wrangler", "package-lock.json", "*.md"]
}
```

`semi`（行末のセミコロン）と `singleQuote`（文字列の引用符）は好みです。この記事のコードは、この2つの設定で整形したものに揃えてあります。`printWidth` は折り返す行の長さで、oxfmt の既定は 100 です。

`sortPackageJson` を `false` にしているのは、**既定では `package.json` のキーを決まった順序に並び替えるためです。** npm が書いた内容が整形のたびに動くと、自分で足した行がどれなのか分かりにくくなります。

`ignorePatterns` に `*.md` を入れているのは、**`README.md` や [1.9](01_setup.md#19-任意-claude-code--codex) の `AGENTS.md` まで書き換えられるのを避ける**ためです。oxfmt は Markdown も整形の対象にします。[3章](03_backend.md)以降で生成物が増えたら、ここに足していきます。

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

**型検査のスクリプトも、ここで足しておきます。** `apps/web/package.json` に追加してください。

```json
{
  "scripts": {
    "typecheck": "tsc -b"
  }
}
```

**開発サーバー（`npm run dev`）は型エラーがあっても動きます。** Vite は型検査をせずに型注釈を取り除くだけだからです。**型エラーに気づくのはビルドか、この `typecheck` を実行したときです。** [5.2](05_deploy.md#52-github-actions-を構築する) の CI でも実行します。

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

**再レンダリングとは何か**

React では、コンポーネントは**ただの関数**です。`App()` を実行すると JSX が返り、それが画面になります。

状態が変わると、React は**そのコンポーネントの関数をもう一度実行します。** これが再レンダリングです。`setCount(1)` を呼ぶと `App()` がまた実行され、今度は `count` が `1` の状態で JSX が返ります。

**関数の中で宣言した変数は、実行のたびに作り直されます。** それでも `count` の値が保たれるのは、値を持っているのが関数の外（React 側）だからです。`useState` は「React が預かっている値と、それを更新する関数」を取り出す窓口にすぎません。

再レンダリングが起きるきっかけは、実質的に次の3つです。

- そのコンポーネントの状態 (`useState` の値) が変わった
- 親が再レンダリングされた
- 受け取っている context の値が変わった

**`count = count + 1` では画面が変わらない理由**が、ここにあります。React はその代入を知る手段がなく、関数を実行し直さないためです。

**仮想 DOM と差分更新**

関数を丸ごと実行し直すなら、画面全体を描き直すことになりそうですが、そうはなりません。

React は、返された JSX を**メモリ上の軽いオブジェクト（仮想 DOM）**として持ちます。再レンダリングのたびに、前回の仮想 DOM と新しい仮想 DOM を比べ、**違うところだけ**を実際の DOM に反映します。`<p>現在の値: {count}</p>` の数字だけが変わったなら、書き換わるのはそのテキストだけです。

実際の DOM の操作は重い処理です。**「毎回すべてを組み立て直す」という書きやすさと、「必要な部分しか触らない」という速度を両立させるための仕組み**が仮想 DOM です。

[2.6](#26-編集可能なリスト-メモリスト) で `key` が必要だったのは、この比較のためです。リストの要素が増減したとき、React は `key` を手がかりに「これは前回のどの要素か」を対応づけます。`key` にインデックスを使うと、要素を削除したときに対応づけがずれ、入力中の文字が別の行に残るといった壊れ方をします。

**SPA とは何か**

従来の Web サイトは、リンクをクリックするたびにサーバーへ HTML を取りに行き、**ページ全体を読み込み直していました**（MPA: Multi Page Application）。

SPA (Single Page Application) は、**最初に1つの HTML と JavaScript を読み込んだあとは、ページ遷移も含めてすべてブラウザ側で処理します。** [2.9](#29-react-router-でページを分ける) で `<a href>` ではなく `<Link to>` を使ったのは、まさにこの違いです。`<a href>` はサーバーに取りに行き、`<Link to>` は URL の表示だけ書き換えて描画をブラウザ内で差し替えます。

| | MPA | SPA |
|---|---|---|
| ページ遷移 | サーバーから HTML を取り直す | ブラウザ内で描画を差し替える |
| 遷移時のちらつき | 出やすい | 出にくい |
| 遷移時の状態（ブラウザのメモリ上のもの） | 失われる | 保たれる |
| 最初の表示 | HTML が届いた時点で見える | JavaScript を読んで実行するまで空 |

**これは一般的な傾向で、必ずそうなるわけではありません。** SPA でも、データの取得待ちで読み込み表示を挟めばちらつきますし、コンポーネントが消えればその状態も消えます。MPA でも、サーバーや URL、ブラウザのストレージに置いた情報は遷移をまたいで保てます。

**利点は、遷移が速く、状態を保てることです。** メモアプリで一覧から詳細に移っても `posts` が消えないのは、ページ全体が読み込み直されていないからです。

**欠点は、最初の表示が JavaScript の実行に依存することです。** 初回の読み込みで JavaScript のダウンロードと実行が終わるまで、画面は空白です。検索エンジンや SNS のプレビューがこの空白を読んでしまう問題もあります。この欠点は [7.5](07_features.md#75-csr-の限界) で実際に確認します。

## 2.12 任意) CSR / SSG / SSR / ISR

[2.11](#211-任意-react-の仕組み--なぜ-spa-なのか) で見たとおり、SPA は「最初の HTML が空である」という欠点を持ちます。**これは「HTML をいつ、どこで作るか」の選び方の問題で、選択肢は4つあります。**

| 方式 | HTML をいつ作るか | どこで作るか |
|---|---|---|
| **CSR** (Client Side Rendering) | ブラウザで JavaScript を実行したとき | ブラウザ |
| **SSG** (Static Site Generation) | ビルド時（デプロイの前） | 開発者の手元 / CI |
| **SSR** (Server Side Rendering) | リクエストが来るたび | サーバー |
| **ISR** (Incremental Static Regeneration) | ビルド時に作り、一定時間ごとに作り直す | サーバー |

**このチュートリアルで作るのは CSR です。** サーバーが返す HTML は `<div id="root"></div>` がほぼ空のまま置かれたもので、中身はブラウザが JavaScript を実行して埋めます。

それぞれの向き不向きは、**内容が誰にとっても同じか、更新頻度はどれくらいか**で決まります。

| 方式 | 向いているもの | 向かないもの |
|---|---|---|
| CSR | ログインが前提の管理画面、社内ツール | 検索から流入させたいページ |
| SSG | ドキュメント、ブログ、ランディングページ | 更新のたびに再ビルドが要るので、頻繁に変わる内容 |
| SSR | ユーザーごとに内容が変わり、かつ検索にも載せたいページ | サーバーの負荷とコストが上がる |
| ISR | 記事一覧のように、多少古くても許容できて数が多いもの | 即時反映が必須のもの |

**今回のアプリは、途中まで CSR で問題がありません。** 自分のメモを見るにはログインが必要で、検索エンジンに拾わせる必要もないためです。問題が出るのは [7章](07_features.md)で**公開ページ**を足したときです。「ログインしていない人にも見せたい」「URL を共有したときにプレビューを出したい」という要件は、CSR と相性が悪くなります。

**この章を終える前に**

`npm run build -w apps/web` を実行してください。**開発サーバーは型検査をしないため、import の漏れや型の不整合が残っていても気づけません。** ビルドが通れば、この章のコードは型として整合しています。

```bash
npm run build -w apps/web
```

通ったらコミットしておきます。ここが `chapter-02` と比べる基準点になります。

```bash
git add .
git commit -m "feat(web): メモアプリの UI を作る"
```

**注記**

この節は概念の紹介に留めます。この記事では React Router の Declarative mode を使うため、実際にレンダリング方式を切り替える機会はありません。切り替えたい場合は、その仕組みを持つフレームワーク（React Router の Framework mode、Next.js など）を使うことになります。この選択が何をもたらすかは、[7.5](07_features.md#75-csr-の限界) で実際に確認します。

**次の章**: [3 Hono でバックエンドを作る](03_backend.md)
