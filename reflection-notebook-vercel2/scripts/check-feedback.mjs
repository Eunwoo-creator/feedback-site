// Built-in Node assertions only: no test framework or real OpenAI call.
import assert from 'node:assert/strict';
import {handleFeedback} from '../api/feedback.js';
const token='a'.repeat(32),revision='b'.repeat(32),answers=['민수는 전류가 흐르면 나침반이 움직인다고 생각해요.','','',''];
let role='teacher',owned=true,count=1,calls=0,upstream='ok',payload;
const db={prepare(sql){return {bind(){return this;},async first(){
 if(sql.includes('FROM sessions'))return role==='none'?null:{code:'ABC123',student_id:role==='student'?'student':null};
 if(sql.includes('FROM revisions'))return owned?{answers:JSON.stringify(answers),pin:'123456789012'}:null;
 if(sql.includes('RETURNING count'))return {count};
 throw Error('Unexpected database write: '+sql);
},async all(){return {results:[{name:'민수'}]};}};}};
const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(options.body);
 if(upstream==='throw')throw Error('secret upstream error');
 if(upstream==='fail')return new Response('secret upstream error',{status:500});
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:upstream==='bad'?'wrong format':'잘한 점: 생각을 글로 표현했어요.\n다음 걸음: 전류와 나침반의 움직임은 어떻게 연결될까요?'}]}]});};
const request=(body={},cookie=true,origin='https://notebook.example')=>new Request('https://notebook.example/api/feedback',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:`thought_session=${token}`}:{})},body:JSON.stringify({revision,draft:'전류와 나침반의 움직임을 다시 생각해 봐요.',studentText:answers.join('\n\n'),...body})});
const oldKey=process.env.OPENAI_API_KEY,oldModel=process.env.OPENAI_MODEL;
try{
 process.env.OPENAI_API_KEY='test-key-only';process.env.OPENAI_MODEL='test-model';
 assert.equal((await handleFeedback(request({},false),db,fetcher)).status,401);
 role='student';assert.equal((await handleFeedback(request(),db,fetcher)).status,403);role='teacher';
 owned=false;assert.equal((await handleFeedback(request(),db,fetcher)).status,403);owned=true;
 assert.equal((await handleFeedback(request({},true,'https://other.example'),db,fetcher)).status,403);
 assert.equal((await handleFeedback(request({draft:''}),db,fetcher)).status,400);
 assert.equal((await handleFeedback(request({draft:'민수 잘했어요.'}),db,fetcher)).status,400);
 assert.equal((await handleFeedback(request({studentText:'조작한 글'}),db,fetcher)).status,409);
 assert.equal(calls,0);
 delete process.env.OPENAI_API_KEY;
 let response=await handleFeedback(request(),db,fetcher);assert.equal(response.status,503);assert.equal((await response.json()).error,'AI 다듬기를 쓸 수 없습니다. 직접 써 주세요');
 process.env.OPENAI_API_KEY='test-key-only';
 response=await handleFeedback(request(),db,fetcher);assert.equal(response.status,200);assert.match((await response.json()).feedback,/^잘한 점:/);
 assert.equal(payload.model,'test-model');assert.equal(payload.store,false);assert.ok(!payload.input.includes('민수'));assert.ok(!payload.input.includes('123456789012'));
 assert.match(payload.instructions,/오개념을 잘한 점으로 칭찬하지/);assert.match(payload.instructions,/질문 안에 남깁니다/);
 for(const mode of ['fail','throw','bad']){upstream=mode;response=await handleFeedback(request(),db,fetcher);assert.equal(response.status,503);assert.equal((await response.json()).error,'AI 다듬기를 쓸 수 없습니다. 직접 써 주세요');}
 count=11;assert.equal((await handleFeedback(request(),db,fetcher)).status,429);
 console.log('PASS: teacher authorization, course ownership, privacy, input validation, no automatic save, model setting, formatted output, missing-key/failure fallback, rate limit');
}finally{if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldModel===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=oldModel;}
