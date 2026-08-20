import type { InferResponseType } from 'hono/client'
import type { client } from './lib/api'

// API のレスポンスから型を導く（6.3 Hono RPC）。
// 日時は JSON になる過程で ISO 文字列になるため、ここでも string になる
export type Post = InferResponseType<typeof client.posts.$get>[number]
