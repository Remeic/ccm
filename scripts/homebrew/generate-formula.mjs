#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { renderHomebrewFormula } from './formula.mjs'

function resolvePackageMetadata(packageJson) {
  return {
    packageName: packageJson.name,
    description: packageJson.description,
    homepage: packageJson.homepage,
    license: packageJson.license,
  }
}

function getDefaultOutputPath(cwd, formulaName) {
  return path.join(cwd, 'Formula', `${formulaName}.rb`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      sha256: { type: 'string' },
      version: { type: 'string' },
      output: { type: 'string' },
      'formula-name': { type: 'string', default: 'ccm' },
      cwd: { type: 'string', default: process.cwd() },
    },
  })

  if (!values.sha256) {
    throw new Error('--sha256 is required')
  }

  const packageJsonPath = path.join(values.cwd, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  const metadata = resolvePackageMetadata(packageJson)
  const outputPath = values.output ?? getDefaultOutputPath(values.cwd, values['formula-name'])
  const version = values.version ?? packageJson.version

  const formula = renderHomebrewFormula({
    formulaName: values['formula-name'],
    packageName: metadata.packageName,
    version,
    sha256: values.sha256,
    description: metadata.description,
    homepage: metadata.homepage,
    license: metadata.license,
  })

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, formula)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
