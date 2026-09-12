import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalURL,normalizeJob,mergeJobs,matchJob,blankProfile,researchReady,buildPrompt,validateResume,resumeHTML} from '../dist/core.js';
import {createDocx} from '../dist/export.js';
const base={title:'DevOps Intern',company:'Example',description:'Linux, Git and Docker. Fresh graduates.',location:'Islamabad'};
const resume=`PROFESSIONAL SUMMARY

After researching **"Example"**, ***I understand that the company builds deployment tools.*** Reliable releases and clear issue reports are relevant priorities for this vacancy.

***As a DevOps Intern, I will help address these challenges by supporting deployment checks.*** I will use my verified project experience to document issues and help the team investigate them.

TECHNICAL SKILLS

• **Linux:** Basic administration.
• **Git:** Version control.
• **Containers:** Docker basics.
• **Scripting:** Python basics.
• **Documentation:** Clear issue reports.

EXPERIENCE

**Lab Assistant** | **Example College**        *January 2025 - May 2025*

▸ Documented lab setup steps.
▸ Helped troubleshoot Linux exercises.`;
test('Indeed tracking links deduplicate by job key',()=>assert.equal(canonicalURL('https://pk.indeed.com/rc/clk?jk=abc&utm_source=email'),canonicalURL('https://pk.indeed.com/viewjob?jk=abc')));
test('rejects script links',()=>assert.throws(()=>normalizeJob({...base,url:'javascript:alert(1)'})));
test('duplicate import preserves application and documents',()=>{const j=normalizeJob({...base,url:'https://example.com/job'});j.status='Applied';j.resume='saved';const x=mergeJobs([j],[{...base,url:'https://example.com/job?utm_source=mail',description:'Changed description'}]);assert.equal(x.jobs.length,1);assert.equal(x.jobs[0].status,'Applied');assert.equal(x.jobs[0].resume,'saved');assert.equal(x.jobs[0].previousDescription,base.description);});
test('remote does not automatically imply Pakistan eligibility',()=>{for(const [remoteEligibility,expected] of [['Unknown','Review'],['Restricted','Excluded'],['Pakistan','Eligible']])assert.equal(matchJob(normalizeJob({...base,mode:'Remote',remoteEligibility}),blankProfile()).eligibility,expected);});
test('on-site Lahore is excluded',()=>assert.equal(matchJob(normalizeJob({...base,location:'Lahore'}),blankProfile()).eligibility,'Excluded'));
test('expired deadline excludes and future date is not fresh',()=>{const m=matchJob(normalizeJob({...base,postedAt:'2099-01-01',deadline:'2020-01-01'}),blankProfile());assert.equal(m.eligibility,'Excluded');assert(m.flags.includes('Posting date is in the future'));});
test('truthfully ranks available profile skills including punctuation',()=>{const p=blankProfile();p.skills='Linux, Git, C++, .NET';const m=matchJob(normalizeJob({...base,description:'Linux Git C++ .NET'}),p);assert(m.reasons.some(x=>x.includes('C++')));});
test('source notes must be verified and recent',()=>{const j=normalizeJob(base);j.research=[{verified:true,url:'https://example.com',notes:'Fact',checkedAt:'2020-01-01'}];assert.equal(researchReady(j),false);j.research[0].checkedAt=new Date().toISOString();assert.equal(researchReady(j),true);});
test('master retained verbatim and cover uses independent prompt',async()=>{const master=await readFile(new URL('../dist/prompts/master-resume.txt',import.meta.url),'utf8');const j=normalizeJob(base);assert(buildPrompt(master,j,blankProfile()).startsWith(master));assert(!buildPrompt(master,j,blankProfile(),'cover').includes('Return ONLY:'));});
test('valid exact-preset structure passes',()=>assert.deepEqual(validateResume(resume,base).errors,[]));
test('extra categories and invented placeholders cannot pass',()=>{assert(validateResume(resume.replace('EXPERIENCE','• **More:** Tool.\n• **Extra:** Tool.\n\nEXPERIENCE'),base).errors.length);assert(validateResume(resume.replace('Example College','[Company Name]'),base).errors.some(x=>x.includes('placeholders')));});
test('em dashes fail and HTML is escaped',()=>{assert(validateResume(resume+'—',base).errors.length);assert(!resumeHTML('<script>alert(1)</script>').includes('<script>'));assert(resumeHTML('***Emphasis***').includes('<strong><em>'));});
test('DOCX package includes Word document and correct run sizes',async()=>{const bytes=Buffer.from(await createDocx(resume).arrayBuffer());assert.equal(bytes.readUInt32LE(0),0x04034b50);const txt=bytes.toString('utf8');assert(txt.includes('word/document.xml'));assert(txt.includes('w:val="20"'));assert(txt.includes('w:val="22"'));assert(txt.includes('<w:b/><w:i/>'));});
