import { devices } from '@playwright/test';

const port = process.env.PORT || 4500

export default {
  projects: [
    {
      name: 'Chromium',
      use: {...devices['Desktop Chrome']},
    },
    // {
    //   name: 'Firefox',
    //   use: {...devices['Desktop Firefox']},
    // },
    // {
    //   name: 'WebKit',
    //   use: {...devices['Desktop Safari']},
    // },
  ],
  // Global configuration options
  use: {
    headless: true,
    testDir: './test2',
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `PORT=${port} node dummyServer.js`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
  },
}

