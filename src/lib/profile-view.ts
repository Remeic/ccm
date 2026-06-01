import type { ClaudeAuthStatus } from '../types.js'
import type { StoredProfile } from './profile-store.js'

/** Machine-readable projection of a profile and its Claude auth status. */
export interface ProfileView {
  name: string
  state: StoredProfile['state']
  authMethod: string
  account: string | null
  loggedIn: boolean | null
  createdAt: string | null
  hasConfig: boolean
  hasDirectory: boolean
}

/** Account label used in human-readable output when no account is known. */
export const NO_ACCOUNT_PLACEHOLDER = '—'

/** Resolves the account label from an auth status (email, else API key source). */
export function accountLabel(status: ClaudeAuthStatus | undefined): string | null {
  return status?.email ?? status?.apiKeySource ?? null
}

/** Resolves the auth method, defaulting to "unavailable" when unknown. */
export function authMethodLabel(status: ClaudeAuthStatus | undefined): string {
  return status?.authMethod ?? 'unavailable'
}

/** Projects a stored profile and its auth status into a serializable view. */
export function toProfileView(
  profile: StoredProfile,
  status: ClaudeAuthStatus | undefined,
): ProfileView {
  return {
    name: profile.name,
    state: profile.state,
    authMethod: authMethodLabel(status),
    account: accountLabel(status),
    loggedIn: status?.loggedIn ?? null,
    createdAt: profile.meta?.createdAt ?? null,
    hasConfig: profile.hasConfig,
    hasDirectory: profile.hasDirectory,
  }
}
