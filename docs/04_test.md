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

**つまずきポイント**

> [!TIP]
> - テストしすぎると、リファクタリングのたびにテストが壊れて負担になります。「表示が変わったら壊れるテスト」ではなく「振る舞いが変わったら壊れるテスト」を目指します
> - `getBy` と `queryBy` と `findBy` の使い分けが分かりにくい箇所です

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

describe('メモ一覧', () => {
  it('追加すると一覧に増える', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByPlaceholderText('タイトル'), '買い物')
    await user.type(screen.getByPlaceholderText('本文'), 'たまごを買う')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(screen.getByRole('link', { name: '買い物' })).toBeInTheDocument()
  })

  it('タイトルか本文が空のときは追加できない', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByPlaceholderText('タイトル'), 'タイトルだけ')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(screen.getByText('まだメモがありません。')).toBeInTheDocument()
  })
})
```

**`getByRole('button', { name: '追加' })` のように、画面に見えている情報で要素を探しているのがポイントです。** クラス名や `data-testid` ではなく、利用者が見て操作するのと同じ手がかりを使います。こうしておくと、内部構造を変えてもテストは壊れません。

`npm test -w apps/web` が通れば成功です。

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

`apps/api/vitest.config.ts` を作ります。

```ts
import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// drizzle-kit が生成した SQL を読み、テスト用の D1 に適用できるようにする
const migrations = await readD1Migrations(path.join(import.meta.dirname, 'drizzle'))

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
import { applyD1Migrations, env } from 'cloudflare:test'

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

`apps/api/test/env.d.ts` で、テスト側から見える環境の型を宣言します。`cloudflare:test` の `env` は `Cloudflare.Env` 型なので、そこに足す形になります。

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

**これを忘れると、テストは動くのに `tsc --noEmit` だけが `Module 'cloudflare:test' has no exported member 'SELF'` で落ちます。**

**テストを書く**

`SELF.fetch()` で、実際に Worker にリクエストを送れます。

```ts
import { SELF, env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'

// Better Auth は baseURL と一致しないオリジンからのリクエストを拒否する（422）ため、
// wrangler.jsonc の BETTER_AUTH_URL と同じオリジンで叩く
const BASE = 'http://localhost:8787'

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

複数ユーザーは、サインアップのエンドポイントを叩くヘルパーで用意します。トークンは [3.10](03_backend.md#310-better-auth-を導入しposts-をユーザーに紐づける) で確認した `set-auth-token` ヘッダーから取り出します。

```ts
const signUp = async (userId: string) => {
  const res = await SELF.fetch(`${BASE}/auth/sign-up/email`, {
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
  return { token: res.headers.get('set-auth-token')!, userId }
}
```

認可のテストは、この節の中心です。

```ts
it('他人の非公開メモは 404（403 ではない）', async () => {
  const post = await createPost(alice, false)

  const res = await SELF.fetch(`${BASE}/posts/${post.id}`, {
    headers: { Authorization: `Bearer ${bob.token}` },
  })
  expect(res.status).toBe(404)
})

it('レスポンスにメールアドレスが含まれない', async () => {
  await createPost(alice, true)

  const res = await SELF.fetch(`${BASE}/public/posts`)
  expect(await res.text()).not.toContain('@example.com')
})
```

後者は、**レスポンス全体を文字列として見て、含まれてはいけないものが無いことを確認する**書き方です。カラムを1つ追加したときに漏れを検出できます。

`npm test -w apps/api` が通れば成功です。

**追加のつまずきポイント**

> [!TIP]
> - **テスト間でストレージは自動ではリセットされません。** 上記のように明示的に消してください。消し忘れると、2つ目以降のテストでサインアップが `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`（422）になります
> - **リクエストのオリジンは `BETTER_AUTH_URL` と揃えてください。** `https://example.com` のような別オリジンから叩くと、Better Auth が 422 を返します

---

---

**この章のコード**: `chapter-04` ブランチ
