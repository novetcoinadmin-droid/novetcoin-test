/* Spark engraving follows the actual contours of the four rendered kanji. */
(()=>{
const size=224,glyphs=[];let ready=false;
function prepare(){
glyphs.length=0;
for(const character of '黒天終焔'){
 const mask=document.createElement('canvas');mask.width=mask.height=size;
 const m=mask.getContext('2d',{willReadFrequently:true});m.fillStyle='#09090b';m.font='600 180px "Noto Serif JP", "Yu Mincho", serif';m.textAlign='center';m.textBaseline='middle';m.fillText(character,size/2,size/2);
 const pixels=m.getImageData(0,0,size,size).data;
 const inside=(x,y)=>x>=0&&y>=0&&x<size&&y<size&&pixels[(y*size+x)*4+3]>80;
 const edges=new Map(),key=(x,y)=>y*(size+1)+x;
 function edge(x,y,a,b){const k=key(x,y);if(!edges.has(k))edges.set(k,[]);edges.get(k).push([a,b])}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(inside(x,y)){
  if(!inside(x,y-1))edge(x,y,x+1,y);
  if(!inside(x+1,y))edge(x+1,y,x+1,y+1);
  if(!inside(x,y+1))edge(x+1,y+1,x,y+1);
  if(!inside(x-1,y))edge(x,y+1,x,y);
 }
 const paths=[];
 while(edges.size){const first=edges.keys().next().value;let x=first%(size+1),y=Math.floor(first/(size+1)),points=[[x,y]];
  for(let guard=0;guard<size*size*4;guard++){let k=key(x,y),list=edges.get(k);if(!list)break;[x,y]=list.pop();if(!list.length)edges.delete(k);points.push([x,y]);if(key(x,y)===first)break}
  if(points.length>8)paths.push(points);
 }
 paths.sort((a,b)=>b.length-a.length);
 const layer=document.createElement('canvas');layer.width=layer.height=size;
 glyphs.push({mask,layer,paths,total:paths.reduce((n,p)=>n+p.length,0)});
}
ready=true;
}
// Use the loaded page font when available; offline systems still have a serif fallback.
prepare();document.fonts?.ready.then(prepare);
window.engraveTitle=(ctx,W,H,seconds,reduced)=>{
 if(!ready||seconds<0)return;
 const unit=Math.min(210,(W-32)/4.5,H*.29),gap=unit*.14,left=(W-(unit*4+gap*3))/2,top=H*.46-unit/2;
 const duration=reduced?.9:1.65,spacing=reduced?.65:1.3;
 for(let i=0;i<4;i++){
  const age=seconds-i*spacing,p=Math.max(0,Math.min(1,age/duration));if(p<=0)continue;
  const g=glyphs[i],c=g.layer.getContext('2d');c.clearRect(0,0,size,size);c.globalCompositeOperation='source-over';c.strokeStyle='#08080a';c.lineWidth=16;c.lineCap='round';c.lineJoin='round';
  let remaining=p*g.total,head=null;
  for(const points of g.paths){const count=Math.min(points.length,Math.max(0,Math.floor(remaining)));if(count>1){c.beginPath();c.moveTo(...points[0]);for(let j=1;j<count;j++)c.lineTo(...points[j]);c.stroke();head=points[count-1]}remaining-=points.length;if(remaining<=0)break}
  // A glyph mask clips the burn to the real strokes, leaving the counters white.
  c.globalCompositeOperation='destination-in';c.drawImage(g.mask,0,0);c.globalCompositeOperation='source-over';
  if(p>.87){c.globalAlpha=(p-.87)/.13;c.drawImage(g.mask,0,0);c.globalAlpha=1}
  const x=left+i*(unit+gap);ctx.drawImage(g.layer,x,top,unit,unit);
  if(head&&p<1&&!reduced){const hx=x+head[0]/size*unit,hy=top+head[1]/size*unit;
   ctx.save();ctx.lineWidth=1.2;ctx.shadowColor='#ff7400';ctx.shadowBlur=9;
   for(let j=0;j<18;j++){let life=((seconds*2.4+j*.137)%1),a=j*2.39996+i,dist=life*(12+j%7*4),px=hx+Math.cos(a)*dist,py=hy+Math.sin(a)*dist+life*life*18;ctx.globalAlpha=(1-life)*.85;ctx.strokeStyle=j%3?'#d75b0b':'#9c3514';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-Math.cos(a)*3,py-Math.sin(a)*3);ctx.stroke()}
   ctx.globalAlpha=1;ctx.fillStyle='#f49b27';ctx.beginPath();ctx.arc(hx,hy,2.1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff8da';ctx.fillRect(hx-.7,hy-.7,1.4,1.4);ctx.restore();
  }
 }
};
})();
