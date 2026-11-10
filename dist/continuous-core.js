/* Local heuristic vision, not a trained Blade classifier. Scores are reviewable. */
(function(root){
'use strict';
const base=typeof module==='object'?require('./vision-core.js'):root.SpinVisionCore;
const good=c=>c&&!c.lost&&!c.ambiguous&&c.confidence>=.86;
const inside=(c,a)=>a&&((c.x-a.x-a.w/2)/(a.w/2))**2+((c.y-a.y-a.h/2)/(a.h/2))**2<.85**2;
const gray=(im,x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=im.width||y>=im.height)return 0;const i=(y*im.width+x)*4;return im.data[i]*.299+im.data[i+1]*.587+im.data[i+2]*.114};
function blobs(mask,w,h,step=2){const seen=new Uint8Array(mask.length),q=new Int32Array(mask.length),out=[];for(let i=0;i<mask.length;i++){if(!mask[i]||seen[i])continue;let head=0,tail=0,n=0,sx=0,sy=0,x0=w,y0=h,x1=0,y1=0;q[tail++]=i;seen[i]=1;while(head<tail){const k=q[head++],x=k%w,y=(k/w)|0;n++;sx+=x;sy+=y;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*w+nx;if(nx>=0&&ny>=0&&nx<w&&ny<h&&mask[j]&&!seen[j]){seen[j]=1;q[tail++]=j}}}out.push({x:sx/n*step,y:sy/n*step,r:Math.max(3,Math.max(x1-x0+1,y1-y0+1)*step/2),w:(x1-x0+1)*step,h:(y1-y0+1)*step,area:n*step*step})}return out}
function locateScene(im,direction='unknown'){
const {width:w,height:h}=im,m=Math.min(w,h);let best=null;
// ponytail: ellipse edge search assumes a fixed, complete arena; learned segmentation is needed for arbitrary stadiums.
for(let cy=h*.3;cy<=h*.7;cy+=m*.08)for(let cx=w*.3;cx<=w*.7;cx+=m*.08)for(let rx=m*.22;rx<m*.49;rx+=m*.04)for(const ratio of [.65,.85,1,1.2]){const ry=rx*ratio;if(cx-rx<2||cx+rx>w-3||cy-ry<2||cy+ry>h-3)continue;let sum=0,support=0;for(let j=0;j<48;j++){const a=j*Math.PI/24,dx=Math.cos(a),dy=Math.sin(a);const edge=Math.abs(gray(im,cx+dx*(rx+3),cy+dy*(ry+3))-gray(im,cx+dx*(rx-3),cy+dy*(ry-3)));sum+=Math.min(80,edge);if(edge>18)support++}const score=sum/48;if(support>=27&&(!best||score>best.score))best={x:cx-rx,y:cy-ry,w:rx*2,h:ry*2,score,support:support/48,id:'arena',automatic:true}}
if(!best)return null;
const sw=Math.ceil(w/2),sh=Math.ceil(h/2),mask=new Uint8Array(sw*sh);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const d=((x*2-best.x-best.w/2)/(best.w/2))**2+((y*2-best.y-best.h/2)/(best.h/2))**2;if(d>.65&&d<1.65&&gray(im,x*2,y*2)<58)mask[y*sw+x]=1}
let holes=blobs(mask,sw,sh).filter(b=>b.area>m*m*.001&&b.area<m*m*.045&&b.w/b.h>.3&&b.w/b.h<3.3).sort((a,b)=>b.area-a.area).slice(0,3);
let xtreme=null;if(direction!=='unknown'&&holes.length){const axis=['top','bottom'].includes(direction)?'y':'x',sign=['top','left'].includes(direction)?-1:1;xtreme=holes.reduce((a,b)=>sign*b[axis]>sign*a[axis]?b:a)}
const zones=holes.map((b,i)=>({id:'auto-'+i,kind:direction==='unknown'?'Unknown':b===xtreme?'Xtreme':'Over',x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h,automatic:true,confirmed:false}));return{arena:best,zones};}
function movement(im,previous,arena){if(!previous||previous.width!==im.width)return{items:[],shake:false};const sw=Math.ceil(im.width/2),sh=Math.ceil(im.height/2),mask=new Uint8Array(sw*sh);let changed=0,n=0;for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const p={x:x*2,y:y*2};if(arena&&!inside(p,{x:arena.x-arena.w*.2,y:arena.y-arena.h*.2,w:arena.w*1.4,h:arena.h*1.4}))continue;n++;if(Math.abs(gray(im,p.x,p.y)-gray(previous,p.x,p.y))>24){mask[y*sw+x]=1;changed++}}const shake=changed/Math.max(1,n)>.25,m=Math.min(im.width,im.height);return{shake,items:shake?[]:blobs(mask,sw,sh).filter(b=>b.area>18&&b.r<m*.105&&b.r>m*.012&&b.w/b.h>.35&&b.w/b.h<2.8)}}
function patch(im,c){const a=[];for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)if(x*x+y*y<=10)a.push(gray(im,c.x+x*c.r*.19,c.y+y*c.r*.19));const mean=a.reduce((s,v)=>s+v,0)/a.length;return{a:a.map(v=>v-mean),contrast:Math.sqrt(a.reduce((s,v)=>s+(v-mean)**2,0)/a.length)}}
class Rotation{
constructor(){this.prev=[null,null];this.active=[0,0];this.still=[null,null];this.was=[false,false];this.last=null}
reset(){this.prev=[null,null];this.active=[0,0];this.still=[null,null];this.was=[false,false];this.last=null}
observe(im,tracks,t,shake=false){const dt=this.last==null?0:t-this.last;this.last=t;return tracks.map((c,p)=>{if(!good(c)||shake||dt<=0||dt>.16){this.prev[p]=null;this.still[p]=null;this.active[p]=0;this.was[p]=false;return{state:'unknown'}}const next=patch(im,c),old=this.prev[p];this.prev[p]={...next,x:c.x,y:c.y,r:c.r};if(!old||next.contrast<9||old.contrast<9){this.still[p]=null;return{state:'unknown'}}const delta=next.a.reduce((s,v,i)=>s+Math.abs(v-old.a[i]),0)/next.a.length,travel=Math.hypot(c.x-old.x,c.y-old.y)/Math.max(1,c.r);const rotating=delta>6;const quiet=delta<2.3&&travel<.07;
if(rotating){this.active[p]+=dt;this.still[p]=null;if(this.active[p]>.3)this.was[p]=true}else if(quiet&&this.was[p]){if(this.still[p]==null)this.still[p]=t;this.active[p]=0}else{this.still[p]=null;this.active[p]=0}return{state:rotating?'rotating':quiet&&this.was[p]?'still':'unknown',delta,contrast:next.contrast,stoppedAt:this.still[p],stable:this.still[p]==null?0:t-this.still[p],active:this.active[p]}})}
}
class Match{
constructor(saved){this.scores=[0,0];this.history=[];this.phase='waiting';this.round=1;this.pending=[null,null];this.previous=[null,null];this.readyAt=null;this.clearAt=null;this.rearm=false;this.proposal=null;this.serial=0;this.last=null;if(saved&&saved.version===2&&Array.isArray(saved.history)){this.history=saved.history.slice(-100).filter(e=>[0,1].includes(e.winner)&&['Spin','Over','Xtreme','Burst'].includes(e.kind));this.recount();this.serial=this.history.reduce((n,e)=>Math.max(n,e.id||0),0);this.round=this.history.length+1;this.phase=this.scores.some(v=>v>=4)?'won':'paused'}}
recount(){this.scores=[0,0];for(const e of this.history)this.scores[e.winner]+=({Spin:1,Over:2,Burst:2,Xtreme:3})[e.kind]}
serialize(){return{version:2,scores:this.scores,history:this.history,round:this.round}}
resetEvidence(){this.pending=[null,null];this.previous=[null,null];this.readyAt=null;this.proposal=null}
interrupt(){this.resetEvidence();this.last=null;if(this.phase==='live')this.phase='paused'}
observe(tracks,rotation,t,arena,zones){if(this.phase==='won'||this.phase==='review')return;const gap=this.last!=null&&(t-this.last>.2||t<=this.last);this.last=t;if(gap){this.interrupt();this.last=t;return}const both=tracks.every(good),moving=both&&rotation.every(r=>r?.state==='rotating');if(this.phase==='waiting'||this.phase==='paused'){
if(this.rearm){if(!tracks.some(good)){if(this.clearAt==null)this.clearAt=t;if(t-this.clearAt>.6)this.rearm=false}else this.clearAt=null;return}
if(moving){if(this.readyAt==null)this.readyAt=t;if(t-this.readyAt>.3){this.phase='live';this.resetEvidence()}}else this.readyAt=null;return}
for(let p=0;p<2;p++){const c=tracks[p],r=rotation[p];if(!good(c)){this.previous[p]=null;if(this.pending[p])this.pending[p].continuous=false;continue}const z=zones.find(z=>base.fullInside(c,z)),prev=this.previous[p];if(z){if(!this.pending[p])this.pending[p]={id:++this.serial,player:p,kind:z.kind,start:t,last:t,zoneId:z.id,continuous:!!prev&&t-prev.t<.16,confirmed:!!z.confirmed};else this.pending[p].last=t}else if(this.pending[p]&&inside(c,arena)&&r?.state==='rotating'){this.pending[p]=null}this.previous[p]={t};}
// Return is tested on every frame before a Finish is proposed. Disappearance alone never scores.
for(let p=0;p<2;p++){const e=this.pending[p],r=rotation[p],other=rotation[1-p];if(e&&e.continuous&&e.confirmed&&e.kind!=='Unknown'&&r?.stable>=1.2&&other?.state==='rotating'&&other.active>.25){this.setProposal(1-p,e.kind,t,e.start,'完整進區後可見停轉；須排除旋轉返回');return}}
const stops=rotation.map((r,p)=>good(tracks[p])&&inside(tracks[p],arena)&&r?.stable>=1.2?r.stoppedAt:null);
if(stops.every(v=>v!=null)){if(Math.abs(stops[0]-stops[1])>.16&&!this.pending.some(Boolean)){const loser=stops[0]<stops[1]?0:1;this.setProposal(1-loser,'Spin',t,stops[loser],'雙方已停轉，連續影格顯示可分辨的停轉先後');return}this.proposal={id:++this.serial,kind:'Draw',time:t,reason:'雙方停轉，先後需覆核'};this.phase='review';return}
for(let p=0;p<2;p++)if(stops[p]!=null&&rotation[1-p]?.state==='rotating'&&rotation[1-p].active>.25&&!this.pending.some(Boolean)){this.setProposal(1-p,'Spin',t,stops[p],'連續紋理靜止，對方仍有旋轉證據');return}}
setProposal(winner,kind,t,start,reason){this.proposal={id:++this.serial,winner,kind,time:t,start,reason};this.phase='review'}
commit(winner=this.proposal?.winner,kind=this.proposal?.kind,automatic=false){if(this.phase==='won'||(this.phase==='waiting'&&this.rearm)||![0,1].includes(winner)||!['Spin','Over','Xtreme','Burst'].includes(kind))return false;const e={id:++this.serial,round:this.round,winner,kind,points:({Spin:1,Over:2,Burst:2,Xtreme:3})[kind],time:this.proposal?.time??this.last,automatic};this.history.push(e);this.recount();this.round++;this.resetEvidence();this.phase=this.scores.some(v=>v>=4)?'won':'waiting';this.rearm=true;this.clearAt=null;return e}
undo(){if(!this.history.length)return;this.history.pop();this.recount();this.round=this.history.length+1;this.resetEvidence();this.phase='paused';this.rearm=true;this.clearAt=null}
replay(){this.resetEvidence();this.phase='waiting';this.rearm=true;this.clearAt=null}
}
const api={locateScene,movement,blobs,Rotation,Match,good,inside};if(typeof module==='object')module.exports=api;else root.SpinContinuousCore=api;
})(typeof window!=='undefined'?window:globalThis);
