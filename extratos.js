import {api,el,showMessage,clearMessage,showBusy,dateToday,fmtMoney,toRow,downloadBlob} from './api.js';
el('startDate').value=dateToday().slice(0,8)+'01';el('endDate').value=dateToday();
let account=null;let result=null;
function resetLookup(){account=null;el('clientName').value='';el('issueButton').disabled=true;el('result').hidden=true;clearMessage('lookupStatus');clearMessage('issueStatus');}
el('accountNo').addEventListener('input',resetLookup);
async function lookup(){resetLookup();const accountNo=el('accountNo').value.trim();if(!accountNo){showMessage('lookupStatus','Indica o número da conta.','error');return;}
 const btn=el('lookupAccount');showBusy(btn,true,'A pesquisar…');try{account=await api('/api/v1/banking/accounts/lookup?accountNo='+encodeURIComponent(accountNo));
 el('clientName').value=account.clientName||'';
 if(account.currency!=='MZN')throw new Error('Esta demonstração suporta apenas contas em MZN.');
 if(!account.active)showMessage('lookupStatus','Conta encontrada, mas não está activa. Confirma o estado antes da emissão.','error');
 else{showMessage('lookupStatus',`Conta ${account.accountNo} encontrada e activa.`, 'success');el('issueButton').disabled=false;}
 }catch(e){account=null;el('clientName').value='';showMessage('lookupStatus',e.message,'error')}finally{showBusy(btn,false)}}
el('lookupAccount').addEventListener('click',lookup);
el('issueForm').addEventListener('submit',async e=>{e.preventDefault();clearMessage('issueStatus');if(!account){showMessage('issueStatus','Pesquisa uma conta válida primeiro.','error');return;}
 const startDate=el('startDate').value,endDate=el('endDate').value,type=document.querySelector('input[name=type]:checked')?.value;
 if(!startDate||!endDate||startDate>endDate){showMessage('issueStatus','A data inicial não pode ser posterior à data final.','error');return;}
 const btn=el('issueButton');showBusy(btn,true,'A emitir e ancorar…');el('result').hidden=true;
 try{result=await api('/api/v1/statements/issue',{method:'POST',body:{accountNo:account.accountNo,startDate,endDate,type}});renderResult(result);
 showMessage('issueStatus','Extracto emitido e ancorado. Consulta os comprovativos abaixo.','success');
 }catch(err){showMessage('issueStatus',err.message,'error')}finally{showBusy(btn,false)}});
function bytesFromBase64(value){const str=atob(value);return Uint8Array.from(str,c=>c.charCodeAt(0));}
function renderResult(data){
 el('outType').textContent=data.type==='A'?'Tipo A — Resumido':'Tipo B — Com movimentos';el('outHolder').textContent=data.titular||'—';el('outBalance').textContent=fmtMoney(data.saldoFinal);
 el('outAccount').textContent=data.accountNo||'—';el('outPeriod').textContent=data.periodo||'—';el('outHash').textContent=data.documentHash||'—';el('outTx').textContent=data.transactionHash||'—';el('outIssued').textContent=data.issuedAt||'—';
 const tbody=el('outMovements');tbody.replaceChildren();let movements=Array.isArray(data.movimentos)?data.movimentos:[];
 if(!movements.length)tbody.appendChild(toRow(['—','Sem movimentos','—','—']));
 else for(const m of movements)tbody.appendChild(toRow([m.data||'—',m.tipo==='C'?'Crédito':m.tipo==='D'?'Débito':m.tipo||'—',fmtMoney(m.valor),m.descricao||'—']));
 el('result').hidden=false;clearMessage('qrStatus');el('downloadCbor').disabled=!data.qrCodeDataBase64;
 const canvas=el('qrCanvas'),qr=window.QRCode;const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);
 if(!data.qrCodeDataBase64){showMessage('qrStatus','A resposta não contém o envelope CBOR.','error');return;}
 if(!qr?.toCanvas){showMessage('qrStatus','A biblioteca QR não carregou. Ainda podes guardar o envelope CBOR.','error');return;}
 try{const bytes=bytesFromBase64(data.qrCodeDataBase64);qr.toCanvas(canvas,[{data:bytes,mode:'byte'}],{errorCorrectionLevel:'M',margin:2,width:270},err=>{if(err)showMessage('qrStatus',`Não foi possível gerar o QR: ${err.message}`,'error')});}
 catch(err){showMessage('qrStatus','Não foi possível descodificar o envelope QR: '+err.message,'error');}
 el('result').scrollIntoView({behavior:'smooth',block:'start'});
}
el('downloadJson').addEventListener('click',()=>{if(!result)return;downloadBlob(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}),`extrato_${result.type||'integrado'}_${result.accountNo||'conta'}.json`)});
el('downloadCbor').addEventListener('click',()=>{if(!result?.qrCodeDataBase64)return;downloadBlob(new Blob([bytesFromBase64(result.qrCodeDataBase64)],{type:'application/cbor'}),`extrato_${result.type||'integrado'}_${result.accountNo||'conta'}.cbor`)});
el('printReceipt').addEventListener('click',()=>window.print());
