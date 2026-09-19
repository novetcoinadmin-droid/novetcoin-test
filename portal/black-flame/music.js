/* Original 124-second instrumental composition, independent of typing pitch. */
(()=>{
const track=new Audio('liturgy.mp3?v=score2');track.loop=true;track.preload='auto';track.volume=.72;
let fading=0,releaseTimer=0,active=false;
function cancel(){clearInterval(fading);clearTimeout(releaseTimer)}
function play(){if(!soundOn||document.hidden)return;track.play().catch(()=>{document.getElementById('sound').textContent='音響・BGM 再生を再試行'})}
function start(){cancel();active=true;track.currentTime=0;track.volume=.72;play()}
function release(n){cancel();active=false;const hold=n===20?(fx.reduced?4:8):1.5;releaseTimer=setTimeout(()=>{const initial=track.volume,at=performance.now(),duration=n===20?4500:2500;fading=setInterval(()=>{const p=Math.min(1,(performance.now()-at)/duration);track.volume=initial*(1-p);if(p===1){clearInterval(fading);track.pause()}},40)},hold*1000)}
window.liturgyMusic={start,release,toggle(){if(!soundOn){track.pause();return}if(mode==='playing'||mode==='idle'){active=true;track.volume=.72;play()}else if(mode==='casting'){track.volume=.5;play();release(fx.level)}}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)track.pause();else if(active&&soundOn)play()});
})();
