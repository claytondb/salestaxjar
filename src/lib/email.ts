import { Resend } from 'resend';
import { prisma } from './prisma';

// Initialize Resend client
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Email configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'Sails <noreply@sails.tax>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sails.tax';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'claytondb@gmail.com';

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!resend;
}

// =============================================================================
// Email Templates
// =============================================================================

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Welcome / Verification Email
function welcomeEmailTemplate(params: { name: string; verifyUrl: string }): EmailTemplate {
  return {
    subject: 'Welcome to Sails - Verify Your Email',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Sails</title>
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
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">Sales Tax Made Breezy</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 24px;">Welcome, ${params.name}! 🎉</h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for Sails. We're excited to help you simplify your sales tax compliance.
              </p>
              <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                Please verify your email address by clicking the button below:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${params.verifyUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #94a3b8; font-size: 14px;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Sails. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Welcome to Sails, ${params.name}!

Thanks for signing up. Please verify your email address by visiting:
${params.verifyUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.`,
  };
}

// Password Reset Email
function passwordResetTemplate(params: { name: string; resetUrl: string }): EmailTemplate {
  return {
    subject: 'Reset Your Sails Password',
    html: `
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
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #581c87 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold;">Sails</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 24px;">Reset Your Password</h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Hi ${params.name}, we received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${params.resetUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 14px;">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Sails. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Reset Your Sails Password

Hi ${params.name},

We received a request to reset your password. Visit this link to create a new password:
${params.resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.`,
  };
}

// Filing Reminder Email
function filingReminderTemplate(params: {
  name: string;
  state: string;
  dueDate: string;
  estimatedTax: string;
  daysUntilDue: number;
  dashboardUrl: string;
}): EmailTemplate {
  const urgency = params.daysUntilDue <= 1 ? '🚨 URGENT' : params.daysUntilDue <= 7 ? '⚠️ Reminder' : '📅 Upcoming';
  
  return {
    subject: `${urgency}: ${params.state} Sales Tax Filing Due ${params.dueDate}`,
    html: `
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
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #581c87 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold;">Sails</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <div style="background-color: ${params.daysUntilDue <= 1 ? '#fef2f2' : params.daysUntilDue <= 7 ? '#fefce8' : '#f0fdf4'}; border-left: 4px solid ${params.daysUntilDue <= 1 ? '#ef4444' : params.daysUntilDue <= 7 ? '#eab308' : '#10b981'}; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <strong style="color: ${params.daysUntilDue <= 1 ? '#dc2626' : params.daysUntilDue <= 7 ? '#ca8a04' : '#059669'};">
                  ${params.daysUntilDue <= 0 ? '🚨 OVERDUE!' : params.daysUntilDue === 1 ? '⏰ Due Tomorrow!' : `📅 ${params.daysUntilDue} days until due date`}
                </strong>
              </div>
              
              <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 24px;">Hi ${params.name},</h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Your <strong>${params.state}</strong> sales tax filing is due on <strong>${params.dueDate}</strong>.
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #64748b; font-size: 14px;">State</td>
                    <td style="color: #0f172a; font-weight: 600; text-align: right;">${params.state}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 14px; padding-top: 12px;">Due Date</td>
                    <td style="color: #0f172a; font-weight: 600; text-align: right; padding-top: 12px;">${params.dueDate}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-size: 14px; padding-top: 12px;">Estimated Tax</td>
                    <td style="color: #10b981; font-weight: 600; text-align: right; padding-top: 12px;">${params.estimatedTax}</td>
                  </tr>
                </table>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${params.dashboardUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Filing Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Sails. <a href="${APP_URL}/settings#notifications" style="color: #94a3b8;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `${urgency}: ${params.state} Sales Tax Filing Due ${params.dueDate}

Hi ${params.name},

Your ${params.state} sales tax filing is due on ${params.dueDate}.

State: ${params.state}
Due Date: ${params.dueDate}
Estimated Tax: ${params.estimatedTax}

View filing details: ${params.dashboardUrl}`,
  };
}

// Payment Failed Email
function paymentFailedTemplate(params: { name: string; billingUrl: string }): EmailTemplate {
  return {
    subject: 'Action Required: Payment Failed for Your Sails Subscription',
    html: `
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
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #581c87 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold;">Sails</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <strong style="color: #dc2626;">⚠️ Payment Failed</strong>
              </div>
              
              <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 24px;">Hi ${params.name},</h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                We were unable to process your payment for your Sails subscription. To avoid any interruption to your service, please update your payment method.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${params.billingUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Update Payment Method
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #475569; font-size: 14px; line-height: 1.6;">
                If you believe this is an error or need assistance, please don't hesitate to contact our support team.
              </p>
              
              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 14px;">
                If your payment method is already up to date, your bank may have declined the charge. Please contact them for more information.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Sails. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Payment Failed for Your Sails Subscription

Hi ${params.name},

We were unable to process your payment for your Sails subscription. To avoid any interruption to your service, please update your payment method.

Update your payment method here: ${params.billingUrl}

If you believe this is an error or need assistance, please contact our support team.

If your payment method is already up to date, your bank may have declined the charge. Please contact them for more information.`,
  };
}

// Monthly Tax Summary Email
function monthlySummaryTemplate(params: {
  name: string;
  month: string;
  totalSales: string;
  totalTax: string;
  transactionCount: number;
  topStates: Array<{ state: string; tax: string }>;
  dashboardUrl: string;
}): EmailTemplate {
  const statesHtml = params.topStates
    .map(s => `<tr><td style="padding: 8px 0; color: #475569;">${s.state}</td><td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${s.tax}</td></tr>`)
    .join('');

  return {
    subject: `Your ${params.month} Sales Tax Summary`,
    html: `
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
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #581c87 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold;">Sails</h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">${params.month} Tax Summary</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #0f172a; font-size: 24px;">Hi ${params.name},</h2>
              <p style="margin: 0 0 30px; color: #475569; font-size: 16px; line-height: 1.6;">
                Here's your sales tax summary for ${params.month}:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Total Sales</p>
                    <p style="margin: 8px 0 0; color: #0f172a; font-size: 24px; font-weight: bold;">${params.totalSales}</p>
                  </td>
                  <td style="padding: 20px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Total Tax</p>
                    <p style="margin: 8px 0 0; color: #10b981; font-size: 24px; font-weight: bold;">${params.totalTax}</p>
                  </td>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Transactions</p>
                    <p style="margin: 8px 0 0; color: #0f172a; font-size: 24px; font-weight: bold;">${params.transactionCount}</p>
                  </td>
                </tr>
              </table>
              
              ${params.topStates.length > 0 ? `
              <h3 style="margin: 30px 0 16px; color: #0f172a; font-size: 16px;">Tax by State</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                ${statesHtml}
              </table>
              ` : ''}
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${params.dashboardUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Full Report
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Sails. <a href="${APP_URL}/settings#notifications" style="color: #94a3b8;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `Your ${params.month} Sales Tax Summary

Hi ${params.name},

Here's your sales tax summary for ${params.month}:

Total Sales: ${params.totalSales}
Total Tax: ${params.totalTax}
Transactions: ${params.transactionCount}

View full report: ${params.dashboardUrl}`,
  };
}

// =============================================================================
// Email Sending Functions
// =============================================================================

async function sendEmail(params: {
  to: string;
  template: EmailTemplate;
  templateName: string;
  userId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Log email attempt
  const logData: {
    userId: string | undefined;
    to: string;
    subject: string;
    template: string;
    status: 'sent' | 'failed' | 'bounced';
    messageId: string | undefined;
    error: string | undefined;
  } = {
    userId: params.userId,
    to: params.to,
    subject: params.template.subject,
    template: params.templateName,
    status: 'sent',
    messageId: undefined,
    error: undefined,
  };

  if (!resend) {
    // In development or when Resend is not configured, log the email
    console.log('📧 Email would be sent:', {
      to: params.to,
      subject: params.template.subject,
      template: params.templateName,
    });

    logData.status = 'sent';
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
      subject: params.template.subject,
      html: params.template.html,
      text: params.template.text,
    });

    logData.messageId = result.data?.id;

    try {
      await prisma.emailLog.create({ data: logData });
    } catch {
      // Ignore logging errors
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    logData.status = 'failed';
    logData.error = error instanceof Error ? error.message : 'Unknown error';

    try {
      await prisma.emailLog.create({ data: logData });
    } catch {
      // Ignore logging errors
    }

    console.error('Email send error:', error);
    return { success: false, error: logData.error };
  }
}

// =============================================================================
// Public Email Functions
// =============================================================================

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  verifyToken: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${APP_URL}/verify-email?token=${params.verifyToken}`;
  const template = welcomeEmailTemplate({ name: params.name, verifyUrl });

  return sendEmail({
    to: params.to,
    template,
    templateName: 'welcome',
    userId: params.userId,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetToken: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${APP_URL}/reset-password?token=${params.resetToken}`;
  const template = passwordResetTemplate({ name: params.name, resetUrl });

  return sendEmail({
    to: params.to,
    template,
    templateName: 'reset',
    userId: params.userId,
  });
}

export async function sendFilingReminderEmail(params: {
  to: string;
  name: string;
  state: string;
  dueDate: Date;
  estimatedTax: number;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const daysUntilDue = Math.ceil((params.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dueDateStr = params.dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const taxStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.estimatedTax);

  const template = filingReminderTemplate({
    name: params.name,
    state: params.state,
    dueDate: dueDateStr,
    estimatedTax: taxStr,
    daysUntilDue,
    dashboardUrl: `${APP_URL}/filings`,
  });

  return sendEmail({
    to: params.to,
    template,
    templateName: 'reminder',
    userId: params.userId,
  });
}

export async function sendPaymentFailedEmail(params: {
  to: string;
  name: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const billingUrl = `${APP_URL}/settings?tab=billing`;
  const template = paymentFailedTemplate({ name: params.name, billingUrl });

  return sendEmail({
    to: params.to,
    template,
    templateName: 'payment_failed',
    userId: params.userId,
  });
}

export async function sendMonthlySummaryEmail(params: {
  to: string;
  name: string;
  month: string;
  totalSales: number;
  totalTax: number;
  transactionCount: number;
  topStates: Array<{ state: string; tax: number }>;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const template = monthlySummaryTemplate({
    name: params.name,
    month: params.month,
    totalSales: formatCurrency(params.totalSales),
    totalTax: formatCurrency(params.totalTax),
    transactionCount: params.transactionCount,
    topStates: params.topStates.map(s => ({ state: s.state, tax: formatCurrency(s.tax) })),
    dashboardUrl: `${APP_URL}/dashboard`,
  });

  return sendEmail({
    to: params.to,
    template,
    templateName: 'summary',
    userId: params.userId,
  });
}

// =============================================================================
// Admin Notifications
// =============================================================================

function newSignupNotificationTemplate(params: {
  userName: string;
  userEmail: string;
  signupTime: string;
}): EmailTemplate {
  return {
    subject: `🎉 New Sails Signup: ${params.userName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🎉 New Signup!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 15px; color: #0f172a; font-size: 16px;"><strong>Name:</strong> ${params.userName}</p>
              <p style="margin: 0 0 15px; color: #0f172a; font-size: 16px;"><strong>Email:</strong> ${params.userEmail}</p>
              <p style="margin: 0; color: #64748b; font-size: 14px;"><strong>Time:</strong> ${params.signupTime}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px; text-align: center;">
              <a href="${APP_URL}/admin" style="color: #10b981; text-decoration: none; font-size: 14px;">View Dashboard →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `New Sails Signup!

Name: ${params.userName}
Email: ${params.userEmail}
Time: ${params.signupTime}`,
  };
}

export async function sendNewSignupNotification(params: {
  userName: string;
  userEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('Email not configured, skipping admin notification');
    return { success: true };
  }

  const signupTime = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const template = newSignupNotificationTemplate({
    userName: params.userName,
    userEmail: params.userEmail,
    signupTime,
  });

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    console.log('Admin notification sent for new signup:', params.userEmail);
    return { success: true };
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
