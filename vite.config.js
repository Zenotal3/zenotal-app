import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    viteStaticCopy({
      targets: [
        // Only copy non-module JS files (exclude files that use import/export)
        {
          src: 'js/**/!(clerk-auth|insforge).js',
          dest: 'js'
        },
        {
          src: 'css/**/*',
          dest: 'css'
        },
        {
          src: 'assets/**/*',
          dest: 'assets'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        conversation: './conversation.html',
        app: './app.html',
        audio: './audio.html',
        sharing: './sharing.html',
        dashboard: './dashboard.html'
      }
    }
  },
  // Ensure node_modules are resolved properly
  resolve: {
    preserveSymlinks: true
  }
})
