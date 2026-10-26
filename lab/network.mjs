export const LAB_REF = 'ybmnrtvksvndpdiofmqm';
export const DB_ORIGIN = `https://${LAB_REF}.supabase.co`;
export const APP_ORIGIN = 'http://127.0.0.1:8080';
export const WORKER_ORIGIN = 'http://127.0.0.1:8787';
export const PUBLIC_RPC = ['get_public_moment','get_moment_activation_page','peek_moment_activation_code','resolve_khamakey_code','check_rate_limit','peek_moment_page_invite','peek_moment_ownership_transfer'];
export const OWNED_RPC = ['list_my_moment_events','get_moment_entitlements','moment_can_edit_event','save_my_moment_page','activate_moment_code','set_moment_media_usage','record_moment_media_bytes','create_moment_product_batch','invite_moment_page_editor','list_moment_page_editors','accept_moment_page_invite','revoke_moment_page_editor','request_moment_ownership_transfer','cancel_moment_ownership_transfer','get_moment_ownership_transfer','accept_moment_ownership_transfer','decline_moment_ownership_transfer','moment_ownership_transfer_is_current','abandon_unsent_moment_ownership_transfer'];
export const READ_TABLES = ['platform_members','moment_events','moment_pages','moment_activation_codes','moment_media_usage'];
export function allowedDatabaseRequest(url, method='GET') {
  const u = new URL(url);
  if(u.origin!==DB_ORIGIN || u.username || u.password) return false;
  if(method==='GET' && u.pathname==='/auth/v1/user') return true;
  if(method==='POST' && u.pathname==='/auth/v1/logout') return true;
  if(method==='POST' && u.pathname==='/auth/v1/token') return ['password','refresh_token'].includes(u.searchParams.get('grant_type'));
  if(method==='POST' && u.pathname.startsWith('/rest/v1/rpc/')) return [...PUBLIC_RPC,...OWNED_RPC].includes(u.pathname.slice('/rest/v1/rpc/'.length));
  if(method==='GET' && u.pathname.startsWith('/rest/v1/')) return READ_TABLES.includes(u.pathname.slice('/rest/v1/'.length));
  return false;
}
export async function labFetch(input, options={}) {
  const request = new Request(input, options);
  const u=new URL(request.url);
  const localAsset=u.origin===APP_ORIGIN && request.method==='GET' && !u.pathname.startsWith('/supabase');
  if(!localAsset && !allowedDatabaseRequest(u,request.method)) throw new Error('Laboratory outbound destination or operation blocked');
  // No redirect may carry credentials to another origin.
  return globalThis.fetch(new Request(request,{redirect:'manual'}));
}
export function allowedWorkerRoute(path,method,{localTransferMail=false}={}) {
  if(localTransferMail && path==='/api/moment/transfer' && method==='POST')return true;
  if(method==='GET' || method==='HEAD') return path==='/health' || /^\/(m|k|cdn)\//.test(path);
  return method==='POST' && ['/api/media/upload','/api/media/delete','/api/media/usage-sync','/api/moment/preview'].includes(path);
}
export const LAB_CSP = `default-src 'self'; script-src 'self' 'unsafe-inline' ${APP_ORIGIN} https://esm.sh; style-src 'self' 'unsafe-inline' ${APP_ORIGIN} https://fonts.googleapis.com; font-src 'self' ${APP_ORIGIN} https://fonts.gstatic.com; img-src 'self' data: blob: ${APP_ORIGIN} ${WORKER_ORIGIN}; media-src 'self' blob: ${WORKER_ORIGIN}; connect-src 'self' ${APP_ORIGIN} ${WORKER_ORIGIN}; frame-src 'self' ${APP_ORIGIN} ${WORKER_ORIGIN} https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com; object-src 'none'; base-uri 'self'; frame-ancestors ${APP_ORIGIN} ${WORKER_ORIGIN}; form-action 'self' ${WORKER_ORIGIN}`;
export function labHeaders(response) {
  const headers=new Headers(response.headers);
  headers.set('Content-Security-Policy',LAB_CSP);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','no-referrer');
  headers.set('Cache-Control','no-store');
  headers.set('Access-Control-Allow-Origin',APP_ORIGIN);
  headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  headers.set('Access-Control-Allow-Methods','GET,HEAD,POST,OPTIONS');
  headers.delete('Strict-Transport-Security');
  headers.set('X-KhamaKey-Environment','isolated-laboratory');
  return new Response(response.body,{status:response.status,headers});
}
