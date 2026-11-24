// Tiny stack VM: runs bytecode programs (program.bin) with input bytes (input.bin).
// Writes each program's output to stdout.bin and its exit code to exit.txt.
// Exit 0 = normal halt; 1-11 = trap/error codes (stack under/overflow, div by zero,
// bad opcode, bad memory address, call-stack under/overflow, PC out of range,
// step limit or output limit exceeded). Stack: 256 x int32; memory: 256 words.
import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';
import{join}from'node:path';
const B=new Uint8Array(65536),E=new TextEncoder;
function run(p,q){
 const n=p.length,D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256);
 let s=0,c=0,l=0,i=0,pc=0,t=0;
 for(;;){
  if(t===1e6)return[10,l];
  if(pc<0||pc>=n)return[9,l];
  const b=p[pc];
  let m=0,a=0,d=0;
  if(b<8){
   if(b===1){m=1;d=1}else if(b===2){m=4;d=1}
   else if(b===3)a=1;
   else if(b===4){a=1;d=2}
   else if(b===5){a=2;d=2}
   else if(b===6){a=2;d=3}
   else if(b===7){a=3;d=3}
  }else if(b>=16&&b<=34&&b!==31){
   if(b===23||b===27)a=1;else a=2;d=1;
  }else if(b>=48&&b<=52){
   m=2;if(b===49||b===50)a=1;if(b===52)m=0;
  }else if(b===64){a=1;d=1}
  else if(b===65)a=2;
  else if(b>=80&&b<=83){
   if(b===82)d=1;else a=1;
  }else return[5,l];
  if(pc+m>=n)return[9,l];
  t++;
  const x=pc+1+m;
  if(s<a)return[2,l];
  if(s-a+d>256)return[3,l];
  pc=x;
  switch(b){
   case 0:return[0,l];
   case 1:D[s++]=p[x-1]<<24>>24;break;
   case 2:D[s++]=p[x-4]|p[x-3]<<8|p[x-2]<<16|p[x-1]<<24;break;
   case 3:s--;break;
   case 4:D[s]=D[s-1];s++;break;
   case 5:{const y=D[s-1];D[s-1]=D[s-2];D[s-2]=y;break;}
   case 6:D[s]=D[s-2];s++;break;
   case 7:{const y=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=y;break;}
   case 23:D[s-1]=-D[s-1]|0;break;
   case 27:D[s-1]=~D[s-1];break;
   case 48:case 49:case 50:{
    const r=(p[x-2]|p[x-1]<<8)<<16>>16;
    let k=true;
    if(b!==48){const v=D[--s];k=b===49?v===0:v!==0;}
    if(k)pc=x+r;
    break;}
   case 51:
    if(c===64)return[7,l];
    C[c++]=x;pc=p[x-2]|p[x-1]<<8;break;
   case 52:
    if(c===0)return[8,l];
    pc=C[--c];break;
   case 64:{
    const v=D[s-1];
    if(v<0||v>255)return[6,l];
    D[s-1]=M[v];break;}
   case 65:{
    const v=D[s-1];
    if(v<0||v>255)return[6,l];
    M[v]=D[s-2];s-=2;break;}
   case 80:{
    const g=E.encode(String(D[s-1]));
    if(l+g.length>65536)return[11,l];
    B.set(g,l);l+=g.length;s--;break;}
   case 81:
    if(l+1>65536)return[11,l];
    B[l++]=D[--s]&255;break;
   case 82:D[s++]=i<q.length?q[i++]:-1;break;
   case 83:return[D[--s]&255,l];
   default:{
    const y=D[s-1],v=D[s-2];let r;
    if(b===16)r=v+y|0;
    else if(b===17)r=v-y|0;
    else if(b===18)r=Math.imul(v,y);
    else if(b===19){if(!y)return[4,l];r=v===-2147483648&&y===-1?v:(v/y)|0;}
    else if(b===20){if(!y)return[4,l];r=y===-1?0:v%y|0;}
    else if(b===21){if(!y)return[4,l];r=Math.floor((v>>>0)/(y>>>0))|0;}
    else if(b===22){if(!y)return[4,l];r=(v>>>0)%(y>>>0)|0;}
    else if(b===24)r=v&y;
    else if(b===25)r=v|y;
    else if(b===26)r=v^y;
    else if(b===28)r=v<<(y&31);
    else if(b===29)r=v>>(y&31);
    else if(b===30)r=(v>>>(y&31))|0;
    else if(b===32)r=v===y?1:0;
    else if(b===33)r=v<y?1:0;
    else r=v>>>0<y>>>0?1:0;
    D[s-2]=r;s--;
    break;}
  }
 }
}
const ID=process.env.MAKEFUN_INPUT_DIR??'/input',OD=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(ID).sort()){
 const[c,l]=run(readFileSync(join(ID,id,'program.bin')),readFileSync(join(ID,id,'input.bin')));
 mkdirSync(join(OD,id),{recursive:true});
 writeFileSync(join(OD,id,'stdout.bin'),B.subarray(0,l));
 writeFileSync(join(OD,id,'exit.txt'),c+'\n');
}
