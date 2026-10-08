import {env} from 'cloudflare:workers';
import {defaultQuestions} from '../../questions';
export const dynamic='force-dynamic';
const random=()=>crypto.randomUUID().replaceAll('-','');
function personalPin(){return Array.from(crypto.getRandomValues(new Uint32Array(3)),n=>(n%10000).toString().padStart(4,'0')).join('');}
async function passwordHash(value:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))).map(x=>x.toString(16).padStart(2,'0')).join('');}
function reply(data:unknown,status=200,token?:string,req?:Request){const h:Record<string,string>={'Cache-Control':'no-store'};if(token!==undefined)h['Set-Cookie']=`thought_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?86400:0}${req?.url.startsWith('https:')?'; Secure':''}`;return Response.json(data,{status,headers:h});}
async function auth(req:Request,db:D1Database){const t=req.headers.get('cookie')?.match(/(?:^|;\s*)thought_session=([a-f0-9]{32})/)?.[1];return t?db.prepare('SELECT code,student_id FROM sessions WHERE token=? AND expires>?').bind(t,Date.now()).first<{code:string;student_id:string|null}>():null;}
async function session(db:D1Database,code:string,student:string|null){const token=random();await db.prepare('INSERT INTO sessions(token,code,student_id,expires) VALUES(?,?,?,?)').bind(token,code,student,Date.now()+86400000).run();return token;}
async function throttle(req:Request,db:D1Database,action:string){const ip=req.headers.get('cf-connecting-ip')||'local';const key=await passwordHash(ip+action,'reflection-rate-v1');await db.prepare('INSERT INTO attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN attempts.expires<? THEN 1 ELSE attempts.count+1 END, expires=CASE WHEN attempts.expires<? THEN excluded.expires ELSE attempts.expires END').bind(key,Date.now()+300000,Date.now(),Date.now()).run();const a=await db.prepare('SELECT count FROM attempts WHERE key=?').bind(key).first<{count:number}>();return a!.count<=(action==='join'?200:action==='student-login'?100:30);}
function qs(value:unknown){return Array.isArray(value)&&value.length===4&&value.every(q=>typeof q==='string'&&q.trim().length>0&&q.length<=300)?value.map(q=>q.trim()):null;}
export async function GET(req:Request){try{const db=env.DB;if(!db)throw Error('DB unavailable');const a=await auth(req,db);if(!a)return reply({error:'수업에 다시 들어와 주세요.'},401);
 const lesson=await db.prepare('SELECT code,title,questions FROM lessons WHERE code=?').bind(a.code).first<{code:string;title:string;questions:string}>();if(!lesson)return reply({error:'삭제된 수업입니다.'},404);
 const students=await db.prepare(a.student_id?'SELECT id,name,pin,created FROM students WHERE code=? AND id=?':'SELECT id,name,pin,created FROM students WHERE code=? ORDER BY name,created').bind(...(a.student_id?[a.code,a.student_id]:[a.code])).all<{id:string;name:string;pin:string;created:number}>();
 const rows=await db.prepare(a.student_id?'SELECT r.* FROM revisions r JOIN students s ON s.id=r.student_id WHERE s.code=? AND s.id=? ORDER BY r.number DESC':'SELECT r.* FROM revisions r JOIN students s ON s.id=r.student_id WHERE s.code=? ORDER BY r.number DESC').bind(...(a.student_id?[a.code,a.student_id]:[a.code])).all<any>();
 const grouped=new Map<string,any[]>();for(const r of rows.results){const list=grouped.get(r.student_id)||[];list.push({id:r.id,number:r.number,questions:JSON.parse(r.questions),answers:JSON.parse(r.answers),feedback:r.feedback,created:r.created,feedbackAt:r.feedback_at});grouped.set(r.student_id,list);}
 return reply({role:a.student_id?'student':'teacher',lesson:{...lesson,questions:JSON.parse(lesson.questions)},students:students.results.map(s=>({...s,revisions:grouped.get(s.id)||[]}))});
 }catch(e){console.error(e);return reply({error:'노트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},503);}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return reply({error:'잘못된 요청입니다.'},403);
 if(Number(req.headers.get('content-length'))>60000)return reply({error:'입력 내용이 너무 길어요.'},413);
 const db=env.DB;if(!db)throw Error('DB unavailable');const b=await req.json() as Record<string,any>;const action=b?.action;const code=typeof b?.code==='string'?b.code.trim().toUpperCase():'';
 if(['create','teacher-login','join','student-login'].includes(action)){
  if(!await throttle(req,db,action))return reply({error:'시도가 많아요. 5분 뒤 다시 시도해 주세요.'},429);
  if(action==='create'){
   if(typeof b.password!=='string'||b.password.length<8||b.password.length>100)return reply({error:'비밀번호는 8~100자로 정해 주세요.'},400);
   const questions=qs(b.questions),title=typeof b.title==='string'?b.title.trim():'';if(!questions||!title||title.length>100)return reply({error:'수업 이름과 네 가지 질문을 확인해 주세요.'},400);
   const c=random().slice(0,6).toUpperCase(),salt=random(),hash=await passwordHash(b.password,salt);await db.prepare('INSERT INTO lessons(code,title,password,salt,questions,created) VALUES(?,?,?,?,?,?)').bind(c,title,hash,salt,JSON.stringify(questions),Date.now()).run();return reply({ok:true},200,await session(db,c,null),req);
  }
  if(!/^[A-Z0-9]{6}$/.test(code))return reply({error:'수업 코드 6자리를 확인해 주세요.'},400);
  const lesson=await db.prepare('SELECT password,salt FROM lessons WHERE code=?').bind(code).first<{password:string;salt:string}>();if(!lesson)return reply({error:'수업 코드를 확인해 주세요.'},404);
  if(action==='teacher-login'){
   if(typeof b.password!=='string'||b.password.length>100||await passwordHash(b.password,lesson.salt)!==lesson.password)return reply({error:'수업 코드 또는 비밀번호를 확인해 주세요.'},403);
   return reply({ok:true},200,await session(db,code,null),req);
  }
  if(action==='join'){
   const name=typeof b.name==='string'?b.name.trim():'';if(!name||name.length>40)return reply({error:'이름을 40자 이내로 적어 주세요.'},400);
   const id=random(),pin=personalPin();await db.prepare('INSERT INTO students(id,code,name,pin,created) VALUES(?,?,?,?,?)').bind(id,code,name,pin,Date.now()).run();return reply({ok:true},200,await session(db,code,id),req);
  }
  const pin=typeof b.pin==='string'?b.pin.replace(/[^0-9]/g,''):'';if(!/^\d{12}$/.test(pin))return reply({error:'개인 확인 번호 12자리를 확인해 주세요.'},400);
  const s=await db.prepare('SELECT id FROM students WHERE code=? AND pin=?').bind(code,pin).first<{id:string}>();if(!s)return reply({error:'수업 코드 또는 개인 확인 번호를 확인해 주세요.'},403);return reply({ok:true},200,await session(db,code,s.id),req);
 }
 const a=await auth(req,db);if(!a)return reply({error:'수업에 다시 들어와 주세요.'},401);
 if(action==='logout'){const t=req.headers.get('cookie')?.match(/thought_session=([a-f0-9]{32})/)?.[1];if(t)await db.prepare('DELETE FROM sessions WHERE token=?').bind(t).run();return reply({ok:true},200,'',req);}
 if(!a.student_id){
  if(action==='edit-lesson'){
   const questions=qs(b.questions),title=typeof b.title==='string'?b.title.trim():'';if(!questions||!title||title.length>100)return reply({error:'수업 이름과 네 가지 질문을 확인해 주세요.'},400);await db.prepare('UPDATE lessons SET title=?,questions=? WHERE code=?').bind(title,JSON.stringify(questions),a.code).run();
  }else if(action==='feedback'){
   if(typeof b.feedback!=='string'||b.feedback.length>3000)return reply({error:'피드백은 3,000자 이내로 적어 주세요.'},400);
   const result=await db.prepare('UPDATE revisions SET feedback=?,feedback_at=? WHERE id=? AND student_id IN (SELECT id FROM students WHERE code=?)').bind(b.feedback.trim(),Date.now(),b.revision,a.code).run();if(!result.meta.changes)return reply({error:'이 수업의 답변이 아닙니다.'},403);
  }else if(action==='delete'){
   await db.batch([db.prepare('DELETE FROM revisions WHERE student_id IN (SELECT id FROM students WHERE code=?)').bind(a.code),db.prepare('DELETE FROM sessions WHERE code=?').bind(a.code),db.prepare('DELETE FROM students WHERE code=?').bind(a.code),db.prepare('DELETE FROM lessons WHERE code=?').bind(a.code)]);return reply({deleted:true},200,'',req);
  }else return reply({error:'사용할 수 없는 동작입니다.'},403);
 }else if(action==='submit'){
  if(!Array.isArray(b.answers)||b.answers.length!==4||b.answers.some((v:any)=>typeof v!=='string'||v.length>3000)||!b.answers[0].trim())return reply({error:'1번 질문에 우리말로 답해 주세요. 각 답변은 3,000자까지 쓸 수 있어요.'},400);
  if(typeof b.id!=='string'||!/^\w{32}$/.test(b.id))return reply({error:'다시 제출해 주세요.'},400);
  const existing=await db.prepare('SELECT student_id FROM revisions WHERE id=?').bind(b.id).first<{student_id:string}>();if(existing)return existing.student_id===a.student_id?reply({ok:true}):reply({error:'잘못된 제출입니다.'},403);
  const lesson=await db.prepare('SELECT questions FROM lessons WHERE code=?').bind(a.code).first<{questions:string}>();if(!lesson)return reply({error:'삭제된 수업입니다.'},404);
  if(JSON.stringify(b.questions)!==lesson.questions)return reply({error:'선생님이 질문을 수정했어요. 새 질문을 확인한 뒤 다시 제출해 주세요. 작성한 답변은 그대로 남아 있어요.'},409);
  await db.prepare('INSERT INTO revisions(id,student_id,number,questions,answers,feedback,created) SELECT ?,?,COALESCE(MAX(number),0)+1,?,?,?,? FROM revisions WHERE student_id=?').bind(b.id,a.student_id,lesson.questions,JSON.stringify(b.answers.map((v:string)=>v.trim())),'',Date.now(),a.student_id).run();
 }else return reply({error:'선생님만 사용할 수 있는 동작입니다.'},403);
 return reply({ok:true});
 }catch(e){console.error(e);return reply({error:'저장하지 못했어요. 작성한 내용을 유지하고 다시 시도해 주세요.'},503);}}

