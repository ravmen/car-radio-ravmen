// Rewrites exported CSS so very old Android System WebViews (Chrome 44+, e.g. 8227L head units)
// can render Tailwind v4 output: flattens @layer, adds static fallbacks for var() (custom
// properties arrived in Chrome 49), vh fallbacks for dvh/svh, and lowers oklch/color-mix/nesting.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import postcss from 'postcss'
import cascadeLayers from '@csstools/postcss-cascade-layers'
import { transform } from 'lightningcss'

const cssDir = path.resolve('out/_next/static')
const targets = { chrome: 44 << 16, android: 44 << 16 }
const globalScope = /(^|,)\s*(:root|html|:host)\s*(,|$)|variable/

async function findCss(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((e) => {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) return findCss(full)
      return e.name.endsWith('.css') ? [full] : []
    }),
  )
  return files.flat()
}

function resolveVars(value, vars, depth = 0) {
  if (depth > 12) return null
  let unresolved = false
  let out = ''
  let i = 0
  while (i < value.length) {
    const start = value.indexOf('var(', i)
    if (start === -1) {
      out += value.slice(i)
      break
    }
    out += value.slice(i, start)
    let level = 0
    let end = start + 3
    for (; end < value.length; end++) {
      if (value[end] === '(') level++
      else if (value[end] === ')' && --level === 0) break
    }
    const inner = value.slice(start + 4, end)
    const comma = inner.indexOf(',')
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim()
    const fallback = comma === -1 ? null : inner.slice(comma + 1).trim()
    const raw = vars.get(name) ?? fallback
    const resolved = raw == null ? null : resolveVars(raw, vars, depth + 1)
    if (resolved == null) unresolved = true
    else out += resolved
    i = end + 1
  }
  return unresolved ? null : out
}

const legacyFallbacks = {
  postcssPlugin: 'legacy-fallbacks',
  Once(root) {
    const vars = new Map()
    root.walkRules((rule) => {
      if (!globalScope.test(rule.selector)) return
      rule.each((node) => {
        if (node.type === 'decl' && node.prop.startsWith('--')) vars.set(node.prop, node.value)
      })
    })
    root.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) return
      let value = decl.value
      if (value.includes('var(')) {
        const resolved = resolveVars(value, vars)
        if (resolved == null) return
        value = resolved
      }
      value = value.replace(/(\d)(dvh|svh|lvh)\b/g, '$1vh').replace(/(\d)(dvw|svw|lvw)\b/g, '$1vw')
      if (value !== decl.value) decl.cloneBefore({ value })
    })
  },
}

for (const file of await findCss(cssDir)) {
  const source = await readFile(file, 'utf8')
  const flattened = await postcss([cascadeLayers(), legacyFallbacks]).process(source, { from: file })
  const lowered = transform({
    filename: file,
    code: Buffer.from(flattened.css),
    minify: false,
    targets,
    errorRecovery: true,
  }).code.toString()
  await writeFile(file, lowered)
  console.log(`legacy-css: ${path.relative(process.cwd(), file)} ${source.length} -> ${lowered.length}`)
}
