import {api,el,showMessage,clearMessage,showBusy,records,dateToday,fmtMoney,toRow} from './api.js';
el('activationDate').value=dateToday();el('openedOnDate').value=dateToday();el('movementDate').value=dateToday();
let account=null;let listClients=[];let products=[];
function chooseTab(which){for(const w of ['Clientes','Movimentos']){const yes=w===which;el('btn'+w).setAttribute('aria-selected',String(yes));el('tab'+w).hidden=!yes;}}
el('btnClientes').addEventListener('click',()=>chooseTab('Clientes'));
el('btnMovimentos').addEventListener('click',()=>chooseTab('Movimentos'));
async function loadClients(){
  clearMessage('listStatus');
  try{const data=await api('/api/v1/banking/clients'); listClients=records(data);
    const select=el('clientId');select.replaceChildren(new Option('Selecciona um cliente',''));
    const tbody=el('clientsTable');tbody.replaceChildren();
    if(!listClients.length){tbody.appendChild(toRow(['—','Não há clientes registados.','—']));return;}
    for(const c of listClients){const id=c.id??c.clientId;const name=c.displayName||c.fullName||[c.firstname,c.lastname].filter(Boolean).join(' ')||'Cliente';select.add(new Option(`${name} · #${id}`,String(id)));tbody.appendChild(toRow([id,name,c.status?.value|| (c.active?'Activo':'—')]));}
  }catch(e){showMessage('listStatus',e.message,'error');}}
async function loadProducts(){
  clearMessage('accountStatus');
  try{products=records(await api('/api/v1/banking/accounts/products'));
    const select=el('productId');select.replaceChildren(new Option('Selecciona um produto',''));
    for(const p of products){const code=p.currency?.code||p.currencyCode||'—';select.add(new Option(`${p.name||'Produto'} · ${code} · #${p.id}`,String(p.id)));}
    if(!products.length)showMessage('accountStatus','Não existem produtos bancários disponíveis. Para criar o produto de demonstração, utiliza o endpoint de configuração do backend.', 'info');
  }catch(e){showMessage('accountStatus',e.message,'error');}}
const reload=async()=>{await Promise.all([loadClients(),loadProducts()])};
el('refreshLists').addEventListener('click',reload);el('reloadClients').addEventListener('click',loadClients);
el('clientForm').addEventListener('submit',async e=>{e.preventDefault();const btn=el('createClient');showBusy(btn,true);clearMessage('clientStatus');try{
  const firstname=el('firstname').value.trim(),lastname=el('lastname').value.trim();if(!firstname||!lastname)throw new Error('Nome e apelido são obrigatórios.');
  const activationDate=el('activationDate').value; const result=await api('/api/v1/banking/clients',{method:'POST',body:{firstname,lastname,...(activationDate?{activationDate}:{})}});
  showMessage('clientStatus',`Cliente criado com sucesso. Identificador: ${result?.resourceId??result?.clientId??result?.id??'consultar lista'}.`,'success');e.target.reset();el('activationDate').value=dateToday();await loadClients();
}catch(err){showMessage('clientStatus',err.message,'error')}finally{showBusy(btn,false)}});
el('accountForm').addEventListener('submit',async e=>{e.preventDefault();const btn=el('openAccount');showBusy(btn,true);clearMessage('accountStatus');try{
 const clientId=Number(el('clientId').value),productId=Number(el('productId').value),openedOnDate=el('openedOnDate').value;
 if(!(clientId>0&&productId>0))throw new Error('Selecciona um cliente e um produto bancário.');
 const result=await api('/api/v1/banking/accounts',{method:'POST',body:{clientId,productId,...(openedOnDate?{openedOnDate}:{})}});
 showMessage('accountStatus',`Conta criada e activada: ${result.accountNo} (ID interno ${result.id}). Podes utilizar este número no separador Transacções.`,'success');
}catch(err){showMessage('accountStatus',err.message+' Se a abertura falhou numa etapa posterior, confirma o estado da conta antes de repetir.','error')}finally{showBusy(btn,false)}});
async function lookup(){clearMessage('lookupStatus');clearMessage('transactionStatus');account=null;el('accountSummary').hidden=true;el('postMovement').disabled=true;el('reloadTransactions').disabled=true;el('transactionsTable').replaceChildren(toRow(['—','—','—','—']));
 const accountNo=el('accountNo').value.trim();if(!accountNo){showMessage('lookupStatus','Introduz o número da conta.','error');return;}
 const btn=el('lookupAccount');showBusy(btn,true,'A pesquisar…');try{
 account=await api('/api/v1/banking/accounts/lookup?accountNo='+encodeURIComponent(accountNo));
 el('accountHolder').textContent=account.clientName||'—';el('accountCurrency').textContent=account.currency||'—';el('accountActive').textContent=account.active?'Activa':'Inactiva';el('accountSummary').hidden=false;
 el('postMovement').disabled=!account.active;el('reloadTransactions').disabled=false;
 if(!account.active)showMessage('lookupStatus','A conta não está activa. Não é possível registar movimentos.','error');else showMessage('lookupStatus','Conta encontrada. Já podes registar ou consultar movimentos.','success');
 await loadTransactions();
 }catch(e){showMessage('lookupStatus',e.message,'error')}finally{showBusy(btn,false,'Pesquisar')}}
el('lookupAccount').addEventListener('click',lookup);el('accountNo').addEventListener('input',()=>{account=null;el('postMovement').disabled=true;el('reloadTransactions').disabled=true;el('accountSummary').hidden=true;clearMessage('lookupStatus')});
async function loadTransactions(){if(!account)return;clearMessage('movementsStatus');try{const data=await api(`/api/v1/banking/accounts/${account.accountId}/transactions`);const tbody=el('transactionsTable');tbody.replaceChildren();if(!Array.isArray(data)||!data.length){tbody.appendChild(toRow(['—','Nenhum movimento','—','—']));return;}
 for(const t of data){if(t.reversed)continue;tbody.appendChild(toRow([t.date||'—',t.direction==='C'?'Depósito':t.direction==='D'?'Levantamento':t.direction||'—',fmtMoney(t.amount),t.description||'—']));}
 if(!tbody.children.length)tbody.appendChild(toRow(['—','Nenhum movimento válido','—','—']));
}catch(e){showMessage('movementsStatus',e.message,'error')}}
el('reloadTransactions').addEventListener('click',loadTransactions);
el('transactionForm').addEventListener('submit',async e=>{e.preventDefault();clearMessage('transactionStatus');if(!account?.active){showMessage('transactionStatus','Pesquisa uma conta activa primeiro.','error');return;}const btn=el('postMovement');showBusy(btn,true);try{
 const operation=document.querySelector('input[name=operation]:checked').value;const amount=Number(el('amount').value),date=el('movementDate').value;
 if(!Number.isFinite(amount)||amount<=0||!date)throw new Error('Introduz um valor positivo e uma data válida.');
 await api(`/api/v1/banking/accounts/${account.accountId}/transactions`,{method:'POST',body:{operation,amount,date}});
 showMessage('transactionStatus','Movimento registado no Fineract.','success');el('amount').value='';await loadTransactions();
}catch(err){showMessage('transactionStatus',err.message,'error')}finally{showBusy(btn,false)}});
reload();
