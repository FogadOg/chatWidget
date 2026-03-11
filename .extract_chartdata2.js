/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('fs');
const s=fs.readFileSync('.next/analyze/client.html','utf8');
const pos=s.indexOf('window.chartData');
if(pos===-1){console.error('NOTFOUND');process.exit(2)}
const arrStart = s.indexOf('[', pos);
if(arrStart===-1){console.error('NOSTART');process.exit(2)}
let depth=0,i=arrStart;
for(;i<s.length;i++){
  const ch=s[i];
  if(ch==='[') depth++;
  else if(ch===']'){
    depth--;
    if(depth===0){
      const jsonText = s.slice(arrStart, i+1);
      fs.writeFileSync('.next/analyze/chartData.json', jsonText);
      console.log('SAVED', '.next/analyze/chartData.json', 'len', jsonText.length);
      process.exit(0);
    }
  }
}
console.error('NOEND');process.exit(2);
