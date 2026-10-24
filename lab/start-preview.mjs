import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { prepare } from './prepare-preview.mjs';
const {root,runtime}=prepare();
const env={...process.env};
for(const name of Object.keys(env))if(/^(CLOUDFLARE_|CF_|SUPABASE_|RESEND_|SHOPIFY_|STRIPE_|PAYPAL_|OPENAI_|WEBHOOK_|ANALYTICS_|VISITOR_)/i.test(name))delete env[name];
Object.assign(env,{WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:join(root,'.lab/wrangler.log'),XDG_CONFIG_HOME:join(root,'.lab/config')});
const children=[];
function start(args){const child=spawn(process.execPath,args,{cwd:root,env,stdio:'inherit',windowsHide:true});children.push(child);child.on('exit',()=>children.forEach(c=>{if(c!==child)c.kill();}));return child;}
start(['lab/preview-server.mjs']);
start(['worker/node_modules/wrangler/bin/wrangler.js','dev','--config',join(runtime,'wrangler.toml'),'--local','--ip','127.0.0.1','--port','8787','--persist-to',join(root,'.lab/state'),'--show-interactive-dev-session','false']);
process.on('SIGINT',()=>children.forEach(c=>c.kill()));
process.on('SIGTERM',()=>children.forEach(c=>c.kill()));
