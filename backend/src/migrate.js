require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function runMigrations(direction = 'up') {
  try {
    // Create migrations tracking table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (direction === 'up') {
      // Get already executed migrations
      const { rows: executed } = await db.query('SELECT name FROM migrations');
      const executedNames = new Set(executed.map(r => r.name));

      for (const file of files) {
        if (executedNames.has(file)) {
          console.log(`Skipping already executed: ${file}`);
          continue;
        }

        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await db.query('BEGIN');
        try {
          await db.query(sql);
          await db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await db.query('COMMIT');
          console.log(`Completed: ${file}`);
        } catch (err) {
          await db.query('ROLLBACK');
          throw err;
        }
      }
    } else if (direction === 'down') {
      console.log('Rolling back all migrations...');

      // Drop all tables in reverse order
      const dropStatements = [
        'DROP TABLE IF EXISTS recent_searches CASCADE',
        'DROP TABLE IF EXISTS reports CASCADE',
        'DROP TABLE IF EXISTS notifications CASCADE',
        'DROP TABLE IF EXISTS mentions CASCADE',
        'DROP TABLE IF EXISTS hashtags CASCADE',
        'DROP TABLE IF EXISTS follows CASCADE',
        'DROP TABLE IF EXISTS comments CASCADE',
        'DROP TABLE IF EXISTS likes CASCADE',
        'DROP TABLE IF EXISTS posts CASCADE',
        'DROP TABLE IF EXISTS users CASCADE',
        'DROP TABLE IF EXISTS migrations CASCADE',
        'DROP FUNCTION IF EXISTS update_updated_at_column CASCADE'
      ];

      for (const stmt of dropStatements) {
        await db.query(stmt);
      }
      console.log('All tables dropped');
    }

    console.log('Migrations complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

const direction = process.argv[2] || 'up';
runMigrations(direction);
