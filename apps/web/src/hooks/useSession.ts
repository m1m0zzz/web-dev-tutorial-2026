import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSession, signOut as clearToken } from '../lib/auth'

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
    queryClient.clear()
  }
}
