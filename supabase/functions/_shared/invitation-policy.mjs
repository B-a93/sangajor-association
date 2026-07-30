export const MINIMUM_PASSWORD_LENGTH = 8;

/**
 * Validate the public acceptance request before any privileged Auth operation.
 * Keeping lifecycle decisions pure makes every rejection path independently
 * testable without a Supabase connection.
 */
export function validateAcceptance({ invitation, password, now = new Date() }) {
  if (typeof password !== 'string' || password.length < MINIMUM_PASSWORD_LENGTH) {
    return { status: 400, error: `Password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.` };
  }
  if (!invitation) return { status: 404, error: 'This invitation link is invalid.' };
  if (invitation.status === 'accepted') return { status: 409, error: 'This invitation has already been accepted.' };
  if (invitation.status !== 'pending') return { status: 410, error: 'This invitation has expired or was cancelled.' };
  if (new Date(invitation.expires_at) <= now) return { status: 410, error: 'This invitation has expired or was cancelled.', shouldExpire: true };
  return null;
}
