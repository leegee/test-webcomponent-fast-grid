import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
    server: {
        port: process.env.VITE_HTTP_PORT,
    },

    root: '.',
    build: {
        outDir: 'dist',
        target: 'esnext',
        rollupOptions: {
            input: 'index.html'
        }
    }
});
