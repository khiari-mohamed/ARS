import { mkdirSync } from 'fs';
import * as path from 'path';

export function getUploadDirectories(cwd = process.cwd()): string[] {
  const workingDirectory = path.resolve(cwd);
  const projectRoot = path.basename(workingDirectory).toLowerCase() === 'server'
    ? path.dirname(workingDirectory)
    : workingDirectory;

  return [...new Set([
    path.resolve(workingDirectory, 'uploads'),
    path.resolve(projectRoot, 'uploads'),
    path.resolve(projectRoot, 'server', 'uploads'),
  ])];
}

export function getUploadRelativePath(storedPath: string): string | null {
  const normalized = storedPath.trim().replace(/\\/g, '/');
  if (!normalized) return null;

  const segments = normalized.split('/');
  const uploadsIndex = segments.findIndex((segment) => segment.toLowerCase() === 'uploads');
  const isAbsolutePath = normalized.startsWith('/') || /^[a-z]:\//i.test(normalized);

  if (uploadsIndex === -1 && isAbsolutePath) return null;

  const relativeSegments = uploadsIndex === -1
    ? segments
    : segments.slice(uploadsIndex + 1);

  if (
    relativeSegments.length === 0 ||
    relativeSegments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    return null;
  }

  return relativeSegments.join('/');
}

export function getUploadDestination(): string {
  const uploadDir = path.join(process.cwd(), 'uploads');
  mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}
