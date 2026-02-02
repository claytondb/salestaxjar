const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RgrH9J8cWdzS@ep-rapid-flower-ah9uuz2g-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function deleteUser() {
  const client = await pool.connect();
  try {
    const email = 'ghwst.vr@gmail.com';
    
    const userResult = await client.query(
      'SELECT id, email FROM "User" WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('Found user:', userId, email);
    
    await client.query('DELETE FROM "Subscription" WHERE "userId" = $1', [userId]);
    console.log('Subscription deleted');
    
    await client.query('DELETE FROM "Session" WHERE "userId" = $1', [userId]);
    console.log('Sessions deleted');
    
    await client.query('DELETE FROM "User" WHERE id = $1', [userId]);
    console.log('User deleted!');
    
  } finally {
    client.release();
    await pool.end();
  }
}

deleteUser().catch(console.error);
