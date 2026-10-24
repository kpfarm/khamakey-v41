import { readFileSync,writeFileSync,mkdirSync,cpSync,readdirSync,statSync } from 'node:fs';
import { resolve,dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAB_REF,DB_ORIGIN,APP_ORIGIN,WORKER_ORIGIN } from './network.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function rewriteDestinations(text) {
  for(const origin of ['https://app.khamakeymoments.com','https://khamakey-app.pages.dev']) text=text.replaceAll(origin,APP_ORIGIN);
  for(const origin of ['https://link.khamakeymoments.com','https://khamakey-nfc.khamakey-nfc.workers.dev']) text=text.replaceAll(origin,WORKER_ORIGIN);
  return text.replaceAll('https://cuxlwaocjqwzluycznyp.supabase.co',DB_ORIGIN);
}
export function validateSettings(settings) {
  if(settings.project!==LAB_REF || !/^sb_publishable_[\w-]+$/.test(settings.key)) throw new Error('Dedicated laboratory project and publishable key required');
  const production=readFileSync(join(root,'pages/config.js'),'utf8');
  if(production.includes(settings.key)) throw new Error('Production publishable key rejected');
}
export function prepare() {
  const settings=JSON.parse(readFileSync(join(root,'.lab/settings.json'),'utf8'));
  validateSettings(settings);
  const runtime=join(root,'.lab/runtime'), pages=join(runtime,'pages');
  mkdirSync(pages,{recursive:true});
  cpSync(join(root,'pages'),pages,{recursive:true});
  function rewrite(dir) { for(const name of readdirSync(dir)) {const p=join(dir,name);if(statSync(p).isDirectory())rewrite(p);else if(/\.(js|html|css|json|svg)$/.test(name))writeFileSync(p,rewriteDestinations(readFileSync(p,'utf8')));}}
  rewrite(pages);
  const config=readFileSync(join(root,'pages/config.js'),'utf8')
    .replace(/export const SUPABASE_URL = .*;/,`export const SUPABASE_URL = "${APP_ORIGIN}/supabase";`)
    .replace(/export const SUPABASE_PUBLISHABLE_KEY = .*;/,`export const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(settings.key)};`);
  writeFileSync(join(pages,'config.js'),rewriteDestinations(config));
  // Only generated code is adapted. Source Worker/Pages and protected NFC files are untouched.
  const worker=readFileSync(join(root,'worker/worker.js'),'utf8');
  writeFileSync(join(runtime,'worker-core.mjs'),`import { labFetch as fetch } from '../../lab/network.mjs';\n`+rewriteDestinations(worker));
  writeFileSync(join(runtime,'settings.mjs'),'export default '+JSON.stringify(settings)+';\n');
  writeFileSync(join(runtime,'wrangler.toml'),`name = "khamakey-moments-laboratory-local"\nmain = "../../lab/worker-entry.mjs"\ncompatibility_date = "2026-06-25"\n[[r2_buckets]]\nbinding = "MEDIA"\nbucket_name = "khamakey-moments-laboratory-local"\nremote = false\n`);
  return {root,pages,runtime};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {prepare();console.log('Isolated preview generated; production sources unchanged.');}
