export const MIN_PASSWORD_LENGTH = 10;

/** The reason a new password is not acceptable, or null if it is. Shared by the UI and the server. */
export function passwordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use both letters and numbers in the password.";
  }
  return null;
}
