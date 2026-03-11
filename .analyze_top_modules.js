const fs=require('fs');
const data=JSON.parse(fs.readFileSync('.next/analyze/chartData.json','utf8'));
const modules=[];
function walk(item){
  if(item.groups){
    item.groups.forEach(walk);
  } else {
    modules.push(item);
  }
}
data.forEach(walk);
modules.sort((a,b)=> (b.gzipSize||0)-(a.gzipSize||0));
const top=modules.slice(0,60);
for(const m of top){
  console.log((m.gzipSize||0).toString().padStart(8,' '),' | ',(m.parsedSize||0).toString().padStart(8,' '),' | ',(m.statSize||0).toString().padStart(8,' '),' | ',m.label);
}
console.log('TOTAL_CHUNKS:', data.length);
