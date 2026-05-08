import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        impressum: 'impressum.html',
        datenschutz: 'datenschutz.html',
        '404': '404.html',
      },
    },
  },
})
