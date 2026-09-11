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

const { getDb, closeDb, tx, docGet, docPut, docDelete, docCount, dbHealth } = await import(
  '../server/db'
);
const { trackKeyword, getRankingRecord, recordSnapshot, untrackKeyword } = await import(
  '../server/rankStore'
);

after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('database layer', () => {
  test('creates its schema on first open', () => {
    const db = getDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
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

  test('runs in WAL mode so readers do not block writers', () => {
    const row = getDb().prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    assert.equal(row.journal_mode, 'wal');
  });

  test('a failed transaction rolls back completely', () => {
    const before = docCount();
    assert.throws(() => {
      tx(() => {
        docPut('workspace', 'rollback-test', 'user-rb', { value: 1 });
        throw new Error('simulated failure');
      });
    }, /simulated failure/);
    assert.equal(docCount(), before, 'the write must not survive the rollback');
  });

  test('nested transactions join the outer one instead of failing', () => {
    const result = tx(() => {
      docPut('workspace', 'outer', 'user-n1', { a: 1 });
      return tx(() => {
        docPut('workspace', 'inner', 'user-n1', { b: 2 });
        return 'ok';
      });
    });
    assert.equal(result, 'ok');
    assert.deepEqual(docGet('workspace', 'outer'), { a: 1 });
    assert.deepEqual(docGet('workspace', 'inner'), { b: 2 });
  });

  test('a rolled-back outer transaction also discards inner writes', () => {
    assert.throws(() => {
      tx(() => {
        tx(() => docPut('workspace', 'inner-discard', 'user-n2', { x: 1 }));
        throw new Error('outer fails');
      });
    });
    assert.equal(docGet('workspace', 'inner-discard'), null);
  });

  test('documents round-trip, overwrite and delete', () => {
    docPut('monitor', 'k1', 'user-d1', { checks: 1 });
    assert.deepEqual(docGet('monitor', 'k1'), { checks: 1 });

    docPut('monitor', 'k1', 'user-d1', { checks: 2 });
    assert.deepEqual(docGet('monitor', 'k1'), { checks: 2 }, 'upsert must replace');

    assert.equal(docDelete('monitor', 'k1'), true);
    assert.equal(docGet('monitor', 'k1'), null);
    assert.equal(docDelete('monitor', 'k1'), false, 'deleting twice is not an error');
  });

  test('namespaces are isolated from each other', () => {
    docPut('analytics', 'shared-key', 'user-ns', { from: 'analytics' });
    docPut('rankings', 'shared-key', 'user-ns', { from: 'rankings' });
    assert.deepEqual(docGet('analytics', 'shared-key'), { from: 'analytics' });
    assert.deepEqual(docGet('rankings', 'shared-key'), { from: 'rankings' });
  });

  test('reports its own health', () => {
    const health = dbHealth();
    assert.equal(health.ok, true);
    assert.equal(health.schemaVersion, 1);
    assert.ok(health.documents >= 0);
    assert.ok(health.sizeBytes > 0, 'the file should exist on disk');
  });
});

describe('rank store transactions', () => {
  const user = 'user-rank';
  const biz = 'biz-rank';

  test('tracks a keyword and refuses a duplicate', () => {
    assert.equal(trackKeyword(user, biz, 'roofers in mutare').ok, true);
    const dup = trackKeyword(user, biz, '  Roofers   in Mutare ');
    assert.equal(dup.ok, false, 'case and whitespace should not create a second keyword');
    assert.match(dup.error || '', /already being tracked/i);
  });

  test('enforces the per-business keyword cap', () => {
    for (let i = 0; i < 10; i += 1) {
      trackKeyword(user, biz, `extra keyword ${i}`);
    }
    const record = getRankingRecord(user, biz);
    assert.equal(record.keywords.length, 5, 'cap is 5 keywords per business');
  });

  test('appends snapshots and trims old history', () => {
    for (let i = 0; i < 70; i += 1) {
      recordSnapshot(user, biz, 'roofers in mutare', {
        checkedAt: new Date().toISOString(),
        position: i % 10,
        resultsCount: 10,
      });
    }
    const kw = getRankingRecord(user, biz).keywords.find((k) => k.keyword === 'roofers in mutare');
    assert.ok(kw);
    assert.equal(kw.history.length, 60, 'history is capped at 60 snapshots');
  });

  test('untracking removes only that keyword', () => {
    const before = getRankingRecord(user, biz).keywords.length;
    assert.equal(untrackKeyword(user, biz, 'roofers in mutare'), true);
    assert.equal(getRankingRecord(user, biz).keywords.length, before - 1);
    assert.equal(untrackKeyword(user, biz, 'roofers in mutare'), false);
  });
});
