const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const stage = document.querySelector('.game-stage');
const coordsEl = document.getElementById('coords');
const toast = document.getElementById('toast');
const selectedName = document.getElementById('selectedName');

const palette = {
  grass: { top:'#77bd70', left:'#4b9660', right:'#5aa765', name:'GRASS' },
  sand: { top:'#e9d28a', left:'#caa965', right:'#d9bb70', name:'SAND' },
  stone: { top:'#a8b1a8', left:'#778b83', right:'#8c9b8f', name:'STONE' },
  flower: { top:'#84bf76', left:'#57985f', right:'#67aa68', name:'FLOWER' }
};
const size = 12, height = 7;
let world, player, selected = 'grass', lastTime = 0, hover = null, toastTimer;
const keys = {};

function makeWorld() {
  world = Array.from({length:size}, (_, x) => Array.from({length:size}, (_, y) => {
    const edge = x === 0 || y === 0 || x === size-1 || y === size-1;
    const seed = (x * 13 + y * 7) % 11;
    return { type: edge ? 'stone' : seed < 2 ? 'sand' : seed === 5 ? 'flower' : 'grass', h: edge ? 1 : seed === 3 ? 2 : 1 };
  }));
  player = { x: 5.5, y: 7.2, bob: 0 };
  notify('A fresh patch of earth awaits.');
}
function resize() { const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = canvas.clientWidth*dpr; canvas.height = canvas.clientHeight*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
function camera() { return { x: canvas.clientWidth/2 - player.x*26 + player.y*26, y: canvas.clientHeight*.39 - (player.x+player.y)*13 }; }
function diamond(cx, cy, w, h, fill, stroke='#285447') { ctx.beginPath(); ctx.moveTo(cx,cy-h/2);ctx.lineTo(cx+w/2,cy);ctx.lineTo(cx,cy+h/2);ctx.lineTo(cx-w/2,cy);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1.2;ctx.stroke(); }
function block(x,y,b, alpha=1) {
  const cam=camera(), sx=cam.x+(x-y)*26, sy=cam.y+(x+y)*13; const p=palette[b.type], bh=22*b.h; ctx.globalAlpha=alpha;
  diamond(sx,sy-bh,52,26,p.top); ctx.beginPath();ctx.moveTo(sx-26,sy-bh);ctx.lineTo(sx-26,sy+5);ctx.lineTo(sx,sy+18);ctx.lineTo(sx,sy-bh+13);ctx.closePath();ctx.fillStyle=p.left;ctx.fill();ctx.strokeStyle='#285447';ctx.stroke(); ctx.beginPath();ctx.moveTo(sx+26,sy-bh);ctx.lineTo(sx+26,sy+5);ctx.lineTo(sx,sy+18);ctx.lineTo(sx,sy-bh+13);ctx.closePath();ctx.fillStyle=p.right;ctx.fill();ctx.stroke();
  if (b.type==='flower') { ctx.strokeStyle='#234c3c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy-bh-3);ctx.lineTo(sx+1,sy-bh-22);ctx.stroke();ctx.fillStyle='#ff765b';ctx.beginPath();ctx.arc(sx+1,sy-bh-24,5,0,Math.PI*2);ctx.fill(); }
  ctx.globalAlpha=1; return {sx,sy,bh};
}
function avatar() { const cam=camera(), sx=cam.x+(player.x-player.y)*26, sy=cam.y+(player.x+player.y)*13-28+Math.sin(player.bob)*2; ctx.save();ctx.translate(sx,sy);ctx.rotate(-.2);ctx.strokeStyle='#17362f';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,0,16,-1.2,4.3);ctx.stroke();ctx.strokeStyle='#ff765b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(-3,1,10,-1.1,4.1);ctx.stroke();ctx.fillStyle='#e4ff65';ctx.beginPath();ctx.arc(9,-7,3,0,7);ctx.fill();ctx.restore(); }
function draw() { const w=canvas.clientWidth,h=canvas.clientHeight; ctx.clearRect(0,0,w,h); const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#d4e8df');sky.addColorStop(.46,'#a9cdb7');sky.addColorStop(.47,'#7eae84');sky.addColorStop(1,'#4f8768');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h); ctx.fillStyle='rgba(255,244,185,.7)';ctx.beginPath();ctx.arc(w*.72,h*.25,74,0,7);ctx.fill();
  ctx.fillStyle='#f0c879';ctx.globalAlpha=.3;ctx.beginPath();ctx.moveTo(0,h*.44);ctx.lineTo(w*.23,h*.28);ctx.lineTo(w*.43,h*.42);ctx.lineTo(w*.7,h*.25);ctx.lineTo(w,h*.41);ctx.lineTo(w,h*.56);ctx.lineTo(0,h*.56);ctx.fill();ctx.globalAlpha=1;
  for(let s=0;s<2;s++) for(let x=0;x<size;x++) for(let y=0;y<size;y++) { if((x+y)%2===s) block(x,y,world[x][y]); }
  if(hover) { const tile=world[hover.x]?.[hover.y]; if(tile){ const c=camera(),sx=c.x+(hover.x-hover.y)*26,sy=c.y+(hover.x+hover.y)*13-22*tile.h;diamond(sx,sy,58,29,'rgba(228,255,101,.24)','rgba(228,255,101,.9)'); } }
  avatar(); coordsEl.textContent=`X ${String(Math.round(player.x)).padStart(2,'0')} · Y ${String(Math.round(player.y)).padStart(2,'0')}`;
 }
function loop(t){ const dt=Math.min((t-lastTime)/1000,.05);lastTime=t; let dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.s?1:0)-(keys.w?1:0); if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;player.x=Math.max(1.1,Math.min(size-1.1,player.x+dx*dt*2.8));player.y=Math.max(1.1,Math.min(size-1.1,player.y+dy*dt*2.8));player.bob+=dt*12;}draw();requestAnimationFrame(loop);}
function notify(msg){ toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),1800); }
function tileAt(e){ const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,c=camera();let best=null,dist=999;for(let x=0;x<size;x++)for(let y=0;y<size;y++){const sx=c.x+(x-y)*26,sy=c.y+(x+y)*13-22*world[x][y].h;const d=Math.abs((mx-sx)/29)+Math.abs((my-sy)/16);if(d<1.2&&d<dist){best={x,y};dist=d;}}return best; }
window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(['1','2','3','4'].includes(e.key)){const b=['grass','sand','stone','flower'][+e.key-1];select(b);}if(e.key.toLowerCase()==='r')makeWorld();});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener('mousemove',e=>{hover=tileAt(e);});canvas.addEventListener('mouseleave',()=>hover=null);canvas.addEventListener('click',e=>{const t=tileAt(e);if(!t)return;const b=world[t.x][t.y];if(b.h>1){b.h--;notify('You trimmed that block down.');}else if(b.type==='stone'){b.type=selected;b.h=1;notify(`Crafted a ${palette[selected].name.toLowerCase()} block.`);}else{b.type=selected;b.h=1;notify(`Placed ${palette[selected].name.toLowerCase()}.`);}});
document.querySelectorAll('.slot').forEach(btn=>btn.addEventListener('click',()=>select(btn.dataset.block)));function select(b){selected=b;document.querySelectorAll('.slot').forEach(s=>s.classList.toggle('selected',s.dataset.block===b));selectedName.textContent=palette[b].name;notify(`Carrying ${palette[b].name.toLowerCase()}.`);}document.getElementById('resetButton').addEventListener('click',makeWorld);window.addEventListener('resize',resize);makeWorld();resize();requestAnimationFrame(loop);
