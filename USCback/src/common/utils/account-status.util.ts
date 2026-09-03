export interface AccountStatusCheck {
  /** True if the account is blocked from proceeding right now. */
  blocked: boolean;
  /** True if a past suspension has lapsed and should be cleared to ACTIVE. */
  shouldReactivate: boolean;
  message?: string;
}

/**
 * Pure check for whether an account's current status should block a login/request.
 * Suspensions are time-boxed, so an expired one isn't blocking — it just needs
 * to be cleared back to ACTIVE by the caller (which has the DB handle to do so).
 */
export function checkAccountStatus(
  accountStatus: string,
  suspendedUntil: Date | string | null,
): AccountStatusCheck {
  if (accountStatus === 'BANNED') {
    return {
      blocked: true,
      shouldReactivate: false,
      message: 'Your account has been permanently banned.',
    };
  }

  if (accountStatus === 'SUSPENDED') {
    const until = suspendedUntil ? new Date(suspendedUntil) : null;
    if (until && until.getTime() > Date.now()) {
      const formatted = until.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      return {
        blocked: true,
        shouldReactivate: false,
        message: `Your account is suspended until ${formatted}.`,
      };
    }
    return { blocked: false, shouldReactivate: true };
  }

  return { blocked: false, shouldReactivate: false };
}
