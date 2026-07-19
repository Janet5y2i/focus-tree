interface PasswordResetEmail {
  to: string;
  resetUrl: string;
}

/**
 * Development placeholder for password-reset delivery.
 *
 * Replace this function with a transactional email provider (for example,
 * Nodemailer over SMTP) before deploying. Never log reset links in production.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmail): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Password reset email delivery is not configured");
  }

  console.info(`[password-reset/email] To: ${to}\nReset link: ${resetUrl}`);
}
