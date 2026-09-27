const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 5173;
const APP_ROOT = __dirname;
const DATA_FILE_NAME = 'money-map-data.json';
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
const BACKUP_INTERVAL_MS = 30 * 60 * 1000;
const MAX_BACKUPS = 30;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function oneDriveRoot(env = process.env) {
  return env.MONEY_MAP_DATA_DIR
    || (env.OneDriveCommercial && path.join(env.OneDriveCommercial, 'Money Map'))
    || (env.OneDriveConsumer && path.join(env.OneDriveConsumer, 'Money Map'))
    || (env.OneDrive && path.join(env.OneDrive, 'Money Map'))
    || '';
}

function revisionFor(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function backupTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function createStorage({
  dataDir = oneDriveRoot(),
  backupIntervalMs = BACKUP_INTERVAL_MS,
  maxBackups = MAX_BACKUPS,
} = {}) {
  if (!dataDir) return { available: false, dataDir: '', displayPath: 'OneDrive not detected' };

  const dataFile = path.join(dataDir, DATA_FILE_NAME);
  const backupDir = path.join(dataDir, 'Backups');
  const displayPath = path.join('OneDrive', 'Money Map', DATA_FILE_NAME);

  function ensureDirectories() {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });
  }

  function read() {
    if (!fs.existsSync(dataFile)) {
      return { exists: false, data: null, revision: '', updatedAt: '' };
    }
    const contents = fs.readFileSync(dataFile, 'utf8');
    const stat = fs.statSync(dataFile);
    return {
      exists: true,
      data: JSON.parse(contents),
      revision: revisionFor(contents),
      updatedAt: stat.mtime.toISOString(),
    };
  }

  function backupCurrentFile() {
    if (!fs.existsSync(dataFile)) return;
    ensureDirectories();
    const backups = fs.readdirSync(backupDir)
      .filter((name) => name.startsWith('money-map-') && name.endsWith('.json'))
      .sort();
    const latest = backups.at(-1);
    if (latest) {
      const latestAge = Date.now() - fs.statSync(path.join(backupDir, latest)).mtimeMs;
      if (latestAge < backupIntervalMs) return;
    }
    fs.copyFileSync(dataFile, path.join(backupDir, `money-map-${backupTimestamp()}.json`));
    const updatedBackups = fs.readdirSync(backupDir)
      .filter((name) => name.startsWith('money-map-') && name.endsWith('.json'))
      .sort();
    updatedBackups.slice(0, Math.max(0, updatedBackups.length - maxBackups))
      .forEach((name) => fs.unlinkSync(path.join(backupDir, name)));
  }

  function save(data, { expectedRevision = '', force = false } = {}) {
    ensureDirectories();
    const current = read();
    if (!force && current.exists && expectedRevision !== current.revision) {
      const error = new Error('The OneDrive copy changed since it was last loaded.');
      error.code = 'CONFLICT';
      error.current = current;
      throw error;
    }

    const contents = `${JSON.stringify(data, null, 2)}\n`;
    if (current.exists && revisionFor(contents) === current.revision) return current;
    backupCurrentFile();
    const temporaryFile = path.join(dataDir, `.${DATA_FILE_NAME}.${process.pid}.${Date.now()}.tmp`);
    fs.writeFileSync(temporaryFile, contents, { encoding: 'utf8', flag: 'wx' });
    try {
      fs.renameSync(temporaryFile, dataFile);
    } catch (error) {
      if (process.platform !== 'win32' || !fs.existsSync(dataFile)) throw error;
      fs.rmSync(dataFile);
      fs.renameSync(temporaryFile, dataFile);
    } finally {
      if (fs.existsSync(temporaryFile)) fs.rmSync(temporaryFile);
    }
    return read();
  }

  return { available: true, dataDir, dataFile, backupDir, displayPath, read, save };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(Object.assign(new Error('Request is too large.'), { code: 'TOO_LARGE' }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('Invalid JSON.'), { code: 'INVALID_JSON' }));
      }
    });
    request.on('error', reject);
  });
}

function storageResponse(storage, record) {
  return {
    available: storage.available,
    exists: record?.exists || false,
    revision: record?.revision || '',
    updatedAt: record?.updatedAt || '',
    displayPath: storage.displayPath,
    data: record?.data || null,
  };
}

function createRequestHandler(storage = createStorage()) {
  return async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);
    if (requestUrl.pathname === '/api/storage') {
      if (!storage.available) {
        sendJson(response, 503, { available: false, error: 'OneDrive was not detected.' });
        return;
      }
      if (request.method === 'GET') {
        try {
          sendJson(response, 200, storageResponse(storage, storage.read()));
        } catch (error) {
          sendJson(response, 500, { available: true, error: `Unable to read Money Map data: ${error.message}` });
        }
        return;
      }
      if (request.method === 'PUT') {
        try {
          const body = await readJsonBody(request);
          if (!body.state || typeof body.state !== 'object' || Array.isArray(body.state)) {
            sendJson(response, 400, { error: 'A valid Money Map state is required.' });
            return;
          }
          const saved = storage.save(body.state, {
            expectedRevision: String(body.expectedRevision || ''),
            force: body.force === true,
          });
          sendJson(response, 200, storageResponse(storage, saved));
        } catch (error) {
          if (error.code === 'CONFLICT') {
            sendJson(response, 409, {
              error: error.message,
              revision: error.current.revision,
              updatedAt: error.current.updatedAt,
            });
            return;
          }
          const status = error.code === 'TOO_LARGE' ? 413 : error.code === 'INVALID_JSON' ? 400 : 500;
          sendJson(response, status, { error: error.message });
        }
        return;
      }
      response.writeHead(405, { Allow: 'GET, PUT' });
      response.end();
      return;
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    const relativePath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const filePath = path.resolve(APP_ROOT, `.${relativePath}`);
    if (!filePath.startsWith(`${APP_ROOT}${path.sep}`) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(filePath).pipe(response);
  };
}

function startServer({ port = PORT, host = HOST, storage = createStorage() } = {}) {
  const server = http.createServer(createRequestHandler(storage));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

function openBrowser(url) {
  if (process.platform !== 'win32') return;
  const child = spawn('cmd.exe', ['/c', 'start', '', url], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

if (require.main === module) {
  const storage = createStorage();
  startServer({ storage })
    .then(() => {
      const appUrl = `http://${HOST}:${PORT}/`;
      console.log(`Money Map is running at ${appUrl}`);
      console.log(storage.available
        ? `OneDrive data: ${storage.dataFile}`
        : 'OneDrive was not detected. Set MONEY_MAP_DATA_DIR before starting Money Map.');
      console.log('Keep this window open while using Money Map. Press Ctrl+C to stop.');
      if (process.argv.includes('--open')) openBrowser(appUrl);
    })
    .catch((error) => {
      console.error(`Unable to start Money Map: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = { createStorage, createRequestHandler, oneDriveRoot, revisionFor, startServer };
