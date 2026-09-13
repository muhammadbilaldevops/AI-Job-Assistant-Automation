// Inspect ZIP metadata before passing an untrusted DOCX to its XML parser.
export function validateDocxArchive(bytes) {
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw Error('This file is not a readable Word document.');
 const count=bytes.readUInt16LE(end+10),offset=bytes.readUInt32LE(end+16);
 if(count>200||count<1||offset>=bytes.length)throw Error('This Word document is too complex. Export a simpler DOCX or text PDF.');
 let pos=offset,total=0,document=false;
 for(let i=0;i<count;i++){
  if(pos+46>bytes.length||bytes.readUInt32LE(pos)!==0x02014b50)throw Error('Invalid Word archive.');
  const size=bytes.readUInt32LE(pos+24),nameLength=bytes.readUInt16LE(pos+28),extra=bytes.readUInt16LE(pos+30),comment=bytes.readUInt16LE(pos+32);
  total+=size;if(size>8_000_000||total>12_000_000)throw Error('The expanded Word document is too large.');
  const name=bytes.subarray(pos+46,pos+46+nameLength).toString('utf8');
  if(name==='word/document.xml')document=true;
  pos+=46+nameLength+extra+comment;if(pos>bytes.length)throw Error('Invalid Word archive.');
 }
 if(!document)throw Error('The file does not contain a Word document.');
}
