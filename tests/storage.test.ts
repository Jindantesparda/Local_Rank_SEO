import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Storage guarantees. These are the reasons we moved off JSON files, so they
 * are the things worth proving rather than assuming.
 *
 * A temp DATA_DIR is set BEFORE the db module is imported, because the module
 * resolves its path at import time.
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-db-test-'));
process.env.DATA_DIR = tmpDir;
process.env.DB_FILE = path.join(tmpDir, 'test.db');

const { getDb, closeDb, tx, docGet, docPut, docDelete, docCount, dbHealth, migrate, query, queryOne } = await import(
  '../server/db'
);
const { trackKeyword, getRankingRecord, recordSnapshot, untrackKeyword } = await import(
  '../server/rankStore'
);

after(async () => {
  await closeDb();
  // Windows can refuse to delete a file the database handle has only
  // just released, so retry briefly rather than failing the run.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

describe('database layer', () => {
  test('creates its schema on first open', async () => {
    await migrate();
    const tables = await query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    );
    const names = tables.map((t) => t.name);

    for (const expected of [
      'users',
      'sessions',
      'email_tokens',
      'payments',
      'subscriptions',
      'documents',
      'meta',
    ]) {
      assert.ok(names.includes(expected), `missing table: ${expected}`);
    }
  });

  test('runs in WAL mode for a local file database', async () => {
    await migrate();
    // A hosted libSQL database manages durability itself and rejects the
    // pragma, so this assertion only applies to the local file used in tests.
    const row = await queryOne<{ journal_mode: string }>('PRAGMA journal_mode');
    assert.equal(row?.journal_mode, 'wal');
  });

  test('a failed transaction rolls back completely', async () => {
    const before = await docCount();
    await assert.rejects(async () => {
      await tx(async () => {
        await docPut('workspace', 'rollback-test', 'user-rb', { value: 1 });
        throw new Error('simulated failure');
      });
    }, /simulated failure/);
    assert.equal(await docCount(), before, 'the write must not survive the rollback');
  });

  test('nested transactions join the outer one instead of failing', async () => {
    const result = await tx(async () => {
      await docPut('workspace', 'outer', 'user-n1', { a: 1 });
      return await tx(async () => {
        await docPut('workspace', 'inner', 'user-n1', { b: 2 });
        return 'ok';
      });
    });
    assert.equal(result, 'ok');
    assert.deepEqual(await docGet('workspace', 'outer'), { a: 1 });
    assert.deepEqual(await docGet('workspace', 'inner'), { b: 2 });
  });

  test('a rolled-back outer transaction also discards inner writes', async () => {
    await assert.rejects(async () => {
      await tx(async () => {
        await tx(async () => await docPut('workspace', 'inner-discard', 'user-n2', { x: 1 }));
        throw new Error('outer fails');
      });
    });
    assert.equal(await docGet('workspace', 'inner-discard'), null);
  });

  test('documents round-trip, overwrite and delete', async () => {
    await docPut('monitor', 'k1', 'user-d1', { checks: 1 });
    assert.deepEqual(await docGet('monitor', 'k1'), { checks: 1 });

    await docPut('monitor', 'k1', 'user-d1', { checks: 2 });
    assert.deepEqual(await docGet('monitor', 'k1'), { checks: 2 }, 'upsert must replace');

    assert.equal(await docDelete('monitor', 'k1'), true);
    assert.equal(await docGet('monitor', 'k1'), null);
    assert.equal(await docDelete('monitor', 'k1'), false, 'deleting twice is not an error');
  });

  test('namespaces are isolated from each other', async () => {
    await docPut('analytics', 'shared-key', 'user-ns', { from: 'analytics' });
    await docPut('rankings', 'shared-key', 'user-ns', { from: 'rankings' });
    assert.deepEqual(await docGet('analytics', 'shared-key'), { from: 'analytics' });
    assert.deepEqual(await docGet('rankings', 'shared-key'), { from: 'rankings' });
  });

  test('reports its own health', async () => {
    const health = await dbHealth();
    assert.equal(health.ok, true);
    assert.equal(health.schemaVersion, 1);
    assert.ok(health.documents >= 0);
    assert.ok(health.documents > 0, 'the file should exist on disk');
  });
});

describe('rank store transactions', () => {
  const user = 'user-rank';
  const biz = 'biz-rank';

  test('tracks a keyword and refuses a duplicate', async () => {
    assert.equal((await trackKeyword(user, biz, 'roofers in mutare')).ok, true);
    const dup = await trackKeyword(user, biz, '  Roofers   in Mutare ');
    assert.equal(dup.ok, false, 'case and whitespace should not create a second keyword');
    assert.match(dup.error || '', /already being tracked/i);
  });

  test('enforces the per-business keyword cap', async () => {
    for (let i = 0; i < 10; i += 1) {
      await trackKeyword(user, biz, `extra keyword ${i}`);
    }
    const record = await getRankingRecord(user, biz);
    assert.equal(record.keywords.length, 5, 'cap is 5 keywords per business');
  });

  test('appends snapshots and trims old history', async () => {
    for (let i = 0; i < 70; i += 1) {
      await recordSnapshot(user, biz, 'roofers in mutare', {
        checkedAt: new Date().toISOString(),
        position: i % 10,
        resultsCount: 10,
      });
    }
    const kw = (await getRankingRecord(user, biz)).keywords.find(async (k) => k.keyword === 'roofers in mutare');
    assert.ok(kw);
    assert.equal(kw.history.length, 60, 'history is capped at 60 snapshots');
  });

  test('untracking removes only that keyword', async () => {
    const before = (await getRankingRecord(user, biz)).keywords.length;
    assert.equal(await untrackKeyword(user, biz, 'roofers in mutare'), true);
    assert.equal((await getRankingRecord(user, biz)).keywords.length, before - 1);
    assert.equal(await untrackKeyword(user, biz, 'roofers in mutare'), false);
  });
});
