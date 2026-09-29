// Rewrites exported CSS so old Android System WebViews (Chrome 61+, e.g. 8227L head units)
// can render Tailwind v4 output: flattens @layer, lowers oklch/nesting/color-mix.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import postcss from 'postcss'
import cascadeLayers from '@csstools/postcss-cascade-layers'
import { transform } from 'lightningcss'

const cssDir = path.resolve('out/_next/static')
const targets = { chrome: 61 << 16, android: 61 << 16 }

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

for (const file of await findCss(cssDir)) {
  const source = await readFile(file, 'utf8')
  const lowered = transform({
    filename: file,
    code: Buffer.from(source),
    minify: true,
    targets,
    errorRecovery: true,
  }).code.toString()
  const flattened = await postcss([cascadeLayers()]).process(lowered, { from: file })
  await writeFile(file, flattened.css)
  console.log(`legacy-css: ${path.relative(process.cwd(), file)} ${source.length} -> ${flattened.css.length}`)
}
