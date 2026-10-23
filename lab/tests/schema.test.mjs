import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchema, LAB_PROJECT } from '../restore-schema.mjs';
const fixture = () => ({tables:[],functions:[],constraints:[],schema_acl:[{schema:'public',grantee:'authenticated',privilege:'CREATE'}],table_acl:[{schema:'public',name:'sensitive',kind:'r',grantee:'authenticated',privilege:'DELETE'}],function_acl:[{schema:'public',name:'admin_erase',identity:'',grantee:'anon',privilege:'EXECUTE'}]});
test('schema builder refuses production or unknown targets',()=>{
 for(const target of ['cuxlwaocjqwzluycznyp','bftmldytlhuznintdmdl',undefined,'other']) assert.throws(()=>buildSchema(fixture(),target),/dedicated lab/);
});
test('schema builder does not restore source grants',()=>{
 const sql=buildSchema(fixture(),LAB_PROJECT);
 assert.doesNotMatch(sql,/\bgrant\s/i);
 for(const schema of ['public','app_private']) for(const kind of ['tables','sequences','functions']) assert.ok(sql.includes('revoke all on all '+kind+' in schema "'+schema+'" from PUBLIC, anon, authenticated, service_role;'));
 assert.match(sql,/Target must have no application tables/);
});
test('lab ingest fails closed and Business analytics cannot carry a source secret',()=>{
 const s=fixture();
 s.functions=[{schema:'public',name:'track_business_event',definition:'CREATE OR REPLACE FUNCTION public.track_business_event() RETURNS void LANGUAGE plpgsql AS $function$ BEGIN PERFORM source_secret_sentinel; END; $function$'}, {schema:'app_private',name:'webhook_ingest_key',definition:'CREATE OR REPLACE FUNCTION app_private.webhook_ingest_key() RETURNS text LANGUAGE sql AS $function$ SELECT source_secret_sentinel $function$'}];
 const sql=buildSchema(s,LAB_PROJECT);
 assert.doesNotMatch(sql,/source_secret_sentinel/);
 assert.match(sql,/Business analytics disabled in laboratory/);
 assert.match(sql,/Laboratory ingest key not configured/);
 assert.match(sql,/v IS NULL OR length\(v\)<16/);
});
test('sequence bigint boundaries remain exact and unsafe numeric values are rejected',()=>{
 const s=fixture();
 s.sequences=[{schema:'public',name:'test_seq',type:'bigint',increment:'1',min:'1',max:'9223372036854775807',start:'1',cache:'1',cycle:false}];
 assert.match(buildSchema(s,LAB_PROJECT),/maxvalue 9223372036854775807/);
 s.sequences[0].max=9223372036854775807;
 assert.throws(()=>buildSchema(s,LAB_PROJECT),/Unsafe sequence/);
});
test('unsupported identity or column ACL cannot silently lose protection',()=>{
 for(const column of [{identity:'a'},{has_column_acl:true}]) {
 const s=fixture(); s.tables=[{columns:[column]}];
 assert.throws(()=>buildSchema(s,LAB_PROJECT),/explicit handling/);
 }
});
