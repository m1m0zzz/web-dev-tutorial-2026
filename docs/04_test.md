# 4 テストを書く

ここまでに作ったフロントエンドとバックエンドに、自動テストを足します。新しい機能は作りません。

## 4.1 フロントエンドのテスト

手動での動作確認は、機能が増えるほど時間がかかり、確認漏れも起きます。自動化します。

**使うもの**

- Vitest（テストランナー）
- Testing Library（React コンポーネントのテスト）

**テスト対象**

[2章](02_frontend.md)で作ったメモアプリのコンポーネント。

- 一覧が表示される
- 追加ボタンで項目が増える
- 削除ボタンで項目が減る
- タイトルまたは本文が空のときは追加できない

**扱うこと**

- Vitest のセットアップ
- Testing Library の基本（`render`、`screen`、`userEvent`）
- 「実装の詳細ではなく、ユーザーから見た振る舞いをテストする」という考え方
- 何をテストして、何をテストしないか

**テストを構成する道具**

初めて見る名前が並ぶので、先に役割を押さえます。

| 名前 | 役割 |
|---|---|
| `describe` | テストのグループ。まとまりに名前を付けるだけ |
| `it` | テスト1件。「〜であること」を書く |
| `expect(...)` | 期待する結果を書く。`toBe`、`toBeInTheDocument` などと組み合わせる |
| `render(...)` | コンポーネントをテスト用の DOM に描画する |
| `screen` | 描画されたものから要素を探す入り口 |
| `userEvent` | クリックや入力を、利用者の操作として再現する |

**1件のテストは「準備 → 操作 → 確認」の3段階です。** `render` が準備、`userEvent` が操作、`expect` が確認にあたります。

**要素の探し方は3種類あります。**

| 接頭辞 | 意味 | 見つからないとき |
|---|---|---|
| `getBy...` | 今あるはずのものを取る | **例外を投げる**（テストが失敗する） |
| `queryBy...` | **無いこと**を確かめるときに使う | `null` を返す |
| `findBy...` | あとから現れるものを待つ（非同期） | 待って、それでも無ければ失敗 |

**「消えたこと」を確認するのに `getBy` を使うと、要素を探した時点で例外になります。** 削除のテストでは `queryBy` を使います。

**つまずきポイント**

> [!TIP]
> - テストしすぎると、リファクタリングのたびにテストが壊れて負担になります。「表示が変わったら壊れるテスト」ではなく「振る舞いが変わったら壊れるテスト」を目指します
> - **CSS のクラス名、状態の持ち方、DOM の入れ子は、直接テストしないでください。** これらは実装の都合で変わります

**セットアップ**

```bash
npm i -D -w apps/web vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom
```

Vitest の設定は、Vite の設定ファイルに相乗りできます。`apps/web/vite.config.ts` を書き換えます。

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Testing Library の自動クリーンアップ（各テスト後の unmount）は
    // グローバルの afterEach に登録されるため、globals が必要
    globals: true,
    setupFiles: './src/setup-tests.ts',
  },
})
```

**`defineConfig` の import 元が `vite` ではなく `vitest/config` になる点に注意してください。** `test` の設定はこちらにしかありません。

`apps/web/src/setup-tests.ts` は1行です。

```ts
import '@testing-library/jest-dom/vitest'
```

`toBeInTheDocument()` のような、DOM 向けのアサーションが使えるようになります。

`apps/web/package.json` にスクリプトを足します。

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**テストを書く**

`apps/web/src/App.test.tsx` を作ります。`App` はルーティングを含むので、`MemoryRouter`（履歴をメモリ上に持つ Router）で囲みます。

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App'

const renderApp = () =>
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

const addPost = async (title: string, content: string) => {
  const user = userEvent.setup()
  if (title !== '') {
    await user.type(screen.getByPlaceholderText('タイトル'), title)
  }
  if (content !== '') {
    await user.type(screen.getByPlaceholderText('本文'), content)
  }
  await user.click(screen.getByRole('button', { name: '追加' }))
}

describe('メモ一覧', () => {
  it('最初は空のメッセージが出る', () => {
    renderApp()
    expect(screen.getByText('まだメモがありません。')).toBeInTheDocument()
  })

  it('追加すると一覧に増える', async () => {
    renderApp()
    await addPost('買い物', 'たまごを買う')

    expect(screen.getByRole('link', { name: '買い物' })).toBeInTheDocument()
  })

  it('削除すると一覧から消える', async () => {
    const user = userEvent.setup()
    renderApp()
    await addPost('買い物', 'たまごを買う')

    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(
      screen.queryByRole('link', { name: '買い物' }),
    ).not.toBeInTheDocument()
  })

  it('タイトルか本文が空のときは追加できない', async () => {
    renderApp()
    await addPost('タイトルだけ', '')

    expect(screen.getByText('まだメモがありません。')).toBeInTheDocument()
  })
})
```

**`getByRole('button', { name: '追加' })` のように、画面に見えている情報で要素を探しているのがポイントです。** クラス名や `data-testid` ではなく、利用者が見て操作するのと同じ手がかりを使います。**内部の作りを変えてもテストは壊れませんが、ボタンの文言や役割を変えれば壊れます。** それは「利用者から見た振る舞いが変わった」ということなので、壊れてよい失敗です。

**削除のテストだけ `queryByRole` を使っています。** 消えたことを確かめるので、無ければ `null` を返すほうを使います。

**余力があれば、「タイトルが空・本文だけ」のケースも足してみてください。** 上のテストは「本文が空」の側しか確認していないので、逆向きの実装ミスを見逃します。

`npm test -w apps/web` を実行し、**5件すべてが通れば成功です**（`it.each` の2行は2件と数えます）。 型の確認も一度しておきます。

```bash
npm test -w apps/web
npm run typecheck -w apps/web
```

**追加のつまずきポイント**

> [!TIP]
> - **`globals: true` を外すと、テスト間で描画が残ります。** Testing Library の自動クリーンアップがグローバルの `afterEach` に依存しているためで、外すと「同じ placeholder の要素が複数見つかった」というエラーになります

## 4.2 バックエンドのテスト

API のテストです。Cloudflare Workers の実行環境は Node.js とは異なるため、専用のテスト環境を使います。

**使うもの**

- Vitest
- `@cloudflare/vitest-pool-workers`（Workers のランタイム上でテストを実行する）

**テスト対象**

[3章](03_backend.md)で作ったエンドポイントと認可。

| 分類 | ケース |
|---|---|
| 基本 | `/health` が 200 を返す |
| CRUD | メモの作成・取得・更新・削除 |
| バリデーション | 不正な形式で 400 が返る。ユーザー ID の予約語が弾かれる |
| 認証 | トークンなしで `GET /posts` が 401 を返す |
| 認可 | 他人の非公開メモが 404 になる（403 ではない） |
| 認可 | 他人の公開メモが未ログインで取得できる |
| 認可 | 他人のメモは公開・非公開を問わず更新・削除できない |
| 公開一覧 | `/public/posts` に非公開メモが含まれない |
| 公開一覧 | `/public/posts` のレスポンスにメールアドレスなどが含まれない |
| ユーザー ID | サインアップ後に変更できない（表示名は変更できる） |

**認可のテストがこの節の中心です。** CRUD が動くことは手動でも確認できますが、「見えてはいけないものが見えない」ことは、意識してテストを書かないと確認されません。

**扱うこと**

- `vitest-pool-workers` のセットアップ
- テスト用の D1 の準備とリセット
- 複数ユーザーを用意してテストする方法

**つまずきポイント**

> [!TIP]
> - **通常の Vitest ではなく `vitest-pool-workers` を使う理由は、Workers のランタイムが Node.js と異なるためです。** D1 のバインディングや `cloudflare:workers` からの import は、通常の Node.js 環境では動きません
> - テスト間でデータが残ると、実行順によって結果が変わるテストになります

**セットアップ**

```bash
npm i -D -w apps/api vitest @cloudflare/vitest-pool-workers
```

`apps/api/package.json` にスクリプトを足します。[4.1](#41-フロントエンドのテスト) でフロント側に入れたものと同じです。

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`apps/api/vitest.config.ts` を作ります。

```ts
import path from 'node:path'
import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// drizzle-kit が生成した SQL を読み、テスト用の D1 に適用できるようにする
const migrations = await readD1Migrations(
  path.join(import.meta.dirname, 'drizzle'),
)

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          BETTER_AUTH_SECRET: 'test-secret',
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./test/apply-migrations.ts'],
  },
})
```

`wrangler.jsonc` を読ませているので、D1 のバインディングや `vars` はそのまま使えます。`.dev.vars` も自動で読み込まれますが、**CI には `.dev.vars` が無い**ため、`BETTER_AUTH_SECRET` はテスト用の値をここでも渡しています。

`apps/api/test/apply-migrations.ts`:

```ts
import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

`apps/api/test/env.d.ts` で、テスト側から見える環境の型を宣言します。`env` は `Cloudflare.Env` 型なので、そこに足す形になります。

```ts
import type { D1Migration } from '@cloudflare/vitest-pool-workers'

// vitest.config.ts の miniflare.bindings で足したものを、テストから型付きで参照する
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}
```

`cloudflare:test` からの import を TypeScript に解決させるため、`apps/api/tsconfig.json` に型定義を足します。

```jsonc
{
  "compilerOptions": {
    "types": ["node", "@cloudflare/vitest-pool-workers/types"]
  }
}
```

`"node"` は 3.6 で足したものです。**`types` は「これだけを読み込む」という指定なので、追記する形にしてください。** 上書きすると `drizzle-studio.config.ts` が型エラーになります。

**これを忘れると、テストは動くのに `tsc --noEmit` だけが `Cannot find module 'cloudflare:test' or its corresponding type declarations.` で落ちます。**

**テストを書く**

`exports.default.fetch()` で、実際に Worker にリクエストを送れます。`exports` は `src/index.ts` の `export default` を指すループバックで、テストと同じコンテキストで動きます。

> [!NOTE]
> **開発サーバー（`npm run dev`）を起動する必要はありません。** テストはテスト用のランタイムの中で Worker を直接呼びます。D1 もテスト用のものです。あとで出てくる `http://localhost:8787` という URL も、**そのポートに通信するわけではなく**、リクエストのオリジンを指定しているだけです。

まず `apps/api/test/health.test.ts` から。いちばん短い形です。

```ts
import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

describe('GET /health', () => {
  it('200 と { status: "ok" } を返す', async () => {
    const res = await exports.default.fetch('https://example.com/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
```

次に `apps/api/test/posts.test.ts` です。**認可のテストは同じ準備を何度も必要とする**ので、先にヘルパーを作ります。

```ts
import { env, exports } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

// Better Auth は baseURL と一致しないオリジンからのリクエストを拒否する（422）ため、
// wrangler.jsonc の BETTER_AUTH_URL と同じオリジンで叩く
const BASE = 'http://localhost:8787'

type User = { token: string; userId: string }

const signUp = async (userId: string): Promise<User> => {
  const res = await exports.default.fetch(`${BASE}/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `${userId}@example.com`,
      password: 'password1234',
      name: `${userId} の表示名`,
      userId,
    }),
  })
  expect(res.status).toBe(200)

  const token = res.headers.get('set-auth-token')
  expect(token).not.toBeNull()
  return { token: token!, userId }
}

const authHeaders = (user: User) => ({
  Authorization: `Bearer ${user.token}`,
  'Content-Type': 'application/json',
})

const createPost = async (user: User, isPublic: boolean) => {
  const res = await exports.default.fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: authHeaders(user),
    body: JSON.stringify({
      title: isPublic ? '公開メモ' : '非公開メモ',
      content: '本文',
      isPublic,
    }),
  })
  expect(res.status).toBe(201)
  return (await res.json()) as { id: string }
}

let alice: User
let bob: User

// テスト間でデータが残ると、実行順で結果が変わるテストになる。
// D1 にはインタラクティブなトランザクションが無いので batch() でまとめて消す
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM posts'),
    env.DB.prepare('DELETE FROM session'),
    env.DB.prepare('DELETE FROM account'),
    env.DB.prepare('DELETE FROM verification'),
    env.DB.prepare('DELETE FROM user'),
  ])

  alice = await signUp('alice')
  bob = await signUp('bob')
})
```

**`expect(token).not.toBeNull()` を挟んでいるのが要点です。** この行が無いと、ヘッダーが取れなかったときに**認証のテストが `Bearer null` で失敗し、原因が分からなくなります。** 次の行の `token!` は「null ではない」と TypeScript に伝えるだけで、**実行時には何も確認しません。** 確認するのは `expect` のほうです。

準備ができたら、上の表のケースを1つずつ書いていきます。代表的なものを挙げます。

```ts
it('トークンなしで GET /posts は 401', async () => {
  const res = await exports.default.fetch(`${BASE}/posts`)
  expect(res.status).toBe(401)
})

it('他人の非公開メモは 404（403 ではない）', async () => {
  const post = await createPost(alice, false)

  const res = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
    headers: { Authorization: `Bearer ${bob.token}` },
  })
  expect(res.status).toBe(404)
})

it('他人のメモは公開でも更新できない', async () => {
  const post = await createPost(alice, true)

  const res = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
    method: 'PUT',
    headers: authHeaders(bob),
    body: JSON.stringify({ title: '乗っ取り', content: '書き換え' }),
  })
  expect(res.status).toBe(404)
})

it('レスポンスにメールアドレスが含まれない', async () => {
  await createPost(alice, true)

  const res = await exports.default.fetch(`${BASE}/public/posts`)
  expect(await res.text()).not.toContain('@example.com')
})
```

最後のものは、**レスポンス全体を文字列として見て、含まれてはいけないものが無いことを確認する**書き方です。**確認できるのは「テストデータのメールアドレスが混ざっていないこと」だけ**で、これで内部情報の漏れ全般を防げるわけではありません。返すべきキーを明示的に検証するテストと併用します。

**残りのケースも、上の表を見ながら同じ形で書いてください。** 完成形は `chapter-04` にあり、`health.test.ts` が1件、`posts.test.ts` が14件の**合わせて15件**です。

```bash
npm test -w apps/api
npm run typecheck -w apps/api
```

**15件が通り、型検査も通れば成功です。** 型検査を別に実行するのは、上の `tsconfig.json` の `types` を間違えたときに、**テストは通るのに `tsc` だけが落ちる**ことがあるためです。

**追加のつまずきポイント**

> [!TIP]
> - **テスト間でストレージは自動ではリセットされません。** 上記のように明示的に消してください。消し忘れると、2つ目以降のテストでサインアップが `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`（422）になります（`@cloudflare/vitest-pool-workers` 0.23 で確認。`beforeEach` の削除処理を外すと14件中13件が落ちました）
> - **`cloudflare:test` の `SELF` と `env` は非推奨です。** 0.23 の型定義に `@deprecated` が付いており、それぞれ `cloudflare:workers` の `exports.default` と `env` に置き換わりました。古い記事やサンプルは `SELF` のままなので、読み替えてください。`applyD1Migrations` は引き続き `cloudflare:test` から import します
> - **リクエストのオリジンは `BETTER_AUTH_URL` と揃えてください。** `https://example.com` のような別オリジンから叩くと、Better Auth が 422 を返します

**次の章**: [5 デプロイする](05_deploy.md)
