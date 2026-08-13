/**
 * Every subpath is declared twice: in `exports` (for moduleResolution node16/nodenext/bundler) and
 * in `typesVersions` (for moduleResolution node, which ignores `exports` entirely). Consumers on
 * the older setting get TS2307 for anything missing from the second map, and nothing in the build
 * catches that — hence this check.
 *
 * Run after `pnpm run build`, so the referenced files exist.
 */
import { existsSync, readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const errors = []

const subpaths = Object.keys(pkg.exports).filter((k) => k !== '.' && k !== './package.json')
const typesVersions = pkg.typesVersions?.['*'] ?? {}

for (const key of subpaths) {
  const bare = key.replace(/^\.\//, '')
  const entry = pkg.exports[key]

  for (const condition of ['types', 'require', 'import', 'default']) {
    const target = entry[condition]
    if (!target) {
      errors.push(`exports["${key}"] is missing the "${condition}" condition`)
    } else if (!existsSync(new URL(`../${target}`, import.meta.url))) {
      errors.push(`exports["${key}"].${condition} -> ${target} does not exist`)
    }
  }

  const mapped = typesVersions[bare]
  if (!mapped) {
    errors.push(`typesVersions["*"]["${bare}"] is missing — moduleResolution "node" cannot find its types`)
  } else if (mapped[0] !== entry.types?.replace(/^\.\//, '')) {
    errors.push(`typesVersions["*"]["${bare}"] -> ${mapped[0]} disagrees with exports["${key}"].types -> ${entry.types}`)
  }
}

for (const bare of Object.keys(typesVersions)) {
  if (!subpaths.includes(`./${bare}`)) {
    errors.push(`typesVersions["*"]["${bare}"] has no matching entry in exports`)
  }
}

for (const field of ['main', 'types']) {
  if (!existsSync(new URL(`../${pkg[field]}`, import.meta.url))) {
    errors.push(`"${field}" -> ${pkg[field]} does not exist`)
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in the entry point declarations:`)
  errors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
}

console.log(`✓ ${subpaths.length} subpaths consistent across exports and typesVersions, all targets present`)
