export interface ProfileMeta {
  name: string
  label?: string
  browser?: string
  createdAt: string
}

export interface CcmConfig {
  profiles: Record<string, ProfileMeta>
}

export interface ClaudeAuthStatus {
  loggedIn: boolean
  authMethod: string
  email?: string
  orgName?: string
  subscriptionType?: string
  apiKeySource?: string
}
