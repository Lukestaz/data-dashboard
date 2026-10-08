import { state } from './store.js';

const ENDPOINT = 'https://shop-small-feedback.lucas-stone.workers.dev/feedback';
const SITE_KEY = '0x4AAAAAAFRJs3riFO2_UDAO';
const ISSUES = 'https://github.com/Lukestaz/data-dashboard/issues';
let turnstileLoad = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileLoad) return turnstileLoad;
  turnstileLoad = new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;script.defer = true;
    const timer = setTimeout(() => fail(),15000);
    const fail = () => {clearTimeout(timer);script.remove();turnstileLoad = null;reject(new Error('Spam verification could not load. Please close and reopen this form.'));};
    script.addEventListener('error',fail,{once:true});
    script.addEventListener('load',() => {clearTimeout(timer);if(window.turnstile) resolve(window.turnstile);else fail();},{once:true});
    document.head.append(script);
  });
  return turnstileLoad;
}
function node(tag,text='') {const item=document.createElement(tag);if(text)item.textContent=text;return item;}
function installFeedback(menu) {
  if (document.getElementById('feedback-dialog')) return;
  const style=node('style');
  style.textContent=`
#feedback-dialog{width:min(440px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow:auto;margin:auto;border:1px solid #334155;border-radius:16px;padding:20px;background:#0f172a;color:#e2e8f0;font-family:inherit;box-sizing:border-box}
#feedback-dialog::backdrop{background:#020617cc;backdrop-filter:blur(4px)}
#feedback-dialog h2{font-size:18px;font-weight:700;margin:0}
#feedback-dialog .feedback-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
#feedback-dialog form{display:grid;gap:12px}
#feedback-dialog label{display:grid;gap:5px;font-size:13px}
#feedback-dialog input:not([type=checkbox]),#feedback-dialog select,#feedback-dialog textarea{width:100%;box-sizing:border-box;min-height:40px;border:1px solid #334155;border-radius:8px;background:#020617;color:#e2e8f0;font:inherit;font-size:16px;padding:8px 10px}
#feedback-dialog textarea{min-height:110px;resize:vertical}
#feedback-dialog button{min-height:40px;border:1px solid #334155;border-radius:8px;padding:8px 12px;font:inherit;font-size:13px;background:#1e293b;color:#e2e8f0;cursor:pointer}
#feedback-dialog button[type=submit]{background:#2563eb;border-color:#2563eb;color:white}
#feedback-dialog button:disabled{opacity:.5;cursor:not-allowed}
#feedback-dialog .feedback-consent{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5}
#feedback-dialog .feedback-consent input{margin-top:3px;flex-shrink:0}
#feedback-dialog .feedback-status{font-size:13px;line-height:1.5;overflow-wrap:anywhere}
#feedback-dialog .feedback-status a{color:#93c5fd;text-decoration:underline}
#feedback-dialog .feedback-honeypot{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
#feedback-dialog :focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
#feedback-turnstile{min-height:65px}
`;document.head.append(style);
  const entry=node('button','Idea or bug');entry.type='button';entry.className='compact-control w-full text-xs font-semibold';
  entry.setAttribute('aria-haspopup','dialog');menu.prepend(entry);
  const dialog=node('dialog');dialog.id='feedback-dialog';dialog.setAttribute('aria-labelledby','feedback-heading');
  const heading=node('div');heading.className='feedback-heading';
  const title=node('h2','Submit an idea or bug');title.id='feedback-heading';
  const close=node('button','✕');close.type='button';close.setAttribute('aria-label','Close feedback');heading.append(title,close);
  const form=node('form');
  function field(labelText,control){const label=node('label',labelText);label.append(control);form.append(label);return control;}
  const type=node('select');type.name='type';for(const[value,label]of[['idea','Idea'],['bug','Bug']]){const option=node('option',label);option.value=value;type.append(option);}field('Type',type);
  const subject=field('Short title',node('input'));subject.name='title';subject.required=true;subject.minLength=3;subject.maxLength=120;
  const details=field('Details',node('textarea'));details.name='details';details.required=true;details.minLength=10;details.maxLength=4000;details.placeholder='What would you like changed, or what went wrong?';
  const honeypot=node('label','Leave this empty');honeypot.className='feedback-honeypot';honeypot.setAttribute('aria-hidden','true');
  const website=node('input');website.name='website';website.tabIndex=-1;website.autocomplete='off';honeypot.append(website);form.append(honeypot);
  const consentLabel=node('label');consentLabel.className='feedback-consent';
  const consent=node('input');consent.type='checkbox';consent.required=true;
  consentLabel.append(consent,node('span','I understand this feedback will be posted publicly on GitHub. I will not include personal information.'));form.append(consentLabel);
  const challenge=node('div');challenge.id='feedback-turnstile';form.append(challenge);
  const submit=node('button','Submit feedback');submit.type='submit';submit.disabled=true;form.append(submit);
  const status=node('div');status.className='feedback-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  dialog.append(heading,form,status);document.body.append(dialog);
  let widget=null,token='',submitting=false,finished=false,uncertain=false,requestId='',fingerprint='',context=null;
  const updateButton=()=>{submit.disabled=submitting||finished||uncertain||!token||!consent.checked;submit.textContent=submitting?'Submitting…':'Submit feedback';close.disabled=submitting;};
  consent.addEventListener('change',updateButton);
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',event=>{if(submitting)event.preventDefault();});
  dialog.addEventListener('close',()=>{if(widget!==null&&window.turnstile)window.turnstile.remove(widget);widget=null;token='';updateButton();});
  entry.addEventListener('click',async()=>{
    for(const disclosure of document.querySelectorAll('#compact-more[open],#compact-location[open],#compact-map-info[open]'))disclosure.open=false;
    if(finished){form.reset();finished=false;uncertain=false;requestId='';fingerprint='';context=null;status.replaceChildren();}
    dialog.showModal();subject.focus();updateButton();
    try {
      const turnstile=await loadTurnstile();if(!dialog.open)return;
      widget=turnstile.render(challenge,{sitekey:SITE_KEY,action:'feedback',size:'flexible',callback:value=>{token=value;updateButton();},'expired-callback':()=>{token='';updateButton();},'error-callback':()=>{token='';status.textContent='Spam verification failed. Close and reopen to retry.';updateButton();}});
    }catch(error){status.textContent=error.message;}
  });
  const uncertainMessage=message=>{uncertain=true;status.replaceChildren(node('span',message+' '));const link=node('a','Check existing issues');link.href=ISSUES;link.target='_blank';link.rel='noopener noreferrer';status.append(link);};
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(submitting||finished||uncertain||!token||!form.reportValidity())return;
    const content=JSON.stringify([type.value,subject.value.trim(),details.value.trim()]);
    if(content!==fingerprint){fingerprint=content;requestId=crypto.randomUUID();context={dataset:state.activeDataset,view:state.viewMode};}
    const payload={type:type.value,title:subject.value.trim(),details:details.value.trim(),...context,requestId,turnstileToken:token,publicConsent:consent.checked,website:website.value};
    submitting=true;status.textContent='Submitting feedback…';updateButton();
    try {
      const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
      const body=await response.json();
      if(response.status!==201){
        if(response.status===409||response.status>=500)uncertainMessage(body.error||'Submission was not confirmed. Do not submit a duplicate.');
        else status.textContent=body.error||'Feedback could not be submitted. Please retry.';
      }else if(Number.isInteger(body.number)&&body.number>0&&body.url===ISSUES+'/'+body.number){
        finished=true;status.replaceChildren(node('span','Thanks—your feedback was submitted. '));
        const link=node('a','View issue #'+body.number);link.href=body.url;link.target='_blank';link.rel='noopener noreferrer';status.append(link);
      }else uncertainMessage('GitHub confirmation could not be checked. Your issue may already exist.');
    }catch{uncertainMessage('The connection ended before confirmation. Your feedback may have been posted; check issues before submitting again.');}
    finally {submitting=false;token='';if(widget!==null&&window.turnstile&&!finished)window.turnstile.reset(widget);updateButton();}
  });
}
function start() {
  const mount=()=>{const menu=document.querySelector('#compact-more .compact-popup');if(!menu)return false;installFeedback(menu);return true;};
  if(mount())return;
  const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
