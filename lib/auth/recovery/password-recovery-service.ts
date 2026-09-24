/**
 * ============================================================================
 *  PasswordRecoveryService
 * ============================================================================
 *
 * An abstraction over "how a recovery link reaches the user".
 *
 * The shipped product uses SECURITY-QUESTION recovery and needs no email
 * provider. This interface exists so email-based reset (Resend / SendGrid /
 * SMTP / anything else) can be switched on later by configuration alone, with
 * no changes at any call site: implement `PasswordRecoveryService`, register it
 * in `getPasswordRecoveryService()`, and set RECOVERY_EMAIL_DRIVER.
 *
 * SECURITY CONTRACT for every implementation:
 *  - The raw `token` is a secret. Never log it, never include it in an audit
 *    event, never persist it in plaintext, never return it to a client.
 *  - Delivery failures must be reported as `delivered: false` WITHOUT throwing
 *    in a way that reveals whether the address exists. The caller always
 *    responds to the user with the same generic message.
 */

export interface RecoveryDeliveryInput {
  /** Recipient address. */
  to: string;
  /** Display name, for a friendly greeting. Never used for authorisation. */
  name: string;
  /** Single-use, high-entropy recovery token. SECRET. */
  token: string;
  expiresAt: Date;
  requestedAt: Date;
}

export interface RecoveryDeliveryResult {
  delivered: boolean;
  provider: string;
  /** Non-sensitive failure context, for server logs only. */
  detail?: string;
}

export interface PasswordRecoveryService {
  readonly provider: string;
  /** True when the provider has the configuration it needs to send. */
  isConfigured(): boolean;
  deliver(input: RecoveryDeliveryInput): Promise<RecoveryDeliveryResult>;
}

/** Public URL of the reset page, with the token as a query parameter. */
export function buildRecoveryUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/** Minimal HTML body shared by the email providers. */
function renderEmail(input: RecoveryDeliveryInput): { subject: string; html: string; text: string } {
  const url = buildRecoveryUrl(input.token);
  const expires = input.expiresAt.toISOString().replace("T", " ").slice(0, 16);

  const subject = "Reset your Lunara password";
  const text = [
    `Hi ${input.name},`,
    "",
    "We received a request to reset your Lunara password.",
    `Open this link to choose a new one: ${url}`,
    "",
    `This link expires at ${expires} UTC and can only be used once.`,
    "If you did not request this, you can safely ignore this email - your password has not changed.",
    "",
    "Lunara",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f7f6fb;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#241f36;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #e9e6f3;border-radius:20px;padding:32px;">
      <p style="margin:0 0 4px;font-size:20px;font-weight:600;color:#7c6bd9;">Lunara</p>
      <p style="margin:0 0 24px;font-size:13px;color:#6c6688;">Understand your cycle. Understand yourself.</p>
      <h1 style="margin:0 0 12px;font-size:22px;">Reset your password</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${input.name}, we received a request to reset your Lunara password.</p>
      <p style="margin:0 0 24px;">
        <a href="${url}" style="display:inline-block;background:#7c6bd9;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px;">Choose a new password</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6c6688;">This link expires at ${expires} UTC and can only be used once.</p>
      <p style="margin:0;font-size:13px;color:#6c6688;">If you did not request this, you can safely ignore this email - your password has not changed.</p>
    </div>
  </div>
</body></html>`;

  return { subject, html, text };
}

/**
 * Default provider: recovery email is not configured.
 *
 * Chosen as the default so a self-hosted Lunara instance runs with zero
 * third-party dependencies, matching the "do not require an email provider for
 * the initial development version" requirement.
 */
export class DisabledRecoveryService implements PasswordRecoveryService {
  readonly provider = "disabled";

  isConfigured(): boolean {
    return false;
  }

  async deliver(): Promise<RecoveryDeliveryResult> {
    // Deliberately logs nothing about the recipient or token.
    console.warn(
      "[lunara:recovery] email delivery is not configured; falling back to security-question recovery.",
    );
    return { delivered: false, provider: this.provider, detail: "provider_not_configured" };
  }
}

/** Resend (https://resend.com) via the REST API - no SDK dependency. */
export class ResendRecoveryService implements PasswordRecoveryService {
  readonly provider = "resend";

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY && process.env.RECOVERY_EMAIL_FROM);
  }

  async deliver(input: RecoveryDeliveryInput): Promise<RecoveryDeliveryResult> {
    if (!this.isConfigured()) {
      return { delivered: false, provider: this.provider, detail: "missing_configuration" };
    }
    const { subject, html, text } = renderEmail(input);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RECOVERY_EMAIL_FROM,
          to: input.to,
          subject,
          html,
          text,
        }),
      });
      if (!response.ok) {
        return {
          delivered: false,
          provider: this.provider,
          detail: `http_${response.status}`,
        };
      }
      return { delivered: true, provider: this.provider };
    } catch (error) {
      return {
        delivered: false,
        provider: this.provider,
        detail: error instanceof Error ? error.message : "network_error",
      };
    }
  }
}

/** SendGrid via the v3 REST API - no SDK dependency. */
export class SendGridRecoveryService implements PasswordRecoveryService {
  readonly provider = "sendgrid";

  isConfigured(): boolean {
    return Boolean(process.env.SENDGRID_API_KEY && process.env.RECOVERY_EMAIL_FROM);
  }

  async deliver(input: RecoveryDeliveryInput): Promise<RecoveryDeliveryResult> {
    if (!this.isConfigured()) {
      return { delivered: false, provider: this.provider, detail: "missing_configuration" };
    }
    const { subject, html, text } = renderEmail(input);
    const from = process.env.RECOVERY_EMAIL_FROM ?? "";
    const fromEmail = /<([^>]+)>/.exec(from)?.[1] ?? from;
    const fromName = /^([^<]+)</.exec(from)?.[1]?.trim();

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: input.to }] }],
          from: fromName ? { email: fromEmail, name: fromName } : { email: fromEmail },
          subject,
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html },
          ],
        }),
      });
      if (!response.ok) {
        return {
          delivered: false,
          provider: this.provider,
          detail: `http_${response.status}`,
        };
      }
      return { delivered: true, provider: this.provider };
    } catch (error) {
      return {
        delivered: false,
        provider: this.provider,
        detail: error instanceof Error ? error.message : "network_error",
      };
    }
  }
}

/**
 * SMTP placeholder.
 *
 * A raw SMTP client needs a socket library (e.g. `nodemailer`). Rather than
 * hand-roll an SMTP implementation, this reports "not configured" until such a
 * dependency is added - the interface and call sites are already in place.
 */
export class SmtpRecoveryService implements PasswordRecoveryService {
  readonly provider = "smtp";

  isConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASSWORD &&
        process.env.RECOVERY_EMAIL_FROM,
    );
  }

  async deliver(): Promise<RecoveryDeliveryResult> {
    console.warn(
      "[lunara:recovery] SMTP transport requires an SMTP client library (e.g. nodemailer). Add it and implement SmtpRecoveryService.deliver().",
    );
    return { delivered: false, provider: this.provider, detail: "smtp_transport_not_implemented" };
  }
}

/**
 * Provider registry.
 * Add a new provider: register it here and set RECOVERY_EMAIL_DRIVER to its key.
 */
const PROVIDERS: Record<string, () => PasswordRecoveryService> = {
  disabled: () => new DisabledRecoveryService(),
  resend: () => new ResendRecoveryService(),
  sendgrid: () => new SendGridRecoveryService(),
  smtp: () => new SmtpRecoveryService(),
};

export function getPasswordRecoveryService(): PasswordRecoveryService {
  const configured = (process.env.RECOVERY_EMAIL_DRIVER ?? "disabled").toLowerCase();
  const factory = PROVIDERS[configured];
  if (!factory) {
    console.warn(
      `[lunara:recovery] unknown RECOVERY_EMAIL_DRIVER "${configured}"; using the disabled provider.`,
    );
    return new DisabledRecoveryService();
  }
  return factory();
}

/** True when an email provider is ready to deliver reset links. */
export function isEmailRecoveryAvailable(): boolean {
  return getPasswordRecoveryService().isConfigured();
}
