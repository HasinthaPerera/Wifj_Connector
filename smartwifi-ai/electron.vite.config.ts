import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      sourcemap: false
    }
  },
  preload: {
    build: {
      sourcemap: false
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react'
              }
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'vendor-charts'
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons'
              }
            }
            return undefined
          }
        }
      }
    }
  }
})
