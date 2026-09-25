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
import { loadNexusInputs } from './nexus-data';
import { evaluateAllStates, type StateEvaluation } from './nexus-engine';
import type { ExposureStatus } from './nexus-thresholds';
import { sendNexusAlertEmail } from './email-alerts';

/**
 * Alert levels. The first four follow the exposure status; the rest are
 * situations the engine explains separately:
 *  next_year   — a previous-year state crossed this year (register by Jan 1)
 *  past        — an earlier crossing means tax may be owed for a past period
 *  marketplace — over only through marketplaces that already collect the tax
 *  local       — over Alaska's local (ARSSTC) threshold
 */
export type AlertLevel = ExposureStatus | 'next_year' | 'past' | 'marketplace' | 'local';

export interface NexusAlertResult {
  stateCode: string;
  stateName: string;
  alertLevel: AlertLevel;
  salesAmount: number;
  threshold: number;
  percentage: number;
  message: string;
  /** The numbers that decided the result, in one sentence */
  summary?: string;
  /** What to do next, in plain words (from the nexus engine) */
  detail?: string;
}

/**
 * Alert level hierarchy for comparison
 */
export const ALERT_LEVEL_ORDER: Record<string, number> = {
  safe: 0,
  approaching: 1,
  warning: 2,
  exceeded: 3,
};

/** Which alert levels a state's current result calls for (highest first). */
export function alertLevelsFor(e: StateEvaluation): AlertLevel[] {
  if (e.registration !== 'none') return [];
  if (e.localNexusOver) return ['local'];
  if (!e.hasSalesTax || !e.salesThreshold) return [];
  if (e.marketplaceOnly) return ['marketplace'];
  if (e.overNow) return ['exceeded', 'warning', 'approaching'];
  if (e.startsNextYear) return ['next_year'];
  if (e.pastExposure) return ['past'];
  if (e.status === 'warning') return ['warning', 'approaching'];
  if (e.status === 'approaching') return ['approaching'];
  return [];
}

/** The in-app alert text for a state at a given level. */
export function alertMessageFor(e: StateEvaluation, level: AlertLevel): string {
  switch (level) {
    case 'exceeded':
      return `${e.summaryLine} You'll likely need to register with ${e.stateName} before you start collecting sales tax there.`;
    case 'warning':
      return `${e.summaryLine} You may need to register soon.`;
    case 'approaching':
      return `${e.summaryLine} Keep an eye on this.`;
    default:
      return `${e.summaryLine} ${e.nextStep.text}`;
  }
}

/**
 * Check all states for a user and create new alerts as needed.
 * Uses the nexus engine, so each state's own measurement window and
 * marketplace rule apply. States the seller marked as registered are skipped.
 * Returns the list of newly created alerts.
 */
export async function checkAndCreateAlerts(userId: string, now: Date = new Date()): Promise<NexusAlertResult[]> {
  const { byState, coverage, registrations } = await loadNexusInputs(userId, now);
  const evaluations = evaluateAllStates(byState, { now, coverage, registrations });
  const newAlerts: NexusAlertResult[] = [];

  // Get existing alerts so we don't duplicate
  const existingAlerts = await prisma.nexusAlert.findMany({
    where: { userId },
  });

  const existingAlertMap = new Map<string, string>(); // key: "stateCode:level" -> id
  for (const alert of existingAlerts) {
    existingAlertMap.set(`${alert.stateCode}:${alert.alertLevel}`, alert.id);
  }

  for (const evaluation of evaluations) {
    const levelsToCreate = alertLevelsFor(evaluation);
    if (levelsToCreate.length === 0) continue;
    const threshold = evaluation.salesThreshold ?? evaluation.rule.localNexus?.salesThreshold ?? 0;

    for (const level of levelsToCreate) {
      const key = `${evaluation.stateCode}:${level}`;

      // Skip if alert already exists at this level
      if (existingAlertMap.has(key)) continue;

      const message = alertMessageFor(evaluation, level);

      const alertResult: NexusAlertResult = {
        stateCode: evaluation.stateCode,
        stateName: evaluation.stateName,
        alertLevel: level,
        salesAmount: evaluation.measuredSales,
        threshold,
        percentage: evaluation.highestPercentage,
        message,
        summary: evaluation.summaryLine,
        detail: evaluation.nextStep.text,
      };

      // Create in database
      await prisma.nexusAlert.create({
        data: {
          userId,
          stateCode: evaluation.stateCode,
          stateName: evaluation.stateName,
          alertLevel: level,
          salesAmount: evaluation.measuredSales,
          threshold,
          percentage: Math.min(evaluation.highestPercentage, 999.99),
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
        summary: alert.summary,
        detail: alert.detail,
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
export function generateAlertMessage(
  stateName: string,
  level: ExposureStatus,
  sales: number,
  threshold: number,
  percentage: number,
  opts: { startsNextYear?: boolean; year?: number } = {}
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

  if (opts.startsNextYear && opts.year) {
    return `Your ${opts.year} sales in ${stateName} have reached ${salesFormatted}, over the ${thresholdFormatted} threshold. ${stateName} looks at the previous year, so you'll likely need to register by January 1, ${opts.year + 1}.`;
  }

  switch (level) {
    case 'exceeded':
      return `Your sales in ${stateName} have reached ${salesFormatted}, over the ${thresholdFormatted} economic nexus threshold. You'll likely need to register with ${stateName} before you start collecting sales tax there.`;
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
