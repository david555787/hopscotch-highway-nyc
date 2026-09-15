/* Illustrated sprite renderer. World positions and collision rules stay in the game. */
window.createHighwayArt = function(g) {
  const {ctx,state,project,laneFor,playerPosition,entityX,trainProgress,rand}=g;
  const atlas=new Image(); atlas.src='world-atlas.png';
  let sprites=[];
  const start=document.querySelector('#play');start.disabled=true;start.textContent='Loading artwork…';
  atlas.onerror=()=>{start.textContent='Artwork could not load — refresh';};
  atlas.onload=()=>{
    // Trim each transparent atlas cell once, retaining the original generated art.
    const scratch=document.createElement('canvas');scratch.width=atlas.width;scratch.height=atlas.height;
    const s=scratch.getContext('2d');s.drawImage(atlas,0,0);const pixels=s.getImageData(0,0,atlas.width,atlas.height).data;
    const cw=atlas.width/3,ch=atlas.height/2;
    sprites=Array.from({length:6},(_,i)=>{
      const ox=Math.round(i%3*cw),oy=Math.round(Math.floor(i/3)*ch);let l=cw,t=ch,r=0,b=0;
      for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){if(pixels[((oy+y)*atlas.width+ox+x)*4+3]>30){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
      return {x:ox+l,y:oy+t,w:r-l+1,h:b-t+1};
    });
    start.disabled=false;start.textContent=state.round===1?'Start round':'Play next round';
  };
  function polygon(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
  function ground(y,fill){polygon([project(-22,y-.5),project(22,y-.5),project(22,y+.5),project(-22,y+.5)],fill);}
  function line(x1,y1,x2,y2,color,width=1){const a=project(x1,y1),b=project(x2,y2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function shadow(x,y,w,h,alpha=.2){const p=project(x,y);ctx.save();ctx.translate(p.x+4,p.y+3);ctx.scale(w,h);const gradient=ctx.createRadialGradient(0,0,0,0,0,1);gradient.addColorStop(0,`rgba(19,47,39,${alpha})`);gradient.addColorStop(1,'rgba(19,47,39,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();}
  function sprite(i,x,y,width,z=0,flip=false,angle=0){const r=sprites[i];if(!r)return;const p=project(x,y,z),h=width*r.h/r.w;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);if(flip)ctx.scale(-1,1);ctx.drawImage(atlas,r.x,r.y,r.w,r.h,-width/2,-h,width,h);ctx.restore();}
  function coin(x,y){const p=project(x,y,.3+Math.sin(state.time*3+x)*.08);const w=g.metrics().tileW*.115;ctx.save();ctx.shadowColor='#ffe28a';ctx.shadowBlur=10;const grad=ctx.createLinearGradient(p.x-w,p.y-w,p.x+w,p.y+w);grad.addColorStop(0,'#fff9b1');grad.addColorStop(.4,'#ffdb51');grad.addColorStop(1,'#d68b0b');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(p.x,p.y,w,w*1.15,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#b57914';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff8ce';ctx.font=`bold ${w*1.6}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',p.x,p.y);ctx.restore();}
  function terrain(lane){
    const {tileW, tileH}=g.metrics(),y=lane.y;
    if(lane.type==='grass'){
      const p=project(0,y+.5),q=project(0,y-.5);const grad=ctx.createLinearGradient(0,p.y,0,q.y);grad.addColorStop(0,y%2?'#97ce63':'#a7d873');grad.addColorStop(1,y%2?'#8dc65c':'#9ed169');ground(y,grad);
      for(let i=0;i<80;i++){const x=rand(y,i+140)*32-16,yy=y+rand(y,i+260)*.94-.47;const a=project(x,yy);ctx.strokeStyle=i%3?'rgba(46,109,40,.2)':'rgba(242,255,183,.48)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x-2,a.y);ctx.lineTo(a.x-3,a.y-3);ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+1,a.y-4);ctx.stroke();}
      for(let i=0;i<5;i++){const x=rand(y,i+390)*16-8;if(Math.abs(x)<.55||lane.blockers.some(b=>Math.abs(b-x)<.6))continue;const p=project(x,y+rand(y,i+410)*.7-.35);ctx.fillStyle=i%2?'#fffce5':'#ffdb87';for(let j=0;j<5;j++){ctx.beginPath();ctx.arc(p.x+Math.cos(j*1.26)*2,p.y+Math.sin(j*1.26)*2,1.7,0,7);ctx.fill();}ctx.fillStyle='#e7a72b';ctx.fillRect(p.x-1,p.y-1,2,2);}
    } else if(lane.type==='road'){
      ground(y,'#566474');for(let i=0;i<70;i++){const p=project(rand(y,i+510)*32-16,y+rand(y,i+610)-.5);ctx.fillStyle='rgba(216,229,235,.12)';ctx.fillRect(p.x,p.y,1.2,1.2);}
      line(-22,y-.46,22,y-.46,'#d3d7c5',2.5);line(-22,y+.46,22,y+.46,'#e8e9d8',2.5);
      for(let x=-22;x<22;x+=1.3)line(x,y,x+.6,y,'#e6e7d5',2);
    } else if(lane.type==='river'){
      const a=project(0,y+.5),b=project(0,y-.5),grad=ctx.createLinearGradient(0,a.y,0,b.y);grad.addColorStop(0,'#20adb9');grad.addColorStop(.45,'#43c9d2');grad.addColorStop(1,'#168fa9');ground(y,grad);
      for(let i=0;i<40;i++){const x=rand(y,i+750)*32-16+Math.sin(state.time*.7+i)*.09, yy=y+rand(y,i+820)*.9-.45;line(x,yy,x+.12+rand(y,i+890)*.36,yy,'rgba(214,255,255,.4)',1.2);}
      line(-22,y+.47,22,y+.47,'#c4f3d7',3);line(-22,y-.48,22,y-.48,'rgba(255,255,229,.6)',2);
    } else {
      ground(y,'#b5a792');for(let x=-22;x<22;x+=.38)line(x,y-.36,x,y+.36,'#776550',tileW*.12);
      for(const d of [-.23,.23]){line(-22,y+d,22,y+d,'#454e54',5);line(-22,y+d+.02,22,y+d+.02,'#d9e4e5',2);}
    }
  }
  function draw(){
    const {W,H,tileW,tileH}=g.metrics();ctx.clearRect(0,0,W,H);ctx.fillStyle='#a4d478';ctx.fillRect(0,0,W,H);
    const min=Math.floor(state.cameraY)-Math.ceil(H/tileH)-3,max=Math.ceil(state.cameraY+H/tileH)+5;
    const objects=[];
    for(let y=max;y>=min;y--){const lane=laneFor(y);terrain(lane);
      if(lane.type==='grass'){
        for(const x of lane.blockers)objects.push({x,y,draw:()=>{shadow(x,y,tileW*.55,tileH*.35,.3);sprite(3,x,y,tileW*1.32);}});
        // Border trees frame the playing field without adding invisible obstacles.
        if(y%3===0)for(const x of [-7.5,7.5])objects.push({x,y,draw:()=>{shadow(x,y,tileW*.7,tileH*.4);sprite(3,x,y,tileW*(1.6+rand(y,3)*.4));}});
        for(const x of lane.coins)if(!lane['coin'+x])objects.push({x,y,draw:()=>coin(x,y)});
      } else if(lane.type==='road'||lane.type==='river'){
        const count=Math.ceil(18/lane.spacing)+1;for(let i=0;i<count;i++){const x=entityX(lane,i,lane.spacing);objects.push({x,y,draw:()=>{const w=tileW*lane.size;if(lane.type==='river'){shadow(x,y,w*.55,tileH*.23,.2);sprite(4,x,y,w, -.12);}else{shadow(x,y,w*.53,tileH*.3,.4);sprite((i+y)%2?1:2,x,y,w,0,lane.dir<0);}}});}
      } else {const phase=trainProgress(lane);if(phase<2.1){const x=lane.dir*(12-phase*lane.speed);for(let i=0;i<4;i++){const cx=x+i*lane.dir*2.1;objects.push({x:cx,y,draw:()=>{shadow(cx,y,tileW*1.1,tileH*.4,.4);sprite(5,cx,y,tileW*2.1,0,lane.dir<0);}});}}
        if(phase>lane.period-.9){const p=project(-5.5,y);ctx.fillStyle=Math.sin(state.time*18)>0?'#ff4242':'#ffddd0';ctx.shadowBlur=14;ctx.shadowColor='#ff3838';ctx.beginPath();ctx.arc(p.x,p.y-12,6,0,7);ctx.fill();ctx.shadowBlur=0;}
      }
    }
    const p=playerPosition();objects.push({x:p.x,y:p.y-.03,draw:()=>{shadow(p.x,p.y,tileW*.38,tileH*.24,.35);const side=state.player.toX-state.player.fromX;sprite(0,p.x,p.y,tileW*.86,p.z,side<0,Math.sin(state.player.hop*Math.PI)*side*.12);}});
    objects.sort((a,b)=>b.y-a.y||a.x-b.x);for(const o of objects)o.draw();
    for(const p of state.particles){const s=project(p.x,p.y,p.z);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(s.x,s.y,p.size*.45,0,7);ctx.fill();}ctx.globalAlpha=1;
    const haze=ctx.createLinearGradient(0,0,0,H*.28);haze.addColorStop(0,'rgba(232,248,205,.35)');haze.addColorStop(1,'rgba(232,248,205,0)');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H*.28);
  }
  return {draw,ready:()=>sprites.length===6};
};
