import assert from 'node:assert/strict';
import fs from 'node:fs';
const importSource = source => import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const helper = await importSource(fs.readFileSync(process.argv[2] || 'js/community-reports.js','utf8'));
const {resolveVoteIdentity} = await importSource(fs.readFileSync(process.argv[3] || 'js/vote-identity.js','utf8'));
const {summarizeCommunityReports:summary,communityReportMatches:matches,createCommunityReportLookup:lookup,renderCommunityReportBadge:badge} = helper;
let assertions=0;const equal=(actual,expected)=>{assert.deepEqual(actual,expected);assertions++;};
for(const [up,down,kind] of [[0,0,'none'],[1,0,'accepted'],[2,0,'accepted'],[0,1,'declined'],[0,3,'declined'],[1,1,'mixed'],[2,1,'mixed'],[1,2,'mixed']]){
 const report=summary(['key','key'],{key:{up,down}});equal(report,{status:'ready',kind,up,down});
 for(const [filter]of helper.COMMUNITY_FILTERS)equal(matches(report,filter),filter==='all'||filter===kind);
 equal(badge(report).includes(`data-report-state="${kind}"`),true);
 if(up||down){equal(badge(report).includes(`${up} accepted`),true);equal(badge(report).includes(`${down} declined`),true);}
}
for(const status of ['loading','unavailable']){
 const report=summary(['key'],{key:{up:2}},status);
 equal(report,{status,kind:status,up:0,down:0});equal(matches(report,'all'),true);
 for(const [filter]of helper.COMMUNITY_FILTERS.slice(1))equal(matches(report,filter),false);
 equal(badge(report).includes(status==='loading'?'Reports loading':'Reports unavailable'),true);
}
equal(summary(['a','b','a'],{a:{up:1},b:{down:2}}),{status:'ready',kind:'mixed',up:1,down:2});
equal(summary(['x'],{x:{up:-1,down:'bad'}}).kind,'none');
const fixtures=[
 [],
 [{id:'a',SENumber:'s',title:'Shop'}],
 [{id:'a',SENumber:'s',title:'Shop'},{id:'b',SENumber:'s',title:'Shop'}],
 [{id:'shared',SENumber:'s1',title:'First'},{id:'shared',SENumber:'s2',title:'Second'}],
 [{id:'s2',SENumber:'s1',title:'First'},{id:'b',SENumber:'s2',title:'Second'}],
 [{id:0,seNumber:' 7 ',title:'Zero'},{id:'other',SENumber:'7',name:'Other'}]
];
for(let seed=0;seed<40;seed++)fixtures.push(Array.from({length:8},(_,i)=>({id:`id-${(i+seed)%6}`,SENumber:`se-${(i*3+seed)%5}`,title:`Shop-${i%3}`})));
for(const merchants of fixtures){
 const reportFor=lookup(merchants), votes={};
 for(const m of merchants)for(const key of [m.id,m.seNumber,m.SENumber])if(key!=null)votes[String(key).trim()]={up:1,down:String(key).includes('2')?1:0};
 const targets=[['missing','Missing'],['',''],...merchants.flatMap(m=>[m.id,m.seNumber,m.SENumber].filter(value=>value!=null).flatMap(id=>[[id,m.title||m.name],[id,'Other title']]))];
 for(const [id,title]of targets){
  let expected;try{expected=summary(resolveVoteIdentity(id,title,merchants).aliases,votes);}catch{expected=summary([],votes,'unavailable');}
  equal(reportFor(id,title,votes),expected);
 }
 equal(reportFor('missing','Missing',votes,'loading').kind,'loading');
 equal(reportFor('missing','Missing',votes,'unavailable').kind,'unavailable');
}
const mutableVotes={s:{up:1,down:0}},live=lookup([{id:'a',SENumber:'s',title:'Shop'}]);
equal(live('s','Shop',mutableVotes).kind,'accepted');mutableVotes.s.down=1;equal(live('s','Shop',mutableVotes).kind,'mixed');
equal(matches(live('s','Shop',mutableVotes),'accepted'),false);equal(matches(live('s','Shop',mutableVotes),'mixed'),true);
equal(badge({status:'ready',kind:'<script>',up:0,down:0}).includes('<script>'),false);
console.log(JSON.stringify({assertions,fixtureSets:fixtures.length,networkRequests:0}));
