import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const notificationPrefsSchema = z.object({
  emailDeadlineReminders: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  emailNewRates: z.boolean().optional(),
  reminderDaysBefore: z.number().min(1).max(30).optional(),
});

/**
 * GET /api/notifications
 * 
 * Get user's notification preferences
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create notification preferences
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    if (!prefs) {
      // Create default preferences
      prefs = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
        },
      });
    }

    return NextResponse.json({
      preferences: {
        emailDeadlineReminders: prefs.emailDeadlineReminders,
        emailWeeklyDigest: prefs.emailWeeklyDigest,
        emailNewRates: prefs.emailNewRates,
        reminderDaysBefore: prefs.reminderDaysBefore,
      },
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications
 * 
 * Update user's notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = notificationPrefsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Upsert preferences
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        ...data,
      },
    });

    return NextResponse.json({
      preferences: {
        emailDeadlineReminders: prefs.emailDeadlineReminders,
        emailWeeklyDigest: prefs.emailWeeklyDigest,
        emailNewRates: prefs.emailNewRates,
        reminderDaysBefore: prefs.reminderDaysBefore,
      },
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
