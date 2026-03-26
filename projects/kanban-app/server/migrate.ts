import db from './db';
import { ALL_TABLES, CREATE_INDEXES } from './schema';

export function runMigrations(): void {
  console.log('Running database migrations...');

  const transaction = db.transaction(() => {
    // Create tables
    for (const sql of ALL_TABLES) {
      db.exec(sql);
    }

    // Create indexes
    for (const sql of CREATE_INDEXES) {
      db.exec(sql);
    }
  });

  transaction();
  console.log('Migrations complete.');
}
