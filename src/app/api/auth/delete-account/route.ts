import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Cancel any active Stripe subscription first
    if (user.subscription?.stripeSubscriptionId) {
      try {
        const stripe = (await import('@/lib/stripe')).stripe;
        await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Failed to cancel Stripe subscription:', stripeError);
        // Continue with deletion even if Stripe fails
      }
    }

    // Delete in order to respect foreign key constraints
    // Tables without cascade: NotificationPreference, PlatformConnection, ImportedOrder, ApiKey, SalesSummary, EmailLog
    await prisma.$transaction([
      // Tables without User relation (manual cleanup)
      prisma.notificationPreference.deleteMany({ where: { userId } }),
      prisma.platformConnection.deleteMany({ where: { userId } }),
      prisma.importedOrder.deleteMany({ where: { userId } }),
      prisma.apiKey.deleteMany({ where: { userId } }),
      prisma.salesSummary.deleteMany({ where: { userId } }),
      prisma.emailLog.deleteMany({ where: { userId } }),
      
      // User deletion will cascade to: Session, Business (->NexusState, Filing), Calculation, Subscription
      prisma.user.delete({ where: { id: userId } }),
    ]);

    // Clear the session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete('session_token');
    
    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
