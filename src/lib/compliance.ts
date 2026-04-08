export type ComplianceSource = {
  label: string
  url: string
  summary: string
}

export const COMPLIANCE_CHECKED_AT = '2026-04-08'

export const COMPLIANCE_SOURCES: ComplianceSource[] = [
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
]

function buildRuleLines(): string[] {
  return [
    'Project compliance boundary:',
    '- ccm isolates profiles, but it does not grant any extra rights under Anthropic terms.',
    '- Treat each Claude account as single-user and single-session: 1 account = 1 person = 1 active terminal session.',
    '- Do not share account credentials or API keys, and do not hand off the same account between multiple operators.',
    '- For parallel operators, separate seats/accounts or API-key-based access under Commercial Terms are required.',
  ]
}

/** Formats a short warning that can be embedded in interactive command output. */
export function getCompactComplianceNoticeLines(): string[] {
  return [
    '\x1b[33m!\x1b[0m Compliance notice',
    '  ccm isolates profiles but does not expand Anthropic usage rights.',
    '  Use each Claude account with one person and one active terminal session.',
    '  Do not share credentials or API keys across users or parallel operators.',
    '  Details: ccm compliance',
  ]
}

/** Formats the full compliance notice surfaced by the dedicated CLI command. */
export function getFullComplianceNoticeLines(): string[] {
  const sourceLines = COMPLIANCE_SOURCES.flatMap(source => [
    `- ${source.label}: ${source.url}`,
    `  ${source.summary}`,
  ])

  return [
    'Claude Code compliance notice',
    'This project publishes an intentionally conservative operational rule to reduce misuse and ambiguity.',
    ...buildRuleLines(),
    'Important:',
    '- This notice is compliance guidance for ccm users. It is not legal advice and it does not replace review of Anthropic terms for your specific use case.',
    '- If you are building a product, automation, or shared workflow around Claude access, verify your model with Anthropic before deployment.',
    `Official sources reviewed on ${COMPLIANCE_CHECKED_AT}:`,
    ...sourceLines,
  ]
}
