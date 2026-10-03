const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const guard=require(path.join(root,'brief-guard.js'));
function element(value='') {
  return {value,attributes:{},listeners:{},textContent:'',disabled:false,
    classList:{add(){},remove(){},toggle(){}},
    setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},
    setCustomValidity(v){this.validationMessage=v;},
    addEventListener(type,callback){this.listeners[type]=callback;}
  };
}
function harness(enabled=true) {
  const fields=Object.fromEntries(['name','quantity','company','sector','message','contactName','email','phone','website'].map(key=>[key,element()]));
  fields.sector.value='Przemysł';
  fields.sector.options=guard.sectors.map(value=>({value}));
  const sectorLink=element();sectorLink.dataset={projectSector:'Motoryzacja'};
  const form=element(),status=element(),button=element(),fieldset=element(),counter=element();fieldset.disabled=true;
  form.elements={namedItem:key=>fields[key]};form.querySelectorAll=()=>Object.values(fields);
  form.reportValidity=()=>Object.values(fields).every(input=>!input.validationMessage);
  const nodes={'#project-form':form,'#form-status':status,'#prepare-inquiry':button,'#brief-fields':fieldset,'#message-count':counter};
  const blobs=[],downloads=[],timers=[],requests=[];let now=0, responder=async()=>({ok:true,json:async()=>({ok:true,message:'Serwer przyjął zapytanie.'})});
  const document={documentElement:{dataset:{},classList:{add(){}}},body:{classList:{add(){},remove(){},contains(){return false;}},append(){}},
    querySelector:selector=>nodes[selector]||null,querySelectorAll:selector=>selector==='[data-project-sector]'?[sectorLink]:[],getElementById:()=>null,
    addEventListener(){},createElement(){return {click(){downloads.push(this.download);},remove(){}};}};
  const window={crypto:{randomUUID:()=>require('node:crypto').randomUUID()},fetch:async(url,options)=>{requests.push({url,...options});return responder();},matchMedia:()=>({matches:true}),scrollY:0,addEventListener(){},ARBBriefGuard:enabled?guard:undefined,setTimeout:fn=>timers.push(fn)};
  vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{
    document,window,performance:{now:()=>now},Blob,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:local-test';},revokeObjectURL(){}},
    setTimeout:fn=>timers.push(fn),clearTimeout(){},AbortController,Intl,Date,CustomEvent:class{}
  });
  return {fields,form,status,button,fieldset,counter,blobs,downloads,timers,requests,sectorLink,respond(fn){responder=fn;},submit(){return form.listeners.submit({preventDefault(){}});}};
}
(async()=>{
 const h=harness();assert.equal(h.fieldset.disabled,false);
 await h.submit();assert.equal(h.requests.length,0);
 const values={name:'Osłona testowa',quantity:'10',company:'',sector:'Przemysł',message:'Projekt testowy o wymiarach 200 x 100 mm.',contactName:'Jan Testowy',email:'test@example.com',phone:'+48 600 000 000',website:''};
 for(const [k,v] of Object.entries(values))h.fields[k].value=v;
 await h.submit();assert.equal(h.requests.length,1);assert.equal(h.downloads.length,0);
 const payload=JSON.parse(h.requests[0].body);assert.equal(payload.email,values.email);assert.equal(payload.phone,values.phone);assert.equal(payload.contactName,values.contactName);assert.equal(h.requests[0].url,'inquiry.php');
 await h.submit();assert.equal(JSON.parse(h.requests[1].body).requestId,payload.requestId,'Same submission must reuse idempotency key');
 h.fields.message.value+=' Zmiana.';await h.submit();assert.notEqual(JSON.parse(h.requests[2].body).requestId,payload.requestId);
 h.respond(async()=>({ok:false,json:async()=>({ok:false,message:'Serwer nie przyjął wiadomości.'})}));await h.submit();assert.ok(h.status.textContent.includes('nie przyjął'));assert.equal(h.fields.email.value,values.email);assert.equal(h.fieldset.disabled,false);
 h.respond(async()=>{throw new Error('Network failure');});await h.submit();assert.ok(h.status.textContent.includes('Dane pozostają'));
 let resolve;h.respond(()=>new Promise(r=>resolve=r));const sending=h.submit();await h.submit();assert.equal(h.fieldset.disabled,true);const n=h.requests.length;resolve({ok:true,json:async()=>({ok:true,message:'Przyjęto'})});await sending;assert.equal(h.requests.length,n);assert.equal(h.fieldset.disabled,false);
 h.form.listeners.reset({preventDefault(){}});h.timers.at(-1)();assert.ok(h.status.textContent.includes('wyczyszczone'));
 const missing=harness(false);assert.equal(missing.fieldset.disabled,true);
 console.log('PASS: validation, contact payload, no TXT, duplicate protection, pending lock, server/network failure and recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;});
