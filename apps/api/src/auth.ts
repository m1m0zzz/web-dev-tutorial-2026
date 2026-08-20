import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import * as schema from './db/auth-schema'

// URL に出るユーザー ID。予約語は将来のパス追加とぶつかるため除外する
const RESERVED_USER_IDS = ['auth', 'api', 'health', 'posts', 'public', 'users']

export const userIdSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9-]+$/, '英小文字・数字・ハイフンのみ使えます')
  .refine((value) => !RESERVED_USER_IDS.includes(value), '予約語は使えません')

const options = {
  basePath: '/auth',
  emailAndPassword: { enabled: true },
  plugins: [bearer()],
  user: {
    additionalFields: {
      userId: {
        type: 'string',
        required: true,
        input: true,
        unique: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user: Record<string, unknown>) => {
          const result = userIdSchema.safeParse(user.userId)
          if (!result.success) {
            throw new APIError('BAD_REQUEST', {
              message: result.error.issues[0].message,
            })
          }
        },
      },
    },
  },
} satisfies BetterAuthOptions

export const createAuth = (env: CloudflareBindings) =>
  betterAuth({
    ...options,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: 'sqlite',
      schema,
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
  })

// Better Auth CLI がスキーマ生成のために読み込む定義。リクエスト処理には使いません
export const auth = betterAuth({
  ...options,
  database: drizzleAdapter(drizzle({} as D1Database, { schema }), {
    provider: 'sqlite',
    schema,
  }),
})
