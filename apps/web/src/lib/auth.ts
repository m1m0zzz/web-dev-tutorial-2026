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
