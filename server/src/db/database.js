import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,                        // max connections in the pool
  min: 2,                         // keep 2 idle connections ready
  idleTimeoutMillis: 30000,       // close idle connections after 30s
  connectionTimeoutMillis: 5000,  // fail if can't connect in 5s
});

export default pool;
