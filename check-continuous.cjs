const assert=require('node:assert/strict'),A=require('./dist/continuous-core.js');
const arena={x:0,y:0,w:200,h:200},zones=[{id:'over',kind:'Over',x:160,y:50,w:35,h:40,confirmed:true}];
const tr=(x=80,y=90)=>({x,y,r:5,confidence:.98,lost:false}),both=[tr(),tr(115)];
const spin={state:'rotating',active:1},still=t=>({state:'still',stable:1.3,stoppedAt:t}),rot=[spin,spin];
function start(m,t=0){for(let i=0;i<10;i++)m.observe(both,rot,t+i*.05,arena,zones);assert.equal(m.phase,'live')}
let m=new A.Match();start(m);m.observe(both,[still(.5),spin],.5,arena,zones);assert.equal(m.proposal.kind,'Spin');assert.equal(m.proposal.winner,1);assert.ok(m.commit());assert.deepEqual(m.scores,[0,1]);assert.equal(m.commit(0,'bad'),false);assert.equal(m.history.length,1);
// Cannot count the same stationary pair as a fresh battle. Clear and relaunch required.
for(let i=0;i<25;i++)m.observe(both,rot,.55+i*.05,arena,zones);assert.equal(m.phase,'waiting');assert.equal(m.history.length,1);
for(let i=0;i<18;i++)m.observe([null,null],[{},{}],1.8+i*.05,arena,zones);start(m,2.7);m.observe(both,[still(3.2),spin],3.2,arena,zones);m.commit();assert.deepEqual(m.scores,[0,2]);m.phase='review';m.commit(1,'Over');assert.equal(m.phase,'won');assert.deepEqual(m.scores,[0,4]);assert.equal(m.commit(0,'Spin'),false);m.undo();assert.deepEqual(m.scores,[0,2]);assert.equal(m.phase,'paused');const restored=new A.Match(m.serialize());assert.deepEqual(restored.scores,[0,2]);assert.equal(restored.phase,'paused');
// Enter 2-point pocket and return spinning; this must not award an Over.
m=new A.Match();start(m);m.observe([tr(175,70),both[1]],rot,.5,arena,zones);assert.ok(m.pending[0]);m.observe(both,rot,.55,arena,zones);assert.equal(m.pending[0],null);assert.equal(m.proposal,null);m.observe(both,[spin,still(.6)],.6,arena,zones);assert.equal(m.proposal.winner,0);assert.equal(m.proposal.kind,'Spin');
m=new A.Match();start(m);m.observe([null,both[1]],[still(.5),spin],.5,arena,zones);assert.equal(m.proposal,null);m.observe(both,[still(.6),spin],2,arena,zones);assert.equal(m.phase,'paused');assert.equal(m.proposal,null);
m=new A.Match();start(m);m.observe(both,[still(.5),still(.5)],.5,arena,zones);assert.equal(m.proposal.kind,'Draw');
m=new A.Match();start(m);m.observe(both,[still(.5),still(.8)],.5,arena,zones);assert.equal(m.proposal.kind,'Spin');assert.equal(m.proposal.winner,1);
m=new A.Match();start(m);for(let i=0;i<18000;i++)m.observe(both,rot,.5+i/30,arena,zones);assert.equal(m.phase,'live');assert.equal(m.history.length,0);assert.equal(m.pending.filter(Boolean).length,0);

function image(angleA,angleB){const width=200,height=200,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){let v=110;for(const [cx,angle] of [[70,angleA],[130,angleB]]){const dx=x-cx,dy=y-100;if(dx*dx+dy*dy<15*15)v=Math.sin(Math.atan2(dy,dx)*3+angle)>0?220:30}const k=(y*width+x)*4;data[k]=data[k+1]=data[k+2]=v;data[k+3]=255}return{width,height,data}}
const tracks=[{...tr(70,100),r:15},{...tr(130,100),r:15}],r=new A.Rotation();let res;
for(let i=0;i<100;i++){const t=i/30;res=r.observe(image(Math.min(i,30)*.4,i*.4),tracks,t)}
assert.equal(res[0].state,'still');assert.ok(res[0].stable>1.2);assert.equal(res[1].state,'rotating');r.observe(image(12,40),[{...tracks[0],lost:true},tracks[1]],3.4);assert.equal(r.still[0],null);
assert.equal(A.locateScene({width:200,height:200,data:new Uint8ClampedArray(200*200*4)}),null,'blank scene must abstain');
console.log('PASS: Spin texture, return from 2-point pocket then win, missing detection/gap abstention, draw review, clear/relaunch, multiple rounds, first-to-four, undo, restored pause, blank-scene abstention');
