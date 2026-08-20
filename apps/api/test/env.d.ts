import type { D1Migration } from '@cloudflare/vitest-pool-workers'

// vitest.config.ts の miniflare.bindings で足したものを、テストから型付きで参照する
declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}
