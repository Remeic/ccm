import { describe, expect, test } from 'vitest'
import {
  getNpmTarballUrl,
  renderHomebrewFormula,
  toFormulaClassName,
} from '../../scripts/homebrew/formula.mjs'

describe('homebrew formula helpers', () => {
  test('builds scoped npm tarball urls', () => {
    expect(getNpmTarballUrl('@remeic/ccm', '1.2.3')).toBe(
      'https://registry.npmjs.org/@remeic/ccm/-/ccm-1.2.3.tgz',
    )
  })

  test('derives a Ruby class name from the formula name', () => {
    expect(toFormulaClassName('ccm')).toBe('Ccm')
    expect(toFormulaClassName('ccm-beta')).toBe('CcmBeta')
  })

  test('renders a Homebrew formula for ccm', () => {
    const formula = renderHomebrewFormula({
      formulaName: 'ccm',
      packageName: '@remeic/ccm',
      version: '1.2.3',
      sha256: 'abc123',
      description: 'Manage multiple Claude Code profiles',
      homepage: 'https://github.com/remeic/ccm',
      license: 'MIT',
    })

    expect(formula).toContain('class Ccm < Formula')
    expect(formula).toContain('url "https://registry.npmjs.org/@remeic/ccm/-/ccm-1.2.3.tgz"')
    expect(formula).toContain('sha256 "abc123"')
    expect(formula).toContain('bin.install_symlink libexec/"bin/ccm"')
    expect(formula).toContain('assert_match version.to_s, shell_output("#{bin}/ccm --version")')
  })
})
