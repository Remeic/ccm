import { describe, expect, test } from 'vitest'
import {
  COMPLIANCE_CHECKED_AT,
  COMPLIANCE_SOURCES,
  getCompactComplianceNoticeLines,
  getFullComplianceNoticeLines,
} from '../../src/lib/compliance.js'
import { warnLine } from '../../src/lib/ui.js'

describe('compliance notices', () => {
  test('exports the official sources used by the notice', () => {
    expect(COMPLIANCE_CHECKED_AT).toBe('2026-04-08')
    expect(COMPLIANCE_SOURCES).toEqual([
      {
        label: 'Claude Code Legal & Compliance',
        url: 'https://code.claude.com/docs/en/legal-and-compliance',
        summary:
          'Pro and Max usage limits assume ordinary, individual use. Anthropic may enforce authentication restrictions without notice.',
      },
      {
        label: 'Anthropic Consumer Terms',
        url: 'https://www.anthropic.com/legal/consumer-terms',
        summary:
          'Account login information, API keys, and account credentials must not be shared or made available to anyone else.',
      },
      {
        label: 'Anthropic Commercial Terms',
        url: 'https://www.anthropic.com/legal/commercial-terms',
        summary:
          'Commercial customers are responsible for all activity and fees incurred under their account.',
      },
    ])
  })

  test('formats the compact notice for interactive commands', () => {
    expect(getCompactComplianceNoticeLines()).toEqual([
      warnLine('Compliance notice'),
      '  ccm isolates profiles but does not expand Anthropic usage rights.',
      '  Use each Claude account with one person and one active terminal session.',
      '  Do not share credentials or API keys across users or parallel operators.',
      '  Details: ccm compliance',
    ])
  })

  test('formats the full notice with rules, disclaimer, and source URLs', () => {
    expect(getFullComplianceNoticeLines()).toEqual([
      'Claude Code compliance notice',
      'This project publishes an intentionally conservative operational rule to reduce misuse and ambiguity.',
      'Project compliance boundary:',
      '- ccm isolates profiles, but it does not grant any extra rights under Anthropic terms.',
      '- Treat each Claude account as single-user and single-session: 1 account = 1 person = 1 active terminal session.',
      '- Do not share account credentials or API keys, and do not hand off the same account between multiple operators.',
      '- For parallel operators, separate seats/accounts or API-key-based access under Commercial Terms are required.',
      'Important:',
      '- This notice is compliance guidance for ccm users. It is not legal advice and it does not replace review of Anthropic terms for your specific use case.',
      '- If you are building a product, automation, or shared workflow around Claude access, verify your model with Anthropic before deployment.',
      `Official sources reviewed on ${COMPLIANCE_CHECKED_AT}:`,
      '- Claude Code Legal & Compliance: https://code.claude.com/docs/en/legal-and-compliance',
      '  Pro and Max usage limits assume ordinary, individual use. Anthropic may enforce authentication restrictions without notice.',
      '- Anthropic Consumer Terms: https://www.anthropic.com/legal/consumer-terms',
      '  Account login information, API keys, and account credentials must not be shared or made available to anyone else.',
      '- Anthropic Commercial Terms: https://www.anthropic.com/legal/commercial-terms',
      '  Commercial customers are responsible for all activity and fees incurred under their account.',
    ])
  })
})
