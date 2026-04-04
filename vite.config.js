import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    viteStaticCopy({
      targets: [
        // Copy non-module JS files (exclude files that use import/export)
        // Flatten all into dist/js/ (HTML references like js/app.js, js/launch.js)
        {
          src: 'js/**/!(auth|insforge|supabase).js',
          dest: 'js'
        },
        // Also preserve js/pages/ structure (for js/pages/dashboard.js, js/pages/sharing.js)
        {
          src: 'js/pages/*.js',
          dest: 'js/pages'
        },
        // Copy JSON data files in js/
        {
          src: 'js/*.json',
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
