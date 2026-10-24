import core from '../.lab/runtime/worker-core.mjs';
import settings from '../.lab/runtime/settings.mjs';
import { DB_ORIGIN,APP_ORIGIN,WORKER_ORIGIN,allowedWorkerRoute,labHeaders } from './network.mjs';
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if(url.origin!==WORKER_ORIGIN || (request.headers.get('origin') && ![APP_ORIGIN,WORKER_ORIGIN].includes(request.headers.get('origin')))) return new Response('Laboratory origin rejected',{status:403});
    if(request.method==='OPTIONS') return labHeaders(new Response(null,{status:204}));
    if(url.pathname==='/health' && request.method==='GET') return labHeaders(Response.json({environment:'isolated-laboratory',database:DB_ORIGIN,media:'local',coreFlowBrowserTested:false}));
    if(!allowedWorkerRoute(url.pathname,request.method)) return labHeaders(new Response('Operation disabled in laboratory',{status:403}));
    // Project all bindings explicitly; inherited secrets never reach the real handler.
    const isolated={MEDIA:env.MEDIA,SUPABASE_URL:DB_ORIGIN,SUPABASE_PUBLISHABLE_KEY:settings.key,PAGES_ASSET_BASE:APP_ORIGIN,WORKER_PUBLIC_BASE:WORKER_ORIGIN,VISITOR_SALT:'laboratory-only-no-customer-data'};
    return labHeaders(await core.fetch(request,isolated,ctx));
  }
};
