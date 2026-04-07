import { z } from 'zod'

/** Sets the accepted length boundary for managed profile names. */
export const MAX_PROFILE_NAME_LENGTH = 64
/** Defines the stable character policy for managed profile names. */
export const PROFILE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

/** Validates profile names used by CCM profile operations. */
export const ProfileNameSchema = z
  .string()
  .min(1)
  .max(MAX_PROFILE_NAME_LENGTH)
  .regex(PROFILE_NAME_PATTERN)

/** Validates profile metadata stored by CCM. */
export const ProfileMetaSchema = z
  .object({
    name: ProfileNameSchema,
    label: z.string().optional(),
    browser: z.string().optional(),
    createdAt: z.string(),
  })
  .passthrough()

/** Validates the persisted CCM configuration shape. */
export const CcmConfigSchema = z
  .object({
    profiles: z.record(z.string(), ProfileMetaSchema),
  })
  .passthrough()

/** Validates Claude Code authentication status consumed by CCM. */
export const ClaudeAuthStatusSchema = z
  .object({
    loggedIn: z.boolean(),
    authMethod: z.string(),
    email: z.string().optional(),
    orgName: z.string().optional(),
    subscriptionType: z.string().optional(),
    apiKeySource: z.string().optional(),
  })
  .passthrough()

export type ProfileMeta = z.infer<typeof ProfileMetaSchema>
export type CcmConfig = z.infer<typeof CcmConfigSchema>
export type ClaudeAuthStatus = z.infer<typeof ClaudeAuthStatusSchema>
