import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

const rootEnvPath = path.resolve(__dirname, '../../../../.env');
const localEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config(); // fallback to default CWD resolution
}

export {};
