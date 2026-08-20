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

describe('バリデーション', () => {
  it('タイトルが空だと 400', async () => {
    const res = await exports.default.fetch(`${BASE}/posts`, {
      method: 'POST',
      headers: authHeaders(alice),
      body: JSON.stringify({ title: '', content: '本文' }),
    })
    expect(res.status).toBe(400)
  })

  it('ユーザー ID の予約語は弾かれる', async () => {
    const res = await exports.default.fetch(`${BASE}/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'public@example.com',
        password: 'password1234',
        name: '予約語',
        userId: 'public',
      }),
    })
    expect(res.status).toBe(400)
  })
})

describe('認証', () => {
  it('トークンなしの GET /posts は 401', async () => {
    const res = await exports.default.fetch(`${BASE}/posts`)
    expect(res.status).toBe(401)
  })
})

describe('CRUD', () => {
  it('作成・取得・更新・削除ができる', async () => {
    const post = await createPost(alice, false)

    const got = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
      headers: authHeaders(alice),
    })
    expect(got.status).toBe(200)

    const updated = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
      method: 'PUT',
      headers: authHeaders(alice),
      body: JSON.stringify({ title: '更新後', content: '本文' }),
    })
    expect(updated.status).toBe(200)
    expect(((await updated.json()) as { title: string }).title).toBe('更新後')

    const deleted = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
      method: 'DELETE',
      headers: authHeaders(alice),
    })
    expect(deleted.status).toBe(204)

    const gone = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
      headers: authHeaders(alice),
    })
    expect(gone.status).toBe(404)
  })

  it('一覧には自分のメモだけが返る', async () => {
    await createPost(alice, false)

    const res = await exports.default.fetch(`${BASE}/posts`, {
      headers: authHeaders(bob),
    })
    expect(await res.json()).toEqual([])
  })
})

describe('認可', () => {
  it('他人の非公開メモは 404（403 ではない）', async () => {
    const post = await createPost(alice, false)

    const res = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
      headers: authHeaders(bob),
    })
    expect(res.status).toBe(404)
  })

  it('他人の公開メモは未ログインでも取得できる', async () => {
    const post = await createPost(alice, true)

    const res = await exports.default.fetch(`${BASE}/posts/${post.id}`)
    expect(res.status).toBe(200)
  })

  it('他人のメモは公開・非公開を問わず更新できない', async () => {
    const publicPost = await createPost(alice, true)
    const privatePost = await createPost(alice, false)

    for (const post of [publicPost, privatePost]) {
      const res = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
        method: 'PUT',
        headers: authHeaders(bob),
        body: JSON.stringify({ title: '乗っ取り', content: '本文' }),
      })
      expect(res.status).toBe(404)
    }
  })

  it('他人のメモは公開・非公開を問わず削除できない', async () => {
    for (const isPublic of [true, false]) {
      const post = await createPost(alice, isPublic)

      const res = await exports.default.fetch(`${BASE}/posts/${post.id}`, {
        method: 'DELETE',
        headers: authHeaders(bob),
      })
      expect(res.status).toBe(404)
    }
  })
})

describe('ユーザー ID', () => {
  // userId は URL に出るため変更できてはいけない。
  // additionalFields の input: true は更新時の入力も許可するので、
  // auth.ts の databaseHooks.user.update.before で塞いでいる
  it('サインアップ後に変更できない', async () => {
    const res = await exports.default.fetch(`${BASE}/auth/update-user`, {
      method: 'POST',
      headers: authHeaders(alice),
      body: JSON.stringify({ userId: 'hijacked' }),
    })
    expect(res.status).toBe(400)

    const session = await exports.default.fetch(`${BASE}/auth/get-session`, {
      headers: authHeaders(alice),
    })
    const body = (await session.json()) as { user: { userId: string } }
    expect(body.user.userId).toBe('alice')
  })

  it('表示名は変更できる', async () => {
    const res = await exports.default.fetch(`${BASE}/auth/update-user`, {
      method: 'POST',
      headers: authHeaders(alice),
      body: JSON.stringify({ name: '新しい名前' }),
    })
    expect(res.status).toBe(200)

    const session = await exports.default.fetch(`${BASE}/auth/get-session`, {
      headers: authHeaders(alice),
    })
    const body = (await session.json()) as { user: { name: string } }
    expect(body.user.name).toBe('新しい名前')
  })
})

describe('公開一覧', () => {
  it('非公開メモが含まれない', async () => {
    await createPost(alice, true)
    await createPost(alice, false)

    const res = await exports.default.fetch(`${BASE}/public/posts`)
    const body = (await res.json()) as { title: string }[]

    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('公開メモ')
  })

  it('レスポンスにメールアドレスが含まれない', async () => {
    await createPost(alice, true)

    const res = await exports.default.fetch(`${BASE}/public/posts`)
    expect(await res.text()).not.toContain('@example.com')
  })

  it('存在しないユーザーのページは 404', async () => {
    const res = await exports.default.fetch(`${BASE}/users/nobody/posts`)
    expect(res.status).toBe(404)
  })
})
