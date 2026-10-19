import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false,
    retries: 1,
    reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',
        locale: 'pt',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    /* No webServer because next dev is already running */
});
