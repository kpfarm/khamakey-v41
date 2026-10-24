// Local capture only. This module never sends a request to an email provider.
import {labFetch} from './network.mjs';
export const LAB_MAIL_KEY='laboratory-capture-not-a-provider-key';
export const LAB_EVENT='46d02893-9668-4583-9ffd-64615c8f80c9';
export const LAB_MAIL_RECIPIENTS=['lab-owner-a@example.invalid','lab-owner-b@example.invalid','lab-mail-failure@example.invalid'];
const captured=[];
export function capturedMailSnapshot(){return structuredClone(captured);}
export async function labMailFetch(input,options={}){
 const request=new Request(input,options),url=new URL(request.url);
 if(url.origin!=='https://api.resend.com')return labFetch(request);
 if(url.href!=='https://api.resend.com/emails'||request.method!=='POST'||request.headers.get('authorization')!=='Bearer '+LAB_MAIL_KEY)throw Error('Laboratory mail capture rejected request');
 const payload=await request.json();
 if(!Array.isArray(payload.to)||payload.to.length!==1||!LAB_MAIL_RECIPIENTS.includes(payload.to[0])||payload.from!=='Laboratory <no-reply@example.invalid>'||!payload.tags?.some(t=>t.name==='type'&&t.value==='moments_ownership_transfer'))throw Error('Only artificial transfer mail may be captured');
 const failed=payload.to[0]==='lab-mail-failure@example.invalid';
 captured.push({id:'local-capture-'+(captured.length+1),delivery:failed?'simulated-failure':'captured-not-sent',payload});
 if(captured.length>10)captured.shift();
 return Response.json(failed?{message:'Laboratory simulated delivery failure'}:{id:captured.at(-1).id},{status:failed?503:200});
}
