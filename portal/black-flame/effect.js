(()=>{const canvas=document.getElementById('fire'),gl=canvas.getContext('webgl',{alpha:false,antialias:false});if(!gl){canvas.style.background='radial-gradient(ellipse at 70% 38%,#552011,transparent 65%)';return}
const vs='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const fs=`precision highp float;
uniform vec2 res;uniform float time,level,burst,reduced;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float f=0.,a=.5;for(int i=0;i<5;i++){f+=a*noise(p);p=p*2.03+vec2(3.1,1.7);a*=.5;}return f;}
void main(){vec2 uv=gl_FragCoord.xy/res;vec2 p=(gl_FragCoord.xy-.5*res)/res.y;float t=time*mix(1.,.2,reduced);float phase=level<5.5?0.:level<10.5?1.:level<15.5?2.:3.;vec3 hue=phase<.5?vec3(1.,.20,.025):phase<1.5?vec3(.055,.42,1.):phase<2.5?vec3(.85,.86,1.):vec3(.4,.22,.65);
float impact=burst>0.?smoothstep(.65,1.6,burst)*exp(-max(0.,burst-2.)*.47):0.;float gather=burst>0.?sin(min(burst/.8,1.)*1.57):0.;float strength=.4+level*.035;
vec2 center=burst>0.&&burst<8.5?vec2(0.,.11):vec2(.15*res.x/res.y,.12);vec2 q=p-center;float r=length(q);float ang=atan(q.y,q.x);float n=fbm(vec2(ang*3.,r*7.-t));float radius=.19+strength*.09+impact*.25;
float corona=exp(-abs(r-radius-(n-.5)*.07)*48.);float halo=exp(-abs(r-radius)*9.);float flames=fbm(vec2(q.x*5.,q.y*3.-t*.65)+fbm(q*4.+t*.2));float column=pow(max(0.,1.-abs(q.x)/(max(.06,.25-q.y*.16)+impact*.4)),2.);float flame=column*smoothstep(.25,.8,flames)*smoothstep(-.6,-.2,q.y)*(1.-smoothstep(.1,.65+impact*.4,q.y));
vec3 col=vec3(.025,.025,.04)+hue*(halo*.08+flame*strength*1.7+corona*.8);
float rings=0.;for(int i=0;i<3;i++){float ri=radius+.085+float(i)*.027;float dash=step(.3,sin(ang*(24.+float(i)*12.)+t*(float(i)-1.)*.3));rings+=exp(-abs(r-ri)*600.)*dash;}col+=hue*rings*.22;
for(int i=0;i<45;i++){float fi=float(i);vec2 s=vec2(hash(vec2(fi,2.)),hash(vec2(fi,4.)));vec2 pos=vec2((s.x-.5)*2.,mod(s.y+t*(.02+s.x*.055),1.4)-.7);pos.x+=sin(pos.y*4.+fi+t)*.05;float d=length(p-pos);col+=hue*min(.4,.000012/(d*d+.00003))*strength;}
if(phase>2.5){float hole=1.-smoothstep(radius-.05,radius+.004,r);col*=1.-hole*.99;col+=vec3(.5,.4,.65)*corona*.3;}
if(burst>0.){float wave=abs(r-(burst-.65)*.62);col+=hue*exp(-wave*55.)*impact*1.3;col+=hue*impact*(.15+flames*.3);if(phase>2.5)col*=1.-smoothstep(r-.12,r+.12,impact*1.2)*.92;if(level<.5)col*=.5;}
col*=1.-.3*length(uv-.5);gl_FragColor=vec4(col,1.);}`;
function compile(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}let program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);let a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);const u={};for(const k of ['res','time','level','burst','reduced'])u[k]=gl.getUniformLocation(program,k);let last=0;function draw(now){requestAnimationFrame(draw);if(now-last<(fx.reduced?65:30))return;last=now;const scale=Math.min(devicePixelRatio,1.25),w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}gl.uniform2f(u.res,w,h);gl.uniform1f(u.time,now/1000);gl.uniform1f(u.level,fx.level);gl.uniform1f(u.burst,fx.cast?(now-fx.cast)/1000:0);gl.uniform1f(u.reduced,fx.reduced?1:0);gl.drawArrays(gl.TRIANGLES,0,6)}requestAnimationFrame(draw)})();


