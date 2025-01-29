import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
    files: 'tests/wtr/*.test.js',  // Path to test files
    nodeResolve: true,            // Resolve ES modules
    testFramework: {
        config: {
            timeout: 5000,             // Adjust if needed
        },
    },
    plugins: [],
    browsers: [
        playwrightLauncher({ product: 'chromium' }),
    ],
};
