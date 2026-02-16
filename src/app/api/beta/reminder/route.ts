import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, action } = body;
    
    // Get current user if logged in
    const user = await getCurrentUser();
    const targetEmail = email || user?.email;

    if (!targetEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (action === 'set') {
      // Update beta user with reminder flag
      await prisma.betaUser.update({
        where: { email: targetEmail.toLowerCase() },
        data: {
          notes: 'survey_reminder_requested',
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Reminder set! We\'ll email you when the survey opens.',
      });
    } else if (action === 'cancel') {
      // Remove reminder flag
      await prisma.betaUser.update({
        where: { email: targetEmail.toLowerCase() },
        data: {
          notes: null,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Reminder cancelled.',
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Beta reminder error:', error);
    return NextResponse.json({ error: 'Failed to process reminder' }, { status: 500 });
  }
}
