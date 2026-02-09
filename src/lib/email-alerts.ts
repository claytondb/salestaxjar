/**
 * Email Alerts for Nexus Threshold Crossings
 * 
 * Uses Resend (same setup as existing email.ts) to send
 * clear, actionable emails when users approach or cross nexus thresholds.
 */

import { Resend } from 'resend';
import { prisma } from './prisma';
import { ExposureStatus } from './nexus-thresholds';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Sails <noreply@sails.tax>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sails.tax';

interface NexusAlertEmailParams {
  to: string;
  name: string;
  userId: string;
  stateCode: string;
  stateName: string;
  alertLevel: ExposureStatus;
  salesAmount: number;
  threshold: number;
  percentage: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAlertConfig(level: ExposureStatus): {
  emoji: string;
  urgency: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  actionText: string;
} {
  switch (level) {
    case 'exceeded':
      return {
        emoji: '🚨',
        urgency: 'Action Required',
        bgColor: '#fef2f2',
        borderColor: '#ef4444',
        textColor: '#dc2626',
        actionText: 'You need to register for sales tax collection in this state.',
      };
    case 'warning':
      return {
        emoji: '⚠️',
        urgency: 'Warning',
        bgColor: '#fff7ed',
        borderColor: '#f97316',
        textColor: '#ea580c',
        actionText: 'You should prepare to register for sales tax collection.',
      };
    case 'approaching':
      return {
        emoji: '📊',
        urgency: 'Heads Up',
        bgColor: '#fefce8',
        borderColor: '#eab308',
        textColor: '#ca8a04',
        actionText: 'Keep an eye on your sales in this state.',
      };
    default:
      return {
        emoji: '📊',
        urgency: 'Info',
        bgColor: '#f0fdf4',
        borderColor: '#22c55e',
        textColor: '#16a34a',
        actionText: '',
      };
  }
}

function nexusAlertEmailTemplate(params: NexusAlertEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const config = getAlertConfig(params.alertLevel);
  const salesFormatted = formatCurrency(params.salesAmount);
  const thresholdFormatted = formatCurrency(params.threshold);
  const percentRounded = Math.round(params.percentage);

  const subject = `${config.emoji} ${config.urgency}: ${params.stateName} nexus threshold at ${percentRounded}%`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #581c87 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold;">Sails</h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">Nexus Threshold Alert</p>
            </td>
          </tr>
          
          <!-- Alert Banner -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="background-color: ${config.bgColor}; border-left: 4px solid ${config.borderColor}; padding: 16px; margin-top: 30px; border-radius: 4px;">
                <strong style="color: ${config.textColor}; font-size: 16px;">
                  ${config.emoji} ${config.urgency}: ${params.stateName}
                </strong>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 24px 40px 40px;">
              <p style="margin: 0 0 20px; color: #0f172a; font-size: 16px; line-height: 1.6;">
                Hi ${params.name},
              </p>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Your sales in <strong>${params.stateName}</strong> have reached 
                <strong>${salesFormatted}</strong> — that's <strong>${percentRounded}%</strong> 
                of the <strong>${thresholdFormatted}</strong> economic nexus threshold.
              </p>
              
              <!-- Progress Bar -->
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-size: 14px;">Progress toward threshold</span>
                  <span style="color: #0f172a; font-weight: 600; font-size: 14px;">${percentRounded}%</span>
                </div>
                <div style="background-color: #e2e8f0; border-radius: 4px; height: 12px; overflow: hidden;">
                  <div style="background-color: ${config.borderColor}; height: 100%; width: ${Math.min(percentRounded, 100)}%; border-radius: 4px;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                  <span style="color: #64748b; font-size: 13px;">${salesFormatted}</span>
                  <span style="color: #64748b; font-size: 13px;">${thresholdFormatted}</span>
                </div>
              </div>
              
              <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">
                ${config.actionText}
              </p>
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/nexus" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Nexus Exposure
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Sails. 
                <a href="${APP_URL}/settings#notifications" style="color: #94a3b8;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${config.emoji} ${config.urgency}: ${params.stateName} Nexus Threshold

Hi ${params.name},

Your sales in ${params.stateName} have reached ${salesFormatted} — that's ${percentRounded}% of the ${thresholdFormatted} economic nexus threshold.

${config.actionText}

View your nexus exposure: ${APP_URL}/nexus

---
Manage notification preferences: ${APP_URL}/settings#notifications`;

  return { subject, html, text };
}

/**
 * Send a nexus alert email
 */
export async function sendNexusAlertEmail(
  params: NexusAlertEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const template = nexusAlertEmailTemplate(params);

  // Log the email
  const logData: {
    userId: string;
    to: string;
    subject: string;
    template: string;
    status: 'sent' | 'failed' | 'bounced';
    messageId: string | undefined;
    error: string | undefined;
  } = {
    userId: params.userId,
    to: params.to,
    subject: template.subject,
    template: 'nexus_alert',
    status: 'sent',
    messageId: undefined,
    error: undefined,
  };

  if (!resend) {
    // Development mode
    console.log('📧 Nexus alert email would be sent:', {
      to: params.to,
      subject: template.subject,
      state: params.stateName,
      level: params.alertLevel,
      percentage: Math.round(params.percentage),
    });

    logData.messageId = 'dev-' + Date.now();

    try {
      await prisma.emailLog.create({ data: logData });
    } catch {
      // Ignore logging errors
    }

    return { success: true, messageId: logData.messageId };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logData.messageId = result.data?.id;

    try {
      await prisma.emailLog.create({ data: logData });
    } catch {
      // Ignore logging errors
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    logData.status = 'failed' as const;
    logData.error = error instanceof Error ? error.message : 'Unknown error';

    try {
      await prisma.emailLog.create({ data: logData });
    } catch {
      // Ignore logging errors
    }

    console.error('Nexus alert email error:', error);
    return { success: false, error: logData.error };
  }
}
