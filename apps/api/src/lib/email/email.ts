/**
 * Transactional email helper — thin wrapper around nodemailer.
 *
 * Transport selection:
 *   SMTP_HOST set        → real SMTP (STARTTLS on port 587 by default)
 *   SMTP_HOST unset dev  → Ethereal test account (no real delivery)
 *   NODE_ENV=test        → JSON transport (no network calls at all)
 *
 * New env vars (all optional in dev):
 *   SMTP_HOST   SMTP server hostname
 *   SMTP_PORT   SMTP server port (default 587)
 *   SMTP_USER   SMTP auth username
 *   SMTP_PASS   SMTP auth password
 *   SMTP_FROM   Envelope FROM address (default noreply@localhost)
 */

import nodemailer, { Transporter } from "nodemailer";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

interface EtherealAccount {
  user: string;
  pass: string;
}

let _transporter: Transporter | null = null;
let _initPromise: Promise<Transporter> | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;
  if (_initPromise) return _initPromise;

  _initPromise = _buildTransporter().then((t) => {
    _transporter = t;
    return t;
  });

  return _initPromise;
}

async function _buildTransporter(): Promise<Transporter> {
  // Test environment — no real network calls
  if (process.env.NODE_ENV === "test") {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  // Real SMTP transport
  if (env.smtpHost) {
    const t = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth:
        env.smtpUser && env.smtpPass
          ? { user: env.smtpUser, pass: env.smtpPass }
          : undefined,
    });
    logger.info("[email] SMTP transport configured", undefined, {
      host: env.smtpHost,
      port: env.smtpPort,
    });
    return t;
  }

  // Dev fallback — Ethereal test account (visible at ethereal.email)
  const account = (await nodemailer.createTestAccount()) as EtherealAccount;
  const t = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
  });
  logger.info("[email] Ethereal test transport created", undefined, {
    user: account.user,
    previewUrl: "https://ethereal.email",
  });
  return t;
}

/**
 * Send a single transactional email.
 * Throws on transport errors so callers can record the failure.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.smtpFrom,
    to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (process.env.NODE_ENV === "test") return;

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info("[email] Ethereal preview URL", undefined, { previewUrl });
  }
}

/** Replace transporter in tests. @internal */
export function _setTransporterForTest(t: Transporter): void {
  _transporter = t;
  _initPromise = null;
}

/** Reset transporter between tests. @internal */
export function _resetTransporterForTest(): void {
  _transporter = null;
  _initPromise = null;
}
