import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const testPort = new URL(baseURL).port || '3000'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  workers: 1,
  use: { baseURL, trace: 'on-first-retry' },
  webServer: {
    command: `pnpm exec nuxt dev --host 127.0.0.1 --port ${testPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.PLAYWRIGHT_BASE_URL,
    timeout: 240_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
