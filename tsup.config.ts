import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'contentScript.bundle': 'src/pages/Content/index.js',
    'background.bundle': 'src/pages/Background/index.js',
  },
  outDir: 'build/pure',
  clean: false,
  format: ['cjs'],
  shims: false,
})
