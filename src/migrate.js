import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'munioran.db');

console.log('Migrating Database at:', DB_PATH);

try {
  const db = new Database(DB_PATH);
  const info = db.prepare("UPDATE reclamos SET estado = 'nuevo' WHERE estado = 'en_revision'").run();
  console.log(`Successfully migrated ${info.changes} records from "en_revision" to "nuevo".`);
  
  const info2 = db.prepare("UPDATE reclamos SET estado = 'nuevo' WHERE estado NOT IN ('nuevo', 'asignado', 'resuelto', 'descartado')").run();
  if (info2.changes > 0) {
    console.log(`Successfully migrated ${info2.changes} legacy records to "nuevo".`);
  }
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
console.log('Migration complete.');
