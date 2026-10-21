import {importWorkbook} from './parser.js';
import {compute} from './finance.js';
const $=id=>document.getElementById(id);
const EUR=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});
const NUM=new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
const euro=n=>EUR.format(n);
const percentage=n=>n===null?'—':`${NUM.format(n*100)} %`;
const CATEGORY=['iphone','watch','ipad','mac'];
const LABEL={iphone:'iPhone',watch:'Apple Watch',ipad:'iPad',mac:'Mac'};
let data=null,cat='iphone',months=24,current=null,toastTimer=null;
let previousChoice=null;
function toast(message,kind='') {
  const el=$('toast');el.textContent=message;el.className=`toast ${kind}`;el.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,7000);
}
function openPicker(){$('excelFile').click()}
function store() {
  return new Promise((resolve,reject)=> {
    const request=indexedDB.open('planmy-local-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>resolve(request.result);
  });
}
async function saveData(d) {
  const db=await store();
  try {await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(d,'catalog');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});}finally{db.close()}
}
async function loadData() {
  const db=await store();
  try {return await new Promise((resolve,reject)=>{const tx=db.transaction('state');const req=tx.objectStore('state').get('catalog');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});}finally{db.close()}
}
function plansFor(category) {return data.plans.filter(p=>p.products.some(x=>x.family===category))}
function activePlan(){return plansFor(cat).find(p=>p.months===months)||plansFor(cat)[0]}
function activeItems(){return (activePlan()?.products||[]).filter(p=>p.family===cat)}
function models(){return [...new Set(activeItems().map(p=>p.model))]}
function setOptions(select,options,preferred) {
  select.replaceChildren();
  options.forEach(item=>select.add(new Option(item,item)));
  if(preferred&&options.includes(preferred))select.value=preferred;
}
function refreshModels(preferredModel,preferredVariant) {
  const choices=models();setOptions($('model'),choices,preferredModel);
  refreshVariants(preferredVariant);
}
function refreshVariants(preferred) {
  const matches=activeItems().filter(p=>p.model===$('model').value);
  setOptions($('variant'),[...new Set(matches.map(x=>x.variant))],preferred);
  updateProduct();
}
function setCategory(category,preferredMonths,preferredProduct) {
  const plans=plansFor(category);
  if(!plans.length)return;
  cat=category;
  months=plans.some(p=>p.months===preferredMonths)?preferredMonths:plans[0].months;
  document.querySelectorAll('.category').forEach(el=>{el.classList.toggle('active',el.dataset.cat===cat);el.setAttribute('aria-pressed',String(el.dataset.cat===cat));});
  document.querySelectorAll('#terms button').forEach(btn=> {
    const exists=plans.some(p=>p.months===Number(btn.dataset.months));
    btn.disabled=!exists;btn.classList.toggle('selected',Number(btn.dataset.months)===months);
    btn.setAttribute('aria-pressed',String(Number(btn.dataset.months)===months));
  });
  $('termHelp').textContent=plans.length===1?`Aquesta categoria disposa d'un termini de ${months} mesos segons l'Excel.`:'Selecciona el termini disponible per a aquest producte.';
  refreshModels(preferredProduct?.model,preferredProduct?.variant);
}
function updateProduct() {
  current=activeItems().find(p=>p.model===$('model').value&&p.variant===$('variant').value)||null;
  const plan=activePlan();
  if(!current||!plan)return;
  $('printProduct').textContent=`${current.name} · ${months} + 1 quotes`;
  $('price').value=current.price.toFixed(2);
  $('residual').value=current.residual.toFixed(2);
  $('fees').value='0';
  $('tin').value=(plan.tin*100).toFixed(2);
  calculate();
}
function calculate() {
  if(!current)return;
  let result;
  try {
    result=compute({price:Number($('price').value),fees:Number($('fees').value),residual:Number($('residual').value),tin:Number($('tin').value)/100,months});
  }catch(e){$('monthly').textContent='—';$('lastQuota').textContent='—';$('interest').textContent='—';$('owed').textContent='—';$('tae').textContent='—';$('tinOut').textContent='—';$('currentPrice').textContent='—';$('amortRows').replaceChildren();toast(e.message,'error');return}
  $('monthly').textContent=euro(result.regular);
  $('lastQuota').textContent=euro(result.residual);
  $('currentPrice').textContent=euro(result.price);
  $('termBadge').textContent=`${months} + 1 quotes`;
  $('regularCount').textContent=String(months);
  $('interest').textContent=euro(result.interest);
  $('owed').textContent=euro(result.owed);
  $('tinOut').textContent=percentage(result.tin);
  $('tae').textContent=percentage(result.tae);
  const values=[['Preu del producte',result.price],['Despeses',result.fees],['Crèdit total',result.loan],['Interessos',result.interest],['Cost total del crèdit',result.creditCost],['Total a retornar',result.owed],['Penúltima quota mensual',result.lastMonthly],['Quota residual',result.residual]];
  const breakdown=$('breakdown');breakdown.replaceChildren();
  for(const [label,value] of values) {
    const div=document.createElement('div'),name=document.createElement('span'),amount=document.createElement('strong');
    name.textContent=label;amount.textContent=euro(value);div.append(name,amount);breakdown.append(div);
  }
  const body=$('amortRows');body.replaceChildren();const frag=document.createDocumentFragment();
  for(const row of result.rows) {
    const tr=document.createElement('tr');
    for(const value of [row.period,euro(row.begin),euro(row.interest),euro(row.amort),euro(row.payment),euro(row.outstanding)]){const td=document.createElement('td');td.textContent=value;tr.append(td)}
    frag.append(tr);
  }
  const tr=document.createElement('tr');for(const value of ['Residual',euro(result.residual),euro(0),euro(result.residual),euro(result.residual),euro(0)]){const td=document.createElement('td');td.textContent=value;tr.append(td)}frag.append(tr);body.append(frag);
}
function startDashboard() {
  $('welcome').hidden=true;$('dashboard').hidden=false;
  $('fileName').textContent=data.meta.filename;
  const modified=new Date(data.meta.modified).toLocaleDateString('ca-ES');
  $('fileMeta').textContent=`${data.meta.count} registres · Excel del ${modified}`;
  document.querySelectorAll('.category').forEach(button=>button.disabled=!plansFor(button.dataset.cat).length);
  const preferred=CATEGORY.includes(cat)&&plansFor(cat).length?cat:CATEGORY.find(c=>plansFor(c).length);
  setCategory(preferred,months,previousChoice);
}
async function importFile(file) {
  if(!file)return;
  const buttons=[$('firstImport'),$('updateTop'),$('updateBottom')];
  buttons.forEach(b=>b.disabled=true);
  toast('Llegint i validant l’Excel al teu dispositiu…');
  try {
    const parsed=await importWorkbook(file);
    // Only publish the new catalog in this browser after complete parsing/validation.
    let persisted=true;
    try {await saveData(parsed)} catch {persisted=false}
    data=parsed;
    previousChoice=current?{model:current.model,variant:current.variant}:null;
    startDashboard();
    const note=!persisted?' No s’ha pogut desar al dispositiu; caldrà reimportar-lo en tornar a obrir.':'';
    toast(`Excel importat correctament: ${parsed.meta.count} registres.${note} ${parsed.notices.length?`${parsed.notices.length} avisos de validació.`:''}`,(!persisted||parsed.notices.length)?'warning':'');
  }catch(e){toast(`No s'ha importat l'Excel. ${e.message}`,'error')}
  finally{buttons.forEach(b=>b.disabled=false);$('excelFile').value=''}
}
function theme(next) {document.documentElement.dataset.theme=next;localStorage.setItem('planmy-theme',next);$('themeButton').title=next==='dark'?'Canviar a mode clar':'Canviar a mode obscur'}
async function init() {
  theme(localStorage.getItem('planmy-theme')||'light');
  $('themeButton').addEventListener('click',()=>theme(document.documentElement.dataset.theme==='light'?'dark':'light'));
  ['firstImport','updateTop','updateBottom'].forEach(id=>$(id).addEventListener('click',openPicker));
  $('excelFile').addEventListener('change',e=>importFile(e.target.files?.[0]));
  document.querySelectorAll('.category').forEach(btn=>btn.addEventListener('click',()=>setCategory(btn.dataset.cat,months)));
  document.querySelectorAll('#terms button').forEach(btn=>btn.addEventListener('click',()=> {
    const old=current?{model:current.model,variant:current.variant}:null;
    setCategory(cat,Number(btn.dataset.months),old);
  }));
  $('model').addEventListener('change',()=>refreshVariants());
  $('variant').addEventListener('change',updateProduct);
  ['price','residual','fees','tin'].forEach(id=>$(id).addEventListener('input',calculate));
  $('resetValues').addEventListener('click',updateProduct);
  $('printButton').addEventListener('click',()=>window.print());
  try {
    data=await loadData();
    if(data?.plans?.length&&data.meta?.filename)startDashboard();
    else $('welcome').hidden=false;
  }catch(e){$('welcome').hidden=false;toast('El navegador no permet desar dades localment. Hauràs de carregar l’Excel cada vegada.','warning')}
  if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();
