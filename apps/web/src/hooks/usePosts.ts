import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '../lib/api'

export const postsKey = ['posts'] as const

export const usePosts = () =>
  useQuery({
    queryKey: postsKey,
    queryFn: async () => {
      const res = await client.posts.$get()
      if (!res.ok) throw new Error('メモの取得に失敗しました')
      return await res.json()
    },
  })

export const usePost = (id: string) =>
  useQuery({
    queryKey: [...postsKey, id],
    queryFn: async () => {
      const res = await client.posts[':id'].$get({ param: { id } })
      if (!res.ok) throw new Error('メモが見つかりませんでした')
      return await res.json()
    },
  })

export const useCreatePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      const res = await client.posts.$post({ json: input })
      if (!res.ok) throw new Error('メモの作成に失敗しました')
      return await res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postsKey }),
  })
}

export const useUpdatePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      title: string
      content: string
      isPublic?: boolean
    }) => {
      const { id, ...body } = input
      const res = await client.posts[':id'].$put({ param: { id }, json: body })
      if (!res.ok) throw new Error('メモの更新に失敗しました')
      return await res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postsKey }),
  })
}

export const useDeletePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.posts[':id'].$delete({ param: { id } })
      if (!res.ok) throw new Error('メモの削除に失敗しました')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postsKey }),
  })
}

export const usePublicPosts = () =>
  useQuery({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const res = await client.public.posts.$get()
      if (!res.ok) throw new Error('公開メモの取得に失敗しました')
      return await res.json()
    },
  })

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
