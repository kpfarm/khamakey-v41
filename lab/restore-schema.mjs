import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const LAB_PROJECT = 'ybmnrtvksvndpdiofmqm';
const q = value => '"' + String(value).replaceAll('"','""') + '"';
const object = value => q(value.schema)+'.'+q(value.name || value.table);
const role = value => value === 'PUBLIC' ? 'PUBLIC' : q(value);
export function buildSchema(s,target) {
 if(target !== LAB_PROJECT) throw new Error('Only the dedicated lab project is allowed');
 if(s.tables.some(t=>t.columns.some(c=>c.identity || c.has_column_acl))) throw new Error('Identity/column ACL requires explicit handling');
 const out = ["begin;", "set local check_function_bodies = false;", "set local search_path = public, extensions, pg_catalog;",
  "do $$ begin if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private') and c.relkind='r') then raise exception 'Target must have no application tables'; end if; end $$;",
  "create schema if not exists app_private;", "create extension if not exists pgcrypto with schema extensions;", 'create extension if not exists "uuid-ossp" with schema extensions;'];
 for(const x of s.sequences || []) for(const field of ['increment','min','max','start','cache']) {
  if((typeof x[field]==='number' && !Number.isSafeInteger(x[field])) || !/^-?\d+$/.test(String(x[field]))) throw new Error('Unsafe sequence boundary; read bigint values as text');
 }
 for(const x of s.sequences || []) out.push('create sequence '+object(x)+' as '+x.type+' increment by '+x.increment+' minvalue '+x.min+' maxvalue '+x.max+' start with '+x.start+' cache '+x.cache+(x.cycle?' cycle':' no cycle')+';');
 for(const t of s.tables) {
  out.push('create table '+object(t)+' (\n'+t.columns.map(c=>q(c.name)+' '+c.type+(c.generated?' generated always as ('+c.default+') stored':'')+(c.not_null?' not null':'')).join(',\n')+'\n);');
  if(t.rls) out.push('alter table '+object(t)+' enable row level security;');
  if(t.force_rls) out.push('alter table '+object(t)+' force row level security;');
 }
 for(const f of s.functions) {
  if(!f.definition.startsWith('CREATE OR REPLACE FUNCTION ')) throw new Error('Unexpected function DDL');
  // The only source URL literal is an old Business redirect; keep laboratory output local.
  let definition = f.definition.replaceAll('https://khamakey-nfc.khamakey-nfc.workers.dev','http://127.0.0.1:8787');
  if(f.schema==='public' && f.name==='track_business_event') definition = f.definition.slice(0,f.definition.indexOf('AS $function$')) + "AS $function$ BEGIN RAISE EXCEPTION 'Business analytics disabled in laboratory' USING ERRCODE='42501'; END; $function$";
  if(f.schema==='app_private' && f.name==='webhook_ingest_key') definition = "CREATE OR REPLACE FUNCTION app_private.webhook_ingest_key() RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, app_private AS $function$ DECLARE v text; BEGIN SELECT secret_value INTO v FROM app_private.khamakey_secrets WHERE secret_key='webhook_ingest_key'; IF v IS NULL OR length(v)<16 THEN RAISE EXCEPTION 'Laboratory ingest key not configured' USING ERRCODE='42501'; END IF; RETURN v; END; $function$";
  out.push(definition+';');
 }
 for(const t of s.tables) for(const c of t.columns) if(c.default && !c.generated) out.push('alter table '+object(t)+' alter column '+q(c.name)+' set default '+c.default+';');
 for(const c of s.constraints) out.push('alter table '+object({...c,name:c.table})+' add constraint '+q(c.name)+' '+c.definition+';');
 for(const i of s.indexes || []) out.push(i+';');
 for(const v of s.views || []) out.push('create view '+object(v)+(v.options?.length?' with ('+v.options.join(',')+')':'')+' as '+v.definition.replace(/;\s*$/,'')+';');
 const commands={'*':'all',r:'select',a:'insert',w:'update',d:'delete'};
 for(const p of s.policies || []) out.push('create policy '+q(p.name)+' on '+object({...p,name:p.table})+' as '+(p.permissive?'permissive':'restrictive')+' for '+commands[p.command]+' to '+p.roles.map(role).join(',')+(p.using?' using ('+p.using+')':'')+(p.check?' with check ('+p.check+')':'')+';');
 for(const t of s.triggers || []) {
  out.push(t.definition+';');
  if(t.enabled==='D') out.push('alter table '+object({...t,name:t.table})+' disable trigger '+q(t.name)+';');
  else if(t.enabled!=='O') throw new Error('Nonstandard trigger mode');
 }
 for(const schema of ['public','app_private']) {
  out.push('revoke all on all tables in schema '+q(schema)+' from PUBLIC, anon, authenticated, service_role;');
  out.push('revoke all on all sequences in schema '+q(schema)+' from PUBLIC, anon, authenticated, service_role;');
  out.push('revoke all on all functions in schema '+q(schema)+' from PUBLIC, anon, authenticated, service_role;');
  out.push('revoke all on schema '+q(schema)+' from PUBLIC, anon, authenticated, service_role;');
 }
 // Keep access closed. A separate reviewed allowlist is required before functional staging.
 out.push('commit;');
 return out.join('\n\n')+'\n';
}
if(typeof process !== 'undefined' && process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
 const snapshot=JSON.parse(readFileSync('.lab/schema-snapshot.json','utf8'));
 const sql=buildSchema(snapshot,process.env.LAB_PROJECT_REF);
 writeFileSync('.lab/restore-schema.sql',sql);
 console.log('Schema-only laboratory restore prepared; no row data or production execution.');
}

