import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'js/**/*',
          dest: 'js'
        },
        {
          src: 'css/**/*',
          dest: 'css'
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
        sharing: './sharing.html'
      }
    }
  }
})
