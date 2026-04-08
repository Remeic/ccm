import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { registerCompliance } from '../../src/commands/compliance.js'

vi.mock('../../src/lib/compliance.js', () => ({
  getFullComplianceNoticeLines: vi.fn(),
}))

import { getFullComplianceNoticeLines } from '../../src/lib/compliance.js'

const mockGetFullComplianceNoticeLines = vi.mocked(getFullComplianceNoticeLines)

beforeEach(() => {
  vi.resetAllMocks()
  mockGetFullComplianceNoticeLines.mockReturnValue(['line 1', 'line 2'])
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

function createProgram() {
  const program = new Command()
  program.exitOverride()
  registerCompliance(program)
  return program
}

describe('command: compliance', () => {
  test('registers the documented command description', () => {
    const program = createProgram()
    const command = program.commands.find(candidate => candidate.name() === 'compliance')

    expect(command?.description()).toBe(
      'Show the Claude Code compliance notice and official source links',
    )
  })

  test('prints the full compliance notice', () => {
    const log = vi.spyOn(console, 'log')
    const program = createProgram()

    program.parse(['node', 'ccm', 'compliance'])

    expect(mockGetFullComplianceNoticeLines).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith('line 1')
    expect(log).toHaveBeenCalledWith('line 2')
  })

  test('supports the tos alias', () => {
    const log = vi.spyOn(console, 'log')
    const program = createProgram()

    program.parse(['node', 'ccm', 'tos'])

    expect(mockGetFullComplianceNoticeLines).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith('line 1')
  })
})
