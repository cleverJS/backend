/**
 * Every subpath is declared twice: in `exports` (for moduleResolution node16/nodenext/bundler) and
 * in `typesVersions` (for moduleResolution node, which ignores `exports` entirely). Consumers on
 * the older setting get TS2307 for anything missing from the second map, and nothing in the build
 * catches that — hence this check.
 *
 * The root entry point ("." in `exports`) is also required to stay free of the optional `ws` peer
 * — that's the whole point of the peer-free root (see the commit that introduced it). Nothing in
 * the build enforces that either, so this script walks the root declaration's transitive relative
 * imports and fails if any of them reach into the `ws` peer.
 *
 * Run after `pnpm run build`, so the referenced files exist.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const packageRoot = fileURLToPath(new URL('..', import.meta.url))

function extractSpecifiers(source) {
  const specifiers = new Set()
  const fromRe = /from\s+['"]([^'"]+)['"]/g
  const dynamicImportRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const re of [fromRe, dynamicImportRe]) {
    let match
    while ((match = re.exec(source))) {
      specifiers.add(match[1])
    }
  }
  return specifiers
}

// `.d.ts` imports are extension-less and may point at a directory's `index.d.ts`, same as JS.
function resolveDeclarationFile(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier)
  const candidates = [`${base}.d.ts`, resolve(base, 'index.d.ts')]
  return candidates.find(existsSync) ?? null
}

function checkPeerFreeRoot() {
  if (!pkg.types || !existsSync(new URL(`../${pkg.types}`, import.meta.url))) {
    errors.push(`cannot verify the peer-free root: "${pkg.types}" does not exist — run \`pnpm run build\` first`)
    return 0
  }

  const rootFile = fileURLToPath(new URL(`../${pkg.types}`, import.meta.url))
  const visited = new Set([rootFile])
  const parent = new Map()
  const flagged = new Set()
  const queue = [rootFile]

  while (queue.length) {
    const file = queue.shift()
    const source = readFileSync(file, 'utf8')

    for (const specifier of extractSpecifiers(source)) {
      if (specifier === 'ws' || specifier.startsWith('ws/')) {
        if (!flagged.has(file)) {
          flagged.add(file)
          const chain = [file]
          for (let cur = file; parent.has(cur); cur = parent.get(cur)) {
            chain.unshift(parent.get(cur))
          }
          errors.push(`root entry point transitively imports the "ws" peer via ${chain.map((f) => relative(packageRoot, f)).join(' -> ')}`)
        }
        continue
      }

      if (!specifier.startsWith('.')) continue // only follow local declaration files, not other bare peers

      const resolved = resolveDeclarationFile(file, specifier)
      if (resolved && !visited.has(resolved)) {
        visited.add(resolved)
        parent.set(resolved, file)
        queue.push(resolved)
      }
    }
  }

  return visited.size
}

const scannedDeclarationFiles = checkPeerFreeRoot()

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in the entry point declarations:`)
  errors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
}

console.log(`✓ ${subpaths.length} subpaths consistent across exports and typesVersions, all targets present`)
console.log(`✓ root entry point does not transitively import the "ws" peer (${scannedDeclarationFiles} declaration file(s) scanned)`)
