import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

interface OpenApiSpec {
  openapi?: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, { operationId?: string; summary?: string; tags?: string[] }>>;
}

const rootDir = path.resolve(__dirname, '..');
const apiSpecPath = path.join(rootDir, 'src', 'api-spec.json');
const outDir = path.join(rootDir, 'src', 'generated');
const outFile = path.join(outDir, 'openapi-types.ts');

if (!fs.existsSync(apiSpecPath)) {
  console.warn('No src/api-spec.json found; skipping OpenAPI type generation.');
  process.exit(0);
}

const rawSpec = fs.readFileSync(apiSpecPath, 'utf-8');
const spec = JSON.parse(rawSpec) as OpenApiSpec;

if (!spec.openapi || !spec.paths || typeof spec.paths !== 'object') {
  throw new Error('Invalid OpenAPI specification: missing openapi version or paths object.');
}

const specHash = crypto.createHash('sha256').update(rawSpec).digest('hex');

interface OperationEntry {
  method: string;
  path: string;
  operationId: string;
  summary: string;
  tags: string[];
}

const operations: OperationEntry[] = [];
const httpMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;

for (const routePath of Object.keys(spec.paths).sort()) {
  const pathItem = spec.paths[routePath];
  if (!pathItem) continue;
  for (const method of httpMethods) {
    const op = pathItem[method];
    if (!op) continue;
    operations.push({
      method: method.toUpperCase(),
      path: routePath,
      operationId: op.operationId ?? `${method}_${routePath}`,
      summary: op.summary ?? '',
      tags: op.tags ?? [],
    });
  }
}

const routeUnion = Object.keys(spec.paths)
  .sort()
  .map((p) => `  | '${p}'`)
  .join('\n');

const operationIdUnion = operations
  .map((o) => `  | '${o.operationId}'`)
  .join('\n');

const generated = `/* eslint-disable */
/**
 * Deterministically generated from src/api-spec.json.
 * Do not edit manually; run \`npm run generate\` to regenerate.
 */

export const OPENAPI_SPEC_META = {
  title: ${JSON.stringify(spec.info?.title ?? 'DIP API')},
  version: ${JSON.stringify(spec.info?.version ?? '1.0.0')},
  openapi: ${JSON.stringify(spec.openapi)},
  specSha256: ${JSON.stringify(specHash)},
  operationCount: ${operations.length},
} as const;

export type OpenApiPath =
${routeUnion};

export type OpenApiOperationId =
${operationIdUnion};

export interface OpenApiOperationDescriptor {
  readonly method: string;
  readonly path: OpenApiPath;
  readonly operationId: OpenApiOperationId;
  readonly summary: string;
  readonly tags: readonly string[];
}

export const OPENAPI_OPERATIONS: readonly OpenApiOperationDescriptor[] = ${JSON.stringify(
  operations,
  null,
  2
)} as const;
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, generated, 'utf-8');
console.log(
  `Generated ${operations.length} OpenAPI operations from ${spec.info?.title ?? 'API spec'} (sha256: ${specHash.slice(0, 12)}) -> src/generated/openapi-types.ts`
);
