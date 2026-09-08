/* Pointer state only: shared by the browser controls and their input checks. */
(function(root) {
  'use strict';
  class MobileInput {
    constructor() { this.reset(); this.charge = 0; }
    reset() { this.left = null; this.right = null; this.lastTap = -10000; this.boostUntil = 0; }
    zone(x,y,previous) {
      if (Math.abs(x)>1.15 || Math.abs(y)>1.15) return 'outside';
      // A small overlap prevents jitter at the edge of a held region.
      if (previous==='left' && x<-.35 && Math.abs(y)<Math.abs(x)*1.25) return 'left';
      if (previous==='right' && x>.35 && Math.abs(y)<Math.abs(x)*1.25) return 'right';
      if (previous==='brake' && y>.35 && y>Math.abs(x)*.9) return 'brake';
      if (previous==='punch' && y<-.35 && -y>Math.abs(x)*1.2) return 'punch';
      if (y>.44 && y>Math.abs(x)*.9) return 'brake';
      if (y<-.44 && -y>Math.abs(x)*1.2) return 'punch';
      if (x<-.44) return 'left';
      if (x>.44) return 'right';
      return 'gas';
    }
    down(id,side,x,y,now) {
      if (this[side]) return false;
      const zone=side==='right'?this.zone(x,y):'';
      this[side]={id,x,y,startX:x,startY:y,start:now,moved:false,zone,gas:zone==='gas',tap:zone==='gas'};
      if(side==='right' && zone==='gas' && now-this.lastTap<=320 && this.charge>0) {this.boostUntil=now+180;this.lastTap=-10000;this.right.tap=false;}
      return true;
    }
    move(id,x,y) {
      const g=this.left?.id===id?this.left:this.right?.id===id?this.right:null;
      if(!g)return;
      g.x=x;g.y=y;if(Math.hypot(x-g.startX,y-g.startY)>.12)g.moved=true;
      if(g===this.right){g.zone=this.zone(x,y,g.zone);if(g.zone==='gas')g.gas=true;if(g.zone==='brake'||g.zone==='outside')g.gas=false;}
    }
    up(id,now,cancel=false) {
      if(this.left?.id===id)this.left=null;
      if(this.right?.id===id){const g=this.right;if(!cancel && g.tap && !g.moved && g.zone==='gas' && now-g.start<240)this.lastTap=now;else this.lastTap=-10000;this.right=null;this.boostUntil=0;}
    }
    packet(now) {
      const buttons=Array(16).fill(0),axes=[0,0,0,0],l=this.left,r=this.right;
      if(l && Math.abs(l.x)<=1.15 && Math.abs(l.y)<=1.15){buttons[14]=l.x<-.12?1:0;buttons[15]=l.x>.12?1:0;}
      if(r && r.zone!=='outside'){
        buttons[7]=r.gas && r.zone!=='brake'?1:0;
        axes[2]=r.zone==='left'?-1:r.zone==='right'?1:0;
        buttons[3]=r.zone==='punch'?1:0;
        // Existing reverse input brakes forward motion, then engages reverse at rest.
        buttons[1]=r.zone==='brake'?1:0;
        buttons[2]=buttons[7] && now<this.boostUntil?1:0;
      }
      return {connected:true,axes,buttons};
    }
  }
  root.NovetMobileInput=MobileInput;
  if(typeof module!=='undefined')module.exports=MobileInput;
})(typeof window!=='undefined'?window:globalThis);
