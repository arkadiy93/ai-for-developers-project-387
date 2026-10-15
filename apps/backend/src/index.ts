import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const dbPath =
  process.env.DB_PATH ?? fileURLToPath(new URL('../data/calendar.db', import.meta.url));

mkdirSync(dirname(dbPath), { recursive: true });

createApp({ db: new DatabaseSync(dbPath), staticDir: process.env.STATIC_DIR }).listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
