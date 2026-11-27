import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('Runtime & package export compatibility tests', () => {
  it('keeps browser-safe src/index.ts dependency graph free of node:* built-in imports', () => {
    const browserSafeFiles = [
      'src/index.ts',
      'src/client.ts',
      'src/core/auth.ts',
      'src/core/config.ts',
      'src/core/dipClient.ts',
      'src/core/errors.ts',
      'src/core/pagination.ts',
      'src/core/redaction.ts',
      'src/core/retry.ts',
      'src/core/transport.ts',
      'src/contracts/common.ts',
      'src/contracts/domain.ts',
      'src/contracts/planned.ts',
      'src/resources/applications.ts',
      'src/resources/catalogue.ts',
      'src/resources/documents.ts',
      'src/resources/health.ts',
      'src/resources/integrations.ts',
      'src/resources/payments.ts',
      'src/resources/sandbox.ts',
      'src/resources/types.ts',
      'src/resources/webhooks.ts',
      'src/services/apiSathi.ts',
      'src/services/database.ts',
      'src/services/storage.ts',
    ];

    for (const relPath of browserSafeFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');
      expect(content).not.toMatch(/from\s+['"]node:/);
    }
  });

  it('loads built ESM and CJS outputs cleanly including legacy exports and ./webhooks', async () => {
    const esmDist = path.resolve(process.cwd(), 'dist', 'esm', 'index.js');
    const cjsDist = path.resolve(process.cwd(), 'dist', 'cjs', 'index.js');
    const esmWebhooks = path.resolve(process.cwd(), 'dist', 'esm', 'server-sdk.js');
    const cjsWebhooks = path.resolve(process.cwd(), 'dist', 'cjs', 'server-sdk.js');

    expect(fs.existsSync(esmDist)).toBe(true);
    expect(fs.existsSync(cjsDist)).toBe(true);
    expect(fs.existsSync(esmWebhooks)).toBe(true);
    expect(fs.existsSync(cjsWebhooks)).toBe(true);

    const esmMod = await import(pathToFileURL(esmDist).href);
    expect(typeof esmMod.DIPClient).toBe('function');
    expect(typeof esmMod.ApiClient).toBe('function');
    expect(typeof esmMod.ApiSathiClient).toBe('function');
    expect(typeof esmMod.DatabaseClient).toBe('function');
    expect(typeof esmMod.StorageClient).toBe('function');

    const cjsMod = require(cjsDist);
    expect(typeof cjsMod.DIPClient).toBe('function');
    expect(typeof cjsMod.ApiClient).toBe('function');

    const esmWh = await import(pathToFileURL(esmWebhooks).href);
    const cjsWh = require(cjsWebhooks);
    expect(typeof esmWh.verifyWebhookSignature).toBe('function');
    expect(typeof cjsWh.verifyWebhookSignature).toBe('function');
  });
});
