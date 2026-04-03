import { z } from 'zod'

export const MAX_PROFILE_NAME_LENGTH = 64
export const PROFILE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

export const ProfileNameSchema = z
  .string()
  .min(1)
  .max(MAX_PROFILE_NAME_LENGTH)
  .regex(PROFILE_NAME_PATTERN)

export const ProfileMetaSchema = z
  .object({
    name: ProfileNameSchema,
    label: z.string().optional(),
    browser: z.string().optional(),
    createdAt: z.string(),
  })
  .passthrough()

export const CcmConfigSchema = z
  .object({
    profiles: z.record(z.string(), ProfileMetaSchema),
  })
  .passthrough()

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
