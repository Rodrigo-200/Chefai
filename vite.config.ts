import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxyTarget = env.VITE_API_PROXY || 'http://localhost:4000';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['chefai.rrmtools.uk'],
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        }
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
        name: 'ChefAI - Intelligent Recipe Extractor',
        short_name: 'ChefAI',
        description: 'Extract recipes from videos, images, and websites automatically using AI.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        id: '/',
        scope: '/',
        start_url: '/',
        categories: ['food', 'lifestyle', 'productivity'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "media",
                accept: ["image/*", "video/*"]
              }
            ]
          }
        }
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
