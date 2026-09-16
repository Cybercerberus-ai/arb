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
  const fields=Object.fromEntries(['name','quantity','company','sector','message'].map(key=>[key,element()]));
  fields.sector.value='Przemysł';
  fields.sector.options=guard.sectors.map(value=>({value}));
  const sectorLink=element();sectorLink.dataset={projectSector:'Motoryzacja'};
  const form=element(),status=element(),button=element(),fieldset=element(),counter=element();fieldset.disabled=true;
  form.elements={namedItem:key=>fields[key]};form.querySelectorAll=()=>Object.values(fields);
  form.reportValidity=()=>Object.values(fields).every(input=>!input.validationMessage);
  const nodes={'#project-form':form,'#form-status':status,'#prepare-inquiry':button,'#brief-fields':fieldset,'#message-count':counter};
  const blobs=[],downloads=[],timers=[];let now=0;
  const document={documentElement:{dataset:{},classList:{add(){}}},body:{classList:{add(){},remove(){},contains(){return false;}},append(){}},
    querySelector:selector=>nodes[selector]||null,querySelectorAll:selector=>selector==='[data-project-sector]'?[sectorLink]:[],getElementById:()=>null,
    addEventListener(){},createElement(){return {click(){downloads.push(this.download);},remove(){}};}};
  const window={matchMedia:()=>({matches:true}),scrollY:0,addEventListener(){},ARBBriefGuard:enabled?guard:undefined,setTimeout:fn=>timers.push(fn)};
  vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{
    document,window,performance:{now:()=>now},Blob,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:local-test';},revokeObjectURL(){}},
    setTimeout:fn=>timers.push(fn),clearTimeout(){},Intl,Date,CustomEvent:class{}
  });
  return {fields,form,status,button,fieldset,counter,blobs,downloads,timers,sectorLink,clock(value){now=value;},submit(){form.listeners.submit({preventDefault(){}});}};
}
(async()=>{
  const h=harness();assert.equal(h.fieldset.disabled,false);
  h.sectorLink.listeners.click({button:0,ctrlKey:true});assert.equal(h.fields.sector.value,'Przemysł');
  h.fields.sector.setCustomValidity('previous error');h.fields.sector.setAttribute('aria-invalid','true');
  h.sectorLink.listeners.click({button:0});assert.equal(h.fields.sector.value,'Motoryzacja');assert.equal(h.fields.sector.validationMessage,'');assert.equal(h.fields.sector.attributes['aria-invalid'],undefined);
  h.submit();assert.equal(h.downloads.length,0);assert.ok(h.fields.name.validationMessage);
  Object.assign(h.fields.name,{value:'Osłona <test>'});h.fields.quantity.value='10';h.fields.message.value='Projekt testowy: osłona o wymiarach 200 x 100 mm.';
  h.submit();assert.equal(h.downloads.length,1);assert.equal(h.downloads[0],'ARB-opis-projektu.txt');
  const text=await h.blobs[0].text();assert.ok(text.includes('Nazwa projektu: Osłona <test>'));assert.ok(text.includes('nie zostały wysłane'));
  h.submit();assert.equal(h.downloads.length,1);assert.ok(h.status.textContent.includes('Odczekaj'));
  h.form.listeners.reset();h.fields.name.value='';h.fields.message.value='';h.timers.at(-1)();
  assert.equal(h.counter.textContent,'0 / 2500');assert.ok(h.status.textContent.includes('wyczyszczone'));
  h.fields.name.value='Następny projekt';h.fields.message.value='Projekt testowy o innym kształcie i wymiarach.';
  h.submit();assert.equal(h.downloads.length,1,'Reset must not bypass the cooldown');
  h.clock(3001);h.submit();assert.equal(h.downloads.length,2);
  const missing=harness(false);assert.equal(missing.fieldset.disabled,true);assert.equal(missing.form.listeners.submit,undefined);
  console.log('PASS: real app handler validates, generates plain TXT, limits repeats, preserves cooldown after reset, clears data, fails closed without guard.');
})();
