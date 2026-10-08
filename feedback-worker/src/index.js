const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
const trim = value => typeof value === 'string' ? value.trim() : '';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/feedback') return json({error:'Not found'},404);
    const origin = request.headers.get('Origin');
    if (origin !== env.ALLOWED_ORIGIN) return json({error:'Origin not allowed'},403);
    const cors = {'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
    const respond = response => {const headers = new Headers(response.headers);for(const [key,value] of Object.entries(cors)) headers.set(key,value);return new Response(response.body,{status:response.status,headers});};
    if (request.method === 'OPTIONS') return respond(new Response(null,{status:204}));
    if (request.method !== 'POST') return respond(json({error:'Method not allowed'},405));
    if (!env.GITHUB_TOKEN || !env.TURNSTILE_SECRET || !env.IP_HASH_SECRET) return respond(json({error:'Feedback is not configured yet'},503));
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return respond(json({error:'JSON required'},415));
    if (Number(request.headers.get('Content-Length') || 0) > 16384) return respond(json({error:'Submission too large'},413));
    let text = '';
    try {
      const reader = request.body?.getReader();
      if (!reader) return respond(json({error:'Submission required'},400));
      const chunks = [];let bytes = 0;
      while (true) {const {done,value} = await reader.read();if(done) break;bytes += value.byteLength;if(bytes > 16384){await reader.cancel();return respond(json({error:'Submission too large'},413));}chunks.push(value);}
      const buffer = new Uint8Array(bytes);let offset = 0;for(const chunk of chunks){buffer.set(chunk,offset);offset += chunk.byteLength;}text = new TextDecoder().decode(buffer);
      const body = JSON.parse(text);
      const type = trim(body.type), title = trim(body.title), details = trim(body.details), token = trim(body.turnstileToken), requestId = trim(body.requestId);
      if (!['idea','bug'].includes(type) || title.length < 3 || title.length > 120 || details.length < 10 || details.length > 4000 || token.length > 2048 || !token || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return respond(json({error:'Check the type, title and details'},400));
      if (trim(body.website)) return respond(json({error:'Submission rejected'},400));
      if (body.publicConsent !== true) return respond(json({error:'Please confirm this feedback can be posted publicly'},400));
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return respond(json({error:'Unable to verify submission'},403));
      const ipHash = await digest(env.IP_HASH_SECRET + ':' + ip);
      const gate = env.FEEDBACK_GATE.get(env.FEEDBACK_GATE.idFromName(ipHash));
      const payload = {type,title,details,token,requestId,dataset:['amex','legacy'].includes(body.dataset)?body.dataset:'unknown',view:['cards','map'].includes(body.view)?body.view:'unknown'};
      return respond(await gate.fetch(new Request('https://gate/submit',{method:'POST',body:JSON.stringify(payload)})));
    } catch {return respond(json({error:'Unable to process feedback. Please try again.'},500));}
  }
};

export class FeedbackGate {
  constructor(ctx, env) {this.ctx = ctx;this.env = env;}
  async fetch(request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const body = await request.json(), now = Date.now();
      const fingerprint = await digest(JSON.stringify([body.type,body.title,body.details,body.dataset,body.view]));
      const key = 'request:' + body.requestId;
      const previous = await this.ctx.storage.get(key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) return json({error:'Submission ID already used'},409);
        if (previous.result) return json(previous.result,201);
        return json({error:'This submission may already have been posted. Check repository issues before submitting again.'},409);
      }
      let window = await this.ctx.storage.get('window');
      if (!window || now - window.start >= 600000) window = {start:now,count:0};
      if (window.count >= 5) return json({error:'Too many submissions. Please try again in ten minutes.'},429);
      window.count++;await this.ctx.storage.put('window',window);
      await this.ctx.storage.setAlarm(now + 86400000);
      let validation;
      try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:this.env.TURNSTILE_SECRET,response:body.token,idempotency_key:body.requestId}),signal:AbortSignal.timeout(10000)});
        validation = await response.json();
      } catch {return json({error:'Spam protection unavailable. Please retry.'},503);}
      if (!validation.success || validation.hostname !== new URL(this.env.ALLOWED_ORIGIN).hostname || validation.action !== 'feedback') return json({error:'Please complete spam verification again'},400);
      const issueBody = '## ' + (body.type === 'bug'?'Bug report':'Idea') + '\n\n' + body.details + '\n\n---\nSubmitted through the Shop Small NZ feedback form.\nDataset: ' + body.dataset + '\nView: ' + body.view + '\nReference: ' + body.requestId + '\n\nNo GitHub account was required from the submitter. Content is user-supplied.';
      await this.ctx.storage.put(key,{fingerprint,pending:true});
      let response;
      try {
        response = await fetch('https://api.github.com/repos/' + this.env.GITHUB_REPOSITORY + '/issues',{method:'POST',headers:{'Authorization':'Bearer ' + this.env.GITHUB_TOKEN,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'shop-small-feedback','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({title:'[' + (body.type === 'bug'?'Bug':'Idea') + '] ' + body.title,body:issueBody}),signal:AbortSignal.timeout(15000)});
      } catch {return json({error:'GitHub confirmation timed out. Your feedback may have been posted; check repository issues before submitting again.'},503);}
      if (response.status !== 201) {
        if (response.status < 500) await this.ctx.storage.delete(key);
        return json({error:'GitHub did not confirm issue creation. Please try later.'},502);
      }
      let issue;
      try {issue = await response.json();} catch {return json({error:'Issue may be posted, but confirmation could not be read. Check repository issues.'},502);}
      const result = {number:issue.number,url:issue.html_url};
      await this.ctx.storage.put(key,{fingerprint,result});
      return json(result,201);
    });
  }
  async alarm() {await this.ctx.storage.deleteAll();}
}
