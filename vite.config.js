import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  resolve: {
    alias: {
      react: fileURLToPath(new URL('./src/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./src/react-dom', import.meta.url)),
      'react-dom-bindings': fileURLToPath(new URL('./src/react-dom-bindings', import.meta.url)),
      'react-reconciler': fileURLToPath(new URL('./src/react-reconciler', import.meta.url)),
      'scheduler': fileURLToPath(new URL('./src/scheduler', import.meta.url)),
      shared: fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
})
