/**
 * Enhanced file parser utility.
 * Supports text, image, PDF, and binary files.
 * Returns a structured result with type, content, and error handling.
 */

export type ParsedFile =
  | { type: 'text'; content: string }
  | { type: 'image'; content: string; dataUrl: string }
  | { type: 'pdf'; content: ArrayBuffer }
  | { type: 'binary'; content: ArrayBuffer }
  | { type: 'unknown'; content: null };

export function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const textExts = ['txt', 'csv', 'md', 'log', 'json'];
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
  const pdfExt = 'pdf';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);

    if (textExts.includes(ext)) {
      reader.onload = () => resolve({ type: 'text', content: reader.result as string });
      reader.readAsText(file);
    } else if (imageExts.includes(ext)) {
      reader.onload = () =>
        resolve({
          type: 'image',
          content: '',
          dataUrl: reader.result as string,
        });
      reader.readAsDataURL(file);
    } else if (ext === pdfExt) {
      reader.onload = () =>
        resolve({
          type: 'pdf',
          content: reader.result as ArrayBuffer,
        });
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('application/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      reader.onload = () =>
        resolve({
          type: 'binary',
          content: reader.result as ArrayBuffer,
        });
      reader.readAsArrayBuffer(file);
    } else {
      // Unknown type, just return null
      resolve({ type: 'unknown', content: null });
    }
  });
}