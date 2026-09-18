import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function init(extra = {}, browser = true) {
  const calls = [], warnings = [];
  const context = vm.createContext({ ...(browser ? { window: {} } : {}), console: { warn: text => warnings.push(text), error: text => warnings.push(text) } });
  const env = Object.fromEntries(['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID', 'DATABASE_URL'].map(key => [`VITE_FIREBASE_${key}`, 'test-only']));
  Object.assign(env, extra);
  const app = {};
  function module(values) {
    return new vm.SyntheticModule(Object.keys(values), function () { for (const [k, v] of Object.entries(values)) this.setExport(k, v); }, { context });
  }
  const modules = {
    'firebase/app': module({ initializeApp: () => { calls.push('app'); return app; } }),
    'firebase/app-check': module({
      ReCaptchaEnterpriseProvider: class { constructor(key) { this.key = key; this.kind = 'enterprise'; } },
      ReCaptchaV3Provider: class { constructor(key) { this.key = key; this.kind = 'v3'; } },
      initializeAppCheck: (actualApp, options) => { assert.equal(actualApp, app); calls.push({ appCheck: options }); },
    }),
    'firebase/firestore': module({ getFirestore: () => { calls.push('firestore'); return {}; } }),
    'firebase/database': module({ getDatabase: () => { calls.push('database'); return {}; } }),
  };
  const source = await readFile(new URL('../src/firebaseCore.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const core = new vm.SourceTextModule(code, { context, initializeImportMeta(meta) { meta.env = env; } });
  await core.link(name => modules[name]); await core.evaluate();
  return { calls, warnings };
}
for (const [provider, kind] of [['recaptcha-v3', 'v3'], ['recaptcha-enterprise', 'enterprise']]) {
  test(`${provider} initializes before databases and refreshes tokens`, async () => {
    const { calls, warnings } = await init({ VITE_FIREBASE_APPCHECK_SITE_KEY: ' public-site-key ', VITE_FIREBASE_APPCHECK_PROVIDER: provider });
    assert.equal(calls[0], 'app'); assert.equal(calls[1].appCheck.provider.kind, kind);
    assert.equal(calls[1].appCheck.provider.key, 'public-site-key'); assert.equal(calls[1].appCheck.isTokenAutoRefreshEnabled, true);
    assert.equal(calls[2], 'firestore'); assert.equal(calls[3], 'database'); assert.equal(warnings.length, 0);
  });
}
test('missing public key is diagnosed without breaking non-enforced installations', async () => {
  const { calls, warnings } = await init();
  assert.deepEqual(calls, ['app', 'firestore', 'database']); assert.match(warnings[0], /App Check is not configured/);
});
test('provider must be explicitly selected instead of guessing from key', async () => {
  const { calls, warnings } = await init({ VITE_FIREBASE_APPCHECK_SITE_KEY: 'public-site-key' });
  assert.deepEqual(calls, ['app', 'firestore', 'database']); assert.match(warnings[0], /PROVIDER/);
});
test('browser attestation is not initialized during server execution', async () => {
  const { calls } = await init({ VITE_FIREBASE_APPCHECK_SITE_KEY: 'public-site-key', VITE_FIREBASE_APPCHECK_PROVIDER: 'recaptcha-v3' }, false);
  assert.deepEqual(calls, ['app', 'firestore', 'database']);
});
