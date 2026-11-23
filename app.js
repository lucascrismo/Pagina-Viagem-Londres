const $ = id => document.getElementById(id);
const CHAVE = "viagem-londres-v1";
const NOMES = ["✈️ Passagem principal","🚌 Trecho Curitiba ⇄ São Paulo","🏨 Hospedagem","🎫 Atrações","🍽️ Alimentação","🚇 Transporte local","🛡️ Seguro viagem","📦 Outros gastos"];
const vazio = () => ({categorias: NOMES.map((n,i) => ({id:"c"+i, nome:n, itens:[]}))});

function carregar(){
  try { const t = localStorage.getItem(CHAVE); if (t) return JSON.parse(t); } catch(e) {}
  return vazio();
}
// Várias viagens: cada uma guarda seus próprios dados em "dados"
const CHAVE2 = "viagens-v2";
function lerLoja(){
  try { const t = localStorage.getItem(CHAVE2); if (t) return JSON.parse(t); } catch(e) {}
  // Migração: os dados antigos viram a viagem Londres 2027
  return {viagens:[{id:"v1", nome:"Londres 2027", destino:"Londres", saida:"2027-02-06", moeda:"GBP", forma:"roundel", cor1:"#dc241f", cor2:"#0019a8", dados:carregar()}]};
}
let loja = lerLoja(), viagem = null;
function salvar(){ if (viagem) viagem.dados = estado; try { localStorage.setItem(CHAVE2, JSON.stringify(loja)); } catch(e) { alert("Não foi possível salvar: o armazenamento do navegador está cheio. Remova imagens grandes ou exporte um backup."); } }

let estado = vazio(), edit = null;
// Configurações da meta: pessoas, meses restantes e saldo em caixa
const MESES = [["Até Jul/2026",0],["Ago/2026",0],["Set/2026",0],["Out/2026",0],["Nov/2026",0],["Dez/2026",1],["Jan/2027",1],["Fev/2027",1]];
// ---- Aportes por mês (AAAA-MM) ----
const MN = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const ehMes = m => /^\d{4}-\d{2}$/.test(m);
const rotuloMes = iso => MN[+iso.split("-")[1]-1] + "/" + iso.split("-")[0];
const rm = a => a.rotulo || (ehMes(a.mes) ? rotuloMes(a.mes) : a.mes);
const mesAtual = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0"); };
function mesesEntre(ini, fim){
  const out = []; let [a,m] = ini.split("-").map(Number); const [fa,fm] = fim.split("-").map(Number);
  while ((a < fa || (a === fa && m <= fm)) && out.length <= 120) { out.push(a + "-" + String(m).padStart(2,"0")); m++; if (m > 12) { m = 1; a++; } }
  return out;
}
function isoDeRotulo(s){
  const r = /(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\/(\d{4})/.exec(String(s));
  return r ? r[2] + "-" + String(MN.indexOf(r[1])+1).padStart(2,"0") : null;
}
// Cria uma linha para cada mês do período; meses fora do período só saem se estiverem vazios
function ajustarAportes(){
  const g = estado.config, alvo = mesesEntre(g.inicio, g.fim), por = new Map(estado.aportes.map(a => [a.mes, a]));
  const novos = alvo.map(m => por.get(m) || {id:"a"+m, mes:m, v:Array(g.pessoas).fill(0)});
  estado.aportes.forEach(a => { if (!alvo.includes(a.mes) && totA(a) > 0) novos.push(a); });
  estado.aportes = novos.sort((x,y) => x.mes.localeCompare(y.mes));
}
function periodo(k, val){
  const g = estado.config;
  if (k === "inicio" || k === "fim") {
    if (!ehMes(val)) return;
    const n = Object.assign({}, g, {[k]: val});
    if (n.inicio > n.fim) { alert("O último mês não pode ser anterior ao primeiro."); aportes(); return; }
    if (mesesEntre(n.inicio, n.fim).length > 120) { alert("Período muito longo (máximo de 120 meses)."); aportes(); return; }
  }
  g[k] = val; ajustarAportes(); tudo();
}

const totA = a => a.v.reduce((x,y) => x+(+y||0), 0);
function norm(){
  const g = estado.config = Object.assign({pessoas:2, cotacao:0, usd:0, ajuste:0}, estado.config || {});
  delete g.caixa; delete g.meses;
  if (!Array.isArray(estado.conversoes)) estado.conversoes = [];
  if (!Array.isArray(estado.despesas)) estado.despesas = [];
  if (!estado.roteiro || typeof estado.roteiro !== "object") estado.roteiro = {};
  if (!Array.isArray(estado.roteiro.dias)) estado.roteiro.dias = [];
  if (!Array.isArray(estado.roteiro.passes)) estado.roteiro.passes = [];
  if (typeof estado.roteiro.mapa !== "string") estado.roteiro.mapa = "";
  if (typeof estado.roteiro.passeEscolhido !== "string") estado.roteiro.passeEscolhido = "";
  estado.roteiro.dias.forEach(d => { if (!Array.isArray(d.itens)) d.itens = []; });
  if (!Array.isArray(estado.aportes)) estado.aportes = [];
  g.pessoas = Math.max(1, Math.min(10, Math.round(+g.pessoas) || 2));
  if (!Array.isArray(g.nomes)) g.nomes = [];
  if (g.nome1) g.nomes[0] = g.nome1;
  if (g.nome2) g.nomes[1] = g.nome2;
  delete g.nome1; delete g.nome2;
  for (let i = 0; i < g.pessoas; i++) if (!g.nomes[i]) g.nomes[i] = "Pessoa " + (i+1);
  g.nomes.length = g.pessoas;
  estado.aportes.forEach(a => {
    if (!ehMes(a.mes)) { const iso = isoDeRotulo(a.mes); if (iso) { if (/^Até/i.test(a.mes)) a.rotulo = a.mes; a.mes = iso; } }
    delete a.futuro;
    if (!Array.isArray(a.v)) { a.v = [a.lucas || 0, a.emily || 0]; delete a.lucas; delete a.emily; }
    for (let i = 0; i < g.pessoas; i++) a.v[i] = +a.v[i] || 0;
    a.v.length = g.pessoas;
  });
  const ms = estado.aportes.map(a => a.mes).filter(ehMes).sort();
  if (!ehMes(g.inicio)) g.inicio = ms[0] || mesAtual();
  if (!ehMes(g.fim)) g.fim = ms.length ? ms[ms.length-1] : (viagem ? viagem.saida.slice(0,7) : g.inicio);
  if (g.fim < g.inicio) g.fim = g.inicio;
  ajustarAportes();
}
function definirPessoas(n){
  const g = estado.config; n = Math.max(1, Math.min(10, Math.round(n) || 1));
  if (n < g.pessoas && estado.aportes.some(a => a.v.slice(n).some(x => x > 0)) && !confirm("Reduzir o número de pessoas apaga os aportes das pessoas removidas. Continuar?")) { tudo(); return; }
  g.pessoas = n; norm(); tudo();
}
const U = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"USD"});
norm();

const R = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc = s => String(s==null?"":s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// Total de um item: quantidade x valor x pessoas (ou o total fixo, se existir)
const total = i => (i.totalFixo!=null && i.totalFixo!=="") ? Number(i.totalFixo) : (+i.qtd||0)*(+i.valor||0)*(+i.pax||1);
const soma = (c,p) => c.itens.filter(i => p===undefined || !!i.pago===p).reduce((s,i) => s+total(i), 0);
const todos = p => estado.categorias.reduce((s,c) => s+soma(c,p), 0);

function calc(){
  const T=todos(), P=todos(true), D=T-P, g=estado.config;
  const ar = estado.aportes.reduce((x,a) => x+totA(a), 0);
  const nv = estado.conversoes.filter(v => !v.base);
  const usdTot = g.usd + nv.reduce((x,v) => x+v.usd, 0);
  const deb = nv.filter(v => v.caixa).reduce((x,v) => x+v.usd*v.cotacao, 0);
  const uso=P+g.ajuste+deb, caixa=ar-uso, conv=usdTot*g.cotacao, disp=caixa+conv;
  const falta=Math.max(D-disp,0);
  const mA = mesAtual(), meses = estado.aportes.filter(a => ehMes(a.mes) && a.mes >= mA && a.mes <= g.fim && !totA(a)).length;
  const pm = meses ? falta/meses : 0, pp = g.pessoas ? pm/g.pessoas : 0;
  return {T,P,D,g,ar,uso,caixa,conv,disp,falta,meses,pm,pp,usdTot};
}

function resumo(){
  const c=calc(), g=c.g, pc=c.T?Math.round(c.P/c.T*100):0;
  const mm = v => c.meses ? R(v) : "—";
  $("resumo").innerHTML =
   `<div class="cards">
      <div class="card"><small>Total estimado</small><b>${R(c.T)}</b></div>
      <div class="card"><small>Já pago</small><b>${R(c.P)}</b></div>
      <div class="card"><small>Pendente</small><b>${R(c.D)}</b></div>
    </div>
    <div class="card"><div class="topo"><h2>Pagamentos concluídos</h2><b>${pc}%</b></div><div class="trilho"><i style="width:${pc}%"></i></div></div>
    <div class="card"><h2>Saldo disponível em caixa</h2>
      <div class="cfg">
        <label>Cotação do dólar hoje (R$)<input type="number" step="any" inputmode="decimal" data-cfg="cotacao" value="${g.cotacao}"></label>
      </div>
      <table>
        <tr><td>Total arrecadado (aportes)</td><td>${R(c.ar)}</td></tr>
        <tr><td>(−) Já utilizado</td><td>${R(c.uso)}</td></tr>
        <tr><td>Saldo em caixa (R$)</td><td><b>${R(c.caixa)}</b></td></tr>
        <tr><td>Saldo em dólar (${U(c.usdTot)}) em R$</td><td>${R(c.conv)}</td></tr>
        <tr><td>Saldo total disponível</td><td><b>${R(c.disp)}</b></td></tr>
      </table></div>
    <div class="card"><h2>Quanto falta juntar</h2>
      <div class="cfg"><label>Pessoas<input type="number" min="1" step="1" inputmode="numeric" data-cfg="pessoas" value="${g.pessoas}"></label></div>
      <table>
        <tr><td>Pendente a cobrir</td><td>${R(c.D)}</td></tr>
        <tr><td>(−) Saldo total disponível</td><td>${R(c.disp)}</td></tr>
        <tr><td>Falta juntar</td><td><b>${R(c.falta)}</b></td></tr>
        <tr><td>Meses restantes (sem aporte)</td><td>${c.meses}</td></tr>
        <tr><td>Por mês (total)</td><td>${mm(c.pm)}</td></tr>
        <tr><td>Por pessoa, por mês</td><td><b>${mm(c.pp)}</b></td></tr>
        <tr><td>Por pessoa, até o fim</td><td>${R(g.pessoas?c.falta/g.pessoas:0)}</td></tr>
      </table></div>
    <div class="card"><h2>Por categoria</h2><div style="overflow-x:auto"><table>
      <tr><th>Categoria</th><th>Total</th><th>Pago</th><th>Pendente</th></tr>
      ${estado.categorias.map(k => `<tr><td>${esc(k.nome)}</td><td>${R(soma(k))}</td><td>${R(soma(k,true))}</td><td>${R(soma(k,false))}</td></tr>`).join("")}
    </table></div></div>`;
}

function aportes(){
  const g = estado.config;
  const campo = (a,i) => `<td><input type="number" step="any" inputmode="decimal" data-ap="${a.id}|${i}" value="${a.v[i] || ""}"></td>`;
  $("aportes").innerHTML =
   `<div class="card"><h2>Período e pessoas</h2>
      <div class="cfg">
        <label>Primeiro mês<input type="month" data-cp="inicio" value="${g.inicio}"></label>
        <label>Último mês<input type="month" data-cp="fim" value="${g.fim}"></label>
        <label>Número de pessoas<input type="number" min="1" max="10" step="1" inputmode="numeric" data-cfg="pessoas" value="${g.pessoas}"></label>
      </div>
      <div class="cfg">${g.nomes.map((n,i) => `<label>Nome da pessoa ${i+1}<input data-nome="${i}" value="${esc(n)}"></label>`).join("")}</div>
      <p class="vazio">Cada mês do período vira uma linha e cada pessoa vira uma coluna. Se você encurtar o período, meses que já têm valor não são apagados.</p></div>
    <div class="card"><h2>Aportes mensais</h2>
      <p class="vazio">Informe quanto cada pessoa depositou em cada mês. Editar um mês não altera os outros. Meses a partir do mês atual, ainda sem valor, contam como meses restantes.</p>
      <div style="overflow-x:auto"><table class="ap">
        <tr><th>Mês</th>${g.nomes.map(n => `<th>${esc(n)} (R$)</th>`).join("")}<th>Total</th></tr>
        ${estado.aportes.map(a => `<tr><td>${esc(rm(a))}</td>${g.nomes.map((n,i) => campo(a,i)).join("")}<td id="at_${a.id}">${R(totA(a))}</td></tr>`).join("")}
        <tr><td><b>Total</b></td>${g.nomes.map((n,i) => `<td id="tc_${i}"></td>`).join("")}<td id="tt"></td></tr>
      </table></div></div>`;
  aportesTotais();
}
function aportesTotais(){
  estado.config.nomes.forEach((n,i) => { $("tc_"+i).textContent = R(estado.aportes.reduce((x,a) => x+(+a.v[i]||0), 0)); });
  $("tt").textContent = R(estado.aportes.reduce((x,a) => x+totA(a), 0));
}

const fmt = d => d ? d.split("-").reverse().join("/") : "—";

function grafico(cv){
  const L = [...cv].sort((a,b) => (a.data||"").localeCompare(b.data||""));
  if (L.length < 2) return `<p class="vazio">Registre ao menos 2 compras para ver o gráfico.</p>`;
  const vals = L.map(x => x.cotacao), mn = Math.min(...vals), mx = Math.max(...vals), pad = (mx-mn)||1;
  const W=600, H=220, m=36, X = i => m+i*(W-2*m)/(L.length-1), Y = v => H-m-8-(v-mn)/pad*(H-2*m-24);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Cotação de cada compra de dólar">
    <line x1="${m}" y1="${H-m}" x2="${W-m}" y2="${H-m}" stroke="var(--borda)"/>
    <polyline points="${L.map((x,i) => X(i).toFixed(1)+","+Y(x.cotacao).toFixed(1)).join(" ")}" fill="none" stroke="var(--azul)" stroke-width="2"/>
    ${L.map((x,i) => `<circle cx="${X(i)}" cy="${Y(x.cotacao)}" r="4" fill="var(--azul)"/><text x="${X(i)}" y="${Y(x.cotacao)-10}" font-size="12" text-anchor="middle" fill="var(--texto)">${x.cotacao.toFixed(2)}</text><text x="${X(i)}" y="${H-12}" font-size="11" text-anchor="middle" fill="var(--suave)">${x.data ? fmt(x.data).slice(0,5) : i+1}</text>`).join("")}
  </svg>`;
}

function dolar(){
  const g=estado.config, cv=estado.conversoes, c=calc();
  const totU = cv.reduce((x,v) => x+v.usd, 0), totR = cv.reduce((x,v) => x+v.usd*v.cotacao, 0), med = totU ? totR/totU : 0;
  const hoje = new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  $("dolar").innerHTML =
   `<div class="card"><h2>Saldo em dólar</h2>
      <div class="cfg"><label>Saldo base (US$)<input type="number" step="any" inputmode="decimal" data-cfg="usd" value="${g.usd}"></label></div>
      <table>
        <tr><td>Saldo base</td><td>${U(g.usd)}</td></tr>
        <tr><td>(+) Compras novas</td><td>${U(c.usdTot-g.usd)}</td></tr>
        <tr><td>Saldo atual</td><td><b>${U(c.usdTot)}</b></td></tr>
      </table>
      <p class="vazio">O saldo base já inclui as compras marcadas como "no saldo". Só as compras novas alteram o dólar e o caixa em reais.</p>
      <details><summary class="vazio">Avançado: ajuste de conciliação</summary>
        <div class="cfg"><label>Ajuste (R$)<input type="number" step="any" inputmode="decimal" data-cfg="ajuste" value="${g.ajuste}"></label></div>
        <p class="vazio">Pequena diferença entre o dólar que saiu do caixa e o que foi pago no cartão em dólar. Serve só para o saldo em caixa bater com a planilha antiga. Pode ficar como está.</p></details></div>
    <div class="card"><h2>Registrar compra de dólar</h2>
      <div class="cfg">
        <label>Data<input type="date" id="cv_data" value="${hoje}"></label>
        <label>Quantidade (US$)<input type="number" step="any" inputmode="decimal" id="cv_usd"></label>
        <label>Cotação do dia (R$)<input type="number" step="any" inputmode="decimal" id="cv_cot"></label>
      </div>
      <label class="chk"><input type="checkbox" id="cv_caixa" checked> Pago com o saldo em reais (desconta do caixa)</label>
      <div class="acoes"><button class="btn" id="cv_add">Registrar compra</button></div></div>
    <div class="card"><h2>Compras registradas</h2>
      ${cv.length ? `<div style="overflow-x:auto"><table>
        <tr><th>Data</th><th>US$</th><th>Cotação</th><th>R$</th><th></th></tr>
        ${cv.map(x => `<tr><td>${fmt(x.data)}${x.base ? ` <small class="vazio">(no saldo)</small>` : ""}</td><td>${U(x.usd)}</td><td>${R(x.cotacao)}</td><td>${R(x.usd*x.cotacao)}</td><td><button class="st" data-dc="${x.id}" aria-label="Excluir compra">✕</button></td></tr>`).join("")}
      </table></div>
      <table>
        <tr><td>Total comprado</td><td>${U(totU)}</td></tr>
        <tr><td>Total em reais</td><td>${R(totR)}</td></tr>
        <tr><td>Cotação média</td><td><b>${R(med)}</b></td></tr>
      </table>` : `<p class="vazio">Nenhuma compra registrada.</p>`}</div>
    <div class="card"><h2>Cotação de cada compra</h2>${grafico(cv)}</div>`;
}

function addCv(){
  const u = +$("cv_usd").value, c = +$("cv_cot").value;
  if (!(u>0 && c>0)) { alert("Informe a quantidade em dólar e a cotação."); return; }
  estado.conversoes.push({id:"v"+Date.now(), data:$("cv_data").value, usd:u, cotacao:c, caixa:$("cv_caixa").checked, base:false});
  tudo();
}

// ---- Conversor de moedas (cotações de referência da API Frankfurter) ----
const MOEDAS = ["USD","BRL","GBP","EUR","CAD","AUD","CHF","JPY","ARS","MXN"];
const CK = "viagem-londres-cambio";
const cb = {de:"GBP", para:"USD", valor:1, taxa:0, info:"", manual:""};
const lerCache = () => { try { return JSON.parse(localStorage.getItem(CK)) || {}; } catch(e) { return {}; } };

function conversor(){
  const op = v => MOEDAS.map(m => `<option ${m===v?"selected":""}>${m}</option>`).join("");
  $("conv").innerHTML =
   `<div class="card"><h2>Conversor de moedas</h2>
      <div class="cfg">
        <label>Valor<input type="number" step="any" inputmode="decimal" id="cb_val" value="${cb.valor}"></label>
        <label>De<select id="cb_de">${op(cb.de)}</select></label>
        <label>Para<select id="cb_para">${op(cb.para)}</select></label>
      </div>
      <div class="acoes"><button class="btn sec" id="cb_troca">⇄ Inverter</button><button class="btn sec" id="cb_atu">Atualizar cotação</button></div>
      <p id="cb_res" style="font-size:1.3rem;margin:14px 0 4px"></p>
      <p id="cb_info" class="vazio"></p>
      <label style="display:block;margin-top:12px;font-size:.85rem;color:var(--suave)">Cotação manual (opcional, ex.: a da Nomad)<input class="man" type="number" step="any" inputmode="decimal" id="cb_man" value="${cb.manual}"></label>
    </div>`;
  conversorRes();
}

function conversorRes(){
  const man = +cb.manual > 0, t = man ? +cb.manual : cb.taxa;
  const f = (v,d) => v.toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
  $("cb_res").innerHTML = t ? `<b>${cb.valor.toLocaleString("pt-BR")} ${cb.de} = ${f(cb.valor*t,2)} ${cb.para}</b>` : "—";
  $("cb_info").textContent = (t ? `1 ${cb.de} = ${t.toLocaleString("pt-BR",{maximumFractionDigits:6})} ${cb.para}. ` : "") + (man ? "Usando a cotação manual." : cb.info);
}

async function buscar(){
  const par = cb.de+"-"+cb.para;
  if (cb.de === cb.para) { cb.taxa = 1; cb.info = ""; conversorRes(); return; }
  cb.info = "Buscando cotação…"; conversorRes();
  try {
    const r = await fetch(`https://api.frankfurter.dev/v2/rate/${cb.de.toLowerCase()}/${cb.para.toLowerCase()}`);
    if (!r.ok) throw 0;
    const d = await r.json();
    if (!(d.rate > 0)) throw 0;
    cb.taxa = d.rate; cb.info = `Cotação de referência de ${fmt(d.date)} (Frankfurter). Não é cotação ao vivo.`;
    const c = lerCache(); c[par] = {rate:d.rate, date:d.date};
    try { localStorage.setItem(CK, JSON.stringify(c)); } catch(e) {}
  } catch(e) {
    const c = lerCache()[par];
    if (c) { cb.taxa = c.rate; cb.info = `Sem conexão: usando a última cotação salva (${fmt(c.date)}).`; }
    else { cb.taxa = 0; cb.info = "Sem conexão e sem cotação salva. Digite a cotação manual."; }
  }
  conversorRes();
}

$("conv").addEventListener("change", e => {
  if (e.target.id==="cb_de" || e.target.id==="cb_para") { cb.de = $("cb_de").value; cb.para = $("cb_para").value; buscar(); }
});
$("conv").addEventListener("input", e => {
  if (e.target.id==="cb_val") { cb.valor = +e.target.value || 0; conversorRes(); }
  if (e.target.id==="cb_man") { cb.manual = e.target.value; conversorRes(); }
});
$("conv").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id==="cb_troca") { [cb.de, cb.para] = [cb.para, cb.de]; conversor(); buscar(); }
  if (b.id==="cb_atu") buscar();
});

// ---- Despesas ao vivo na viagem ----
const DCATS = ["Alimentação","Transporte","Compras em geral"];
const dp = {moeda:"GBP", tu:0, tb:0, man:false, infoU:"", infoB:""};
const M = (v,m) => Number(v).toLocaleString("pt-BR",{style:"currency",currency:m});

async function obterTaxa(de, para){
  if (de === para) return {rate:1, date:""};
  const par = de+"-"+para;
  try {
    const r = await fetch(`https://api.frankfurter.dev/v2/rate/${de.toLowerCase()}/${para.toLowerCase()}`);
    if (!r.ok) throw 0;
    const d = await r.json(); if (!(d.rate > 0)) throw 0;
    const c = lerCache(); c[par] = {rate:d.rate, date:d.date};
    try { localStorage.setItem(CK, JSON.stringify(c)); } catch(e) {}
    return {rate:d.rate, date:d.date};
  } catch(e) { const c = lerCache()[par]; return c ? {rate:c.rate, date:c.date, cache:true} : null; }
}

function despForm(){
  const hoje = new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  $("dp_form").innerHTML =
   `<div class="card"><h2>Registrar despesa</h2>
      <div class="cfg">
        <label>Data<input type="date" id="dp_data" value="${hoje}"></label>
        <label>Categoria<select id="dp_cat">${DCATS.map(k => `<option>${k}</option>`).join("")}</select></label>
        <label>Moeda<select id="dp_moeda">${MOEDAS.map(m => `<option ${m===dp.moeda?"selected":""}>${m}</option>`).join("")}</select></label>
      </div>
      <label style="display:block;margin-top:10px;font-size:.85rem;color:var(--suave)">Descrição (opcional)<input class="man" id="dp_desc" placeholder="Ex.: café da manhã"></label>
      <div class="cfg">
        <label>Valor<input type="number" step="any" inputmode="decimal" id="dp_val"></label>
        <label>Cotação → US$<input type="number" step="any" inputmode="decimal" id="dp_tu"></label>
        <label>Cotação US$ → R$<input type="number" step="any" inputmode="decimal" id="dp_tb"></label>
      </div>
      <p id="dp_info" class="vazio"></p>
      <p id="dp_prev" style="font-size:1.2rem;margin:10px 0"></p>
      <div class="acoes"><button class="btn" id="dp_add">Registrar despesa</button><button class="btn sec" id="dp_auto">Usar cotações automáticas</button></div>
    </div>`;
}

function despPrev(){
  const v = +$("dp_val").value || 0, tu = +$("dp_tu").value || 0, tb = +$("dp_tb").value || 0, usd = v*tu;
  $("dp_prev").textContent = v && tu ? `≈ ${U(usd)}` + (tb ? ` ≈ ${R(usd*tb)}` : "") : "—";
}

function despCampos(){
  $("dp_tu").value = dp.tu || ""; $("dp_tb").value = dp.tb || "";
  $("dp_info").textContent = `Cotação → US$: ${dp.infoU}. US$ → R$: ${dp.infoB}.`;
  despPrev();
}

async function despAuto(forcar){
  dp.man = false;
  const a = await obterTaxa(dp.moeda, "USD");
  if (a) { dp.tu = a.rate; dp.infoU = a.cache ? `última salva (${fmt(a.date)})` : (a.date ? `automática (${fmt(a.date)})` : "1 para 1"); }
  else { dp.tu = 0; dp.infoU = "indisponível, digite manualmente"; }
  if (!forcar && estado.config.cotacao > 0) { dp.tb = estado.config.cotacao; dp.infoB = "cotação do dólar do Resumo"; }
  else {
    const b = await obterTaxa("USD", "BRL");
    if (b) { dp.tb = b.rate; dp.infoB = b.cache ? `última salva (${fmt(b.date)})` : `automática (${fmt(b.date)})`; }
    else { dp.tb = 0; dp.infoB = "indisponível, digite manualmente"; }
  }
  despCampos();
}

function addDesp(){
  const v = +$("dp_val").value, tu = +$("dp_tu").value, tb = +$("dp_tb").value;
  if (!(v>0 && tu>0 && tb>0)) { alert("Informe o valor e as duas cotações."); return; }
  const usd = v*tu;
  estado.despesas.push({id:"d"+Date.now(), data:$("dp_data").value, desc:$("dp_desc").value.trim(), cat:$("dp_cat").value, moeda:$("dp_moeda").value, valor:v, taxaUsd:tu, taxaBrl:tb, usd, brl:usd*tb, manual:dp.man});
  $("dp_val").value = ""; $("dp_desc").value = ""; despPrev(); tudo();
}

function despesas(){
  const dsp = estado.despesas, c = calc(), cot = estado.config.cotacao;
  const soma2 = (l,k) => l.reduce((x,d) => x+d[k], 0);
  const totU = soma2(dsp,"usd"), totB = soma2(dsp,"brl"), rest = c.usdTot - totU;
  const ord = [...dsp].sort((a,b) => (b.data||"").localeCompare(a.data||"") || b.id.localeCompare(a.id));
  $("dp_lista").innerHTML =
   `<div class="card"><h2>Saldo em dólar restante</h2><table>
      <tr><td>Saldo em dólar (aba Câmbio)</td><td>${U(c.usdTot)}</td></tr>
      <tr><td>(−) Despesas na viagem</td><td>${U(totU)} · ${R(totB)}</td></tr>
      <tr><td>Restante</td><td><b>${U(rest)}</b>${cot>0 ? ` · ${R(rest*cot)}` : ""}</td></tr>
    </table></div>
    <div class="card"><h2>Por categoria</h2><table>
      <tr><th>Categoria</th><th>US$</th><th>R$</th></tr>
      ${DCATS.map(k => { const l = dsp.filter(d => d.cat===k); return `<tr><td>${k}</td><td>${U(soma2(l,"usd"))}</td><td>${R(soma2(l,"brl"))}</td></tr>`; }).join("")}
      <tr><td><b>Total</b></td><td><b>${U(totU)}</b></td><td><b>${R(totB)}</b></td></tr>
    </table></div>
    <div class="card"><h2>Despesas lançadas</h2>
      ${ord.length ? ord.map(d => `<div class="item" style="grid-template-columns:1fr auto">
        <div>${esc(d.desc || d.cat)}<small class="vazio" style="display:block">${fmt(d.data).slice(0,5)} · ${esc(d.cat)}${d.manual ? " · cotação manual" : ""}</small>
          <b>${M(d.valor,d.moeda)}</b> → ${U(d.usd)} → <b>${R(d.brl)}</b></div>
        <button class="st" data-dd="${d.id}" aria-label="Excluir despesa">✕</button></div>`).join("") : `<p class="vazio">Nenhuma despesa lançada.</p>`}
    </div>`;
}

$("dp_form").addEventListener("change", e => {
  if (e.target.id === "dp_moeda") { dp.moeda = e.target.value; despAuto(false); }
});
$("dp_form").addEventListener("input", e => {
  if (e.target.id === "dp_tu" || e.target.id === "dp_tb") dp.man = true;
  if (["dp_val","dp_tu","dp_tb"].includes(e.target.id)) despPrev();
});

// ---- Roteiro ----
const RES = {pend:"Falta reservar", passe:"Reservar no passe", ok:"Reservado"};
let rfiltro = "", rfp = "", rpAberto = false;
const DSEM = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
const lk = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">link</a>`);
const chaveHora = i => { const m = /(\d{1,2}):(\d{2})/.exec(i.hora || ""); return m ? m[1].padStart(2,"0") + ":" + m[2] : "99:99"; };
const rotuloDia = d => { const [a,m,x] = d.data.split("-").map(Number); return DSEM[new Date(a,m-1,x).getDay()] + " " + String(x).padStart(2,"0") + "/" + String(m).padStart(2,"0"); };

function roteiro(){
  const r = estado.roteiro, n = estado.config.pessoas, mo = viagem ? viagem.moeda : "GBP";
  const L = v => M(v, mo), tot = i => (+i.preco||0) * n, soma = l => l.reduce((x,i) => x+tot(i), 0);
  const dias = [...r.dias].sort((a,b) => a.data.localeCompare(b.data));
  const pagos = dias.flatMap(d => d.itens).filter(i => +i.preco > 0);
  const inc = (i,p) => !!(i.pass && i.pass[p.id]);
  const pe = r.passes.find(p => p.id === r.passeEscolhido) || null;
  const chipsDe = i => pe ? (inc(i,pe) ? [pe] : []) : r.passes.filter(p => +i.preco > 0 || (i.pass && p.id in i.pass));
  const totalAv = soma(pagos), foraPe = pe ? soma(pagos.filter(i => !inc(i,pe))) : 0;
  const mel = r.passes.map(p => ({p, dif: soma(pagos.filter(i => inc(i,p))) - p.preco})).sort((a,b) => b.dif - a.dif)[0];
  const its = dias.flatMap(d => d.itens), cont = k => its.filter(i => i.res === k).length;
  if (rfp && !r.passes.some(p => p.id === rfp)) rfp = "";
  const filt = rfiltro || rfp, pfs = pe ? [pe] : r.passes, passeF = r.passes.find(p => p.id === rfp);
  const okF = i => (!rfiltro || i.res === rfiltro) && (!passeF || inc(i, passeF));
  const mm = (r.mapa || "").match(/google\.[a-z.]+\/maps\/d\/.*[?&]mid=([^&]+)/);
  const mapa = !r.mapa ? `<p class="vazio">Nenhum mapa vinculado.</p>`
    : mm ? `<iframe class="mapa" loading="lazy" allowfullscreen src="https://www.google.com/maps/d/embed?mid=${encodeURIComponent(mm[1])}"></iframe>`
    : `<a class="btn" href="${esc(r.mapa)}" target="_blank" rel="noopener">Abrir mapa do roteiro</a>`;
  $("roteiro").innerHTML =
   `<div class="card"><div class="topo"><h2>Filtrar roteiro</h2>${filt ? `<button class="st" data-rf="">Mostrar todos</button>` : ""}</div>
      <div class="chips" style="margin-top:8px">${Object.keys(RES).map(k => `<button class="chip rs-${k} ${rfiltro === k ? "sel" : ""}" data-rf="${k}">${RES[k]}: ${cont(k)}</button>`).join("")}${pfs.map(p => `<button class="chip rs-pass ${rfp === p.id ? "sel" : ""}" data-rfp="${p.id}">No ${esc(p.nome)}: ${its.filter(i => inc(i,p)).length}</button>`).join("")}</div>
      <p class="vazio" style="margin:8px 0 0">Toque para filtrar. Você pode combinar um status de reserva com um passe.</p></div>
    <div class="card"><div class="topo"><h2>Mapa</h2><button class="st" data-rmapa="1">${r.mapa ? "Trocar link" : "Vincular mapa"}</button></div>${mapa}</div>
    ${dias.filter(d => !filt || d.itens.some(okF)).map(d => `<section class="card">
      <div class="topo"><h2>${rotuloDia(d)}${d.titulo ? " – " + esc(d.titulo) : ""}</h2><button class="st" data-rdia="${d.id}" aria-label="Editar dia">✎</button></div>
      ${[...d.itens].filter(okF).sort((a,b) => chaveHora(a).localeCompare(chaveHora(b))).map(i => `<div class="item ${i.res ? "r-" + i.res : ""}">
        <div><button class="nome" data-ritem="${d.id}|${i.id}"><span class="hora">${esc(i.hora||"")}</span>${esc(i.nome)}</button>${i.res ? ` <span class="chip rs-${i.res}">${RES[i.res]}</span>` : ""}
          <small class="vazio" style="display:block">${esc(i.duracao||"")}${i.duracao && i.obs ? " · " : ""}${lk(i.obs||"")}</small>
          ${chipsDe(i).length ? `<div class="chips">${chipsDe(i).map(p => `<button class="chip ${inc(i,p) ? "ok" : ""}" data-pc="${d.id}|${i.id}|${p.id}">${esc(p.nome)} ${inc(i,p) ? "☑" : "☐"}</button>`).join("")}</div>` : ""}</div>
        <span>${+i.preco <= 0 ? "Gratuito" : pe && inc(i,pe) ? `<small class="vazio">no passe</small>` : L(tot(i))}</span></div>`).join("")}
      <div class="topo" style="margin-top:8px"><button class="st" data-radd="${d.id}">+ Item</button>${filt ? "" : `<span>${pe ? "À parte" : "Subtotal"}: <b>${L(soma(pe ? d.itens.filter(i => !inc(i,pe)) : d.itens))}</b></span>`}</div>
    </section>`).join("")}
    <button class="add" data-rnd="1" style="margin-bottom:12px">+ Adicionar dia</button>
    <div class="card"><h2>Ingressos e passes</h2>
      ${pe ? `<table>
        <tr><td>Passe escolhido: <b>${esc(pe.nome)}</b> <button class="st" data-rptroca="1">Trocar</button></td><td>${L(pe.preco)}</td></tr>
        <tr><td>Atrações fora do passe</td><td>${L(foraPe)}</td></tr>
        <tr><td><b>Custo total estimado</b></td><td><b>${L(pe.preco + foraPe)}</b></td></tr>
        <tr><td>Se tudo fosse avulso</td><td>${L(totalAv)}</td></tr>
        <tr><td>Economia com o passe</td><td><b>${L(totalAv - pe.preco - foraPe)}</b></td></tr>
      </table>` : `<p style="margin:8px 0">${mel ? `Melhor opção hoje: <b>${esc(mel.p.nome)}</b> (${mel.dif > 0 ? "economiza " + L(mel.dif) + " frente ao avulso" : "o avulso compensa mais"}).` : "Adicione um passe para comparar com os ingressos avulsos."}</p>`}
      <details id="rp_det" ${rpAberto || !pe ? "open" : ""}><summary class="vazio">Comparar passes</summary>
        ${r.passes.length ? `<div style="overflow-x:auto"><table><tr><th>Passe</th><th>Elegíveis</th><th>Preço</th><th>Resultado</th><th></th></tr>
          ${r.passes.map(p => { const el = soma(pagos.filter(i => inc(i,p))), dif = el - p.preco, esco = r.passeEscolhido === p.id;
            return `<tr><td><button class="nome" data-rpe="${p.id}">${esc(p.nome)}</button></td><td>${L(el)}</td><td>${L(p.preco)}</td><td>${dif > 0 ? "Passe economiza " + L(dif) : "Avulso compensa " + L(-dif)}</td><td><button class="st ${esco ? "pago" : ""}" data-rpx="${p.id}">${esco ? "Escolhido" : "Escolher"}</button></td></tr>`; }).join("")}
        </table></div>` : ""}
        <button class="add" data-rpa="1">+ Adicionar passe</button>
        <p class="vazio">O preço do passe é para o grupo todo, nos dias necessários. Toque no nome do passe para editar ou excluir. Toque em "Escolhido" para desfazer a escolha.</p>
      </details></div>`;
}

let ri = null, rdSel = null;
function abrirItem(did, iid){
  const d = estado.roteiro.dias.find(x => x.id === did), it = iid ? d.itens.find(x => x.id === iid) : null;
  ri = {d, it};
  $("di_t").textContent = it ? "Editar item" : "Novo item em " + rotuloDia(d);
  $("di_hora").value = it ? (it.hora||"") : ""; $("di_nome").value = it ? it.nome : ""; $("di_dur").value = it ? (it.duracao||"") : "";
  $("di_preco").value = it && it.preco ? it.preco : ""; $("di_obs").value = it ? (it.obs||"") : "";
  $("di_passes").innerHTML = estado.roteiro.passes.length
    ? `<p class="vazio" style="margin:12px 0 0">Passes turísticos</p>` + estado.roteiro.passes.map(p => {
        const v = it && it.pass && p.id in it.pass ? (it.pass[p.id] ? "1" : "0") : "";
        return `<label>${esc(p.nome)}<select data-pid="${p.id}"><option value="">Não se aplica</option><option value="1" ${v === "1" ? "selected" : ""}>Incluso no passe</option><option value="0" ${v === "0" ? "selected" : ""}>Não incluso</option></select></label>`; }).join("")
    : `<p class="vazio">Cadastre um passe no quadro de passes para marcar a inclusão.</p>`;
  $("di_res").value = it ? (it.res || "") : "";
  $("di_exc").hidden = !it; $("di").showModal();
}
$("di_sal").onclick = () => {
  const nome = $("di_nome").value.trim(); if (!nome) { $("di_nome").focus(); return; }
  const it = ri.it || {id:"r" + Date.now()}, pass = {};
  $("di_passes").querySelectorAll("select").forEach(c => { if (c.value !== "") pass[c.dataset.pid] = c.value === "1"; });
  Object.assign(it, {hora:$("di_hora").value.trim(), nome, duracao:$("di_dur").value.trim(), preco:+$("di_preco").value || 0, obs:$("di_obs").value.trim(), pass, res:$("di_res").value});
  if (!ri.it) ri.d.itens.push(it);
  $("di").close(); tudo();
};
$("di_can").onclick = () => $("di").close();
$("di_exc").onclick = () => { if (confirm("Excluir este item?")) { ri.d.itens = ri.d.itens.filter(x => x !== ri.it); $("di").close(); tudo(); } };

function abrirDia(id){
  rdSel = id ? estado.roteiro.dias.find(x => x.id === id) : null;
  let data = rdSel ? rdSel.data : (viagem ? viagem.saida : "");
  const ult = estado.roteiro.dias.map(d => d.data).sort().pop();
  if (!rdSel && ult) { const [a,m,x] = ult.split("-").map(Number), t = new Date(a,m-1,x+1); data = t.getFullYear() + "-" + String(t.getMonth()+1).padStart(2,"0") + "-" + String(t.getDate()).padStart(2,"0"); }
  $("dy_t").textContent = rdSel ? "Editar dia" : "Novo dia";
  $("dy_data").value = data; $("dy_tit").value = rdSel ? (rdSel.titulo||"") : ""; $("dy_exc").hidden = !rdSel; $("dy").showModal();
}
$("dy_sal").onclick = () => {
  const data = $("dy_data").value, titulo = $("dy_tit").value.trim();
  if (!data) { alert("Informe a data do dia."); return; }
  if (rdSel) Object.assign(rdSel, {data, titulo}); else estado.roteiro.dias.push({id:"y" + Date.now(), data, titulo, itens:[]});
  $("dy").close(); tudo();
};
$("dy_can").onclick = () => $("dy").close();
$("dy_exc").onclick = () => { if (confirm("Excluir este dia e todos os itens dele?")) { estado.roteiro.dias = estado.roteiro.dias.filter(x => x !== rdSel); $("dy").close(); tudo(); } };

$("roteiro").addEventListener("toggle", e => { if (e.target.id === "rp_det") rpAberto = e.target.open; }, true);

function editarMapa(){
  const u = prompt("Cole o link do mapa (Google Earth, Meu Mapas ou outro):", estado.roteiro.mapa || "");
  if (u !== null) { estado.roteiro.mapa = u.trim(); tudo(); }
}
function novoPasse(){
  const nome = prompt("Nome do passe (ex.: London Pass):"); if (!nome || !nome.trim()) return;
  const preco = parseFloat((prompt("Preço do passe para o grupo, na moeda local:") || "").replace(",", ".")) || 0;
  estado.roteiro.passes.push({id:"p" + Date.now(), nome:nome.trim(), preco}); tudo();
}
function editarPasse(id){
  const p = estado.roteiro.passes.find(x => x.id === id);
  const v = prompt(`Preço de ${p.nome} para o grupo. Digite "excluir" para remover o passe.`, p.preco);
  if (v === null) return;
  if (v.trim().toLowerCase() === "excluir") estado.roteiro.passes = estado.roteiro.passes.filter(x => x !== p);
  else p.preco = parseFloat(v.replace(",", ".")) || 0;
  tudo();
}

function gastos(){
  $("gastos").innerHTML = estado.categorias.map(c =>
   `<section class="card">
      <div class="topo"><h2>${esc(c.nome)}</h2><span>${R(soma(c))}</span></div>
      ${c.itens.length ? c.itens.map(i =>
        `<div class="item">
          <button class="nome" data-ed="${c.id}|${i.id}">${esc(i.nome)}<small>${esc(i.obs)}</small></button>
          <span>${R(total(i))}</span>
          <button class="st ${i.pago?"pago":""}" data-st="${c.id}|${i.id}">${i.pago?"Pago":"Pendente"}</button>
        </div>`).join("") : `<p class="vazio">Nenhum item ainda.</p>`}
      <button class="add" data-add="${c.id}">+ Adicionar item</button>
    </section>`).join("");
}

function tudo(){ salvar(); resumo(); gastos(); roteiro(); aportes(); dolar(); despesas(); }

function abas(a){
  ["resumo","gastos","roteiro","aportes","cambio","despesas","dados"].forEach(x => { $(x).hidden = x!==a; });
  document.querySelectorAll("#abas button").forEach(b => b.classList.toggle("on", b.dataset.aba===a));
}

function abrir(cid, iid){
  const c = estado.categorias.find(x => x.id===cid);
  const it = iid ? c.itens.find(x => x.id===iid) : null;
  edit = {c, it};
  $("dt").textContent = it ? "Editar item" : "Novo item em " + c.nome;
  $("f_nome").value = it ? it.nome : "";
  $("f_qtd").value = it ? it.qtd : 1;
  $("f_valor").value = it ? it.valor : "";
  $("f_pax").value = it ? it.pax : 2;
  $("f_fixo").value = it && it.totalFixo!=null ? it.totalFixo : "";
  $("f_obs").value = it ? (it.obs||"") : "";
  $("f_pago").value = it && it.pago ? "1" : "0";
  $("exc").hidden = !it;
  $("dlg").showModal();
}

document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.aba) abas(d.aba);
  else if (d.st) {
    const [c,i] = d.st.split("|");
    const it = estado.categorias.find(x => x.id===c).itens.find(x => x.id===i);
    it.pago = !it.pago; tudo();
  }
  else if (d.ed) abrir(...d.ed.split("|"));
  else if (d.add) abrir(d.add);
  else if (b.id === "cv_add") addCv();
  else if (b.id === "dp_add") addDesp();
  else if (b.id === "dp_auto") despAuto(true);
  else if (d.v) abrirViagem(d.v);
  else if (d.rmapa) editarMapa();
  else if (d.rdia) abrirDia(d.rdia);
  else if (d.rnd) abrirDia(null);
  else if (d.ritem) abrirItem(...d.ritem.split("|"));
  else if (d.radd) abrirItem(d.radd);
  else if (d.rpa) novoPasse();
  else if (d.rpe) editarPasse(d.rpe);
  else if (d.rpx !== undefined) { estado.roteiro.passeEscolhido = estado.roteiro.passeEscolhido === d.rpx ? "" : d.rpx; tudo(); }
  else if (d.rptroca) { rpAberto = true; roteiro(); }
  else if (d.rf !== undefined) { if (d.rf === "") { rfiltro = ""; rfp = ""; } else rfiltro = d.rf === rfiltro ? "" : d.rf; roteiro(); }
  else if (d.rfp !== undefined) { rfp = d.rfp === rfp ? "" : d.rfp; roteiro(); }
  else if (d.pc) {
    const [di,ii,pi] = d.pc.split("|"), it = estado.roteiro.dias.find(x => x.id === di).itens.find(x => x.id === ii);
    it.pass = it.pass || {}; it.pass[pi] = !it.pass[pi]; tudo();
  }
  else if (d.nv) editarViagem(null);
  else if (d.volta) home();
  else if (d.ev) editarViagem(viagem.id);
  else if (d.dd) { estado.despesas = estado.despesas.filter(x => x.id !== d.dd); tudo(); }
  else if (d.dc) { estado.conversoes = estado.conversoes.filter(x => x.id !== d.dc); tudo(); }
});

$("sal").onclick = () => {
  const n = $("f_nome").value.trim();
  if (!n) { $("f_nome").focus(); return; }
  const it = edit.it || {id:"i"+Date.now()};
  Object.assign(it, {nome:n, qtd:+$("f_qtd").value||0, valor:+$("f_valor").value||0, pax:+$("f_pax").value||1, obs:$("f_obs").value.trim(), pago:$("f_pago").value==="1"});
  const f = $("f_fixo").value;
  if (f!=="") it.totalFixo = +f; else delete it.totalFixo;
  if (!edit.it) edit.c.itens.push(it);
  $("dlg").close(); tudo();
};
$("can").onclick = () => $("dlg").close();
$("exc").onclick = () => {
  if (confirm("Excluir este item?")) { edit.c.itens = edit.c.itens.filter(x => x!==edit.it); $("dlg").close(); tudo(); }
};

$("exp").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(estado,null,1)], {type:"application/json"}));
  a.download = "dados-" + viagem.nome.toLowerCase().replace(/[^a-z0-9]+/g,"-") + ".json"; a.click();
};
$("imp").onclick = () => $("arq").click();
$("arq").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try { const d = JSON.parse(r.result); if (Array.isArray(d.categorias)) estado = d;
      else if (d.aportes || d.conversoes || d.roteiro) {
        if (d.roteiro) estado.roteiro = d.roteiro;
        if (d.aportes) estado.aportes = d.aportes;
        if (d.conversoes) estado.conversoes = d.conversoes;
        estado.config = Object.assign(estado.config, d.config || {});
      }
      else throw 0;
      norm(); tudo(); abas("resumo"); }
    catch(x) { alert("Arquivo inválido. Use um backup exportado por esta página."); }
  };
  r.readAsText(f); e.target.value = "";
};
$("lim").onclick = () => { if (confirm("Apagar todos os dados desta viagem?")) { estado = vazio(); norm(); tudo(); } };

document.addEventListener("change", e => {
  const k = e.target.dataset.cfg, ap = e.target.dataset.ap, v = +e.target.value || 0;
  if (k === "pessoas") definirPessoas(v);
  else if (k) { estado.config[k] = k==="ajuste" ? v : Math.max(v,0); tudo(); }
  else if (e.target.dataset.cp) periodo(e.target.dataset.cp, e.target.value);
  else if (e.target.dataset.nome !== undefined) { const i = +e.target.dataset.nome; estado.config.nomes[i] = e.target.value.trim() || "Pessoa " + (i+1); tudo(); }
  else if (ap) {
    const [id,idx] = ap.split("|");
    const a = estado.aportes.find(x => x.id===id);
    a.v[+idx] = Math.max(v,0);
    $("at_"+id).textContent = R(totA(a));
    aportesTotais(); salvar(); resumo();
  }
});

// ---- Minhas viagens ----
const PRE = {londres:["roundel","#dc241f","#0019a8"], paris:["circulo","#ffce00","#14213d"], novayork:["circulo","#0039a6","#ffffff"], orlando:["anel","#ff7a00","#0b5ed7"]};

function contagem(saida){
  const h = new Date(); h.setHours(0,0,0,0);
  const [a,m,d] = saida.split("-").map(Number);
  return Math.round((new Date(a,m-1,d) - h) / 864e5);
}
const txtDias = n => n>1 ? n+" dias para a saída" : n===1 ? "1 dia para a saída" : "Boa viagem!";

const uid = () => "g" + Math.random().toString(36).slice(2,8);
function emblemaImg(v, n){
  const i = v.img, S = 220, k = Math.max(S/i.w, S/i.h) * (v.zoom || 1), W = i.w*k, H = i.h*k;
  const x = (S-W) * ((v.ox ?? 50)/100), y = (S-H) * ((v.oy ?? 50)/100);
  const id = uid(), circ = v.forma === "imagem";
  const forma = circ ? `<circle cx="110" cy="110" r="100"/>` : `<rect x="10" y="10" width="200" height="200" rx="30"/>`;
  const borda = circ ? `<circle cx="110" cy="110" r="100" fill="none" stroke="${v.cor1}" stroke-width="8"/>` : `<rect x="10" y="10" width="200" height="200" rx="30" fill="none" stroke="${v.cor1}" stroke-width="8"/>`;
  return `<svg viewBox="0 0 220 220" role="img" aria-label="${txtDias(n)}"><defs><clipPath id="${id}">${forma}</clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></linearGradient></defs>
    <g clip-path="url(#${id})"><image href="${i.src}" x="${x}" y="${y}" width="${W}" height="${H}"/><rect x="0" y="95" width="220" height="125" fill="url(#${id}g)"/></g>${borda}
    <text x="110" y="162" text-anchor="middle" font-size="46" font-weight="800" fill="#fff">${n>0 ? n : "✈"}</text>
    <text x="110" y="188" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">${n>1 ? "dias para a saída" : n===1 ? "dia para a saída" : "Boa viagem!"}</text></svg>`;
}

function emblema(v, n){
  if (v.forma && v.forma.startsWith("imagem") && v.img) return emblemaImg(v, n);
  const num = n>0 ? n : "✈", c1 = v.cor1, c2 = v.cor2, leg = n>1 ? "dias" : n===1 ? "dia" : "";
  let f;
  if (v.forma === "roundel") f = `<circle cx="110" cy="110" r="92" fill="none" stroke="${c1}" stroke-width="20"/><text x="110" y="98" text-anchor="middle" font-size="58" font-weight="800" fill="var(--texto)">${num}</text><rect x="4" y="106" width="212" height="36" fill="${c2}"/><text x="110" y="131" text-anchor="middle" font-size="19" font-weight="700" fill="#fff">${n>1 ? "dias para a saída" : n===1 ? "dia para a saída" : "Boa viagem!"}</text>`;
  else if (v.forma === "circulo") f = `<circle cx="110" cy="110" r="100" fill="${c1}"/><text x="110" y="125" text-anchor="middle" font-size="78" font-weight="800" fill="${c2}">${num}</text><text x="110" y="160" text-anchor="middle" font-size="22" font-weight="700" fill="${c2}">${leg}</text>`;
  else f = `<circle cx="110" cy="110" r="92" fill="none" stroke="${c1}" stroke-width="18"/><text x="110" y="125" text-anchor="middle" font-size="70" font-weight="800" fill="var(--texto)">${num}</text><text x="110" y="156" text-anchor="middle" font-size="22" font-weight="700" fill="${c2}">${leg}</text>`;
  return `<svg viewBox="0 0 220 220" role="img" aria-label="${txtDias(n)}">${f}</svg>`;
}

function home(){
  salvar(); viagem = null;
  $("viagem").hidden = true; $("home").hidden = false; document.title = "Minhas viagens";
  $("home").innerHTML =
   `<header><h1>Minhas viagens</h1><p>Escolha uma viagem para ver o planejamento.</p></header>
    <div class="viagens">
      ${loja.viagens.map(v => `<button class="vcard" data-v="${v.id}">${emblema(v, contagem(v.saida))}<b>${esc(v.nome)}</b><small>${esc(v.destino)} · ${fmt(v.saida)}</small></button>`).join("")}
      <button class="vcard novo" data-nv="1"><span style="font-size:3rem">＋</span><b>Nova viagem</b></button>
    </div>`;
}

function abrirViagem(id){
  viagem = loja.viagens.find(x => x.id === id); estado = viagem.dados; norm();
  dp.moeda = viagem.moeda; cb.de = viagem.moeda; cb.para = viagem.moeda === "USD" ? "BRL" : "USD"; cb.manual = "";
  $("home").hidden = true; $("viagem").hidden = false; document.title = viagem.nome;
  $("h1").textContent = viagem.nome; $("sub").textContent = txtDias(contagem(viagem.saida));
  abas("resumo"); tudo(); conversor(); buscar(); despForm(); despAuto(false);
}

let editV = null, dvImg = null;
function editarViagem(id){
  editV = id ? loja.viagens.find(x => x.id === id) : null;
  const v = editV || {nome:"", destino:"", saida:"", moeda:"USD", forma:"circulo", cor1:"#0039a6", cor2:"#ffffff"};
  $("dv_t").textContent = editV ? "Editar viagem" : "Nova viagem";
  $("dv_nome").value = v.nome; $("dv_dest").value = v.destino; $("dv_saida").value = v.saida; $("dv_moeda").value = v.moeda;
  $("dv_forma").value = v.forma; $("dv_c1").value = v.cor1; $("dv_c2").value = v.cor2;
  dvImg = v.img || null; $("dv_zoom").value = v.zoom || 1; $("dv_ox").value = v.ox ?? 50; $("dv_oy").value = v.oy ?? 50; $("dv_img").value = "";
  $("dv_exc").hidden = !editV; dvPrev(); $("dv").showModal();
}
const dvLer = () => ({nome:$("dv_nome").value.trim(), destino:$("dv_dest").value.trim(), saida:$("dv_saida").value, moeda:$("dv_moeda").value, forma:$("dv_forma").value, cor1:$("dv_c1").value, cor2:$("dv_c2").value, img:dvImg, zoom:+$("dv_zoom").value, ox:+$("dv_ox").value, oy:+$("dv_oy").value});
function dvPrev(){ const v = dvLer(); $("dv_img_box").hidden = !v.forma.startsWith("imagem"); $("dv_prev").innerHTML = emblema(v, v.saida ? contagem(v.saida) : 0); }

$("dv_moeda").innerHTML = MOEDAS.map(m => `<option>${m}</option>`).join("");
$("dv").addEventListener("input", dvPrev);
$("dv_img").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 480/Math.max(im.width, im.height)), w = Math.round(im.width*k), h = Math.round(im.height*k);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(im, 0, 0, w, h);
      dvImg = {src:c.toDataURL("image/webp", 0.85), w, h}; dvPrev();
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
};
$("dv").addEventListener("click", e => {
  const p = PRE[e.target.dataset.pre]; if (!p) return;
  $("dv_forma").value = p[0]; $("dv_c1").value = p[1]; $("dv_c2").value = p[2]; dvPrev();
});
$("dv_can").onclick = () => $("dv").close();
$("dv_sal").onclick = () => {
  const v = dvLer();
  if (!v.nome || !v.saida) { alert("Informe o nome e a data de saída."); return; }
  if (v.forma.startsWith("imagem") && !v.img) { alert("Escolha uma imagem ou outra forma de emblema."); return; }
  const dentro = viagem && editV && viagem.id === editV.id;
  if (editV) Object.assign(editV, v); else loja.viagens.push({id:"v"+Date.now(), ...v, dados:vazio()});
  salvar(); $("dv").close();
  if (dentro) abrirViagem(editV.id); else home();
};
$("dv_exc").onclick = () => {
  if (!confirm("Excluir esta viagem e todos os dados dela? Isso não pode ser desfeito.")) return;
  loja.viagens = loja.viagens.filter(x => x !== editV); viagem = null; salvar(); $("dv").close(); home();
};

home();
