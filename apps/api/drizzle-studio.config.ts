import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'drizzle-kit'

// ローカルの D1 は wrangler がハッシュ名の SQLite ファイルとして作る。
// 名前が環境によって変わるため、実行時に探す
const stateDir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
const file = readdirSync(stateDir).find(
  (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
)

if (file === undefined) {
  throw new Error(
    'ローカルの D1 が見つかりません。先に `npm run db:migrate:local -w apps/api` を実行してください',
  )
}

export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './drizzle',
  dbCredentials: { url: join(stateDir, file) },
})
