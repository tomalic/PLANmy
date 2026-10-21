/* PLANmy XLSX reader. Runs entirely in the browser; no uploads or external requests. */
const D = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const dec = new TextDecoder('utf-8');
function nodes(parent, tag) { return Array.from(parent.getElementsByTagNameNS(D,tag)); }
function child(parent, tag) { return Array.from(parent.children).find(x=>x.localName===tag) || null; }
function xml(source) {
  const doc = new DOMParser().parseFromString(dec.decode(source),'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw Error('El fitxer Excel conté XML no vàlid.');
  return doc;
}
function unzip(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), len=bytes.length;
  let end=-1;
  for(let i=len-22;i>=Math.max(0,len-65557);i--) if(view.getUint32(i,true)===0x06054b50) {end=i; break;}
  if(end<0)throw Error('No és un fitxer .xlsx vàlid (ZIP).');
  const files=new Map(), count=view.getUint16(end+10,true), offset=view.getUint32(end+16,true);
  if(count>2500)throw Error('El fitxer conté massa elements.');
  let pos=offset;
  for(let i=0;i<count;i++) {
    if(pos+46>len||view.getUint32(pos,true)!==0x02014b50)throw Error('Directori del fitxer Excel incorrecte.');
    const method=view.getUint16(pos+10,true), size=view.getUint32(pos+20,true), unpacked=view.getUint32(pos+24,true);
    const nameLen=view.getUint16(pos+28,true),extraLen=view.getUint16(pos+30,true),commentLen=view.getUint16(pos+32,true);
    const local=view.getUint32(pos+42,true),name=dec.decode(bytes.subarray(pos+46,pos+46+nameLen));
    pos+=46+nameLen+extraLen+commentLen;
    if(!name.startsWith('xl/')||(!name.endsWith('.xml')&&!name.endsWith('.rels')))continue;
    if(unpacked>25_000_000||size>25_000_000||size && unpacked/size>250)throw Error('El fitxer Excel té una mida descomprimida no segura.');
    if(local+30>len||view.getUint32(local,true)!==0x04034b50)throw Error('Entrada ZIP incorrecta.');
    const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
    if(start+size>len)throw Error('El fitxer Excel està incomplet.');
    const compressed=bytes.subarray(start,start+size);
    let data;
    if(method===0)data=compressed;
    else if(method===8) {
      if(!window.pako?.inflateRaw)throw Error('No s’ha carregat el descompressor local.');
      data=window.pako.inflateRaw(compressed);
    } else throw Error('Compressió Excel no compatible.');
    if(data.length!==unpacked)throw Error('La mida de les dades Excel no coincideix.');
    files.set(name,data);
  }
  return files;
}
function parseSheet(bytes, strings) {
  const root=xml(bytes), cells=new Map();
  for(const c of nodes(root,'c')) {
    const addr=c.getAttribute('r');
    if(!addr)continue;
    const v=child(c,'v'), f=child(c,'f'), it=child(c,'is');
    let value=v?.textContent??'';
    if(c.getAttribute('t')==='s')value=strings[Number(value)]??'';
    else if(it)value=nodes(it,'t').map(e=>e.textContent).join('');
    else if(c.getAttribute('t')!=='str'&&c.getAttribute('t')!=='inlineStr'&&value!==''&&!Number.isNaN(Number(value)))value=Number(value);
    cells.set(addr,{value,formula:f?.textContent??null});
  }
  return {get:(address)=>cells.get(address)?.value??'', formula:(address)=>cells.get(address)?.formula??null, cells};
}
const PLANS=[
  {title:'iPhone 24M', table:'RV iPhone 24 Meses',type:'iphone',months:24},
  {title:'Watch 24M',table:'RV Watch 24 Meses',type:'watch',months:24},
  {title:'iPhone 36M',table:'RV iPhone 36M',type:'iphone',months:36},
  {title:'iPad y Mac 36M',table:'RV 36 Meses',type:'mixed',months:36}
];
function modelParts(full,type) {
  const clean=full.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const match=clean.match(/\s+(\d+(?:\/\d+)*\s*mm|\d+\s*(?:GB|Gb|TB|Tb))$/i);
  if(match)return {model:clean.slice(0,match.index),variant:match[1].replace(/\s+/g,'')};
  return {model:clean,variant:'Estàndard'};
}
export async function importWorkbook(file) {
  if(!file||!(/\.xlsx$/i.test(file.name)))throw Error('Selecciona un Excel amb extensió .xlsx.');
  if(file.size>15*1024*1024)throw Error('L’Excel supera el límit de 15 MB.');
  const zip=unzip(new Uint8Array(await file.arrayBuffer()));
  const wb=zip.get('xl/workbook.xml'),rels=zip.get('xl/_rels/workbook.xml.rels');
  if(!wb||!rels)throw Error('Falten els arxius principals del llibre Excel.');
  const strings=[];
  if(zip.has('xl/sharedStrings.xml'))for(const si of nodes(xml(zip.get('xl/sharedStrings.xml')),'si'))strings.push(nodes(si,'t').map(x=>x.textContent).join(''));
  const refPaths=new Map();
  for(const link of Array.from(xml(rels).documentElement.children)) {
    const id=link.getAttribute('Id'),target=link.getAttribute('Target');
    if(id&&target) {
      const path=target.startsWith('/')?target.slice(1):'xl/'+target;
      const pieces=[]; for(const piece of path.split('/'))if(piece==='..')pieces.pop();else if(piece!=='.')pieces.push(piece);
      refPaths.set(id,pieces.join('/'));
    }
  }
  const sheetNames=new Map();
  for(const sheet of nodes(xml(wb),'sheet')) {
    const name=sheet.getAttribute('name'),id=sheet.getAttributeNS(R,'id')||sheet.getAttribute('r:id');
    const path=refPaths.get(id);
    if(path&&zip.has(path))sheetNames.set(name,parseSheet(zip.get(path),strings));
  }
  const result=[], notices=[];
  for(const cfg of PLANS) {
    const calc=sheetNames.get(cfg.title),table=sheetNames.get(cfg.table);
    if(!calc||!table)throw Error(`Falta un full necessari: ${!calc?cfg.title:cfg.table}.`);
    if(String(table.get('A2')).trim().toLowerCase()!=='modelo'||String(table.get('B2')).trim().toUpperCase()!=='PVP')throw Error(`La taula «${cfg.table}» ha canviat d'estructura.`);
    const term=Number(calc.get('C15')),tin=Number(calc.get('C14'));
    if(term!==cfg.months||!Number.isFinite(tin)||tin<0||tin>1)throw Error(`Condicions no reconegudes al full «${cfg.title}».`);
    if(!/\bPMT\(/i.test(calc.formula('F30')||'')||!/\bIRR\(/i.test(calc.formula('C16')||'')||!calc.formula('D'+(29+term))?.includes('SUM('))throw Error(`Les fórmules de «${cfg.title}» han canviat. Per seguretat, no s'importa fins a verificar-les.`);
    const products=[], seen=new Set();
    // Read the data table itself; not the Excel's inaccessible model-selection dropdown.
    for(let r=3;r<=1000;r++) {
      const name=String(table.get('A'+r)||'').trim(),price=Number(table.get('B'+r)),residual=Number(table.get('C'+r));
      if(!name)continue;
      if(!(price>0&&Number.isFinite(price)&&residual>=0&&Number.isFinite(residual)&&residual<price)) {
        notices.push(`${cfg.table}: fila ${r} ignorada (import no vàlid).`);continue;
      }
      const normalized=name.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
      if(seen.has(normalized)) {notices.push(`Producte duplicat a «${cfg.table}»: ${normalized}.`);continue;}
      seen.add(normalized);
      const family=cfg.type==='mixed'?(normalized.toLowerCase().startsWith('ipad')?'ipad':'mac'):cfg.type;
      products.push({name:normalized,...modelParts(normalized,family),family,price,residual});
    }
    if(!products.length)throw Error(`No s'han trobat productes vàlids a «${cfg.table}».`);
    result.push({id:cfg.title,type:cfg.type,months:term,tin,products});
  }
  const count=result.reduce((n,p)=>n+p.products.length,0);
  return {plans:result,meta:{filename:file.name,modified:file.lastModified||Date.now(),imported:Date.now(),count},notices};
}
