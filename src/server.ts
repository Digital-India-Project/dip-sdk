import http from 'node:http';
import {
  ApiClient,
  ApiSathiClient,
  DIPClient,
  DatabaseClient,
  OPENAPI_SPEC_META,
  StorageClient,
} from './index.js';

const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';

const exportsList = [
  DIPClient.name,
  ApiClient.name,
  ApiSathiClient.name,
  DatabaseClient.name,
  StorageClient.name,
];

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'ok',
        package: '@digital-india/sdk',
        version: '0.2.0',
        openapiVersion: OPENAPI_SPEC_META.version,
        verifiedOperations: OPENAPI_SPEC_META.operationCount,
        exports: exportsList,
      })
    );
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>@digital-india/sdk</title>
    <meta name="description" content="Digital India Project SDK - TypeScript client for DIPINDIA API services" />
  </head>
  <body style="font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 20px; line-height: 1.6; color: #111827;">
    <h1>@digital-india/sdk</h1>
    <p>Digital India Project SDK — TypeScript client library for approved Digital India Project API services (${OPENAPI_SPEC_META.operationCount} verified OpenAPI operations).</p>
    <h2>Primary &amp; Legacy Exports</h2>
    <ul>
      ${exportsList.map((name) => `<li><code>${name}</code></li>`).join('\n      ')}
    </ul>
    <p><a href="/health">/health</a></p>
  </body>
</html>`);
});

server.listen(port, host, () => {
  console.log(`@digital-india/sdk dev server listening on http://${host}:${port}`);
});
