import { defineConfig } from '@playwright/test'

const WEB_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:8787'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'dot' : 'list',

  use: {
    baseURL: WEB_URL,
    // 失敗したときに原因を追えるようにする
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // フロントと API の2つを起動する。
  // ローカル D1 の作り直しは、サーバーを起動する前に同じコマンドの中で行う
  // （webServer は globalSetup より先に起動するため、globalSetup で消すと
  //   起動済みのサーバーが SQLITE_CANTOPEN で落ちる）
  webServer: [
    {
      command:
        'rm -rf apps/api/.wrangler/state/v3/d1 && npm run db:migrate:local -w apps/api && npm run dev -w apps/api',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
    },
    {
      command: 'npm run dev -w apps/web',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
    },
  ],
})
