import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
    files: 'tests/wtr/*.test.ts',
    nodeResolve: true,
    browserConsole: true,
    timeout: 10_000,
    plugins: [
        esbuildPlugin({ ts: true }),
    ],
    browsers: [
        playwrightLauncher({ product: 'chromium' }),
    ],
};
