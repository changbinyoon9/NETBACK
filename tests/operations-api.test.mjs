// Run only against an isolated QA workspace; this intentionally creates local records.
import assert from 'node:assert/strict';
const base=process.env.NETBACK_QA_URL;
if(!base||!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Set NETBACK_QA_URL to an isolated local QA server.');
const endpoint=base+'/api/operations';
async function post(command,status=200){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(command)});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
let s=await(await fetch(endpoint)).json();assert.equal(s.reports.length,0,'Use a fresh QA workspace');assert.equal(s.vessels.length,0);
s=await post({action:'createVessel',actor:'QA API',values:{name:'QA research vessel',lat:34.83,lon:128.43,maxDepth:50,maxWave:2,speed:9,hourlyCost:150000,gear:['NET'],confirmed:true}});
s=await post({action:'createReport',actor:'QA API',values:{title:'QA API isolation record',lat:34.83583,lon:128.43333,gear:'NET',notes:'QA only'}});
const id=s.reports[0].id;const command=(action,values)=>({action,values,actor:'QA API',id,revision:s.reports.find(r=>r.id===id).revision});
const review=command('review',{depth:24,wave:.7,budget:2000000,radius:15,hours:2,note:'QA manual review',locationChecked:true});
s=await post(review);await post(review,409);
s=await post(command('assign',{vesselId:s.vessels[0].id}));
await post(command('start',{note:'missing consent'}),400);
s=await post(command('start',{crewConfirmed:true,safetyConfirmed:true,note:'QA contact confirmed'}));
s=await post(command('outcome',{result:'Partial',weight:12,actualCost:360000,evidence:'QA-REFERENCE',note:'Partial attempt QA',disposition:'QA depot'}));
s=await post(command('close',{evidenceChecked:true}));
const persisted=await(await fetch(endpoint)).json();assert.equal(persisted.reports[0].stage,'CLOSED');assert.equal(persisted.reports[0].outcome.weight,12);assert.equal(persisted.reports[0].history.length,6);
const hostile=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify(review)});assert.equal(hostile.status,403);
console.log('PASS API local persistence, full workflow, stale writes, crew checks, and origin rejection');
