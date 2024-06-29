import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/gift',
  plugins: [svelte(),    {
    name: 'add-script',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // using base to construct src
        const src_path = '/gift/danmaku-websocket.min.js';
        return html.replace(
          '</title>',
          '</title>\n    <script type="module" src="'+src_path+'"></script>'
        );
      },
    },
  },]
})
