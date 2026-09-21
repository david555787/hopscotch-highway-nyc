/* Illustrated sprite renderer. World positions and collision rules stay in the game. */
window.createHighwayArt = function(g) {
  const {ctx,state,project,laneFor,playerPosition,entityX,trainProgress,trainCarPositions,rand}=g;
  let sprites=[],loaded=0;
  const start=document.querySelector('#play');start.disabled=true;start.textContent='Loading artwork…';
  function loadAtlas(url,offset){const atlas=new Image();
  atlas.onerror=()=>{start.textContent='Artwork could not load — refresh';};
  atlas.onload=()=>{
    // Trim each transparent atlas cell once, retaining the original generated art.
    const scratch=document.createElement('canvas');scratch.width=atlas.width;scratch.height=atlas.height;
    const s=scratch.getContext('2d');s.drawImage(atlas,0,0);const pixels=s.getImageData(0,0,atlas.width,atlas.height).data;
    const cells=Array.from({length:6},(_,i)=>{
      const region=offset===6?[[0,0,535,390],[535,0,510,390],[1045,0,491,490],[0,390,525,634],[545,390,420,634],[990,500,546,524]][i]:[i%3*512,Math.floor(i/3)*512,512,512];
      const scale=atlas.width/1536;
      const [ox,oy,cw,ch]=region.map(v=>Math.round(v*scale));let l=cw,t=ch,r=0,b=0;
      for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){if(pixels[((oy+y)*atlas.width+ox+x)*4+3]>30){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
      return {image:atlas,x:ox+l,y:oy+t,w:r-l+1,h:b-t+1};
    });
    cells.forEach((cell,i)=>sprites[offset+i]=cell);loaded++;
    if(loaded===2){start.disabled=false;start.textContent=state.round===1?'Start round':'Play next round';}
  };
  atlas.src=url;}
  loadAtlas('world-atlas.png',0);loadAtlas('nyc-atlas.png',6);
  function polygon(points,fill){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
  function ground(y,fill){polygon([project(-5.8,y-.5),project(5.8,y-.5),project(5.8,y+.5),project(-5.8,y+.5)],fill);}
  function line(x1,y1,x2,y2,color,width=1){const a=project(x1,y1),b=project(x2,y2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function shadow(x,y,w,h,alpha=.2){const p=project(x,y);ctx.save();ctx.translate(p.x+4,p.y+3);ctx.scale(w,h);const gradient=ctx.createRadialGradient(0,0,0,0,0,1);gradient.addColorStop(0,`rgba(19,47,39,${alpha})`);gradient.addColorStop(1,'rgba(19,47,39,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();}
  function sprite(i,x,y,width,z=0,flip=false,angle=0){const r=sprites[i];if(!r)return;const p=project(x,y,z),h=width*r.h/r.w;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);if(flip)ctx.scale(-1,1);ctx.drawImage(r.image,r.x,r.y,r.w,r.h,-width/2,-h,width,h);ctx.restore();}
  function glow(x,y,color,size=1){const p=project(x,y),w=g.metrics().tileW*size;ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.45);const r=ctx.createRadialGradient(0,0,0,0,0,w);r.addColorStop(0,color);r.addColorStop(1,'transparent');ctx.fillStyle=r;ctx.fillRect(-w,-w,2*w,2*w);ctx.restore();}
  function lamp(x,y){const p=project(x,y),top=project(x,y,1.55);ctx.strokeStyle='#5c7897';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(top.x,top.y);ctx.lineTo(top.x+10,top.y);ctx.stroke();ctx.shadowBlur=15;ctx.shadowColor='#ffcf81';ctx.fillStyle='#fff1b5';ctx.fillRect(top.x+6,top.y-2,9,4);ctx.shadowBlur=0;}
  function coin(x,y){const p=project(x,y,.3+Math.sin(state.time*3+x)*.08);const w=g.metrics().tileW*.115;ctx.save();ctx.shadowColor='#ffe28a';ctx.shadowBlur=10;const grad=ctx.createLinearGradient(p.x-w,p.y-w,p.x+w,p.y+w);grad.addColorStop(0,'#fff9b1');grad.addColorStop(.4,'#ffdb51');grad.addColorStop(1,'#d68b0b');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(p.x,p.y,w,w*1.15,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#b57914';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff8ce';ctx.font=`bold ${w*1.6}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',p.x,p.y);ctx.restore();}
  function terrain(lane){
    const {tileW, tileH}=g.metrics(),y=lane.y;
    if(lane.type==='grass'){
      const p=project(0,y+.5),q=project(0,y-.5);const grad=ctx.createLinearGradient(0,p.y,0,q.y);grad.addColorStop(0,y%2?'#53647e':'#60718c');grad.addColorStop(1,y%2?'#45576f':'#536580');ground(y,grad);
      for(let x=-5.8;x<5.8;x+=.7)line(x,y-.48,x,y+.48,'#243c5655',1);line(-5.8,y,5.8,y,'#a5bed229',1);
      line(-5.8,y-.46,5.8,y-.46,'#adc1d088',2);
      for(const x of [-5.4,5.4])glow(x,y,y%2?'#e46bba30':'#4ee5ef30',1.2);
    } else if(lane.type==='road'){
      ground(y,'#25334c');for(let i=0;i<45;i++){const p=project(rand(y,i+510)*11.6-5.8,y+rand(y,i+610)-.5);ctx.fillStyle='rgba(216,229,235,.12)';ctx.fillRect(p.x,p.y,1.2,1.2);}
      line(-5.8,y-.46,5.8,y-.46,'#b4c6d188',1.5);line(-5.8,y+.46,5.8,y+.46,'#a0bdcc88',1.5);
      for(let x=-5.8;x<5.8;x+=1.3)line(x,y,x+.6,y,'#e9bd7399',2);
      for(const x of [-3.7,3.7])for(let a=-.36;a<=.36;a+=.18)line(x-.38,y+a,x+.38,y+a,'#d9e6e4bb',tileH*.09);
    } else if(lane.type==='river'){
      const a=project(0,y+.5),b=project(0,y-.5),grad=ctx.createLinearGradient(0,a.y,0,b.y);grad.addColorStop(0,'#154465');grad.addColorStop(.45,'#27768b');grad.addColorStop(1,'#163451');ground(y,grad);
      for(let i=0;i<40;i++){const x=rand(y,i+750)*11-5.5+Math.sin(state.time*.7+i)*.09, yy=y+rand(y,i+820)*.9-.45;line(x,yy,x+.12+rand(y,i+890)*.36,yy,i%2?'#6ee9e666':'#fba8d966',1.2);}
      line(-5.8,y+.47,5.8,y+.47,'#66a7be',3);line(-5.8,y-.48,5.8,y-.48,'#4f7187',2);
    } else {
      ground(y,'#18283e');for(let x=-5.8;x<5.8;x+=.38)line(x,y-.36,x,y+.36,'#4d6074',tileW*.12);
      for(const d of [-.23,.23]){line(-5.8,y+d,5.8,y+d,'#243e53',5);line(-5.8,y+d+.02,5.8,y+d+.02,'#a6c7dd',2);}
      line(-5.8,y-.48,5.8,y-.48,'#70bbd8',3);
    }
  }
  function draw(){
    const {W,H,tileW,tileH}=g.metrics();ctx.clearRect(0,0,W,H);ctx.fillStyle='#172239';ctx.fillRect(0,0,W,H);
    const min=Math.floor(state.cameraY)-Math.ceil(H/tileH)-3,max=Math.ceil(state.cameraY+H/tileH)+5;
    const objects=[];
    for(let y=max;y>=min;y--){const lane=laneFor(y);terrain(lane);
      if(lane.type==='grass'){
        for(const x of lane.blockers)objects.push({x,y,draw:()=>{shadow(x,y,tileW*.55,tileH*.35,.3);sprite(8,x,y,tileW*.95);}});
        for(const x of lane.coins)if(!lane['coin'+x])objects.push({x,y,draw:()=>coin(x,y)});
      } else if(lane.type==='road'||lane.type==='river'){
        const count=Math.ceil(18/lane.spacing)+1;for(let i=0;i<count;i++){const x=entityX(lane,i,lane.spacing);if(Math.abs(x)>7.5)continue;objects.push({x,y,draw:()=>{const w=tileW*lane.size;if(lane.type==='river'){shadow(x,y,w*.55,tileH*.23,.2);sprite(4,x,y,w, -.12,false,.245);}else{shadow(x,y,w*.53,tileH*.3,.4);glow(x+lane.dir*lane.size*.6,y,'#ffe6a73d',.6);sprite((i+y)%3?6:7,x,y,w,0,lane.dir<0,lane.dir<0?.49:0);}}});}
      } else {const phase=trainProgress(lane),cars=trainCarPositions(lane);for(let i=0;i<cars.length;i++){const cx=cars[i];if(Math.abs(cx)>8)continue;objects.push({x:cx,y,draw:()=>{shadow(cx,y,tileW*1.1,tileH*.4,.4);sprite(11,cx,y,tileW*2.1,.1,lane.dir<0,.245);}});}
        if(phase>lane.period-.9){const p=project(-5.5,y);ctx.fillStyle=Math.sin(state.time*18)>0?'#ff4242':'#ffddd0';ctx.shadowBlur=14;ctx.shadowColor='#ff3838';ctx.beginPath();ctx.arc(p.x,p.y-12,6,0,7);ctx.fill();ctx.shadowBlur=0;}
      }
      if(y%3===0)for(const x of [-6.65,6.85])objects.push({x,y,draw:()=>{glow(x,y,x<0?'#ff65be55':'#53cfe94d',1.7);sprite((y%6===0)?10:9,x,y,tileW*(y%6===0?2.1:2.35));}});
      if(y%3===1)for(const x of [-5.65,5.65])objects.push({x,y,draw:()=>{glow(x,y,'#ffcf7644',1.1);lamp(x,y);}});
    }
    const p=playerPosition();objects.push({x:p.x,y:p.y-.03,draw:()=>{shadow(p.x,p.y,tileW*.38,tileH*.24,.35);const side=state.player.toX-state.player.fromX;sprite(0,p.x,p.y,tileW*.86,p.z,side<0,Math.sin(state.player.hop*Math.PI)*side*.12);}});
    objects.sort((a,b)=>(b.y-b.x*.25/.66)-(a.y-a.x*.25/.66));for(const o of objects)o.draw();
    for(const p of state.particles){const s=project(p.x,p.y,p.z);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(s.x,s.y,p.size*.45,0,7);ctx.fill();}ctx.globalAlpha=1;
    const haze=ctx.createLinearGradient(0,0,0,H*.25);haze.addColorStop(0,'rgba(81,82,160,.3)');haze.addColorStop(1,'rgba(40,51,97,0)');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H*.25);
  }
  return {draw,ready:()=>loaded===2};
};
