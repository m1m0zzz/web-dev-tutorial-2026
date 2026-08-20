import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Testing Library の自動クリーンアップ（各テスト後の unmount）は
    // グローバルの afterEach に登録されるため、globals が必要
    globals: true,
    setupFiles: './src/setup-tests.ts',
  },
})
