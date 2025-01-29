import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
    server: {
        port: process.env.VITE_HTTP_PORT,
    },
});
