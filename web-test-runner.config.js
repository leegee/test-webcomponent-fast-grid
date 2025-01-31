import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
    files: 'tests/wtr/*.test.js',
    nodeResolve: true,
    browserConsole: true,
    timeout: 10_000,
    browsers: [
        playwrightLauncher({ product: 'chromium' }),
    ],
};
