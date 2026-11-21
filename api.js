/** Chamadas apenas à API Spring Boot. Nunca colocar as credenciais Fineract no browser. */
export const API_BASE_URL = 'https://api-blockchain-pfc-1021823144662.africa-south1.run.app';
export function el(id){return document.getElementById(id)}
export function showMessage(id,message,type='info'){
  const x = el(id); if(!x)return;
  x.textContent = message; x.className='message '+(type==='error'?'error':type==='success'?'success':''); x.hidden=false;
}
export function clearMessage(id){const x=el(id);if(x)x.hidden=true}
export function showBusy(button,busy,label='A processar…'){
  if(!button)return;
  if(busy){button.dataset.original=button.textContent;button.textContent=label;button.disabled=true;}
  else{button.textContent=button.dataset.original||button.textContent;button.disabled=false;}
}
export async function api(path,{method='GET',body,timeoutMs=30000}={}){
  const base=API_BASE_URL;
  if(location.protocol==='https:' && base.startsWith('http:')) throw new Error('O navegador bloqueia chamadas HTTP a partir de uma página HTTPS. Configura HTTPS na API ou utiliza um ambiente local de desenvolvimento.');
  let response;
  try{response=await fetch(base+path,{method,headers:{'Accept':'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(timeoutMs)});}
  catch(e){throw new Error('Falha de ligação à API (rede, CORS ou timeout). '+(e.message||''));}
  let data;const raw=await response.text();try{data=raw?JSON.parse(raw):null}catch{data={message:raw.slice(0,180)}}
  if(!response.ok){const info= typeof data?.detail==='string'?data.detail: typeof data?.message==='string'?data.message:typeof data?.error==='string'?data.error:response.statusText;
    const friendly=response.status===404?'Recurso não encontrado.':response.status===502?'A API não conseguiu concluir a operação no Fineract.':response.status===401||response.status===403?'Acesso não autorizado.':'Pedido não concluído.';
    throw new Error(`${friendly} HTTP ${response.status}${info?' — '+info:''}`);}
  return data;
}
export function records(data){return Array.isArray(data)?data:Array.isArray(data?.pageItems)?data.pageItems:Array.isArray(data?.results)?data.results:[]}
export function dateToday(){return new Date().toLocaleDateString('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'});}
export function fmtMoney(x){const n=Number(x);return Number.isFinite(n)?new Intl.NumberFormat('pt-MZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' MZN':String(x??'—')}
export function td(text){const cell=document.createElement('td');cell.textContent=String(text??'—');return cell;}
export function toRow(values){const tr=document.createElement('tr');for(const x of values)tr.appendChild(td(x));return tr;}
export function downloadBlob(blob,name){const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),5000)}
