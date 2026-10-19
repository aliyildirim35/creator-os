/* Creator OS local server — Node 18+ (no external packages required). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3455);
const ROOT = __dirname;
const STORE = path.join(ROOT, '.creator-os.secure.json');
const master = process.env.CREATOR_OS_MASTER_KEY;
if (!master) console.warn('CREATOR_OS_MASTER_KEY is not set: credentials will only remain available while this server runs.');
const key = master ? crypto.createHash('sha256').update(master).digest() : crypto.randomBytes(32);
let state = null;

function seal(value) { const iv=crypto.randomBytes(12), c=crypto.createCipheriv('aes-256-gcm',key,iv); const data=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]); return {iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:data.toString('base64')}; }
function unseal(value) { const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(value.iv,'base64')); d.setAuthTag(Buffer.from(value.tag,'base64')); return JSON.parse(Buffer.concat([d.update(Buffer.from(value.data,'base64')),d.final()]).toString()); }
function load() { try { return unseal(JSON.parse(fs.readFileSync(STORE,'utf8'))); } catch { return { settings:{}, tokens:null }; } }
let db = load();
function persist() { if (master) fs.writeFileSync(STORE,JSON.stringify(seal(db)),{mode:0o600}); }
function json(res, status, body) { res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body)); }
function read(req) { return new Promise((ok,fail)=>{let s='';req.on('data',x=>s+=x);req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){fail(e)}})}); }
function scopes() { return 'user.info.basic,user.info.stats,video.list,video.upload,video.publish'; }

const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,`http://localhost:${PORT}`);
 try {
  if(req.method==='GET' && url.pathname==='/api/status') return json(res,200,{connected:Boolean(db.tokens), configured:Boolean(db.settings.clientKey&&db.settings.clientSecret&&db.settings.redirectUri), redirectUri:db.settings.redirectUri||`http://localhost:${PORT}/oauth/callback`});
  if(req.method==='POST' && url.pathname==='/api/settings') { const b=await read(req), old=db.settings; db.settings={clientKey:b.clientKey?.trim()||old.clientKey,clientSecret:b.clientSecret?.trim()||old.clientSecret,redirectUri:b.redirectUri?.trim()||old.redirectUri,openaiKey:b.openaiKey?.trim()||old.openaiKey,openaiModel:b.openaiModel?.trim()||old.openaiModel||'gpt-5-mini'}; persist(); return json(res,200,{ok:true}); }
  if(req.method==='POST' && url.pathname==='/api/idea') { const b=await read(req); if(!db.settings.openaiKey) return json(res,400,{error:'Önce ayarlara OpenAI API anahtarını girin.'}); const prompt=`Sen etik ve özgün bir TikTok içerik stratejistisin. ${b.context||'Güzellik, GRWM ve ürün incelemesi yapan Türk içerik üreticisi için'} tek, kısa, uygulanabilir video fikri üret. İlk iki saniye kancasını, video akışını ve izleyiciye sorulacak soruyu yaz. Uydurma ürün/sonuç iddiası yapma.`; const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${db.settings.openaiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:db.settings.openaiModel,input:prompt})}); const data=await r.json(); if(!r.ok) return json(res,r.status,{error:data.error?.message||'Yapay zekâ isteği başarısız oldu.'}); const output=data.output_text||data.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join(''); return json(res,200,{idea:output}); }
  if(req.method==='GET' && url.pathname==='/oauth/tiktok') {
    const s=db.settings; if(!s.clientKey||!s.clientSecret||!s.redirectUri) return json(res,400,{error:'Önce TikTok Client Key, Client Secret ve redirect URI girin.'});
    const verifier=crypto.randomBytes(48).toString('base64url'); const challenge=crypto.createHash('sha256').update(verifier).digest('base64url'); state={value:crypto.randomBytes(32).toString('hex'),verifier}; const q=new URLSearchParams({client_key:s.clientKey,response_type:'code',scope:scopes(),redirect_uri:s.redirectUri,state:state.value,code_challenge:challenge,code_challenge_method:'S256'}); res.writeHead(302,{Location:`https://www.tiktok.com/v2/auth/authorize/?${q}`}); return res.end();
  }
  if(req.method==='GET' && url.pathname==='/oauth/callback') {
    if(url.searchParams.get('state')!==state?.value || url.searchParams.get('error')) return res.end('<h2>Bağlantı tamamlanamadı.</h2><p>Pencereyi kapatıp Creator OS ekranından yeniden deneyin.</p>');
    const form=new URLSearchParams({client_key:db.settings.clientKey,client_secret:db.settings.clientSecret,code:url.searchParams.get('code'),grant_type:'authorization_code',redirect_uri:db.settings.redirectUri,code_verifier:state.verifier});
    const r=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form}); const t=await r.json(); if(!r.ok||t.error?.code!=='ok') throw new Error(t.error?.message||'Token alınamadı'); db.tokens={...t.data, savedAt:Date.now()}; persist(); return res.end('<h2>TikTok bağlandı ✓</h2><p>Creator OS’a dönüp sayfayı yenileyebilirsiniz.</p>');
  }
  if(req.method==='POST' && url.pathname==='/api/publish') {
    if(!db.tokens?.access_token) return json(res,401,{error:'Önce TikTok hesabını bağlayın.'}); const b=await read(req);
    const r=await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/',{method:'POST',headers:{Authorization:`Bearer ${db.tokens.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({post_info:{title:b.caption||'',privacy_level:b.privacy||'SELF_ONLY',disable_duet:false,disable_comment:false,disable_stitch:false},source_info:{source:'PULL_FROM_URL',video_url:b.videoUrl}})}); return json(res,r.status,await r.json());
  }
  if(req.method==='GET' && ['/','/index.html','/terms','/privacy'].includes(url.pathname)) { const file=url.pathname==='/'||url.pathname==='/index.html'?'index.html':url.pathname==='/terms'?'terms.html':'privacy.html'; res.writeHead(200,{'Content-Type':'text/html'});return fs.createReadStream(path.join(ROOT,file)).pipe(res); }
  if(req.method==='GET' && url.pathname==='/assets/creator-os-logo.svg') { res.writeHead(200,{'Content-Type':'image/svg+xml'});return fs.createReadStream(path.join(ROOT,'assets','creator-os-logo.svg')).pipe(res); }
  json(res,404,{error:'Bulunamadı'});
 } catch(e) { json(res,500,{error:e.message}); }
});
server.listen(PORT,()=>console.log(`Creator OS: http://localhost:${PORT}`));
