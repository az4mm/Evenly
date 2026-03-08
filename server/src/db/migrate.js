import db from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  try {
    console.log('Running database migrations...');

    // Create migrations tracking table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Get list of already executed migrations
    const executedMigrations = await db.query(
      'SELECT name FROM migrations ORDER BY id'
    );
    const executedNames = new Set(executedMigrations.rows.map(row => row.name));

    // Read all migration files
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found. Creating it...');
      fs.mkdirSync(migrationsDir, { recursive: true });
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      return;
    }

    let executedCount = 0;

    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');

      if (executedNames.has(migrationName)) {
        continue;
      }

      console.log(`Running migration: ${migrationName}`);

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await db.query('BEGIN');
        await db.query(sql);
        await db.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migrationName]
        );
        await db.query('COMMIT');

        console.log(`Migration completed: ${migrationName}`);
        executedCount++;
      } catch (error) {
        await db.query('ROLLBACK');
        console.error(`Migration failed: ${migrationName}`);
        console.error(error);
        throw error;
      }
    }

    if (executedCount === 0) {
      console.log('All migrations are up to date.');
    } else {
      console.log(`Successfully executed ${executedCount} migration(s).`);
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}
