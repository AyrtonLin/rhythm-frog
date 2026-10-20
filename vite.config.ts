import { defineConfig } from 'vite'

// base 用相对路径：产物可部署到 GitHub Pages 子路径 / itch.io / Netlify 等任意静态托管
export default defineConfig({
  base: './',
  build: {
    // Phaser 本体较大，提高阈值避免无意义告警
    chunkSizeWarningLimit: 1600,
  },
})
