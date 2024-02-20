import { devices, defineConfig } from '@playwright/test';
import path from "path"

const port = process.env.PORT || 4500
const testDir = './test2'

export default defineConfig({
  projects: [
    {
      name: 'Chromium',
      use: {...devices['Desktop Chrome']},
      testMatch: path.join(testDir, "browser.spec.ts")
    },
    {
      name: 'Firefox',
      use: {...devices['Desktop Firefox']},
      testMatch: path.join(testDir, "browser.spec.ts")
    },
    {
      name: 'WebKit',
      use: {...devices['Desktop Safari']},
      testMatch: path.join(testDir, "browser.spec.ts")
    },

    {
      name: 'Node',
      testMatch: path.join(testDir, "node.spec.ts")
    },
  ],
  // Global configuration options
  use: {
    headless: true,
    baseURL: `http://127.0.0.1:${port}`,
    testDir: testDir,
  },
  webServer: {
    command: `PORT=${port} node dummyServer.js`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})

