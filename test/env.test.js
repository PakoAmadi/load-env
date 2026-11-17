'use strict';

const {describe, it, beforeEach, afterEach} = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const loadEnv = require('../src/index');

const TEST_KEYS = [
  'TEST_PORT', 'TEST_DB_URI', 'TEST_SECRET', 'TEST_URL', 'TEST_EMPTY', 'TEST_NO_EQUALS',
  'TEST_SPACED', 'TEST_HASH', 'TEST_COMMENT', 'TEST_EXPORT', 'TEST_EXISTING', 'TEST_DEFAULT',
  'TEST_MISMATCH_1', 'TEST_MISMATCH_2', 'TEST_QUOTED_COMMENT', 'TEST_HASH_NO_SPACE',
];

describe('Environment Variables Parser Module', () => {
  let tmpDir;
  let tmpEnvPath;

  const writeEnv = (content) => fs.writeFileSync(tmpEnvPath, content);

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
    tmpEnvPath = path.join(tmpDir, '.env');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
    for (const key of TEST_KEYS) delete process.env[key];
  });

  it('should successfully parse valid key-value pairs', () => {
    writeEnv(`
          TEST_PORT=5000
          TEST_DB_URI=mongodb://localhost:27017/test
        `);

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_PORT, '5000');
    assert.strictEqual(process.env.TEST_DB_URI, 'mongodb://localhost:27017/test');
  });

  it('should ignore empty lines and comments', () => {
    writeEnv('# Comment\nTEST_PORT=5000\n\n# Another\nTEST_SECRET=supersecret');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_PORT, '5000');
    assert.strictEqual(process.env.TEST_SECRET, 'supersecret');
  });

  it('should strip single and double quotes around values', () => {
    writeEnv('TEST_PORT="5000"\nTEST_SECRET=\'secret_with_quotes\'');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_PORT, '5000');
    assert.strictEqual(process.env.TEST_SECRET, 'secret_with_quotes');
  });

  it('should do nothing when the file does not exist', () => {
    const before = {...process.env};

    assert.doesNotThrow(() => loadEnv(path.join(tmpDir, 'missing.env')));
    assert.deepStrictEqual({...process.env}, before);
  });

  it('should keep "=" characters inside values', () => {
    writeEnv('TEST_URL=https://example.com/?a=1&b=2');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_URL, 'https://example.com/?a=1&b=2');
  });

  it('should handle Windows line endings', () => {
    writeEnv('TEST_PORT=5000\r\nTEST_SECRET=supersecret\r\n');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_PORT, '5000');
    assert.strictEqual(process.env.TEST_SECRET, 'supersecret');
  });

  it('should trim spaces around "=" but keep spaces inside quotes', () => {
    writeEnv('TEST_PORT = 5000\nTEST_SPACED = "  padded value  "');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_PORT, '5000');
    assert.strictEqual(process.env.TEST_SPACED, '  padded value  ');
  });

  it('should set empty string for empty values and lines without "="', () => {
    writeEnv('TEST_EMPTY=\nTEST_NO_EQUALS');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_EMPTY, '');
    assert.strictEqual(process.env.TEST_NO_EQUALS, '');
  });

  it('should ignore lines with an empty key', () => {
    writeEnv('=orphan\nTEST_PORT=5000');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env[''], undefined);
    assert.strictEqual(process.env.TEST_PORT, '5000');
  });

  it('should not strip mismatched quotes', () => {
    writeEnv('TEST_MISMATCH_1="abc\'\nTEST_MISMATCH_2=abc"');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_MISMATCH_1, '"abc\'');
    assert.strictEqual(process.env.TEST_MISMATCH_2, 'abc"');
  });

  it('should keep "#" inside quotes and strip inline comments outside of them', () => {
    writeEnv([
      'TEST_HASH="pass#word"',
      'TEST_COMMENT=5000 # http port',
      'TEST_QUOTED_COMMENT="value" # comment',
      'TEST_HASH_NO_SPACE=color#fff',
    ].join('\n'));

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_HASH, 'pass#word');
    assert.strictEqual(process.env.TEST_COMMENT, '5000');
    assert.strictEqual(process.env.TEST_QUOTED_COMMENT, 'value');
    assert.strictEqual(process.env.TEST_HASH_NO_SPACE, 'color#fff');
  });

  it('should support the "export" prefix', () => {
    writeEnv('export TEST_EXPORT=exported');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_EXPORT, 'exported');
    assert.strictEqual(process.env['export TEST_EXPORT'], undefined);
  });

  it('should overwrite already existing variables', () => {
    process.env.TEST_EXISTING = 'old';
    writeEnv('TEST_EXISTING=new');

    loadEnv(tmpEnvPath);

    assert.strictEqual(process.env.TEST_EXISTING, 'new');
  });

  it('should load <cwd>/.env when no path is given', () => {
    const originalCwd = process.cwd();
    writeEnv('TEST_DEFAULT=from_default_path');

    try {
      process.chdir(tmpDir);
      loadEnv();
    } finally {
      process.chdir(originalCwd);
    }

    assert.strictEqual(process.env.TEST_DEFAULT, 'from_default_path');
  });

  it('should log an error instead of throwing when the file cannot be read', (t) => {
    const errorMock = t.mock.method(console, 'error', () => {});

    assert.doesNotThrow(() => loadEnv(tmpDir));
    assert.strictEqual(errorMock.mock.callCount(), 1);
    assert.match(errorMock.mock.calls[0].arguments[0], /\.env file loading error/);
  });
});
