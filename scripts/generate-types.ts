// Type generation script for SDK
import fs from 'fs';
import path from 'path';

const apiSpecPath = path.join(__dirname, '..', 'src', 'api-spec.json');
if (fs.existsSync(apiSpecPath)) {
  const spec = JSON.parse(fs.readFileSync(apiSpecPath, 'utf-8'));
  console.log(`Generating types from API spec: ${spec.name}`);
} else {
  console.warn('No api-spec.json found, using default types');
}
