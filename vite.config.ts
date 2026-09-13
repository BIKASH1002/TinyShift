import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { validatePublicConfig } from './scripts/public-config.mjs';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, 'backend');
  const env = loadEnv(mode, envDir, '');
  validatePublicConfig(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  return {
    plugins: [react(), tailwindcss()],
    envDir,
    // Only these public values may be included in the browser bundle.
    envPrefix: [],
    define: {
      'import.meta.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(env.EXPO_PUBLIC_SUPABASE_URL),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      ),
    },
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: {
      // Optional switch for environments where file watching is unavailable.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
