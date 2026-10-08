import { env } from 'cloudflare:workers';
export const dynamic='force-dynamic';
type State={joined:boolean; completed:number[]; attempts:Record<string,number>; source:string; final:string; feedback:string; approved:boolean};
const fresh=():State=>({joined:false,completed:[],attempts:{},source:'',final:'',feedback:'',approved:false});
const random=()=>crypto.randomUUID().replaceAll('-','');
async function hash(value:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))).map(x=>x.toString(16).padStart(2,'0')).join('');}
function reply(data:unknown,status=200,token?:string,request?:Request){const headers:Record<string,string>={'Cache-Control':'no-store'};if(token!==undefined)headers['Set-Cookie']=`lab_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?86400:0}${request?.url.startsWith('https:')?'; Secure':''}`;return Response.json(data,{status,headers});}
async function auth(req:Request,db:D1Database){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)lab_session=([a-f0-9]{32})/)?.[1];return token?await db.prepare('SELECT code, team FROM sessions WHERE token=? AND expires>?').bind(token,Date.now()).first<{code:string;team:number|null}>():null;}
async function snapshot(db:D1Database,a:{code:string;team:number|null}){const room=await db.prepare('SELECT code,stage FROM rooms WHERE code=?').bind(a.code).first();if(!room)return null;const rows=await db.prepare(a.team===null?'SELECT number,state FROM teams WHERE code=? ORDER BY number':'SELECT number,state FROM teams WHERE code=? AND number=?').bind(...(a.team===null?[a.code]:[a.code,a.team])).all<{number:number;state:string}>();return {room,role:a.team===null?'teacher':'student',team:a.team,teams:rows.results.map(t=>({number:t.number,...JSON.parse(t.state)}))};}
export async function GET(req:Request){try{const db=env.DB;if(!db)throw Error('DB unavailable');const a=await auth(req,db);if(!a)return reply({error:'수업에 입장해 주세요.'},401);const data=await snapshot(db,a);return data?reply(data):reply({error:'삭제된 수업입니다. 시작 화면으로 돌아가 주세요.'},404);}catch(e){console.error(e);return reply({error:'수업을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},503);}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return reply({error:'잘못된 요청입니다.'},403);
 const db=env.DB;if(!db)throw Error('DB unavailable');const b=await req.json() as Record<string, any>;const action=b.action;const code=typeof b.code==='string'?b.code.trim().toUpperCase():'';
 if(action==='create'||action==='login'||action==='join'){
  if(action==='create'){
   if(typeof b.password!=='string'||b.password.length<8||b.password.length>100)return reply({error:'선생님 비밀번호는 8~100자로 정해 주세요.'},400);
   const c=random().slice(0,6).toUpperCase(),salt=random();const password=await hash(b.password,salt);
   await db.batch([db.prepare('INSERT INTO rooms(code,password,salt,stage,created) VALUES(?,?,?,0,?)').bind(c,password,salt,Date.now()),...Array.from({length:6},(_,i)=>db.prepare('INSERT INTO teams(code,number,state) VALUES(?,?,?)').bind(c,i+1,JSON.stringify(fresh())))]);
   const token=random();await db.prepare('INSERT INTO sessions(token,code,team,expires) VALUES(?,?,NULL,?)').bind(token,c,Date.now()+86400000).run();return reply({ok:true},200,token,req);
  }
  if(!/^[A-Z0-9]{6}$/.test(code))return reply({error:'수업 코드 6자리를 확인해 주세요.'},400);
  const room=await db.prepare('SELECT password,salt FROM rooms WHERE code=?').bind(code).first<{password:string;salt:string}>();
  if(!room)return reply({error:'수업 코드를 다시 확인해 주세요.'},404);
  let team:number|null=null;
  if(action==='login'){if(typeof b.password!=='string'||b.password.length>100||await hash(b.password,room.salt)!==room.password)return reply({error:'수업 코드 또는 비밀번호를 확인해 주세요.'},403);}
  else{team=Number(b.team);if(!Number.isInteger(team)||team<1||team>6)return reply({error:'1~6팀 중에서 골라 주세요.'},400);const row=await db.prepare('SELECT state FROM teams WHERE code=? AND number=?').bind(code,team).first<{state:string}>();const state=JSON.parse(row!.state);state.joined=true;await db.prepare('UPDATE teams SET state=? WHERE code=? AND number=?').bind(JSON.stringify(state),code,team).run();}
  const token=random();await db.prepare('INSERT INTO sessions(token,code,team,expires) VALUES(?,?,?,?)').bind(token,code,team,Date.now()+86400000).run();return reply({ok:true},200,token,req);
 }
 if(action==='logout')return reply({ok:true},200,'',req);
 const a=await auth(req,db);if(!a)return reply({error:'다시 입장해 주세요.'},401);
 const room=await db.prepare('SELECT stage FROM rooms WHERE code=?').bind(a.code).first<{stage:number}>();if(!room)return reply({error:'삭제된 수업입니다.'},404);
 if(a.team===null){
  if(action==='advance'){
   if(room.stage>=5)return reply({error:'이미 마지막 방입니다.'},400);
   if(room.stage>0){const rows=await db.prepare('SELECT number,state FROM teams WHERE code=?').bind(a.code).all<{number:number;state:string}>();await db.batch(rows.results.map(r=>{const s=JSON.parse(r.state);if(!s.completed.includes(room.stage))s.completed.push(room.stage);return db.prepare('UPDATE teams SET state=? WHERE code=? AND number=?').bind(JSON.stringify(s),a.code,r.number);}));}
   await db.prepare('UPDATE rooms SET stage=? WHERE code=? AND stage=?').bind(room.stage+1,a.code,room.stage).run();
  }else if(action==='review'){
   const n=Number(b.team);const row=await db.prepare('SELECT state FROM teams WHERE code=? AND number=?').bind(a.code,n).first<{state:string}>();if(!row)return reply({error:'팀을 확인해 주세요.'},400);const s:State=JSON.parse(row.state);if(!s.final)return reply({error:'아직 제출된 답변이 없어요.'},400);s.approved=b.approved===true;s.feedback=typeof b.feedback==='string'?b.feedback.trim().slice(0,500):'';await db.prepare('UPDATE teams SET state=? WHERE code=? AND number=?').bind(JSON.stringify(s),a.code,n).run();
  }else if(action==='delete'){await db.batch(['DELETE FROM sessions WHERE code=?','DELETE FROM teams WHERE code=?','DELETE FROM rooms WHERE code=?'].map(sql=>db.prepare(sql).bind(a.code)));return reply({deleted:true},200,'',req);}
  else return reply({error:'사용할 수 없는 동작입니다.'},400);
 }else{
  const row=await db.prepare('SELECT state FROM teams WHERE code=? AND number=?').bind(a.code,a.team).first<{state:string}>();const s:State=JSON.parse(row!.state);
  if(action==='answer'){
   if(room.stage<1||room.stage>4||Number(b.stage)!==room.stage)return reply({error:'현재 열린 방의 문제를 풀어 주세요.'},409);
   const st=room.stage,sub=st===2?Number(b.sub):0;if(st===2&&![0,1,2].includes(sub))return reply({error:'문제를 확인해 주세요.'},400);
   const key=`${st}-${sub}`,answers=Array.isArray(b.answers)?b.answers:[];const expected=st===1?[1,4]:st===2?[sub===2?1:0]:st===3?[3]:[2];
   if(st===1&&(typeof b.source!=='string'||!b.source.trim()))return reply({error:'확인한 자료의 이름이나 주소를 적어 주세요.'},400);
   const ok=JSON.stringify([...new Set(answers)].sort())===JSON.stringify(expected);s.attempts[key]=(s.attempts[key]||0)+(ok?0:1);
   if(ok){if(st===1)s.source=b.source.trim().slice(0,500);if(st===2){(s as any).subCompleted=Array.from(new Set([...((s as any).subCompleted||[]),sub]));if((s as any).subCompleted.length===3&&!s.completed.includes(st))s.completed.push(st);}else if(!s.completed.includes(st))s.completed.push(st);}
   await db.prepare('UPDATE teams SET state=? WHERE code=? AND number=?').bind(JSON.stringify(s),a.code,a.team).run();return reply({correct:ok,hint:s.attempts[key]>=2});
  }else if(action==='final'){
   if(room.stage!==5||b.pin!=='3729')return reply({error:'모은 네 자리 암호를 확인해 주세요.'},400);
   if(typeof b.answer!=='string'||b.answer.trim().length<3||b.answer.length>1000)return reply({error:'우리 팀 생각을 1~2문장으로 적어 주세요. (최대 1,000자)'},400);
   if(s.approved)return reply({error:'이미 탈출한 팀입니다.'},400);s.final=b.answer.trim();s.feedback='';await db.prepare('UPDATE teams SET state=? WHERE code=? AND number=?').bind(JSON.stringify(s),a.code,a.team).run();
  }else return reply({error:'사용할 수 없는 동작입니다.'},403);
 }
 return reply({ok:true});
 }catch(e){console.error(e);return reply({error:'저장하지 못했어요. 입력한 내용을 유지하고 다시 시도해 주세요.'},503);}}

