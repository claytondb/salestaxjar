/**
 * Nexus Alert System
 * 
 * Checks user sales data against state nexus thresholds and creates
 * alerts when approaching (75%), warning (90%), or exceeding (100%).
 * 
 * Anti-spam: only creates alerts for NEW threshold crossings.
 * Once an alert is created for a given (user, state, level), it won't
 * be re-created unless the user's sales drop below and cross again.
 */

import { prisma } from './prisma';
import { getExposureTotals } from './sales-aggregation';
import {
  STATE_NEXUS_THRESHOLDS,
  THRESHOLD_BY_STATE,
  calculateExposureStatus,
  ExposureStatus,
} from './nexus-thresholds';
import { sendNexusAlertEmail } from './email-alerts';

export interface NexusAlertResult {
  stateCode: string;
  stateName: string;
  alertLevel: ExposureStatus;
  salesAmount: number;
  threshold: number;
  percentage: number;
  message: string;
}

/**
 * Alert level hierarchy for comparison
 */
const ALERT_LEVEL_ORDER: Record<string, number> = {
  safe: 0,
  approaching: 1,
  warning: 2,
  exceeded: 3,
};

/**
 * Check all states for a user and create new alerts as needed.
 * Returns the list of newly created alerts.
 */
export async function checkAndCreateAlerts(userId: string): Promise<NexusAlertResult[]> {
  const exposureTotals = await getExposureTotals(userId);
  const newAlerts: NexusAlertResult[] = [];

  // Get existing alerts so we don't duplicate
  const existingAlerts = await prisma.nexusAlert.findMany({
    where: { userId },
  });

  const existingAlertMap = new Map<string, string>(); // key: "stateCode:level" -> id
  for (const alert of existingAlerts) {
    existingAlertMap.set(`${alert.stateCode}:${alert.alertLevel}`, alert.id);
  }

  for (const threshold of STATE_NEXUS_THRESHOLDS) {
    if (!threshold.hasSalesTax || !threshold.salesThreshold) continue;

    const totals = exposureTotals.get(threshold.stateCode);
    if (!totals) continue;

    // Pick the right measurement period
    let sales: number;
    let transactions: number;

    if (
      threshold.measurementPeriod === 'rolling_12_months'
    ) {
      sales = totals.rolling12MonthSales;
      transactions = totals.rolling12MonthTransactions;
    } else {
      // calendar_year or previous_or_current_calendar_year
      // Use the higher of rolling 12-month or calendar year
      sales = Math.max(totals.rolling12MonthSales, totals.calendarYearSales);
      transactions = Math.max(
        totals.rolling12MonthTransactions,
        totals.calendarYearTransactions
      );
    }

    const exposure = calculateExposureStatus(sales, transactions, threshold);

    if (exposure.status === 'safe') continue;

    // Determine which alert levels to create
    const levelsToCreate: ExposureStatus[] = [];
    
    if (exposure.status === 'exceeded') {
      levelsToCreate.push('exceeded', 'warning', 'approaching');
    } else if (exposure.status === 'warning') {
      levelsToCreate.push('warning', 'approaching');
    } else if (exposure.status === 'approaching') {
      levelsToCreate.push('approaching');
    }

    for (const level of levelsToCreate) {
      const key = `${threshold.stateCode}:${level}`;
      
      // Skip if alert already exists at this level
      if (existingAlertMap.has(key)) continue;

      const message = generateAlertMessage(
        threshold.stateName,
        level,
        sales,
        threshold.salesThreshold,
        exposure.highestPercentage
      );

      const alertResult: NexusAlertResult = {
        stateCode: threshold.stateCode,
        stateName: threshold.stateName,
        alertLevel: level,
        salesAmount: sales,
        threshold: threshold.salesThreshold,
        percentage: exposure.highestPercentage,
        message,
      };

      // Create in database
      await prisma.nexusAlert.create({
        data: {
          userId,
          stateCode: threshold.stateCode,
          stateName: threshold.stateName,
          alertLevel: level,
          salesAmount: sales,
          threshold: threshold.salesThreshold,
          percentage: Math.min(exposure.highestPercentage, 999.99),
          message,
        },
      });

      // Only add the highest new level to results (to avoid spamming)
      if (level === levelsToCreate[0]) {
        newAlerts.push(alertResult);
      }
    }
  }

  // Send email alerts for new alerts
  if (newAlerts.length > 0) {
    try {
      await sendNexusAlertEmails(userId, newAlerts);
    } catch (error) {
      console.error('Failed to send nexus alert emails:', error);
      // Don't throw — alerts were still created in DB
    }
  }

  return newAlerts;
}

/**
 * Send email alerts for newly created nexus alerts
 */
async function sendNexusAlertEmails(
  userId: string,
  alerts: NexusAlertResult[]
): Promise<void> {
  // Check notification preferences
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  // Default to true if no preferences set
  const emailEnabled = prefs?.emailNexusAlerts !== false;
  if (!emailEnabled) return;

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user) return;

  for (const alert of alerts) {
    try {
      const result = await sendNexusAlertEmail({
        to: user.email,
        name: user.name,
        userId,
        stateCode: alert.stateCode,
        stateName: alert.stateName,
        alertLevel: alert.alertLevel,
        salesAmount: alert.salesAmount,
        threshold: alert.threshold,
        percentage: alert.percentage,
      });

      // Mark email as sent
      if (result.success) {
        await prisma.nexusAlert.updateMany({
          where: {
            userId,
            stateCode: alert.stateCode,
            alertLevel: alert.alertLevel,
          },
          data: { emailSent: true },
        });
      }
    } catch (error) {
      console.error(`Failed to send nexus alert email for ${alert.stateCode}:`, error);
    }
  }
}

/**
 * Generate a human-readable alert message
 */
function generateAlertMessage(
  stateName: string,
  level: ExposureStatus,
  sales: number,
  threshold: number,
  percentage: number
): string {
  const salesFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(sales);

  const thresholdFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(threshold);

  switch (level) {
    case 'exceeded':
      return `Your sales in ${stateName} have reached ${salesFormatted}, exceeding the ${thresholdFormatted} economic nexus threshold. You need to register and start collecting sales tax.`;
    case 'warning':
      return `Your sales in ${stateName} have reached ${salesFormatted} — that's ${Math.round(percentage)}% of the ${thresholdFormatted} nexus threshold. You may need to register soon.`;
    case 'approaching':
      return `Your sales in ${stateName} have reached ${salesFormatted} — that's ${Math.round(percentage)}% of the ${thresholdFormatted} nexus threshold. Keep an eye on this.`;
    default:
      return `Sales in ${stateName}: ${salesFormatted}`;
  }
}

/**
 * Get all alerts for a user, sorted by most recent first.
 */
export async function getUserAlerts(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<{
  alerts: Array<{
    id: string;
    stateCode: string;
    stateName: string;
    alertLevel: string;
    salesAmount: number;
    threshold: number;
    percentage: number;
    message: string;
    read: boolean;
    emailSent: boolean;
    createdAt: Date;
  }>;
  unreadCount: number;
}> {
  const where: Record<string, unknown> = { userId };
  if (options?.unreadOnly) {
    where.read = false;
  }

  const [alerts, unreadCount] = await Promise.all([
    prisma.nexusAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    }),
    prisma.nexusAlert.count({
      where: { userId, read: false },
    }),
  ]);

  return {
    alerts: alerts.map(a => ({
      id: a.id,
      stateCode: a.stateCode,
      stateName: a.stateName,
      alertLevel: a.alertLevel,
      salesAmount: Number(a.salesAmount),
      threshold: Number(a.threshold),
      percentage: Number(a.percentage),
      message: a.message,
      read: a.read,
      emailSent: a.emailSent,
      createdAt: a.createdAt,
    })),
    unreadCount,
  };
}

/**
 * Mark alerts as read
 */
export async function markAlertsRead(
  userId: string,
  alertIds?: string[]
): Promise<number> {
  const where: Record<string, unknown> = { userId };
  if (alertIds && alertIds.length > 0) {
    where.id = { in: alertIds };
  }

  const result = await prisma.nexusAlert.updateMany({
    where,
    data: { read: true },
  });

  return result.count;
}
