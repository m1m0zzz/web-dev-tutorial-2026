import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSession, signOut as clearToken } from '../lib/auth'
import { postsKey } from './usePosts'

export const sessionKey = ['session'] as const

export const useSession = () =>
  useQuery({
    queryKey: sessionKey,
    queryFn: getSession,
    staleTime: 60_000,
  })

export const useSignOut = () => {
  const queryClient = useQueryClient()

  return () => {
    clearToken()
    // queryClient.clear() だけでは、購読中の useSession() に「ログアウトした」ことが
    // 伝わらない（購読先の query ごと消えるだけで、再描画が起きない）。
    // セッションを明示的に null にして、そのうえで自分のメモのキャッシュを捨てる
    queryClient.setQueryData(sessionKey, null)
    queryClient.removeQueries({ queryKey: postsKey })
  }
}
