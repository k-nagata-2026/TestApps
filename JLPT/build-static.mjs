import { build } from 'esbuild'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist/assets', { recursive: true })
await cp('public', 'dist', { recursive: true })
await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/assets/app.js',
  format: 'esm',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
})
await writeFile('dist/index.html', '<!doctype html><html lang="ja"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><link rel="stylesheet" href="/assets/app.css"/><title>Java Bronze 学習アプリ</title></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>')
console.log('Static frontend created in dist/')
