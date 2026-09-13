import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {processRun,newRun,checked} from './pipeline.js';

const url=Deno.env.get('SUPABASE_URL')!;
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function finish(uid:string,id:string){
 const until=Date.now()+100000;
 try{for(let step=0;step<24 && Date.now()<until;step++){const r=await processRun(service,uid,id);if(['COMPLETED','FAILED','PAUSED'].includes(r.state))break;if(Date.parse(r.lease_until)>Date.now())break;}}
 catch{await service.from('automation_runs').update({lease_until:'1970-01-01',updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',uid);}
}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return reply(405,{error:'POST required'});
 try{
  const raw=await req.text();if(raw.length>1000)return reply(413,{error:'Request too large'});const body=JSON.parse(raw||'{}');
  const key=req.headers.get('x-worker-key');
  if(key){
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))].map(b=>b.toString(16).padStart(2,'0')).join('');
   const {data,error}=await service.from('worker_configuration').select('secret_hash').eq('id','make').single();
   if(error||data.secret_hash!==hash)return reply(401,{error:'Unauthorized'});
   const work=async()=>{
    const profiles=checked(await service.from('user_profiles').select('user_id,data').eq('data->preferences->>daily','true').limit(20));
    for(const p of profiles){const recent=checked(await service.from('automation_runs').select('id').eq('user_id',p.user_id).gte('created_at',new Date(Date.now()-86400000).toISOString()).limit(1));if(!recent.length)await service.from('automation_runs').insert({user_id:p.user_id,data:newRun(p.data)});}
    const runs=checked(await service.from('automation_runs').select('id,user_id').not('state','in','(COMPLETED,FAILED,PAUSED)').lt('lease_until',new Date().toISOString()).order('updated_at',{ascending:true}).limit(3));
    await Promise.allSettled(runs.map(r=>finish(r.user_id,r.id)));
   };
   EdgeRuntime.waitUntil(work().catch(()=>console.error('Scheduled search sweep could not finish.')));
   return reply(202,{accepted:true});
  }
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
  const {data:auth,error}=await service.auth.getUser(token);
  if(error||!auth.user)return reply(401,{error:'Sign in required'});
  const run=checked(await service.from('automation_runs').select('id').eq('id',body.id).eq('user_id',auth.user.id).single());
  EdgeRuntime.waitUntil(finish(auth.user.id,run.id));
  return reply(202,{accepted:true});
 }catch{return reply(400,{error:'Worker request could not be accepted'});}
});
