// Explicit opt-in: disposable accounts provisioned by the developer, no outgoing email.
// Never run against real user credentials or create fake public job listings.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {cloud} from '../dist/config.js';
import {createDocx} from '../dist/export.js';
if(!process.env.QA_PASSWORD)throw Error('Set QA_PASSWORD for disposable .invalid accounts.');
const client=()=>createClient(cloud.url,cloud.key,{auth:{persistSession:false,autoRefreshToken:false}});
const a=client(),b=client();
const login=async(db,email)=>{const r=await db.auth.signInWithPassword({email,password:process.env.QA_PASSWORD});if(r.error)throw r.error;return r.data.session;};
const sa=await login(a,'qa-agent@applydesk.invalid'),sb=await login(b,'qa-isolation@applydesk.invalid');
const first=await a.from('jobs').select('id,data').limit(1).single();assert.ok(first.data?.id,'Run a real discovery search before this smoke check.');
const foreign=await b.from('jobs').select('id').eq('id',first.data.id);assert.deepEqual(foreign.data,[]);
const foreignWrite=await b.from('jobs').update({status:'Applied'}).eq('id',first.data.id).select();assert.deepEqual(foreignWrite.data,[]);
const forgery=await b.from('generated_documents').insert({user_id:sb.user.id,job_id:first.data.id,kind:'resume',data:{text:'QA ownership rejection'}});assert.ok(forgery.error,'Foreign job document insert must fail.');
const config=await b.from('worker_configuration').select('*');assert.ok(config.error,'Worker secrets must not be selectable by a user.');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4174';
const call=async(action,data={},token=sa.access_token)=>{const r=await fetch(origin+'/api/agent',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action,...data})});return {status:r.status,body:await r.json()};};
const noAuth=await call('status',{},'');assert.equal(noAuth.status,401);
const cross=await call('research',{id:first.data.id},sb.access_token);assert.notEqual(cross.status,200);
const original=Buffer.from(await createDocx('QA parsing fixture\nSKILLS\nLinux, Docker\nEDUCATION\nParser verification only').arrayBuffer());
const upload=await call('parse',{name:'qa-parser.docx',base64:original.toString('base64')});assert.equal(upload.status,200,upload.body.error);assert.match(upload.body.text,/Linux, Docker/);
const hidden=await b.storage.from('career-originals').download(upload.body.original.data.path);assert.ok(hidden.error,'Other users must not download the original.');
await a.storage.from('career-originals').remove([upload.body.original.data.path]);await a.from('resumes').delete().eq('id',upload.body.original.id);
const badWorker=await fetch(cloud.url+'/functions/v1/job-worker',{method:'POST',headers:{'Content-Type':'application/json','x-worker-key':'invalid'},body:'{}'});assert.equal(badWorker.status,401);
console.log('PASS: authentication, cross-user reads/updates, foreign job references, private worker configuration, DOCX parsing and private file isolation.');
await a.auth.signOut();await b.auth.signOut();
