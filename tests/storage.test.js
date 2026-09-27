const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStorage, oneDriveRoot } = require('../server.js');

function temporaryStorage(options = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'money-map-storage-'));
  return {
    dataDir,
    storage: createStorage({ dataDir, backupIntervalMs: 0, maxBackups: 2, ...options }),
  };
}

test('detects the configured OneDrive folder without hard-coding a user path', () => {
  assert.equal(oneDriveRoot({ OneDriveConsumer: 'C:\\Users\\Example\\OneDrive' }), path.join('C:\\Users\\Example\\OneDrive', 'Money Map'));
  assert.equal(oneDriveRoot({ MONEY_MAP_DATA_DIR: 'D:\\Private Money Map' }), 'D:\\Private Money Map');
});

test('saves and reads a Money Map state atomically', (t) => {
  const { dataDir, storage } = temporaryStorage();
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  assert.equal(storage.read().exists, false);
  const saved = storage.save({ schemaVersion: 5, transactions: [{ id: 'one' }] });
  assert.equal(saved.exists, true);
  assert.equal(saved.data.transactions[0].id, 'one');
  assert.ok(saved.revision);
  assert.equal(fs.readdirSync(dataDir).some((name) => name.endsWith('.tmp')), false);
});

test('rejects stale writes instead of overwriting a newer copy', (t) => {
  const { dataDir, storage } = temporaryStorage();
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const first = storage.save({ value: 1 });
  const second = storage.save({ value: 2 }, { expectedRevision: first.revision });
  assert.throws(
    () => storage.save({ value: 3 }, { expectedRevision: first.revision }),
    (error) => error.code === 'CONFLICT' && error.current.revision === second.revision
  );
  assert.equal(storage.read().data.value, 2);
});

test('keeps only the configured number of rolling backups', (t) => {
  const { dataDir, storage } = temporaryStorage();
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  let revision = storage.save({ value: 0 }).revision;
  for (let value = 1; value <= 4; value += 1) {
    revision = storage.save({ value }, { expectedRevision: revision }).revision;
  }
  const backups = fs.readdirSync(storage.backupDir).filter((name) => name.endsWith('.json'));
  assert.ok(backups.length <= 2);
  assert.equal(storage.read().data.value, 4);
});
