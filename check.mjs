import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const elements=new Map();
function element(){return {hidden:false,textContent:'',style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},replaceChildren(){},append(){},addEventListener(){}}}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,documentElement:element(),body:element(),addEventListener(){}};
const code=fs.readFileSync('dist/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const context=vm.createContext({document,window:{addEventListener(){}},navigator:{},localStorage:{getItem(){return null},setItem(){}},structuredClone,Date,setInterval(){return 1},clearInterval(){},setTimeout(){return 1},clearTimeout(){},assert});
vm.runInContext(code,context);
vm.runInContext(`
assert.notEqual(fresh().matchId,fresh().matchId);
s=fresh();s.phase='live';s.started=Date.now();award(0,0);assert.equal(s.scores[0],3);assert.equal(s.phase,'result');award(1,0);assert.equal(s.scores[1],0);
s.phase='live';s.started=Date.now();award(0,3);assert.equal(s.scores[0],4);assert.equal(s.phase,'won');
s=fresh();s.phase='live';s.started=Date.now();fault(0);assert.equal(s.scores[1],0);assert.equal(s.faults[0],1);assert.equal(s.phase,'ready');
s.phase='live';s.started=Date.now();replay();assert.equal(s.faults[0],1);
s.phase='live';s.started=Date.now();fault(0);assert.equal(s.scores[1],1);assert.equal(s.faults[0],0);assert.equal(s.phase,'result');
s=fresh();s.faults=[1,1];s.phase='live';s.started=Date.now();award(1,2);assert.equal(s.scores[1],2);assert.equal(s.faults[0],0);assert.equal(s.faults[1],0);
config.faultScope='match';s=fresh();s.faults=[1,1];s.phase='live';s.started=Date.now();fault(0);assert.equal(s.faults[0],0);assert.equal(s.faults[1],1);
s=fresh();s.scores=[3,0];s.faults=[0,1];s.phase='live';s.started=Date.now();fault(1);assert.equal(s.phase,'won');assert.equal(s.scores[0],4);
`,context);
console.log('PASS: finish points, first-to-four, scoring lock, two-error penalty, replay retention, fault scopes, penalty victory');
