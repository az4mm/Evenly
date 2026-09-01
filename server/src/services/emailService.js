import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let transporter = null;

// Path to the Evenly logo image for CID embedding (PNG for mobile email compatibility)
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'evenly_logo.png');

/**
 * Create or return the Nodemailer SMTP transporter.
 * If SMTP_USER is not set, all sends silently skip.
 */
function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[EmailService] SMTP_USER/SMTP_PASS not set — emails will be skipped.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: { user, pass },
  });

  return transporter;
}

/**
 * Send a single email with the Evenly logo embedded.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - Email HTML body (use cid:evenly-logo for logo)
 */
export async function sendEmail(to, subject, html) {
  const transport = getTransporter();
  if (!transport) return;

  const fromName = process.env.SMTP_FROM_NAME || 'Evenly';
  const fromEmail = process.env.SMTP_USER;

  try {
    await transport.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
      attachments: [{
        filename: 'evenly_logo.png',
        path: LOGO_PATH,
        cid: 'evenly-logo',
      }],
    });
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
  }
}

/**
 * Send emails to multiple recipients with the Evenly logo embedded.
 * @param {Array<{email: string}>} recipients - Array of objects with email field
 * @param {string} subject - Email subject line
 * @param {string} html - Email HTML body (use cid:evenly-logo for logo)
 */
export async function sendBulkEmails(recipients, subject, html) {
  const transport = getTransporter();
  if (!transport) return;

  const fromName = process.env.SMTP_FROM_NAME || 'Evenly';
  const fromEmail = process.env.SMTP_USER;

  const promises = recipients.map(({ email }) =>
    transport.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject,
      html,
      attachments: [{
        filename: 'evenly_logo.png',
        path: LOGO_PATH,
        cid: 'evenly-logo',
      }],
    }).catch(err => {
      console.error(`[EmailService] Failed to send email to ${email}:`, err.message);
    })
  );

  await Promise.allSettled(promises);
}
