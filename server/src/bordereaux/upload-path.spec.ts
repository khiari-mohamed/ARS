import * as path from 'path';
import { getUploadDirectories, getUploadRelativePath } from './upload-path';

describe('upload path helpers', () => {
  describe('getUploadDirectories', () => {
    it('checks the active and legacy upload roots when run from the project root', () => {
      const projectRoot = path.resolve('/home/yourapp');
      expect(getUploadDirectories(projectRoot)).toEqual([
        path.resolve(projectRoot, 'uploads'),
        path.resolve(projectRoot, 'server', 'uploads'),
      ]);
    });

    it('prefers the active server uploads root when run from the server directory', () => {
      const serverDirectory = path.resolve('/home/yourapp/server');
      expect(getUploadDirectories(serverDirectory)).toEqual([
        path.resolve(serverDirectory, 'uploads'),
        path.resolve('/home/yourapp', 'uploads'),
      ]);
    });
  });

  describe('getUploadRelativePath', () => {
    it.each([
      ['/home/yourapp/uploads/manual-scan/bordereau/file.pdf', 'manual-scan/bordereau/file.pdf'],
      ['/home/yourapp/server/uploads/manual-scan/bordereau/file.pdf', 'manual-scan/bordereau/file.pdf'],
      ['uploads/manual-scan/bordereau/file.pdf', 'manual-scan/bordereau/file.pdf'],
      ['documents/file.pdf', 'documents/file.pdf'],
      ['D:\\ARS\\server\\uploads\\documents\\file.pdf', 'documents/file.pdf'],
    ])('normalizes %s', (storedPath, expected) => {
      expect(getUploadRelativePath(storedPath)).toBe(expected);
    });

    it('rejects paths that could escape an upload root', () => {
      expect(getUploadRelativePath('../outside/file.pdf')).toBeNull();
      expect(getUploadRelativePath('uploads/../outside/file.pdf')).toBeNull();
      expect(getUploadRelativePath('/outside/file.pdf')).toBeNull();
    });
  });
});
