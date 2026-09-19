/* Ordered centerline strokes adapted from KanjiVG (see CREDITS.txt). */
(()=>{
const glyphs=window.spellStrokes.map(g=>({character:g.character,strokes:g.strokes.map(d=>{const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);const length=path.getTotalLength(),points=[];for(let n=0;n<=Math.ceil(length*2);n++){const p=path.getPointAtLength(Math.min(length,n/2));points.push([p.x,p.y])}return {points,length}})}));
window.engraveTitle=(ctx,W,H,seconds,reduced)=>{
 if(seconds<0)return;
 const unit=Math.min(210,(W-32)/4.5,H*.29),gap=unit*.14,left=(W-(unit*4+gap*3))/2,top=H*.46-unit/2;
 let cursor=0;
 for(let i=0;i<glyphs.length;i++){
  const x=left+i*(unit+gap);ctx.save();ctx.translate(x,top);ctx.scale(unit/109,unit/109);ctx.strokeStyle='#08080b';ctx.lineCap='round';ctx.lineJoin='round';
  for(let k=0;k<glyphs[i].strokes.length;k++){
   const s=glyphs[i].strokes[k],duration=reduced?.075:.17+Math.min(.19,s.length*.0025),p=Math.max(0,Math.min(1,(seconds-cursor)/duration));cursor+=duration+(reduced?.01:.035);
   if(p<=0)continue;const count=Math.max(2,Math.ceil(p*(s.points.length-1))+1);
   // Pressure varies along each stroke; the spark follows its writing direction.
   for(let j=1;j<Math.min(count,s.points.length);j++){let ratio=j/(s.points.length-1);ctx.lineWidth=4.5*(.48+.52*Math.sin(Math.PI*Math.min(.95,ratio*.85+.08)));ctx.beginPath();ctx.moveTo(...s.points[j-1]);ctx.lineTo(...s.points[j]);ctx.stroke()}
   if(p<1&&!reduced){const head=s.points[Math.min(count-1,s.points.length-1)];ctx.save();ctx.shadowColor='#ed7414';ctx.shadowBlur=5;ctx.lineWidth=.5;
    for(let j=0;j<15;j++){const life=(seconds*3+j*.137)%1,a=j*2.39996,dist=life*(5+j%5*2),px=head[0]+Math.cos(a)*dist,py=head[1]+Math.sin(a)*dist+life*life*7;ctx.globalAlpha=1-life;ctx.strokeStyle='#c95b11';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-Math.cos(a)*1.7,py-Math.sin(a)*1.7);ctx.stroke()}
    ctx.globalAlpha=1;ctx.fillStyle='#fba62b';ctx.beginPath();ctx.arc(head[0],head[1],1.3,0,Math.PI*2);ctx.fill();ctx.restore();
   }
  }
  ctx.restore();cursor+=reduced?.06:.24;
 }
};
})();
