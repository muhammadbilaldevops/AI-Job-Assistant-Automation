import {readdir,readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
for(const dir of ['dist','scripts','tests'])for(const f of await readdir(dir))if(/\.(m?js)$/.test(f))execFileSync(process.execPath,['--check',`${dir}/${f}`]);
execFileSync(process.execPath,['--check','server.mjs']);
for(const f of ['index.html','style.css','print.css','favicon.svg','app.js','core.js','export.js','prompts/master-resume.txt'])await access(`dist/${f}`);
const original=await readFile('dist/prompts/master-resume.txt'),expected=(await readFile('docs/master-prompt.sha256','utf8')).trim();
if(createHash('sha256').update(original).digest('hex')!==expected)throw Error('Original master prompt checksum mismatch.');
console.log('JavaScript syntax, required assets and original prompt checksum passed.');
