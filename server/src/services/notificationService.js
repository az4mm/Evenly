import pool from '../db/database.js';
import { sendBulkEmails } from './emailService.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ──────────────────────────────────────────────────
//  EMAIL TEMPLATE
// ──────────────────────────────────────────────────

/**
 * Build a branded HTML email.
 * @param {string} headline - Main action text (e.g. "Alex added ₹1,200 for Dinner")
 * @param {string[]} detailLines - Array of detail strings
 * @param {string} groupId - Group UUID for CTA link
 * @param {string} groupName - Group name for footer
 * @returns {string} HTML string
 */
function buildEmailHtml(headline, detailLines, groupId, groupName) {
  const groupUrl = `${CLIENT_URL}/groups/${groupId}`;
  const unsubscribeUrl = `${CLIENT_URL}/groups/${groupId}`;

  const detailsHtml = detailLines
    .map(line => `
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#c8c8d8;line-height:1.5;border-left:3px solid #2563eb;background:rgba(37,99,235,0.04);border-radius:0 8px 8px 0;margin-bottom:4px;">
          ${line}
        </td>
      </tr>
      <tr><td style="height:6px;"></td></tr>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0b10;font-family:'Segoe UI','Inter',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b10;padding:40px 16px;">
    <tr><td align="center">

      <!-- Outer glow container -->
      <table width="100%" style="max-width:540px;" cellpadding="0" cellspacing="0">

        <!-- Top accent gradient bar -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#2563eb,#7c3aed,#2563eb);border-radius:24px 24px 0 0;"></td>
        </tr>

        <!-- Main Card -->
        <tr>
          <td style="background:#16161e;border-radius:0 0 24px 24px;border:1px solid rgba(255,255,255,0.06);border-top:none;">

            <!-- Header: Logo + Brand -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:32px 36px 24px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align:middle;padding-right:14px;">
                      <img src="cid:evenly-logo" width="36" height="36" alt="Evenly" style="display:block;border:none;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:24px;color:#f0f0f8;font-weight:700;letter-spacing:-0.5px;">Evenly</span>
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>

            <!-- Headline -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 36px 20px;">
                  <h1 style="margin:0;font-size:20px;color:#f0f0f8;font-weight:600;line-height:1.4;">${headline}</h1>
                </td>
              </tr>
            </table>

            <!-- Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 36px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:16px;border:1px solid rgba(255,255,255,0.05);">
                    <tr><td style="padding:16px 12px;">
                      <table cellpadding="0" cellspacing="0" width="100%">
                        ${detailsHtml}
                      </table>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 36px 32px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:14px;background:linear-gradient(135deg,#2563eb,#4f46e5);">
                        <a href="${groupUrl}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 32px;font-weight:600;font-size:14px;letter-spacing:0.3px;">
                          View in Evenly &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:20px 36px 24px;border-top:1px solid rgba(255,255,255,0.05);">
                  <p style="margin:0 0 6px;font-size:12px;color:#4a4a5a;line-height:1.6;">
                    You received this because you're a member of <strong style="color:#7878a0;">${groupName}</strong>.
                  </p>
                  <a href="${unsubscribeUrl}" style="font-size:12px;color:#2563eb;text-decoration:none;">Manage notification preferences</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <!-- Tagline -->
      <table width="100%" style="max-width:540px;">
        <tr>
          <td style="padding:24px 36px 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#2a2a35;letter-spacing:0.5px;">
              EVENLY &mdash; Split expenses, not friendships.
            </p>
          </td>
        </tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

// ──────────────────────────────────────────────────
//  EMAIL CONTENT BUILDERS (per activity type)
// ──────────────────────────────────────────────────

/**
 * Format currency amount.
 */
function fmtAmount(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${parseFloat(amount).toFixed(2)}`;
  }
}

/**
 * Build email subject and HTML for each activity type.
 * @returns {{ subject: string, html: string }}
 */
function buildEmailContent(activityType, data, groupId, groupName, currency) {
  let headline = '';
  let details = [];

  switch (activityType) {
    case 'member_joined': {
      const name = data.actor_name || 'Someone';
      headline = `${name} joined ${groupName}`;
      details = [
        `<strong>${name}</strong> is now a member of your group.`,
      ];
      break;
    }

    case 'expense_added': {
      const name = data.paid_by_name || data.actor_name || 'Someone';
      const desc = data.description || 'an expense';
      const amount = fmtAmount(data.amount, currency);
      headline = `${name} added ${amount} for ${desc}`;
      details = [
        `💰 <strong>Amount:</strong> ${amount}`,
        `📂 <strong>Category:</strong> ${data.category || 'Others'}`,
        `👤 <strong>Paid by:</strong> ${name}`,
      ];
      if (data.distribution?.splits) {
        const splitCount = data.distribution.splits.length;
        details.push(`👥 <strong>Split among:</strong> ${splitCount} member${splitCount > 1 ? 's' : ''}`);
      }
      break;
    }

    case 'settlement_recorded': {
      const payer = data.paid_by_name || data.actor_name || 'Someone';
      const amount = fmtAmount(data.amount, currency);
      // Receiver is in distribution.splits[0]
      const receiver = data.distribution?.splits?.[0]?.user_name
        || data.distribution?.splits?.[0]?.user_id
        || 'someone';
      headline = `${payer} paid ${receiver} ${amount}`;
      details = [
        `💸 <strong>${payer}</strong> settled <strong>${amount}</strong> with <strong>${receiver}</strong>.`,
      ];
      break;
    }

    case 'expense_deleted': {
      const name = data.actor_name || 'Someone';
      const desc = data.description || 'an expense';
      const amount = fmtAmount(data.amount, currency);
      headline = `${name} deleted ${amount} ${desc}`;
      details = [
        `🗑️ <strong>${name}</strong> deleted an expense of <strong>${amount}</strong>.`,
        `⚠️ This may have changed your group balances.`,
      ];
      break;
    }

    case 'settlement_deleted': {
      const name = data.actor_name || 'Someone';
      const amount = fmtAmount(data.amount, currency);
      headline = `${name} deleted a ${amount} payment`;
      details = [
        `🗑️ <strong>${name}</strong> deleted a settlement of <strong>${amount}</strong>.`,
        `⚠️ This may have changed your group balances.`,
      ];
      break;
    }

    default:
      return null;
  }

  const subject = headline;
  const html = buildEmailHtml(headline, details, groupId, groupName);
  return { subject, html };
}

// ──────────────────────────────────────────────────
//  MAIN ORCHESTRATOR
// ──────────────────────────────────────────────────

/**
 * Notify group members via email (fire-and-forget).
 * Call this WITHOUT await — it runs in the background.
 *
 * @param {Object} opts
 * @param {string} opts.groupId - The group UUID
 * @param {string} opts.excludeUserId - User who triggered the action (won't be notified)
 * @param {string} opts.activityType - One of the 5 supported types
 * @param {Object} opts.data - Activity-specific data (same shape as activity_logs.data)
 * @param {string} opts.actorName - Name of the user who triggered the action
 */
export async function notifyGroupMembers({ groupId, excludeUserId, activityType, data, actorName }) {
  try {
    // 1. Get group info (name + currency)
    const { rows: groupRows } = await pool.query(
      'SELECT name, currency FROM groups WHERE id = $1',
      [groupId]
    );
    if (groupRows.length === 0) return;

    const { name: groupName, currency } = groupRows[0];

    // 2. Get opted-in members (excluding the actor)
    const { rows: recipients } = await pool.query(
      `SELECT u.email
       FROM user_groups ug
       JOIN users u ON u.id = ug.user_id
       WHERE ug.group_id = $1
         AND ug.user_id != $2
         AND ug.email_notifications = true`,
      [groupId, excludeUserId]
    );

    if (recipients.length === 0) return;

    // 3. Build email content
    const enrichedData = { ...data, actor_name: actorName };
    const content = buildEmailContent(activityType, enrichedData, groupId, groupName, currency);
    if (!content) return;

    // 4. Send emails (fire-and-forget — errors are logged, not thrown)
    await sendBulkEmails(recipients, content.subject, content.html);
  } catch (err) {
    // Never throw — this runs in the background
    console.error('[NotificationService] Error sending notifications:', err.message);
  }
}
