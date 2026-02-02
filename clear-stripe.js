const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearStripeData() {
  const user = await prisma.user.findUnique({
    where: { email: 'ghwst.vr@gmail.com' },
    include: { subscription: true }
  });
  
  console.log('User found:', user?.id, user?.email);
  console.log('Subscription:', user?.subscription);
  
  if (user?.subscription) {
    await prisma.subscription.delete({
      where: { userId: user.id }
    });
    console.log('Subscription deleted!');
  } else {
    console.log('No subscription to delete');
  }
  
  await prisma.$disconnect();
}

clearStripeData().catch(console.error);
