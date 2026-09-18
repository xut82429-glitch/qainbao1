import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@sandbox': resolve(__dirname, 'src/core/sandbox'),
      '@ecosystem': resolve(__dirname, 'src/ecosystem'),
      '@ai': resolve(__dirname, 'src/ai-assistant'),
      '@debugger': resolve(__dirname, 'src/debugger'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@types': resolve(__dirname, 'src/types')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        inlineDynamicImports: false
      }
    },
    // 修复 HTML 文件路径问题
    copyPublicDir: true
  },
  // 开发服务器配置
  server: {
    port: 3000
  }
});
