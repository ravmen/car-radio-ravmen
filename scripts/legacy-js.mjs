// Makes the static export runnable on very old Android System WebViews (Chrome 44+, stock
// Android 6 on 8227L head units): transpiles every chunk to ES5, prepends polyfills and an
// on-screen error reporter to each HTML page.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { transformAsync } from '@babel/core'

const require = createRequire(import.meta.url)
const outDir = path.resolve('out')
const babelOptions = {
  babelrc: false,
  configFile: false,
  sourceType: 'script',
  compact: true,
  comments: false,
  presets: [['@babel/preset-env', { targets: { chrome: '44' }, modules: false }]],
}

const errorReporter = `(function(){var shown=0;function show(msg){if(shown>4)return;shown++;var run=function(){var box=document.getElementById('legacy-errors');if(!box){box=document.createElement('pre');box.id='legacy-errors';box.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;margin:0;max-height:45%;overflow:auto;padding:8px;background:#300;color:#fdd;font:12px monospace;white-space:pre-wrap';box.textContent='WebView: '+navigator.userAgent+'\\n';(document.body||document.documentElement).appendChild(box)}box.textContent+=msg+'\\n'};if(document.body)run();else document.addEventListener('DOMContentLoaded',run)}window.addEventListener('error',function(e){show('Error: '+(e.message||e)+' @ '+(e.filename||'')+':'+(e.lineno||''))});window.addEventListener('unhandledrejection',function(e){var r=e.reason;show('Promise: '+(r&&r.message?r.message:r))})})();`

async function walk(dir, ext) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((e) => {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) return walk(full, ext)
      return e.name.endsWith(ext) ? [full] : []
    }),
  )
  return nested.flat()
}

async function toEs5(code, filename) {
  const result = await transformAsync(code, { ...babelOptions, filename })
  return result.code
}

async function buildPolyfills() {
  const coreJs = await readFile(require.resolve('core-js-bundle/minified.js'), 'utf8')
  const extras = [
    'web-streams-polyfill/dist/polyfill.min.js',
    'abortcontroller-polyfill/dist/abortcontroller-polyfill-only.js',
    'resize-observer-polyfill/dist/ResizeObserver.global.js',
    'pepjs/dist/pep.js',
  ]
  const parts = [coreJs]
  for (const spec of extras) {
    const file = require.resolve(spec)
    parts.push(await toEs5(await readFile(file, 'utf8'), file))
  }
  const resizeShim = 'if(!window.ResizeObserver&&typeof ResizeObserver!=="undefined")window.ResizeObserver=ResizeObserver;'
  await mkdir(path.join(outDir, 'legacy'), { recursive: true })
  await writeFile(path.join(outDir, 'legacy', 'polyfills.js'), parts.join(';\n') + ';\n' + resizeShim)
}

async function transpileChunks() {
  const files = await walk(path.join(outDir, '_next'), '.js')
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    await writeFile(file, await toEs5(source, file))
  }
  console.log(`legacy-js: transpiled ${files.length} chunks`)
}

async function patchHtml() {
  const files = await walk(outDir, '.html')
  const inlineScript = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g
  for (const file of files) {
    let html = await readFile(file, 'utf8')
    const replacements = []
    for (const match of html.matchAll(inlineScript)) {
      const [full, attrs, body] = match
      if (!body.trim() || /type="(application\/(ld\+)?json)"/.test(attrs)) continue
      replacements.push([full, `<script${attrs}>${await toEs5(body, 'inline.js')}</script>`])
    }
    for (const [from, to] of replacements) html = html.replace(from, () => to)
    html = html.replace(/ type="module"/g, '')
    html = html.replace(
      /<head([^>]*)>/,
      (tag) => `${tag}<script>${errorReporter}</script><script src="/legacy/polyfills.js"></script>`,
    )
    await writeFile(file, html)
  }
  console.log(`legacy-js: patched ${files.length} html files`)
}

await buildPolyfills()
await transpileChunks()
await patchHtml()
