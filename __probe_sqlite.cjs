/**
 * Probe the node:sqlite API surface before building on it.
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), '__probe.db');
for (const f of [file, `${file}-journal`, `${file}-wal`, `${file}-shm`]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const db = new DatabaseSync(file);
console.log('opened:', file);

db.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    payload TEXT NOT NULL
  );
  CREATE TABLE docs (
    ns TEXT NOT NULL,
    k TEXT NOT NULL,
    user_id TEXT,
    payload TEXT NOT NULL,
    PRIMARY KEY (ns, k)
  );
`);
console.log('exec + schema: ok');

const ins = db.prepare('INSERT INTO users (id, email, payload) VALUES (?, ?, ?)');
const r = ins.run('u1', 'A@Example.com', JSON.stringify({ hello: 'world' }));
console.log('insert run() result:', JSON.stringify(r));

const get = db.prepare('SELECT * FROM users WHERE email = ?');
console.log('case-insensitive lookup:', JSON.stringify(get.get('a@example.com')));

// named params?
try {
  const named = db.prepare('SELECT * FROM users WHERE id = $id');
  console.log('named params:', JSON.stringify(named.get({ id: 'u1' })));
} catch (e) {
  console.log('named params unsupported:', String(e.message).slice(0, 80));
}

// transactions
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

tx(() => {
  db.prepare('INSERT INTO docs (ns, k, user_id, payload) VALUES (?, ?, ?, ?)').run(
    'workspace',
    'u1',
    'u1',
    '{}'
  );
});
console.log('transaction commit: ok, rows =', db.prepare('SELECT COUNT(*) c FROM docs').get().c);

try {
  tx(() => {
    db.prepare('INSERT INTO docs (ns, k, user_id, payload) VALUES (?, ?, ?, ?)').run(
      'workspace',
      'u1',
      'u1',
      '{}'
    );
  });
  console.log('ERROR: duplicate should have thrown');
} catch {
  console.log('transaction rollback on conflict: ok, rows =', db.prepare('SELECT COUNT(*) c FROM docs').get().c);
}

// upsert
db.prepare(
  `INSERT INTO docs (ns, k, user_id, payload) VALUES (?, ?, ?, ?)
   ON CONFLICT(ns, k) DO UPDATE SET payload = excluded.payload`
).run('workspace', 'u1', 'u1', '{"v":2}');
console.log('upsert:', JSON.stringify(db.prepare('SELECT payload FROM docs WHERE k = ?').get('u1')));

// empty-string / undefined binding safety
try {
  ins.run('u2', 'b@example.com', undefined);
  console.log('undefined binding: accepted (turned into NULL?)');
} catch (e) {
  console.log('undefined binding: throws ->', String(e.message).slice(0, 60));
}

// VACUUM INTO (hot backup)
const backupFile = path.join(process.cwd(), '__probe-backup.db');
if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
try {
  db.exec(`VACUUM INTO '${backupFile.replace(/\\/g, '/')}'`);
  console.log('VACUUM INTO backup: ok, size =', fs.statSync(backupFile).size);
} catch (e) {
  console.log('VACUUM INTO failed:', String(e.message).slice(0, 100));
}

// WAL mode
console.log('journal_mode:', JSON.stringify(db.prepare('PRAGMA journal_mode').get()));
try {
  db.exec('PRAGMA journal_mode = WAL');
  console.log('set WAL:', JSON.stringify(db.prepare('PRAGMA journal_mode').get()));
} catch (e) {
  console.log('WAL failed:', String(e.message).slice(0, 60));
}

console.log('foreign_keys pragma:', JSON.stringify(db.prepare('PRAGMA foreign_keys').get()));
db.close();
console.log('closed. cleanup...');

for (const f of [file, `${file}-journal`, `${file}-wal`, `${file}-shm`, backupFile]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}
console.log('done');
