import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const normalize = text => text.replace(/\r\n/g, '\n');
export const digest = text => createHash('sha256').update(normalize(text)).digest('hex');
export function workerProtectedPart(source) {
  source = normalize(source);
  const start = source.indexOf('async function handleMediaUpload(');
  const end = source.indexOf('async function handleMediaDelete(', start);
  if (start < 0 || end < start) throw new Error('Upload boundary not found');
  return (source.slice(0,start) + '/* upload handler excluded */\n' + source.slice(end))
    .replace(/^const WORKER_VERSION = .*;$/m, 'const WORKER_VERSION = "VERSION";');
}
export function checkProtected(root) {
  const manifest = JSON.parse(readFileSync(new URL('protected-baseline.json', import.meta.url),'utf8'));
  const errors = [];
  for (const [path, expected] of Object.entries(manifest.files)) {
    const actual = digest(readFileSync(new URL(path, root),'utf8'));
    if (actual !== expected) errors.push(path);
  }
  if (digest(workerProtectedPart(readFileSync(new URL('worker/worker.js',root),'utf8'))) !== manifest.workerOutsideUpload) errors.push('worker/worker.js outside upload/version');
  return errors;
}
