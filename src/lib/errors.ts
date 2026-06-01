/** Normalizes an unknown thrown value into a human-readable message. */
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
