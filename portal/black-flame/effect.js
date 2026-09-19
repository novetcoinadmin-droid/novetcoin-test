/* Four living backgrounds, continuously blended in both palette and motion. */
(()=>{
const canvas=document.getElementById('fire'),gl=canvas.getContext('webgl',{alpha:false,antialias:false});
if(!gl){canvas.style.background='radial-gradient(ellipse at 50% 40%,#4b1b0e,#09090c 75%)';return}
const vs='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const fs=`precision highp float;
uniform vec2 res;uniform vec4 phases;uniform float time,level,burst,reduced;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float f=0.,a=.5;for(int i=0;i<4;i++){f+=a*noise(p);p=p*2.03+vec2(3.1,1.7);a*=.5;}return f;}
void main(){
vec2 uv=gl_FragCoord.xy/res,q=(uv-vec2(.5,.61))*vec2(res.x/res.y,1.);
float r=length(q),ang=atan(q.y,q.x),t=time*mix(1.,.15,reduced);
float haze=fbm(q*3.+vec2(t*.018,-t*.027));
// Red: restrained, rising tongues of fire across the lower field.
float sway=sin(uv.y*5.-t*.65)*.07+sin(t*.31+uv.x*8.)*.03;
float smoke=fbm(vec2((uv.x+sway)*5.5,uv.y*4.-t*.22));
float tongues=pow(max(0.,smoke-.25),1.5)*(1.-smoothstep(.06,.8,uv.y));
vec3 red=vec3(.047,.008,.009)+vec3(.75,.115,.018)*tongues*2.5;
red+=vec3(.18,.023,.007)*exp(-uv.y*3.)*(.65+.35*haze);
// Blue: spiral crests travel inward; the rotation is deliberately slow.
float spiral=r*24.+ang*3.+t*.43+haze*1.5;
float crest=pow(.5+.5*sin(spiral),5.);
float spiral2=pow(.5+.5*sin(r*37.+ang*5.+t*.58),10.);
float funnel=smoothstep(.018,.18,r)*exp(-r*.6);
vec3 blue=vec3(.005,.038,.115)+vec3(.025,.26,.64)*(crest*.66+spiral2*.22)*funnel;
blue+=vec3(.012,.09,.22)*haze;
blue*=.35+.65*smoothstep(.025,.17,r);
// White: soft fronts emerge at the perimeter and spread inward.
float edge=max(abs(uv.x-.5)*2.,abs(uv.y-.5)*2.);
float front=.5+.5*sin(edge*8.+t*.22+haze*.8);
float whiteLight=.18+.56*smoothstep(.05,1.,edge)+.14*front;
vec3 white=vec3(.91,.95,1.)*whiteLight+vec3(.08)*haze;
// Black: broad white and black ripples slowly converge on the same center.
float ripple=.5+.5*cos(r*29.+t*.55+haze*.7);
float luminous=pow(smoothstep(.18,.98,ripple),2.);
float core=smoothstep(.035,.15,r);
vec3 black=mix(vec3(.006,.007,.012),vec3(.84,.87,.91),luminous*.8*core);
black+=vec3(.035,.04,.05)*haze*core;
vec3 col=red*phases.x+blue*phases.y+white*phases.z+black*phases.w;
// The release continues from the current mixture rather than switching hues.
float impact=burst>0.?smoothstep(.3,1.5,burst)*exp(-max(0.,burst-2.)*.55):0.;
vec3 hue=vec3(.8,.14,.025)*phases.x+vec3(.09,.42,1.)*phases.y+vec3(.9,.94,1.)*(phases.z+phases.w);
col+=hue*impact*.13*exp(-r*.9);
col*=1.-.13*length(uv-.5);
gl_FragColor=vec4(col,1.);
}`;
function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
const u={};for(const k of ['res','phases','time','level','burst','reduced'])u[k]=gl.getUniformLocation(program,k);
let last=0,weights=[1,0,0,0],power=1;
function draw(now){requestAnimationFrame(draw);if(now-last<(fx.reduced?65:30))return;const dt=Math.min(.1,(now-last)/1000);last=now;
const phase=Math.min(3,Math.floor(Math.max(0,fx.level-1)/5));
// A four-second dissolve preserves the current mixture even if a stage ends mid-transition.
const blend=1-Math.exp(-dt/1.35);weights=weights.map((w,i)=>w+((i===phase?1:0)-w)*blend);power+=(fx.level-power)*blend;
const scale=Math.min(devicePixelRatio,1.25),w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
gl.uniform2f(u.res,w,h);gl.uniform4f(u.phases,...weights);gl.uniform1f(u.time,now/1000);gl.uniform1f(u.level,power);gl.uniform1f(u.burst,fx.cast?(now-fx.cast)/1000:0);gl.uniform1f(u.reduced,fx.reduced?1:0);gl.drawArrays(gl.TRIANGLES,0,6)}requestAnimationFrame(draw);
})();
