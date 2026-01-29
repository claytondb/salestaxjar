/**
 * Platform Integration Request API
 * 
 * POST /api/platforms/request
 * 
 * Sends an email notification when a user requests a new platform integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const requestSchema = z.object({
  platform: z.string().min(1, 'Platform name is required').max(100),
});

// Internal email for platform requests (not exposed to users)
const PLATFORM_REQUEST_EMAIL = 'claytondb@gmail.com';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { platform } = parsed.data;

    // Send email using Resend (if configured)
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.FROM_EMAIL || 'Sails <noreply@sails.tax>',
            to: PLATFORM_REQUEST_EMAIL,
            subject: 'Sails: Platform Request',
            text: `A user has requested platform integration.

User: ${user.name || user.email}
Email: ${user.email}
Platform requested: ${platform}

Submitted at: ${new Date().toISOString()}`,
          }),
        });

        if (!response.ok) {
          console.error('Failed to send platform request email:', await response.text());
          // Don't fail the request - just log the error
        }
      } catch (emailError) {
        console.error('Error sending platform request email:', emailError);
        // Don't fail the request - just log the error
      }
    } else {
      // Log to console if Resend not configured
      console.log('=== PLATFORM REQUEST ===');
      console.log(`User: ${user.name || user.email} (${user.email})`);
      console.log(`Platform requested: ${platform}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('========================');
    }

    return NextResponse.json({
      success: true,
      message: 'Platform request submitted successfully',
    });

  } catch (error) {
    console.error('Platform request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
