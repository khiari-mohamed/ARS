import { mkdirSync } from 'fs';
import * as path from 'path';

export function getUploadDestination(): string {
  const uploadDir = path.join(process.cwd(), 'uploads');
  mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}
