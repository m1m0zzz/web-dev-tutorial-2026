import { zValidator } from '@hono/zod-validator'
import { and, desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { z } from 'zod'
import { createAuth } from './auth'
import { user } from './db/auth-schema'
import { posts } from './db/schema'

type AuthUser = { id: string; userId: string; name: string }

type Env = {
  Bindings: CloudflareBindings
  Variables: { user: AuthUser | null }
}

const postInput = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  isPublic: z.boolean().optional(),
})

const getUser = async (c: {
  env: CloudflareBindings
  req: { raw: Request }
}): Promise<AuthUser | null> => {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (session === null) return null

  const { id, name, userId } = session.user as AuthUser
  return { id, name, userId }
}

// 認証必須。トークンが無ければ 401
const requireAuth = createMiddleware<Env>(async (c, next) => {
  const authUser = await getUser(c)
  if (authUser === null) {
    return c.json({ message: 'Unauthorized' }, 401)
  }
  c.set('user', authUser)
  await next()
})

// 任意認証。トークンがあれば誰か分かる。無くても通す
const optionalAuth = createMiddleware<Env>(async (c, next) => {
  c.set('user', await getUser(c))
  await next()
})

const app = new Hono<Env>()
  // フロントは別オリジンにデプロイするため、明示的に許可する
  .use('*', (c, next) =>
    cors({
      origin: c.env.CORS_ORIGIN,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['set-auth-token'],
      credentials: true,
    })(c, next),
  )

  .on(['GET', 'POST'], '/auth/*', (c) => createAuth(c.env).handler(c.req.raw))

  .get('/health', (c) => c.json({ status: 'ok' }))

  .get('/posts', requireAuth, async (c) => {
    const db = drizzle(c.env.DB)
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.userId, c.get('user')!.id))
      .orderBy(desc(posts.updatedAt))
      .all()

    return c.json(rows)
  })

  .post('/posts', requireAuth, zValidator('json', postInput), async (c) => {
    const input = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const now = new Date()

    const row = {
      id: crypto.randomUUID(),
      userId: c.get('user')!.id,
      title: input.title,
      content: input.content,
      isPublic: input.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(posts).values(row)
    return c.json(row, 201)
  })

  .get('/posts/:id', optionalAuth, async (c) => {
    const db = drizzle(c.env.DB)
    const row = await db
      .select()
      .from(posts)
      .where(eq(posts.id, c.req.param('id')))
      .get()

    // 所有者でなく、かつ非公開なら「存在しない」として扱う
    const authUser = c.get('user')
    if (
      row === undefined ||
      (row.userId !== authUser?.id && row.isPublic === false)
    ) {
      return c.json({ message: 'Not Found' }, 404)
    }

    return c.json(row)
  })

  .put('/posts/:id', requireAuth, zValidator('json', postInput), async (c) => {
    const input = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const updated = await db
      .update(posts)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(posts.id, c.req.param('id')),
          eq(posts.userId, c.get('user')!.id),
        ),
      )
      .returning()
      .get()

    if (updated === undefined) {
      return c.json({ message: 'Not Found' }, 404)
    }
    return c.json(updated)
  })

  .delete('/posts/:id', requireAuth, async (c) => {
    const db = drizzle(c.env.DB)

    const deleted = await db
      .delete(posts)
      .where(
        and(
          eq(posts.id, c.req.param('id')),
          eq(posts.userId, c.get('user')!.id),
        ),
      )
      .returning()
      .get()

    if (deleted === undefined) {
      return c.json({ message: 'Not Found' }, 404)
    }
    return c.body(null, 204)
  })

  // ここから下は認証不要
  .get('/public/posts', async (c) => {
    const db = drizzle(c.env.DB)
    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        updatedAt: posts.updatedAt,
        author: { userId: user.userId, name: user.name },
      })
      .from(posts)
      .innerJoin(user, eq(posts.userId, user.id))
      .where(eq(posts.isPublic, true))
      .orderBy(desc(posts.updatedAt))
      .limit(50)
      .all()

    return c.json(rows)
  })

  .get('/users/:userId/posts', async (c) => {
    const db = drizzle(c.env.DB)
    const author = await db
      .select({ userId: user.userId, name: user.name, id: user.id })
      .from(user)
      .where(eq(user.userId, c.req.param('userId')))
      .get()

    if (author === undefined) {
      return c.json({ message: 'Not Found' }, 404)
    }

    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(and(eq(posts.userId, author.id), eq(posts.isPublic, true)))
      .orderBy(desc(posts.updatedAt))
      .limit(50)
      .all()

    return c.json({
      author: { userId: author.userId, name: author.name },
      posts: rows,
    })
  })

export default app
export type AppType = typeof app
