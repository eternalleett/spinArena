const assert=require('node:assert/strict'),Launch=require('./dist/launch-core.js'),C=require('./dist/vision-core.js');
const arena={x:0,y:0,w:240,h:200};
function frame(objects=[],flicker=0,offset=0){const width=240,height=200,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){let rgb=[145,145,145];if(Math.hypot(x-80,y-80)<9||Math.hypot(x-160,y-120)<9)rgb=[18+flicker,18+flicker,18+flicker];for(const o of objects)if(Math.hypot(x-o.x,y-o.y)<(o.r||8))rgb=o.rgb||[12,12,12];const k=(y*width+x)*4;for(let c=0;c<3;c++)data[k+c]=rgb[c]+offset;data[k+3]=255}return{width,height,data}}
function empty(d){for(let i=0;i<35;i++)assert.equal(d.observe(frame([],i%2?7:-7),i/30,arena).length,0);assert.equal(d.ready,true)}
let d=new Launch();empty(d);
for(let i=35;i<300;i++){assert.equal(d.observe(frame([],i%2?14:-3),i/30,arena).length,0);assert.equal(d.foregroundAt(frame(),{x:80,y:80,r:8}),false)}assert.equal(d.state,'waiting');
for(let i=300;i<340;i++)assert.equal(d.observe(frame([{x:120,y:80}]),i/30,arena).length,0,'stationary new objects are not launches');
d=new Launch();empty(d);let pair=[];
for(let i=35;i<70;i++){const objects=[{x:45+(i-35)*1.5,y:60}];if(i>=50)objects.push({x:180-(i-50)*1.2,y:140,rgb:[220,60,30]});pair=d.observe(frame(objects),i/30,arena);if(i<50)assert.equal(pair.length,0)}assert.equal(pair.length,2);assert.ok(pair.every(c=>c.valid));
const stopped=frame([{x:96,y:60},{x:157,y:140,rgb:[220,60,30]}]);assert.equal(d.foregroundAt(stopped,{x:96,y:60,r:8}),true);assert.equal(d.foregroundAt(stopped,{x:80,y:80,r:8}),false);
let seed=C.seed(frame([{x:96,y:60}]),96,60,8);seed.seen=2;const gone=frame();assert.equal(C.update(gone,[seed,null],2.03,arena,c=>d.foregroundAt(gone,c))[0].lost,true);assert.equal(C.update(stopped,[seed,null],2.03,arena,c=>d.foregroundAt(stopped,c))[0].lost,false,'stopped actual top remains tracked');
d=new Launch();for(let i=0;i<100;i++)d.observe(frame([{x:40+(i%30)*4,y:80,r:10}]),i/30,arena);assert.equal(d.ready,false);
d=new Launch();empty(d);for(let i=35;i<65;i++)assert.equal(d.observe(frame([],0,10),i/30,arena).length,0);d.reset();assert.equal(d.ready,false);assert.equal(d.candidates.length,0);
console.log('PASS: empty prelaunch/fixed black anchors, noise/exposure rejection, stationary object rejection, staggered launches, stopped top retention, no reacquisition of static anchors, moving-scene abstention, baseline reset');
