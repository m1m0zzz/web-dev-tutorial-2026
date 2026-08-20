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
