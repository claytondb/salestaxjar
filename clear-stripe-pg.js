const { Pool } = require('pg');

// Use exact URL from .env.local
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RgrH9J8cWdzS@ep-rapid-flower-ah9uuz2g-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function clearStripeData() {
  const client = await pool.connect();
  try {
    // Find the user
    const userResult = await client.query(
      'SELECT id, email FROM "User" WHERE email = $1',
      ['ghwst.vr@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('Found user:', userId, userResult.rows[0].email);
    
    // Check subscription
    const subResult = await client.query(
      'SELECT * FROM "Subscription" WHERE "userId" = $1',
      [userId]
    );
    
    console.log('Subscription:', subResult.rows[0]);
    
    if (subResult.rows.length > 0) {
      // Delete subscription
      await client.query(
        'DELETE FROM "Subscription" WHERE "userId" = $1',
        [userId]
      );
      console.log('Subscription deleted!');
    } else {
      console.log('No subscription to delete');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

clearStripeData().catch(console.error);
