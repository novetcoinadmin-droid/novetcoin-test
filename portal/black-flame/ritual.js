/* A growing ritual, driven by completed typing stages rather than a separate animation demo. */
(()=>{
const canvas=document.getElementById('sigils'),ctx=canvas.getContext('2d');
const palette=['255,88,43','66,173,255','237,241,255','232,226,249'];
const TAU=Math.PI*2;let last=0,displayCount=0,W=0,H=0;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function color(n,a=1){return 'rgba('+palette[Math.min(3,Math.floor(Math.max(0,n-1)/5))]+','+clamp(a)+')'}
function line(x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function circle(r){ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke()}
function polygon(r,n,rotation=0,step=1){ctx.beginPath();for(let i=0;i<=n;i++){let a=rotation+i*TAU/n*step;let x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
function seal(x,y,r,tilt,n,t,opacity,black=false){ctx.save();ctx.translate(x,y);ctx.scale(1,tilt);ctx.rotate(t*(n%2?1:-1)*.06+n*.47);ctx.strokeStyle=color(n,opacity);ctx.lineWidth=1.15;ctx.shadowColor=color(n,.7);ctx.shadowBlur=7;circle(r);circle(r*.93);circle(r*.72);polygon(r*.7,6,t*.035,2);polygon(r*.56,4,-t*.04);circle(r*.3);
for(let k=0;k<32;k++){let a=k*TAU/32;ctx.save();ctx.rotate(a);line(r*.79,0,r*.88,0);if(k%2===0){line(r*.81,-3,r*.86,-3);line(r*.83,-3,r*.83,4)}ctx.restore()}
for(let k=0;k<6;k++){ctx.save();ctx.rotate(k*TAU/6);ctx.translate(r*.6,0);circle(4);ctx.restore()}if(black){ctx.globalCompositeOperation='source-over';ctx.fillStyle='#030307';ctx.beginPath();ctx.arc(0,0,r*.27,0,TAU);ctx.fill();ctx.strokeStyle='#f0edff';ctx.shadowBlur=15;circle(r*.29)}ctx.restore()}
function particles(cx,cy,n,t,power,inward=false){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<180;i++){let a=i*2.39996;let speed=60+(i*47%250);let elapsed=t+(i%9)*.025;let distance=inward?Math.max(0,550-elapsed*speed):elapsed*speed;let x=cx+Math.cos(a)*distance,y=cy+Math.sin(a)*distance*.72;let opacity=clamp(1-elapsed/4)*(0.4+(i%6)/10);ctx.strokeStyle=color(n,opacity);ctx.lineWidth=i%4===0?2:1;line(x,y,x-Math.cos(a)*(7+power*25),y-Math.sin(a)*(7+power*25))}ctx.restore()}
function shock(cx,cy,r,n,a,wide=2){ctx.save();ctx.translate(cx,cy);ctx.strokeStyle=color(n,a);ctx.shadowColor=color(n);ctx.shadowBlur=25;ctx.lineWidth=wide;circle(Math.max(1,r));ctx.restore()}
function beam(cx,cy,width,n,alpha){ctx.save();let g=ctx.createLinearGradient(cx-width,0,cx+width,0);g.addColorStop(0,color(n,0));g.addColorStop(.45,color(n,alpha));g.addColorStop(.5,'rgba(255,249,235,'+clamp(alpha)+')');g.addColorStop(.55,color(n,alpha));g.addColorStop(1,color(n,0));ctx.fillStyle=g;ctx.fillRect(cx-width,0,width*2,H);ctx.restore()}
function motif(n,cx,cy,t,envelope){ctx.save();ctx.strokeStyle=color(n,envelope);ctx.lineWidth=2;ctx.shadowColor=color(n);ctx.shadowBlur=18;
// The blood opens the ground; the fourth seal sends its fire across it.
if(n<=4){let paths=n*3;for(let j=0;j<paths;j++){let a=j*TAU/paths;ctx.beginPath();ctx.moveTo(cx,cy);for(let k=1;k<9;k++){let d=k*22*t;ctx.lineTo(cx+Math.cos(a)*d+Math.sin(k*7+j)*12,cy+Math.sin(a)*d*.4+k*5)}ctx.stroke()}}
// Bells propagate in great concentric waves.
if(n===5||n===10||n===15){for(let i=0;i<n/5+2;i++)shock(cx,cy,Math.max(0,t-i*.25)*210,n,envelope/(i+1),3)}
// Seven broken crowns orbit the judgment. Each consists of angular sigils.
if(n===8){for(let i=0;i<7;i++){let a=i*TAU/7;ctx.save();ctx.translate(cx+Math.cos(a)*(110+t*40),cy+Math.sin(a)*(110+t*40)*.65);ctx.rotate(a+t*.3);ctx.beginPath();ctx.moveTo(-22,12);ctx.lineTo(-27,-15);ctx.lineTo(-10,0);ctx.lineTo(0,-25);ctx.lineTo(10,0);ctx.lineTo(27,-15);ctx.lineTo(22,12);ctx.stroke();ctx.restore()}}
if(n===9||n===10){let tilt=Math.sin(Math.min(t,2)*1.5)*.15;ctx.save();ctx.translate(cx,cy);line(0,-100,0,90);line(-40,90,40,90);ctx.rotate(tilt);line(-135,-65,135,-65);for(const x of [-120,120]){line(x,-65,x-35,15);line(x,-65,x+35,15);ctx.beginPath();ctx.ellipse(x,15,35,13,0,0,Math.PI);ctx.stroke()}ctx.restore()}
if(n===11){for(let j=0;j<9;j++){let x=cx+(j-4)*55;line(x,0,x+Math.sin(j*2+t)*35,cy-20)}}
if(n===12||n===13){for(let j=0;j<36;j++){let x=(j*137)%W,y=(j*53+t*(100+j%5*25))%H;line(x,y,x-4,y+25)}}
if(n===14||n===15){for(let j=0;j<16;j++){let y=cy+20+j*j*2;line(cx-30-j*16,y,cx+30+j*16,y)}line(cx-30,cy,cx-300,H);line(cx+30,cy,cx+300,H)}
ctx.restore()}
// Final ritual: turn toward the viewer, gather, release, then burn scattered remnants.
function finale(elapsed,reduced){
const v=reduced?elapsed*13/7:elapsed,cx=W*.5,cy=H*.46,base=Math.min(W*.32,H*.31,285);
ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=clamp(v/.7);ctx.fillStyle='#030305';ctx.fillRect(0,0,W,H);
if(v<6.5){
 // Pale tongues of fire breathe over a black field.
 for(let i=0;i<32;i++){const x=(i+.5)/32*W,flow=v*(reduced?.22:1),height=H*(.13+.13*(.5+.5*Math.sin(i*7.13+flow*.6))),sway=Math.sin(i*2.7+flow*.8)*28,w=18+i%5*7;
 const g=ctx.createLinearGradient(x,H,x,H-height);g.addColorStop(0,'rgba(225,232,243,.03)');g.addColorStop(.55,'rgba(241,244,255,.19)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-w,H);ctx.bezierCurveTo(x-w+sway,H-height*.3,x+sway*1.8,H-height*.55,x+sway,H-height);ctx.bezierCurveTo(x+sway+w,H-height*.4,x+w,H-height*.2,x+w,H);ctx.fill();
 }
 const face=clamp(v/2.8),turn=face*face*(3-2*face),charge=clamp((v-2.4)/3.4);
 for(let j=0;j<20;j++){const r=base*(.44+j*.026)*(1-charge*.18),y=cy+(9.5-j)*10*(1-turn);seal(cx,y,r,.30+.70*turn,j%2?20:15,v,.22+.31*turn,false)}
 const inwardTime=Math.max(0,v-1.3);
 if(v>1.3){ctx.save();ctx.strokeStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=9;for(let i=0;i<(reduced?30:240);i++){let a=i*2.399963,birth=(i%40)/40*2.6,travel=clamp((inwardTime-birth)/2.5);if(travel<=0||travel>=1)continue;let far=Math.hypot(W,H)*(.42+(i%7)*.035),d=far*Math.pow(1-travel,1.7),x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d;ctx.globalAlpha=Math.sin(travel*Math.PI);ctx.lineWidth=i%5===0?2:1;line(x,y,x+Math.cos(a)*(3+travel*17),y+Math.sin(a)*(3+travel*17))}ctx.restore()}
 const core=8+charge*charge*62,g=ctx.createRadialGradient(cx,cy,0,cx,cy,core*2);g.addColorStop(0,'rgba(255,255,255,'+charge+')');g.addColorStop(.28,'rgba(255,255,255,'+charge*.9+')');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(cx-core*2,cy-core*2,core*4,core*4);
}
if(v>=5.9){
 const release=clamp((v-5.9)/.65),reach=Math.hypot(W,H)*release*release;
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,cy,Math.max(1,reach),0,TAU);ctx.fill();
 if(v>=6.55)ctx.fillRect(0,0,W,H);
 {
  // Separate islands linger across the screen. Every edge burns inward independently.
  for(let i=0;i<27;i++){const seed=((Math.sin(i*127.1+311.7)*43758.5453)%1+1)%1,x=(.04+((i*.618034)%1)*.92)*W,y=(.04+((i*.381966+i*i*.071)%1)*.92)*H,start=6.55+(i%6)*.2,life=clamp((v-start)/(3.2+(i%5)*.35)),r=Math.min(W,H)*(.035+(i%5)*.015)*Math.pow(1-life,1.1);if(r<.1)continue;
   ctx.fillStyle='#030305';ctx.beginPath();for(let k=0;k<=72;k++){let a=k*TAU/72,rough=1+.16*Math.sin(a*7+i)+.1*Math.sin(a*13-i),px=x+Math.cos(a)*r*rough,py=y+Math.sin(a)*r*rough*.7;k?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fill();
   if(!reduced){for(let j=0;j<10;j++){let a=j*2.39996+i,drift=((v*.8+j*.117+seed)%1),rr=r+drift*22;ctx.fillStyle='rgba(90,88,85,'+(1-drift)*.6+')';ctx.fillRect(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.7-drift*12,1.5*(1-drift),1.5*(1-drift))}}
  }
 }
}
ctx.restore();
if(elapsed<(reduced?14:28))window.engraveTitle?.(ctx,W,H,elapsed-(reduced?7.7:14),reduced);
document.body.style.setProperty('--release-opacity',String(1-clamp((v-2.2)/2)));
}
function frame(now){requestAnimationFrame(frame);if(now-last<(fx.reduced?60:30))return;const dt=Math.min(.1,(now-last)/1000);last=now;const dpr=Math.min(devicePixelRatio,1.5);W=innerWidth;H=innerHeight;if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
let casting=!!fx.cast,elapsed=casting?(now-fx.cast)/1000:0;const end=fx.level===20?(fx.reduced?14:28):(fx.reduced?2.5:6.5+fx.level*.09);let active=casting&&elapsed<end;let t=now/1000*(fx.reduced?.15:1);let n=casting?fx.level:fx.completed;let count=casting?n:n+fx.progress;displayCount+=(count-displayCount)*Math.min(1,dt*8);let cx=active?W*.5:W*(W<700?.60:.65);const area=document.querySelector('.stage-view').getBoundingClientRect();let cy=active?H*.39:area.top+area.height*.5-65+displayCount*4;let radius=Math.min(W*.31,215);let pulse=Math.exp(-Math.max(0,now-fx.pulse)/550);let v=active?(fx.reduced?elapsed*2.6:elapsed):0;
if(casting&&n===20){finale(elapsed,fx.reduced);return;}
// Twenty independent rotating seals, held in a vertical column.
let layers=Math.ceil(displayCount);let compression=active?1-.65*clamp(v/1.35):1;
for(let j=0;j<Math.max(1,layers);j++){let opacity=j<Math.floor(displayCount)?.55:.15+.4*(displayCount%1);let y=cy+80-(j*11)*compression;let r=radius*(.58+.018*j);seal(cx,y,r,.30+(active?.11:0),j+1,t,opacity+(active?.2:0),j>=15);}
if(!casting&&n>0)shock(cx,cy+80,radius*.6+pulse*100,n,pulse*.4,1);
// An unfinished circle follows actual typing progress.
if(!casting){ctx.save();ctx.translate(cx,cy+93);ctx.scale(1,.35);ctx.strokeStyle=color(fx.level,.8);ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,radius*.63,-Math.PI/2,-Math.PI/2+fx.progress*TAU);ctx.stroke();ctx.restore()}
if(!active)return;
let power=n/20,impact=clamp((v-1.35)/.5),fade=1-clamp((v-4.8)/2.5);let env=impact*fade;
if(n===0){shock(cx,cy+80,8+v*5,1,Math.exp(-v));return}
// Convergence remains visible even before the release: error starts the reward immediately.
if(v<1.7){particles(cx,cy+30,n,v,.1,true);beam(cx,cy,8+power*12,n,.12);return}
let u=v-1.35;
if(!fx.reduced&&n>=10){let tremor=Math.sin(u*33)*Math.exp(-u*1.1)*power*4;ctx.translate(tremor,0)}
if(n<=15){beam(cx,cy,15+power*160,n,env*.75);particles(cx,cy,n,u,power);for(let j=0;j<1+Math.floor(n/3);j++)shock(cx,cy,(u-j*.12)*(115+n*9),n,env/(1+j*.5),2+power*5);motif(n,cx,cy,u,env);}
if(n>=16){let r=(90+power*65)*clamp(u);ctx.save();ctx.translate(cx,cy);let halo=ctx.createRadialGradient(0,0,r*.7,0,0,r*1.5);halo.addColorStop(0,'rgba(240,235,255,0)');halo.addColorStop(.5,'rgba(240,235,255,'+env*.5+')');halo.addColorStop(1,'rgba(240,235,255,0)');ctx.fillStyle=halo;ctx.fillRect(-r*2,-r*2,r*4,r*4);ctx.fillStyle='#020206';ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.restore();particles(cx,cy,n,u,power,true);
let rings=n-14;for(let j=0;j<rings;j++){let angle=j*TAU/rings+t*.09;let x=cx+Math.cos(angle)*r*.9,y=cy+Math.sin(angle)*r*.5;seal(x,y,r*.6,.4,j%2?20:15,t,env*.85,j%2===1)}shock(cx,cy,r,15,env,2);
if(n>=17){for(let j=0;j<Math.min(n-15,3);j++){let a=j*2.1+t*.2,d=Math.max(0,260-u*70);shock(cx+Math.cos(a)*d,cy+Math.sin(a)*d,10+j*7,15,env)}}
if(n>=19){shock(cx,cy,u*220,15,env*.65,2);ctx.fillStyle='rgba(0,0,4,'+env*.35+')';ctx.fillRect(0,0,W,H)}
if(n===20){beam(cx,cy,5+clamp(u-1.2)*60,15,env*.75);for(let j=0;j<8;j++)seal(cx,cy+(j-3.5)*23,140+j*9,.32,j%2?20:15,t,env,j%2===1);shock(cx,cy,Math.max(0,u-1.5)*420,15,env*.8,5)}
}
}
requestAnimationFrame(frame);
window.ritualSound=n=>{if(!soundOn)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();const at=audio.currentTime,delay=fx.reduced?.5:1.35;let o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(90+n*2,at);o.frequency.exponentialRampToValueAtTime(28,at+delay+2);g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(.22,at+delay);g.gain.exponentialRampToValueAtTime(.001,at+delay+4);o.connect(g).connect(audio.destination);o.start();o.stop(at+delay+4);let buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);let source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=350+n*65;gain.gain.value=.1+n*.006;source.connect(filter).connect(gain).connect(audio.destination);source.start(at+delay)}catch{}};
})();

