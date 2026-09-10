(function(){
"use strict";

/* ================= SETUP ================= */
var cfg = window.ONEPLUS_CONFIG || {};
if(!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("COLE_AQUI") === 0){
  document.body.innerHTML = '<div style="max-width:520px;margin:80px auto;font-family:sans-serif;padding:24px;border:1px solid #ddd;border-radius:12px;">' +
    '<h2 style="font-family:Georgia,serif;">Falta configurar</h2>' +
    '<p>Abra o arquivo <code>config.js</code> e cole a Project URL e a anon public key do seu projeto Supabase (Settings &gt; API). Depois recarregue esta página.</p></div>';
  return;
}
var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

var TEAM = ["Henrique","Alana","Agatha","Kelly","Elder"];
var VENDEDORES = ["Henrique","Alana","Elder"];
var PRODUTOS = ["Saúde","Vida","Consórcio"];
var ETAPAS = ["Qualificação","Primeiro Contato","Proposta Enviada","Negociação","Ganho","Perdido"];
var OPERADORAS = ["Omint","Care Plus","Amil","SulAmérica","Bradesco","NotreDame","Prevent Sênior","MedSênior","Porto Seguro","São Cristóvão","Ever","Alice","Outros"];
var CANAIS = ["WhatsApp","Ligação","E-mail","Presencial"];
var CANAIS_TAREFA = ["Ligar","WhatsApp","E-mail","Outro"];
var TIPOS_TITULARIDADE = ["Dependente","Titular adicional"];
var TIPOS_INTERACAO = ["Conteúdo educativo","Agendamento de consulta/exame","Ajuda com reembolso","Pedido de indicação","Aviso de renovação/revisão","Outro"];
var TIPOS_TAREFA = ["Tarefa","Demanda","Inclusão","Exclusão"];
var STATUS_TAREFA = ["Pendente","Em andamento","Concluída"];
var STATUS_REEMBOLSO = ["Solicitado","Em análise","Aprovado","Pago","Negado"];
var TIPOS_AGENDAMENTO = ["Consulta","Exame"];
var STATUS_AGENDAMENTO = ["Agendado","Realizado","Cancelado"];
var ANS_BANDS = [
  {max:18, label:"0 a 18 anos"},{max:23, label:"19 a 23 anos"},{max:28, label:"24 a 28 anos"},
  {max:33, label:"29 a 33 anos"},{max:38, label:"34 a 38 anos"},{max:43, label:"39 a 43 anos"},
  {max:48, label:"44 a 48 anos"},{max:53, label:"49 a 53 anos"},{max:58, label:"54 a 58 anos"},
  {max:Infinity, label:"59 anos ou mais"}
];
var CONTENT_TEMPLATES = {
  "Como funciona a coparticipação do plano": "Oi {nome}! Passando para explicar rapidinho: coparticipação é quando você paga uma parte pequena de alguns procedimentos (geralmente consultas e exames), o que ajuda a manter a mensalidade do seu plano mais baixa. Qualquer dúvida sobre o seu plano específico, é só chamar 😊",
  "Como usar o aplicativo da operadora": "Oi {nome}! Você já usa o aplicativo do seu plano? Nele dá pra achar médicos credenciados perto de você, ver sua carteirinha digital e acompanhar reembolsos. Se quiser, te ajudo a configurar — é rapidinho.",
  "Benefícios e descontos disponíveis no plano": "Oi {nome}! Seu plano tem alguns benefícios que muita gente não usa — descontos em farmácia e check-ups preventivos, por exemplo. Quer que eu te mande a lista completa do seu plano?",
  "Como economizar nos custos do plano de saúde": "Oi {nome}! De tempos em tempos vale revisar o plano de saúde — às vezes existe uma opção com cobertura parecida e mensalidade menor. Quer que eu dê uma olhada no seu caso?",
  "Como agendar consulta/exame pelo app": "Oi {nome}! Lembrando que dá pra agendar consulta e exame direto pelo app do seu plano, sem precisar ligar. Se preferir, também posso agendar pra você — é só me chamar com a especialidade que precisa.",
  "Lembrete: hora de revisar o plano (2 anos)": "Oi {nome}! Já faz um tempinho desde a última revisão do seu plano, e o reajuste anual pode pesar bastante com o tempo. Vamos agendar 15 minutinhos para eu revisar as opções e ver se dá pra economizar?",
  "Pedido de indicação": "Oi {nome}! Fico muito feliz em poder cuidar da sua saúde. Se souber de alguém (amigo, familiar ou empresa) que também precise de um plano de saúde, vida ou consórcio, me manda o contato — cuido com todo o carinho, igual cuido do seu 🙏"
};

var state = {
  session: null,
  tab: "painel",
  clientes: [], dependentes: [], tarefas: [], reembolsos: [], agendamentos: [], leads: [], interacoes: [], metas_mensais: [], implantacoes: [],
  params: {taxa_imposto:0.085, percentual_vitalicio:0.02, parcelas_cheias:3, meta_mensal_padrao:0, meta_vendas_mensal:0},
  loading: true
};

/* ================= helpers: datas / dinheiro ================= */
function pad2(n){return (n<10?"0":"")+n;}
function todayISO(){var d=new Date(); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function parseISO(s){ if(!s) return null; var p=String(s).slice(0,10).split("-"); return new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]||1)); }
function monthKeyFromISO(s){ if(!s) return null; var p=String(s).slice(0,10).split("-"); return p[0]+"-"+p[1]; }
function monthKeyAdd(mk,n){ var p=mk.split("-"); var y=parseInt(p[0]), m=parseInt(p[1])-1+n; y+=Math.floor(m/12); m=((m%12)+12)%12; return y+"-"+pad2(m+1); }
function monthLabel(mk){ var p=mk.split("-"); var names=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]; return names[parseInt(p[1])-1]+"/"+p[0]; }
function fmtMoney(v){ v = v||0; var neg = v<0; v=Math.abs(v); var s = v.toFixed(2).replace(".",","); var parts=s.split(","); parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,"."); return (neg?"-":"")+"R$ "+parts[0]+","+parts[1]; }
function fmtPct(v){ return (v*100).toFixed(1).replace(".",",")+"%"; }
/* Aceita valores digitados no formato brasileiro (1.876,29 ou 1876,29 ou 1876.29) e devolve number. */
function parseMoneyBR(str){
  if(str==null) return 0;
  str = String(str).trim();
  if(!str) return 0;
  str = str.replace(/[^\d,.\-]/g,"");
  if(str.indexOf(",")>=0){ str = str.replace(/\./g,"").replace(",","."); }
  var v = parseFloat(str);
  return isNaN(v) ? 0 : v;
}
function moneyDisplay(v){ if(v==null || v==="" || isNaN(v)) return ""; return fmtMoney(v).replace("R$ ",""); }
/* Campo de dinheiro em texto (aceita vírgula), formatado ao perder o foco. */
function moneyFieldHtml(id, value, label, extraAttrs){
  return '<div class="field"><label>'+label+'</label><input type="text" inputmode="decimal" class="money-input" id="'+id+'" value="'+escapeHtml(moneyDisplay(value))+'" placeholder="0,00" '+(extraAttrs||"")+'></div>';
}
function wireMoneyInputs(root){
  var scope = root || document;
  Array.prototype.forEach.call(scope.querySelectorAll(".money-input"), function(el){
    el.addEventListener("blur", function(){
      var v = parseMoneyBR(el.value);
      el.value = v ? moneyDisplay(v) : "";
    });
  });
}
function fmtDateISO(s){ if(!s) return "—"; var p=String(s).slice(0,10).split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
function fmtDateTime(s){ if(!s) return "—"; var d=new Date(s); return pad2(d.getDate())+"/"+pad2(d.getMonth()+1)+"/"+d.getFullYear()+" "+pad2(d.getHours())+":"+pad2(d.getMinutes()); }
function todayMonthKey(){ return monthKeyFromISO(todayISO()); }
function addYearsISO(s,n){ var p=String(s).slice(0,10).split("-"); var y=parseInt(p[0])+n; return y+"-"+p[1]+"-"+p[2]; }
function addMonthsISO(s,n){
  if(!s) return null;
  var p=String(s).slice(0,10).split("-");
  var y=parseInt(p[0]), m=parseInt(p[1])-1+n, d=parseInt(p[2]||1);
  y += Math.floor(m/12); m = ((m%12)+12)%12;
  var dt = new Date(y, m, d);
  return dt.getFullYear()+"-"+pad2(dt.getMonth()+1)+"-"+pad2(dt.getDate());
}
function daysBetween(aISO,bISO){ return Math.round((parseISO(bISO)-parseISO(aISO))/86400000); }
function ageOnISO(birthISO, atISO){
  var b=parseISO(birthISO), a=parseISO(atISO);
  var age = a.getFullYear()-b.getFullYear();
  var hadBday = (a.getMonth()>b.getMonth())||(a.getMonth()===b.getMonth()&&a.getDate()>=b.getDate());
  if(!hadBday) age--;
  return age;
}
function escapeHtml(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }

function computeFaixa(birthISO){
  if(!birthISO) return null;
  var age = ageOnISO(birthISO, todayISO());
  var band=null, idx=-1;
  for(var i=0;i<ANS_BANDS.length;i++){ if(age<=ANS_BANDS[i].max){ band=ANS_BANDS[i]; idx=i; break; } }
  if(!band) return null;
  var nextChangeISO=null;
  if(idx < ANS_BANDS.length-1){
    var nextBoundaryAge = band.max+1;
    var b=parseISO(birthISO);
    var year = b.getFullYear()+nextBoundaryAge;
    nextChangeISO = year+"-"+pad2(b.getMonth()+1)+"-"+pad2(b.getDate());
  }
  return {label:band.label, nextChangeISO:nextChangeISO};
}

function computeSchedule(cliente, params){
  var base = cliente.data_fechamento || cliente.data_inclusao;
  var p1 = monthKeyFromISO(base);
  if(!p1) return null;
  var p2 = monthKeyAdd(p1,1), p3 = monthKeyAdd(p1,2);
  var bonusMonth = monthKeyAdd(p1,3), vitalicioStart = monthKeyAdd(p1,3);
  var valor = cliente.valor_contrato_total || cliente.valor_por_beneficiario || 0;
  var netParcela = valor * (1-params.taxa_imposto);
  var netBonus = (cliente.bonus_parcela4||0) * (1-params.taxa_imposto);
  var netVitalicio = valor * params.percentual_vitalicio * (1-params.taxa_imposto);
  return {p1:p1,p2:p2,p3:p3,bonusMonth:bonusMonth,vitalicioStart:vitalicioStart,netParcela:netParcela,netBonus:netBonus,netVitalicio:netVitalicio};
}
function faturamentoDoMes(mk, clientes, params){
  var total=0;
  clientes.forEach(function(c){
    var s = computeSchedule(c,params);
    if(!s) return;
    if(s.p1===mk) total += s.netParcela;
    if(s.p2===mk) total += s.netParcela;
    if(s.p3===mk) total += s.netParcela;
    if((c.bonus_parcela4||0)>0 && s.bonusMonth===mk) total += s.netBonus;
    if(c.status!=="Cancelado" && mk>=s.vitalicioStart) total += s.netVitalicio;
  });
  return total;
}
function nextRevisao(c){
  var base = c.ultima_revisao || c.data_fechamento || c.data_inclusao;
  if(!base) return null;
  var due = addYearsISO(base,2);
  return {date:due, overdue: due < todayISO()};
}
function depsOf(clienteId){ return state.dependentes.filter(function(d){ return d.cliente_id===clienteId; }); }

/* ================= toast ================= */
var toastTimer=null;
function toast(msg){
  var el=document.getElementById("toast");
  el.textContent=msg; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ el.classList.remove("show"); }, 2600);
}

/* ================= AUTH ================= */
var loginForm = document.getElementById("login-form");
var loginError = document.getElementById("login-error");
var loginBtn = document.getElementById("login-btn");

loginForm.addEventListener("submit", async function(e){
  e.preventDefault();
  loginError.classList.remove("show");
  loginBtn.disabled = true; loginBtn.textContent = "Entrando…";
  var email = document.getElementById("login-email").value.trim();
  var password = document.getElementById("login-password").value;
  try{
    var res = await sb.auth.signInWithPassword({email:email, password:password});
    if(res.error){ throw res.error; }
    // onAuthStateChange cuida do resto
  }catch(err){
    loginError.textContent = err && err.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : ("Erro ao entrar: "+(err&&err.message||err));
    loginError.classList.add("show");
  }finally{
    loginBtn.disabled = false; loginBtn.textContent = "Entrar";
  }
});

document.getElementById("btn-logout").addEventListener("click", async function(){
  await sb.auth.signOut();
});

sb.auth.onAuthStateChange(function(event, session){
  state.session = session;
  if(event === "PASSWORD_RECOVERY"){
    state.inRecovery = true;
    showRecoveryScreen();
    return;
  }
  if(state.inRecovery){
    // Ainda estamos na tela de "definir nova senha" — não deixa um evento
    // posterior (TOKEN_REFRESHED, SIGNED_IN, etc.) sobrescrever essa tela.
    return;
  }
  if(session){
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app-shell").style.display = "flex";
    document.getElementById("current-email").textContent = session.user.email;
    loadAll();
  } else {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("app-shell").style.display = "none";
  }
});

function showRecoveryScreen(){
  document.getElementById("app-shell").style.display = "none";
  var screen = document.getElementById("login-screen");
  screen.style.display = "flex";
  screen.innerHTML = '<div class="login-card">' +
    '<div class="login-mark">1+</div>' +
    '<h1>Defina sua senha</h1>' +
    '<div class="sub">Crie a senha que vai usar para entrar no sistema a partir de agora.</div>' +
    '<form id="recovery-form">' +
      '<div class="field" style="margin-bottom:12px;"><label>Nova senha</label><input type="password" id="recovery-password" required minlength="6" autocomplete="new-password"></div>' +
      '<div class="field" style="margin-bottom:14px;"><label>Confirmar senha</label><input type="password" id="recovery-password-2" required minlength="6" autocomplete="new-password"></div>' +
      '<button class="btn btn-primary" type="submit" id="recovery-btn" style="width:100%;">Salvar senha e entrar</button>' +
      '<div class="login-error" id="recovery-error"></div>' +
    '</form>' +
  '</div>';
  document.getElementById("recovery-form").addEventListener("submit", async function(e){
    e.preventDefault();
    var errEl = document.getElementById("recovery-error");
    errEl.classList.remove("show");
    var p1 = document.getElementById("recovery-password").value;
    var p2 = document.getElementById("recovery-password-2").value;
    if(p1.length < 6){ errEl.textContent = "A senha precisa ter pelo menos 6 caracteres."; errEl.classList.add("show"); return; }
    if(p1 !== p2){ errEl.textContent = "As senhas não coincidem."; errEl.classList.add("show"); return; }
    var btn = document.getElementById("recovery-btn");
    btn.disabled = true; btn.textContent = "Salvando…";
    try{
      var res = await sb.auth.updateUser({password:p1});
      if(res.error) throw res.error;
      location.reload();
    }catch(err){
      errEl.textContent = "Erro ao salvar senha: " + (err && err.message || err);
      errEl.classList.add("show");
      btn.disabled = false; btn.textContent = "Salvar senha e entrar";
    }
  });
}

/* ================= data loading ================= */
async function loadAll(){
  state.loading = true;
  try{
    var results = await Promise.all([
      sb.from("clientes").select("*").order("titular_nome"),
      sb.from("dependentes").select("*"),
      sb.from("tarefas").select("*").order("data_vencimento"),
      sb.from("reembolsos").select("*").order("data_solicitacao", {ascending:false}),
      sb.from("agendamentos").select("*").order("data_hora"),
      sb.from("leads").select("*").order("criado_em", {ascending:false}),
      sb.from("interacoes").select("*").order("data", {ascending:false}),
      sb.from("params").select("*").eq("id",1).single(),
      sb.from("metas_mensais").select("*"),
      sb.from("implantacoes").select("*")
    ]);
    var errs = results.filter(function(r){return r.error;});
    if(errs.length){ console.error(errs); toast("Alguns dados não carregaram — veja o console."); }
    state.clientes = results[0].data || [];
    state.dependentes = results[1].data || [];
    state.tarefas = results[2].data || [];
    state.reembolsos = results[3].data || [];
    state.agendamentos = results[4].data || [];
    state.leads = results[5].data || [];
    state.interacoes = results[6].data || [];
    if(results[7].data) state.params = results[7].data;
    state.metas_mensais = results[8].data || [];
    state.implantacoes = results[9].data || [];
  }catch(e){ console.error(e); toast("Erro ao carregar dados."); }
  state.loading = false;
  render();
}
async function reload(table){
  var map = {
    clientes: function(){ return sb.from("clientes").select("*").order("titular_nome"); },
    dependentes: function(){ return sb.from("dependentes").select("*"); },
    tarefas: function(){ return sb.from("tarefas").select("*").order("data_vencimento"); },
    reembolsos: function(){ return sb.from("reembolsos").select("*").order("data_solicitacao",{ascending:false}); },
    agendamentos: function(){ return sb.from("agendamentos").select("*").order("data_hora"); },
    leads: function(){ return sb.from("leads").select("*").order("criado_em",{ascending:false}); },
    interacoes: function(){ return sb.from("interacoes").select("*").order("data",{ascending:false}); },
    metas_mensais: function(){ return sb.from("metas_mensais").select("*"); },
    implantacoes: function(){ return sb.from("implantacoes").select("*"); }
  };
  var r = await map[table]();
  if(r.error){ console.error(r.error); toast("Erro ao atualizar "+table); return; }
  state[table] = r.data || [];
  render();
}

function currentUser(){ return (state.session && state.session.user && state.session.user.email) || "—"; }

async function dbInsert(table, data, reloadAlso){
  data.criado_por = currentUser();
  var r = await sb.from(table).insert(data).select();
  if(r.error){ console.error(r.error); toast("Erro ao salvar: "+r.error.message); return null; }
  toast("Salvo.");
  await reload(table);
  if(reloadAlso) await reload(reloadAlso);
  return r.data && r.data[0];
}
async function dbUpdate(table, id, data){
  var r = await sb.from(table).update(data).eq("id", id);
  if(r.error){ console.error(r.error); toast("Erro ao atualizar: "+r.error.message); return false; }
  toast("Atualizado.");
  await reload(table);
  return true;
}
async function dbDelete(table, id, reloadAlso){
  var r = await sb.from(table).delete().eq("id", id);
  if(r.error){ console.error(r.error); toast("Erro ao remover: "+r.error.message); return false; }
  toast("Removido.");
  await reload(table);
  if(reloadAlso){ for(var i=0;i<reloadAlso.length;i++){ await reload(reloadAlso[i]); } }
  return true;
}
async function saveParams(p){
  var r = await sb.from("params").update(p).eq("id",1);
  if(r.error){ console.error(r.error); toast("Erro ao salvar parâmetros."); return; }
  toast("Parâmetros salvos.");
  var res = await sb.from("params").select("*").eq("id",1).single();
  if(res.data) state.params = res.data;
  render();
}

/* ================= nav / shell ================= */
var NAV = [
  {id:"painel", label:"Painel", icon:"grid"},
  {id:"clientes", label:"Clientes", icon:"users"},
  {id:"funil", label:"Funil Comercial", icon:"filter"},
  {id:"implantacao", label:"Implantação", icon:"flag"},
  {id:"tarefas", label:"Tarefas", icon:"check"},
  {id:"agenda", label:"Agenda", icon:"calendar"},
  {id:"atendimentos", label:"Atendimentos", icon:"heart"},
  {id:"posvenda", label:"Pós-venda", icon:"message"},
  {id:"parametros", label:"Parâmetros", icon:"sliders"}
];
var ICONS = {
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8.5" r="2.6"/><path d="M15.5 14.2c2.7.4 4.5 2.6 4.5 5.8"/></svg>',
  filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 5c-2.3 4.5-9.3 9-9.3 9z"/></svg>',
  message:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H8l-4 4z"/></svg>',
  sliders:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h9M17 6h3M4 12h3M9 12h11M4 18h13M20 18h0"/><circle cx="14" cy="6" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V4"/><path d="M5 4h13l-3 4.5L18 13H5"/></svg>'
};
function renderNav(){
  var nav = document.getElementById("nav");
  nav.innerHTML = NAV.map(function(n){
    return '<div class="navitem'+(state.tab===n.id?' active':'')+'" data-tab="'+n.id+'">'+ICONS[n.icon]+'<span>'+n.label+'</span></div>';
  }).join("");
  Array.prototype.forEach.call(nav.querySelectorAll(".navitem"), function(el){
    el.addEventListener("click", function(){ state.tab = el.getAttribute("data-tab"); render(); });
  });
}

function render(){
  renderNav();
  var main = document.getElementById("main");
  if(state.loading){ main.innerHTML = '<div class="empty">Carregando…</div>'; return; }
  if(state.tab==="painel") main.innerHTML = viewPainel();
  else if(state.tab==="clientes") main.innerHTML = viewClientes();
  else if(state.tab==="funil") main.innerHTML = viewFunil();
  else if(state.tab==="implantacao") main.innerHTML = viewImplantacao();
  else if(state.tab==="tarefas") main.innerHTML = viewTarefas();
  else if(state.tab==="agenda") main.innerHTML = viewAgenda();
  else if(state.tab==="atendimentos") main.innerHTML = viewAtendimentos();
  else if(state.tab==="posvenda") main.innerHTML = viewPosvenda();
  else if(state.tab==="parametros") main.innerHTML = viewParametros();
  wireActions();
}
function tile(label,value,sub){ return '<div class="tile"><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="sub">'+(sub||"")+'</div></div>'; }
function tabbtn(group,id,label,current){ return '<div class="tab2'+(current===id?' active':'')+'" data-'+group+'-tab="'+id+'">'+label+'</div>'; }
function clienteLabel(c){ return c ? (c.titular_nome || c.razao_social || "Cliente") : "—"; }

/* ================= MODAL helper ================= */
function openModal(title, bodyHtml, onSave, saveLabel){
  var root=document.getElementById("modal-root");
  root.innerHTML = '<div class="modal-backdrop" id="modal-backdrop"><div class="modal">'+
    '<div class="modal-head"><h3>'+title+'</h3><button class="modal-close" id="modal-close">&times;</button></div>'+
    '<div class="modal-body" id="modal-body">'+bodyHtml+'</div>'+
    '<div class="modal-foot"><button class="btn btn-ghost" id="modal-cancel">Cancelar</button><button class="btn btn-primary" id="modal-save">'+(saveLabel||"Salvar")+'</button></div>'+
  '</div></div>';
  function close(){ root.innerHTML=""; }
  document.getElementById("modal-close").onclick = close;
  document.getElementById("modal-cancel").onclick = close;
  document.getElementById("modal-backdrop").addEventListener("click", function(e){ if(e.target.id==="modal-backdrop") close(); });
  document.getElementById("modal-save").onclick = function(){ onSave(close); };
  wireMoneyInputs(document.getElementById("modal-body"));
  return close;
}

/* ================= PAINEL ================= */
function viewPainel(){
  var ativos = state.clientes.filter(function(c){ return c.status!=="Cancelado"; });
  var mesAtual = todayMonthKey();
  var fatMes = faturamentoDoMes(mesAtual, state.clientes, state.params);
  var meta = state.params.meta_mensal_padrao||0;
  var funilAberto = state.leads.filter(function(l){ return l.etapa!=="Ganho" && l.etapa!=="Perdido"; });
  var valorFunil = funilAberto.reduce(function(s,l){ return s+(l.valor_estimado||0); },0);
  var hoje = todayISO();
  var revisoes = ativos.map(function(c){ return {c:c,r:nextRevisao(c)}; }).filter(function(x){ return x.r && daysBetween(hoje,x.r.date)<=60; });
  var tarefasPendHoje = state.tarefas.filter(function(t){ return t.status!=="Concluída" && t.data_vencimento && t.data_vencimento<=hoje; });
  var agend7 = state.agendamentos.filter(function(a){ return a.status==="Agendado" && a.data_hora && daysBetween(hoje, a.data_hora.slice(0,10))<=7 && daysBetween(hoje,a.data_hora.slice(0,10))>=0; });
  var reembAberto = state.reembolsos.filter(function(r){ return r.status!=="Pago" && r.status!=="Negado"; });

  var months=[]; for(var i=-1;i<6;i++){ months.push(monthKeyAdd(mesAtual,i)); }

  return '<div class="topbar"><div><h1>Painel</h1><div class="desc">Visão geral — '+monthLabel(mesAtual)+'</div></div></div>'+
  '<div class="tiles">'+
    tile("Clientes ativos", ativos.length, (state.clientes.length-ativos.length)+" cancelado(s)")+
    tile("Faturamento líquido — "+monthLabel(mesAtual), fmtMoney(fatMes), meta? ("Meta: "+fmtMoney(meta)+" · "+fmtPct(meta?fatMes/meta:0)+" atingido") : "Defina uma meta em Parâmetros")+
    tile("Tarefas em aberto (vencidas/hoje)", tarefasPendHoje.length, "")+
    tile("Agendamentos (7 dias)", agend7.length, "")+
    tile("Reembolsos em aberto", reembAberto.length, "")+
    tile("Em negociação no funil", fmtMoney(valorFunil), funilAberto.length+" oportunidade(s)")+
  '</div>'+
  '<div class="card"><div class="card-head"><h2>Projeção de faturamento líquido</h2><div class="meta">parcelas + vitalício</div></div>'+
    '<div class="card-body tablewrap"><table class="grid"><thead><tr><th>Mês</th><th class="num">Previsto</th><th class="num">Meta</th><th class="num">Diferença</th></tr></thead><tbody>'+
      months.map(function(mk){ var v=faturamentoDoMes(mk,state.clientes,state.params); var diff=meta-v;
        return '<tr><td>'+monthLabel(mk)+(mk===mesAtual?' <span class="tag">atual</span>':'')+'</td><td class="num">'+fmtMoney(v)+'</td><td class="num">'+fmtMoney(meta)+'</td><td class="num" style="color:'+(diff>0?'var(--danger)':'var(--success)')+'">'+fmtMoney(diff)+'</td></tr>';
      }).join("")+
    '</tbody></table></div></div>'+
  '<div class="card"><div class="card-head"><h2>Revisões de plano (60 dias)</h2></div><div class="card-body">'+
    (revisoes.length===0? '<div class="empty">Nada pendente.</div>' :
    '<div class="tablewrap"><table class="grid"><thead><tr><th>Cliente</th><th>Situação</th><th>Data</th></tr></thead><tbody>'+
      revisoes.map(function(x){ return '<tr><td>'+escapeHtml(clienteLabel(x.c))+'</td><td>'+(x.r.overdue?'<span class="pill pill-bad">Atrasada</span>':'<span class="pill pill-warn">Próxima</span>')+'</td><td>'+fmtDateISO(x.r.date)+'</td></tr>'; }).join("")+
    '</tbody></table></div>')+
  '</div></div>';
}

/* ================= CLIENTES ================= */
var clientesFilter = "";
function viewClientes(){
  var list = state.clientes.filter(function(c){
    if(!clientesFilter) return true;
    var q=clientesFilter.toLowerCase();
    return (c.titular_nome||"").toLowerCase().indexOf(q)>=0 || (c.razao_social||"").toLowerCase().indexOf(q)>=0 || (c.cnpj_cpf||"").toLowerCase().indexOf(q)>=0 || (c.cpf||"").indexOf(q)>=0;
  });
  return '<div class="topbar"><div><h1>Clientes</h1><div class="desc">'+state.clientes.length+' contrato(s)</div></div>'+
  '<div class="rowflex">'+
    '<button class="btn btn-ghost" id="btn-modelo-excel">Baixar modelo Excel</button>'+
    '<button class="btn btn-ghost" id="btn-importar-excel">Importar Excel</button>'+
    '<button class="btn btn-ghost" id="btn-exportar-excel">Exportar relatório</button>'+
    '<input type="file" id="input-importar-excel" accept=".xlsx,.xls" style="display:none;">'+
    '<button class="btn btn-primary" id="btn-novo-cliente">+ Novo cliente</button>'+
  '</div></div>'+
  '<div class="rowflex" style="margin-bottom:14px;"><input style="max-width:300px" placeholder="Buscar por nome, razão social, CNPJ ou CPF…" id="cli-search" value="'+escapeHtml(clientesFilter)+'"></div>'+
  '<div class="card"><div class="tablewrap"><table class="grid"><thead><tr>'+
    '<th>Cliente</th><th>Plano</th><th>Vendedor(a)</th><th>Vigência</th><th class="num">Valor contrato</th><th>Status</th><th>Faixa etária (titular)</th><th>Revisão</th><th></th>'+
  '</tr></thead><tbody>'+
  (list.length===0? '<tr><td colspan="9"><div class="empty">Nenhum cliente cadastrado ainda.</div></td></tr>' :
  list.map(function(c){
    var faixa = computeFaixa(c.data_nascimento);
    var rev = nextRevisao(c);
    var nDeps = depsOf(c.id).length;
    return '<tr>'+
      '<td><b>'+escapeHtml(clienteLabel(c))+'</b><br><span class="muted">'+escapeHtml(c.cnpj_cpf||c.cpf||"")+(nDeps? ' · '+nDeps+' dep.':'')+'</span></td>'+
      '<td>'+escapeHtml(c.plano_nome||c.produto||"—")+'</td>'+
      '<td>'+escapeHtml(c.vendedor||"—")+'</td>'+
      '<td>'+fmtDateISO(c.vigencia_inicio)+(c.vigencia_fim? ' – '+fmtDateISO(c.vigencia_fim):'')+'</td>'+
      '<td class="num">'+fmtMoney(c.valor_contrato_total)+'</td>'+
      '<td>'+(c.status==="Cancelado"?'<span class="pill pill-bad">Cancelado</span>':'<span class="pill pill-ok">Ativo</span>')+'</td>'+
      '<td>'+(faixa? faixa.label+(faixa.nextChangeISO?'<br><span class="muted">muda '+fmtDateISO(faixa.nextChangeISO)+'</span>':'') : '—')+'</td>'+
      '<td>'+(rev? (rev.overdue?'<span class="pill pill-bad">atrasada</span>':fmtDateISO(rev.date)) : '—')+'</td>'+
      '<td><button class="linklike" data-edit-cliente="'+c.id+'">editar</button> <button class="linklike" data-del-cliente="'+c.id+'" style="color:var(--danger);">excluir</button></td>'+
    '</tr>';
  }).join(""))+
  '</tbody></table></div></div>';
}

function clienteFormHtml(c, deps){
  c = c || {produto:"Saúde", vendedor:"Henrique", status:"Ativo"};
  deps = deps || [];
  var banco = c.dados_bancarios || {};
  return ''+
  '<fieldset><legend>Titular</legend>'+
  '<div class="field row2"><div class="field"><label>Nome do titular</label><input id="f-titular" value="'+escapeHtml(c.titular_nome||"")+'"></div><div class="field"><label>Razão social (se PJ)</label><input id="f-razao" value="'+escapeHtml(c.razao_social||"")+'"></div></div>'+
  '<div class="field row3"><div class="field"><label>CNPJ (empresa)</label><input id="f-cnpj" value="'+escapeHtml(c.cnpj_cpf||"")+'"></div><div class="field"><label>CPF (titular)</label><input id="f-cpf" value="'+escapeHtml(c.cpf||"")+'"></div><div class="field"><label>Data de nascimento <span id="f-idade-out" class="muted"></span></label><input type="date" id="f-nasc" value="'+(c.data_nascimento||"")+'"></div></div>'+
  '<div class="field row3"><div class="field"><label>E-mail</label><input type="email" id="f-email" value="'+escapeHtml(c.email||"")+'"></div><div class="field"><label>Telefone</label><input id="f-telefone" value="'+escapeHtml(c.telefone||"")+'"></div><div class="field"><label>Nº da carteirinha</label><input id="f-carteirinha" value="'+escapeHtml(c.numero_carteirinha||"")+'"></div></div>'+
  '</fieldset>'+
  '<fieldset><legend>Endereço</legend>'+
  '<div class="field row3"><div class="field"><label>CEP</label><input id="f-cep" value="'+escapeHtml(c.cep||"")+'" placeholder="00000-000" maxlength="9"></div><div class="field"><label>Número</label><input id="f-end-numero" value="'+escapeHtml(c.endereco_numero||"")+'"></div><div class="field"><label>Complemento (apto/bloco)</label><input id="f-end-compl" value="'+escapeHtml(c.endereco_complemento||"")+'"></div></div>'+
  '<div class="field row3"><div class="field"><label>Rua</label><input id="f-end-rua" value="'+escapeHtml(c.endereco_rua||"")+'"></div><div class="field"><label>Bairro</label><input id="f-end-bairro" value="'+escapeHtml(c.endereco_bairro||"")+'"></div><div class="field"><label>Cidade / UF</label><div class="rowflex"><input id="f-end-cidade" style="flex:1" value="'+escapeHtml(c.endereco_cidade||"")+'"><input id="f-end-uf" style="max-width:64px" maxlength="2" value="'+escapeHtml(c.endereco_uf||"")+'"></div></div></div>'+
  '<div class="muted" id="f-cep-status" style="font-size:11.5px;"></div>'+
  '</fieldset>'+
  '<fieldset><legend>Contrato</legend>'+
  '<div class="field row3"><div class="field"><label>Produto</label><select id="f-produto">'+PRODUTOS.map(function(p){return '<option'+(c.produto===p?' selected':'')+'>'+p+'</option>';}).join("")+'</select></div><div class="field"><label>Nome do plano</label><input id="f-plano" value="'+escapeHtml(c.plano_nome||"")+'" placeholder="ex: Amil Black"></div><div class="field"><label>Vendedor(a)</label><select id="f-vendedor">'+VENDEDORES.map(function(v){return '<option'+(c.vendedor===v?' selected':'')+'>'+v+'</option>';}).join("")+'</select></div></div>'+
  '<div class="field row3"><div class="field"><label>Data de inclusão</label><input type="date" id="f-inclusao" value="'+(c.data_inclusao||"")+'"></div><div class="field"><label>Vigência (início)</label><input type="date" id="f-vig-inicio" value="'+(c.vigencia_inicio||"")+'"></div><div class="field"><label>Vigência (duração)</label><select id="f-vig-meses"><option value="12"'+((c.duracao_contrato_meses||12)==12?' selected':'')+'>12 meses</option><option value="24"'+((c.duracao_contrato_meses||12)==24?' selected':'')+'>24 meses</option></select></div></div>'+
  '<div class="field row2"><div class="field"><label>Vigência (fim, calculado)</label><input type="date" id="f-vig-fim" value="'+(c.vigencia_fim||"")+'"></div><div class="field"><label>&nbsp;</label><div class="muted" style="font-size:11.5px;padding-top:8px;">Calculado a partir do início + duração — pode ajustar manualmente se precisar.</div></div></div>'+
  '<div class="field row3">'+moneyFieldHtml("f-valor-benef", c.valor_por_beneficiario, "Valor por beneficiário (R$)")+moneyFieldHtml("f-valor-total", c.valor_contrato_total, "Valor do contrato total (R$)")+moneyFieldHtml("f-bonus", c.bonus_parcela4||0, "Bônus parcela 4 (R$, opcional)")+'</div>'+
  '<div class="field row3"><div class="field"><label>Data de fechamento (p/ comissão)</label><input type="date" id="f-fechamento" value="'+(c.data_fechamento||c.data_inclusao||"")+'"></div><div class="field"><label>Última revisão de plano</label><input type="date" id="f-revisao" value="'+(c.ultima_revisao||"")+'"></div><div class="field"><label>Status</label><select id="f-status"><option'+(c.status==="Ativo"?' selected':'')+'>Ativo</option><option'+(c.status==="Cancelado"?' selected':'')+'>Cancelado</option></select></div></div>'+
  '<div class="field row3"><div class="field"><label>Reajuste (índice %)</label><input type="number" step="0.01" id="f-reajuste-pct" value="'+(c.percentual_reajuste||"")+'" placeholder="ex: 8,5"></div><div class="field"><label>&nbsp;</label><button type="button" class="btn btn-ghost" id="btn-aplicar-reajuste">Aplicar reajuste ao valor do contrato</button></div><div class="field"><label>Último reajuste em</label><input type="date" id="f-reajuste-data" value="'+(c.data_ultimo_reajuste||"")+'" readonly></div></div>'+
  '</fieldset>'+
  '<fieldset><legend>Dados bancários do titular (opcional)</legend>'+
  '<div class="field row3"><div class="field"><label>Banco</label><input id="f-banco" value="'+escapeHtml(banco.banco||"")+'"></div><div class="field"><label>Agência</label><input id="f-agencia" value="'+escapeHtml(banco.agencia||"")+'"></div><div class="field"><label>Conta</label><input id="f-conta" value="'+escapeHtml(banco.conta||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Tipo de conta</label><input id="f-tipo-conta" value="'+escapeHtml(banco.tipo_conta||"")+'" placeholder="Corrente / Poupança"></div><div class="field"><label>Chave PIX</label><input id="f-pix" value="'+escapeHtml(banco.pix||"")+'"></div></div>'+
  '</fieldset>'+
  '<fieldset><legend>Dependentes</legend><div id="dep-list">'+deps.map(function(d,i){return depRowHtml(d,i);}).join("")+'</div>'+
  '<button type="button" class="linklike" id="btn-add-dep" style="margin-top:6px;">+ adicionar dependente</button></fieldset>'+
  '<div class="field"><label>Observações</label><textarea id="f-obs">'+escapeHtml(c.observacoes||"")+'</textarea></div>';
}
function depRowHtml(d,i){
  d=d||{};
  return '<div class="deprow" data-dep-row="'+i+'">'+
    '<div class="field"><label>Nome</label><input class="dep-nome" value="'+escapeHtml(d.nome||"")+'"></div>'+
    '<div class="field"><label>CPF</label><input class="dep-cpf" value="'+escapeHtml(d.cpf||"")+'"></div>'+
    '<div class="field"><label>Nascimento</label><input type="date" class="dep-nasc" value="'+(d.data_nascimento||"")+'"></div>'+
    '<div class="field"><label>Tipo</label><select class="dep-tipo">'+TIPOS_TITULARIDADE.map(function(t){return '<option'+((d.tipo||"Dependente")===t?' selected':'')+'>'+t+'</option>';}).join("")+'</select></div>'+
    '<div class="field"><label>Valor benefíc. (R$)</label><input type="text" inputmode="decimal" class="money-input dep-valor" value="'+escapeHtml(moneyDisplay(d.valor_beneficiario))+'" placeholder="0,00"></div>'+
    '<button type="button" class="iconbtn" data-remove-dep="'+i+'">✕</button>'+
  '</div>';
}
function wireClienteFormDeps(){
  var list = document.getElementById("dep-list");
  if(!list) return;
  document.getElementById("btn-add-dep").onclick = function(){
    var idx = list.querySelectorAll("[data-dep-row]").length;
    var div = document.createElement("div");
    div.innerHTML = depRowHtml({}, idx);
    list.appendChild(div.firstChild);
    wireDepRemovals();
  };
  wireDepRemovals();
}
function wireDepRemovals(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-remove-dep]"), function(btn){
    btn.onclick = function(){ btn.closest("[data-dep-row]").remove(); };
  });
}
function wireClienteFormExtra(){
  var elNasc = document.getElementById("f-nasc");
  var elIdadeOut = document.getElementById("f-idade-out");
  function updateIdade(){
    if(!elNasc.value){ elIdadeOut.textContent = ""; return; }
    var idade = ageOnISO(elNasc.value, todayISO());
    elIdadeOut.textContent = "("+idade+" ano"+(idade===1?"":"s")+")";
  }
  if(elNasc){ elNasc.addEventListener("input", updateIdade); updateIdade(); }

  var elCep = document.getElementById("f-cep");
  var elCepStatus = document.getElementById("f-cep-status");
  if(elCep){
    elCep.addEventListener("blur", async function(){
      var digits = elCep.value.replace(/\D/g,"");
      if(digits.length !== 8){ return; }
      elCepStatus.textContent = "Buscando endereço…";
      try{
        var resp = await fetch("https://viacep.com.br/ws/"+digits+"/json/");
        var data = await resp.json();
        if(data.erro){ elCepStatus.textContent = "CEP não encontrado."; return; }
        document.getElementById("f-end-rua").value = data.logradouro || "";
        document.getElementById("f-end-bairro").value = data.bairro || "";
        document.getElementById("f-end-cidade").value = data.localidade || "";
        document.getElementById("f-end-uf").value = data.uf || "";
        elCepStatus.textContent = "Endereço preenchido automaticamente — confira o número e complemento.";
      }catch(e){
        console.error(e);
        elCepStatus.textContent = "Não foi possível buscar o CEP agora — preencha manualmente.";
      }
    });
  }

  var elVigInicio = document.getElementById("f-vig-inicio");
  var elVigMeses = document.getElementById("f-vig-meses");
  var elVigFim = document.getElementById("f-vig-fim");
  function updateVigFim(){
    if(!elVigInicio.value) return;
    elVigFim.value = addMonthsISO(elVigInicio.value, parseInt(elVigMeses.value,10)) || elVigFim.value;
  }
  if(elVigInicio){ elVigInicio.addEventListener("change", updateVigFim); }
  if(elVigMeses){ elVigMeses.addEventListener("change", updateVigFim); }

  var btnReajuste = document.getElementById("btn-aplicar-reajuste");
  if(btnReajuste){
    btnReajuste.onclick = function(){
      var pct = parseFloat(document.getElementById("f-reajuste-pct").value);
      if(!pct){ toast("Informe o percentual de reajuste."); return; }
      var elValor = document.getElementById("f-valor-total");
      var atual = parseMoneyBR(elValor.value);
      var novo = atual * (1 + pct/100);
      elValor.value = moneyDisplay(novo);
      document.getElementById("f-reajuste-data").value = todayISO();
      toast("Reajuste de "+pct+"% aplicado ao valor do contrato.");
    };
  }
}
function readClienteForm(){
  var deps=[];
  Array.prototype.forEach.call(document.querySelectorAll("[data-dep-row]"), function(row){
    var nome = row.querySelector(".dep-nome").value.trim();
    var cpf = row.querySelector(".dep-cpf").value.trim();
    var nasc = row.querySelector(".dep-nasc").value;
    var valor = parseMoneyBR(row.querySelector(".dep-valor").value);
    var tipoEl = row.querySelector(".dep-tipo");
    var tipo = tipoEl ? tipoEl.value : "Dependente";
    if(nome||cpf||nasc) deps.push({nome:nome, cpf:cpf, data_nascimento:nasc||null, valor_beneficiario:valor, tipo:tipo});
  });
  var banco = {
    banco: document.getElementById("f-banco").value.trim(),
    agencia: document.getElementById("f-agencia").value.trim(),
    conta: document.getElementById("f-conta").value.trim(),
    tipo_conta: document.getElementById("f-tipo-conta").value.trim(),
    pix: document.getElementById("f-pix").value.trim()
  };
  return {
    data: {
      titular_nome: document.getElementById("f-titular").value.trim(),
      razao_social: document.getElementById("f-razao").value.trim(),
      cnpj_cpf: document.getElementById("f-cnpj").value.trim(),
      cpf: document.getElementById("f-cpf").value.trim(),
      data_nascimento: document.getElementById("f-nasc").value || null,
      email: document.getElementById("f-email").value.trim(),
      telefone: document.getElementById("f-telefone").value.trim(),
      numero_carteirinha: document.getElementById("f-carteirinha").value.trim(),
      produto: document.getElementById("f-produto").value,
      plano_nome: document.getElementById("f-plano").value.trim(),
      vendedor: document.getElementById("f-vendedor").value,
      data_inclusao: document.getElementById("f-inclusao").value || null,
      vigencia_inicio: document.getElementById("f-vig-inicio").value || null,
      vigencia_fim: document.getElementById("f-vig-fim").value || null,
      duracao_contrato_meses: parseInt(document.getElementById("f-vig-meses").value,10)||12,
      valor_por_beneficiario: parseMoneyBR(document.getElementById("f-valor-benef").value),
      valor_contrato_total: parseMoneyBR(document.getElementById("f-valor-total").value),
      bonus_parcela4: parseMoneyBR(document.getElementById("f-bonus").value),
      data_fechamento: document.getElementById("f-fechamento").value || null,
      ultima_revisao: document.getElementById("f-revisao").value || null,
      status: document.getElementById("f-status").value,
      percentual_reajuste: parseFloat(document.getElementById("f-reajuste-pct").value)||null,
      data_ultimo_reajuste: document.getElementById("f-reajuste-data").value || null,
      cep: document.getElementById("f-cep").value.trim(),
      endereco_numero: document.getElementById("f-end-numero").value.trim(),
      endereco_complemento: document.getElementById("f-end-compl").value.trim(),
      endereco_rua: document.getElementById("f-end-rua").value.trim(),
      endereco_bairro: document.getElementById("f-end-bairro").value.trim(),
      endereco_cidade: document.getElementById("f-end-cidade").value.trim(),
      endereco_uf: document.getElementById("f-end-uf").value.trim(),
      dados_bancarios: banco,
      observacoes: document.getElementById("f-obs").value.trim()
    },
    deps: deps
  };
}
function openClienteModal(existing){
  var isEdit = !!(existing && existing.id);
  var deps = isEdit? depsOf(existing.id) : [];
  openModal(isEdit?"Editar cliente":"Novo cliente", clienteFormHtml(existing, deps), async function(closeFn){
    var parsed = readClienteForm();
    if(existing && existing.lead_id) parsed.data.lead_id = existing.lead_id;
    if(!parsed.data.titular_nome && !parsed.data.razao_social){ toast("Informe o nome do titular ou a razão social."); return; }
    var clienteId;
    if(isEdit){
      var ok = await dbUpdate("clientes", existing.id, parsed.data);
      if(!ok) return;
      clienteId = existing.id;
      await sb.from("dependentes").delete().eq("cliente_id", clienteId);
    } else {
      var created = await dbInsert("clientes", parsed.data);
      if(!created) return;
      clienteId = created.id;
    }
    if(parsed.deps.length){
      var rows = parsed.deps.map(function(d){ d.cliente_id = clienteId; return d; });
      await sb.from("dependentes").insert(rows);
    }
    await reload("dependentes");
    closeFn();
  });
  wireClienteFormDeps();
  wireClienteFormExtra();
}

/* ================= CLIENTES: Excel (importar / exportar) ================= */
var CLIENTE_XLS_COLS = [
  {key:"titular_nome", header:"Nome do titular"},
  {key:"razao_social", header:"Razão social (PJ)"},
  {key:"cnpj_cpf", header:"CNPJ"},
  {key:"cpf", header:"CPF"},
  {key:"data_nascimento", header:"Data de nascimento (AAAA-MM-DD)"},
  {key:"email", header:"E-mail"},
  {key:"telefone", header:"Telefone"},
  {key:"numero_carteirinha", header:"Nº carteirinha"},
  {key:"produto", header:"Produto (Saúde/Vida/Consórcio)"},
  {key:"plano_nome", header:"Nome do plano"},
  {key:"vendedor", header:"Vendedor(a)"},
  {key:"data_inclusao", header:"Data de inclusão (AAAA-MM-DD)"},
  {key:"vigencia_inicio", header:"Vigência início (AAAA-MM-DD)"},
  {key:"duracao_contrato_meses", header:"Duração do contrato (12 ou 24)"},
  {key:"valor_por_beneficiario", header:"Valor por beneficiário"},
  {key:"valor_contrato_total", header:"Valor do contrato total"},
  {key:"status", header:"Status (Ativo/Cancelado)"},
  {key:"cep", header:"CEP"},
  {key:"endereco_numero", header:"Número"},
  {key:"endereco_complemento", header:"Complemento"},
  {key:"observacoes", header:"Observações"}
];
function baixarModeloClientes(){
  var headerRow = CLIENTE_XLS_COLS.map(function(c){return c.header;});
  var exampleRow = ["João da Silva","","000.000.000-00","000.000.000-00","1985-04-12","joao@email.com","(11) 90000-0000","1234567","Saúde","Amil Black","Henrique","2026-01-10","2026-01-10","12","350.00","350.00","Ativo","01310-100","1000","apto 12","Cliente exemplo — apague esta linha"];
  var ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  XLSX.writeFile(wb, "modelo-clientes-oneplus.xlsx");
}
function exportarClientesExcel(list){
  var rows = list.map(function(c){
    var row = {};
    CLIENTE_XLS_COLS.forEach(function(col){ row[col.header] = c[col.key]==null? "" : c[col.key]; });
    return row;
  });
  var ws = XLSX.utils.json_to_sheet(rows, {header: CLIENTE_XLS_COLS.map(function(c){return c.header;})});
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  XLSX.writeFile(wb, "relatorio-clientes-oneplus-"+todayISO()+".xlsx");
}
function norm(s){ return String(s==null?"":s).trim().toLowerCase(); }
async function importarClientesExcel(file){
  var headerByNorm = {};
  CLIENTE_XLS_COLS.forEach(function(c){ headerByNorm[norm(c.header)] = c.key; });
  var data = await file.arrayBuffer();
  var wb = XLSX.read(data, {type:"array"});
  var sheet = wb.Sheets[wb.SheetNames[0]];
  var rows = XLSX.utils.sheet_to_json(sheet, {defval:""});
  if(!rows.length){ toast("A planilha está vazia."); return; }
  var registros = [];
  rows.forEach(function(r){
    var rec = {};
    Object.keys(r).forEach(function(h){
      var key = headerByNorm[norm(h)];
      if(key) rec[key] = r[h];
    });
    if(!rec.titular_nome && !rec.razao_social) return;
    rec.duracao_contrato_meses = parseInt(rec.duracao_contrato_meses,10) || 12;
    rec.valor_por_beneficiario = parseFloat(rec.valor_por_beneficiario)||0;
    rec.valor_contrato_total = parseFloat(rec.valor_contrato_total)||0;
    rec.status = rec.status === "Cancelado" ? "Cancelado" : "Ativo";
    ["titular_nome","razao_social","cnpj_cpf","cpf","email","telefone","numero_carteirinha","produto","plano_nome","vendedor","cep","endereco_numero","endereco_complemento","observacoes"].forEach(function(k){
      if(rec[k]!=null) rec[k] = String(rec[k]).trim();
    });
    ["data_nascimento","data_inclusao","vigencia_inicio"].forEach(function(k){
      if(rec[k]) rec[k] = String(rec[k]).slice(0,10); else rec[k]=null;
    });
    if(rec.vigencia_inicio) rec.vigencia_fim = addMonthsISO(rec.vigencia_inicio, rec.duracao_contrato_meses);
    rec.criado_por = currentUser();
    registros.push(rec);
  });
  if(!registros.length){ toast("Nenhuma linha válida encontrada (preencha ao menos o nome do titular)."); return; }
  var r = await sb.from("clientes").insert(registros);
  if(r.error){ console.error(r.error); toast("Erro ao importar: "+r.error.message); return; }
  toast(registros.length+" cliente(s) importado(s) com sucesso.");
  await reload("clientes");
}

/* ================= FUNIL ================= */
function tarefasDoLead(leadId){
  return state.tarefas.filter(function(t){ return t.lead_id===leadId; })
    .sort(function(a,b){ return (a.vencimento_em||"")<(b.vencimento_em||"")?-1:1; });
}
function tarefasAbertasDoLead(leadId){
  return tarefasDoLead(leadId).filter(function(t){ return t.status!=="Concluída"; });
}
/* ---- meta de vendas mensal (definida manualmente, mês a mês) ---- */
function metaValorDoMes(mk){
  var m = state.metas_mensais.filter(function(x){ return x.mes===mk; })[0];
  return m ? (m.valor_meta||0) : 0;
}
function leadsGanhosDoMes(mk){
  return state.leads.filter(function(l){ return l.etapa==="Ganho" && l.data_ganho && monthKeyFromISO(l.data_ganho)===mk; });
}
function vendasValorDoMes(mk){ return leadsGanhosDoMes(mk).reduce(function(s,l){ return s+(l.valor_estimado||0); },0); }
function vendasQtdDoMes(mk){ return leadsGanhosDoMes(mk).length; }
function operadoraTag(l){
  if(!l.operadora) return "";
  return '<span class="tag">'+escapeHtml(l.operadora)+(l.quantidade_vidas? " · "+l.quantidade_vidas+" vida"+(l.quantidade_vidas==1?"":"s") : "")+'</span>';
}
async function setLeadEtapa(leadId, novaEtapa){
  var lead = state.leads.filter(function(l){ return l.id===leadId; })[0];
  var patch = {etapa: novaEtapa};
  if(novaEtapa==="Ganho" && lead && !lead.data_ganho){ patch.data_ganho = todayISO(); }
  var ok = await dbUpdate("leads", leadId, patch);
  if(ok && novaEtapa==="Ganho"){ await ensureImplantacao(leadId); }
}
async function ensureImplantacao(leadId){
  var existing = state.implantacoes.filter(function(i){ return i.lead_id===leadId; })[0];
  if(existing) return existing;
  return await dbInsert("implantacoes", {lead_id: leadId, responsavel:"Kelly"});
}
function metaChartHtml(mk){
  var meta = metaValorDoMes(mk);
  var vendido = vendasValorDoMes(mk);
  var pct = meta>0 ? (vendido/meta) : 0;
  var pctClamped = Math.max(0, Math.min(1,pct));
  var falta = Math.max(meta - vendido, 0);
  var pctFalta = meta>0 ? (1-pctClamped) : 0;
  var excedente = vendido>meta ? vendido-meta : 0;
  return '<div class="card"><div class="card-head"><h2>Meta de vendas — '+monthLabel(mk)+'</h2><div class="meta">'+(meta? fmtPct(pctClamped)+" da meta" : "defina a meta abaixo")+'</div></div>'+
    '<div class="card-body">'+
    '<div class="rowflex" style="margin-bottom:14px;align-items:flex-end;">'+
      moneyFieldHtml("meta-valor-input", meta, "Meta de vendas do mês (R$)")+
      '<button class="btn btn-primary" id="btn-salvar-meta">Salvar meta</button>'+
    '</div>'+
    (meta>0 ? (
      '<div class="progress-track"><div class="progress-fill" style="width:'+(pctClamped*100)+'%;"></div></div>'+
      '<div class="rowflex" style="justify-content:space-between;margin-top:8px;font-size:12.5px;">'+
        '<span><b>'+fmtMoney(vendido)+'</b> vendido ('+fmtPct(pctClamped)+') — '+vendasQtdDoMes(mk)+' negócio(s) ganho(s)</span>'+
        '<span class="muted">'+(falta>0? "Faltam "+fmtMoney(falta)+" ("+fmtPct(pctFalta)+") para bater a meta" : "Meta batida! Excedente de "+fmtMoney(excedente))+'</span>'+
      '</div>'
    ) : '<div class="empty">Defina a meta de vendas do mês acima para ver o gráfico de progresso.</div>')+
    '</div></div>';
}
function viewFunil(){
  var byEtapa={}; ETAPAS.forEach(function(e){byEtapa[e]=[];});
  state.leads.forEach(function(l){ (byEtapa[l.etapa]||(byEtapa[l.etapa]=[])).push(l); });

  var agoraISO = new Date().toISOString();
  var tarefasAtrasadas = state.tarefas.filter(function(t){ return t.lead_id && t.status!=="Concluída" && t.vencimento_em && t.vencimento_em < agoraISO; })
    .sort(function(a,b){ return a.vencimento_em<b.vencimento_em?-1:1; });

  var mesAtual = todayMonthKey();
  var vendasQtdMes = vendasQtdDoMes(mesAtual);
  var metaQtd = state.params.meta_vendas_mensal||0;
  var faltamQtd = Math.max(metaQtd - vendasQtdMes, 0);

  var header = '<div class="topbar"><div><h1>Funil Comercial</h1><div class="desc">'+state.leads.length+' oportunidade(s) · negócios ganhos saem do quadro e seguem na aba Implantação</div></div><button class="btn btn-primary" id="btn-novo-lead">+ Nova oportunidade</button></div>';

  var pipeTiles = '<div class="tiles">'+
    tile("Negócios ganhos — "+monthLabel(mesAtual), vendasQtdMes, metaQtd? (faltamQtd>0? "Faltam "+faltamQtd+" para a meta de "+metaQtd : "Meta de "+metaQtd+" atingida! 🎉") : "Defina a meta (quantidade) em Parâmetros")+
    tile("Tarefas do funil atrasadas", tarefasAtrasadas.length, tarefasAtrasadas.length? "Veja a lista abaixo" : "Tudo em dia")+
  '</div>';

  var metaChart = metaChartHtml(mesAtual);

  var atrasoBanner = "";
  if(tarefasAtrasadas.length){
    atrasoBanner = '<div class="card"><div class="card-head"><h2>⏰ Tarefas atrasadas no funil</h2><div class="meta">'+tarefasAtrasadas.length+'</div></div><div class="card-body">'+
      '<div class="tablewrap"><table class="grid"><thead><tr><th>Lead</th><th>Tarefa</th><th>Canal</th><th>Vencia em</th><th></th></tr></thead><tbody>'+
      tarefasAtrasadas.map(function(t){
        var lead = state.leads.filter(function(l){return l.id===t.lead_id;})[0];
        return '<tr><td>'+escapeHtml(lead? (lead.nome||lead.empresa||"—") : "—")+'</td><td>'+escapeHtml(t.titulo)+'</td><td>'+escapeHtml(t.canal||"—")+'</td><td><span class="pill pill-bad">'+fmtDateTime(t.vencimento_em)+'</span></td><td><button class="linklike" data-concluir-tarefa-lead="'+t.id+'">concluir</button></td></tr>';
      }).join("")+
      '</tbody></table></div></div></div>';
  }

  var ETAPAS_PIPELINE = ETAPAS.filter(function(e){ return e!=="Ganho"; });
  var board = '<div class="kanban-board">'+ETAPAS_PIPELINE.map(function(etapa){
    var items = byEtapa[etapa]||[];
    var total = items.reduce(function(s,l){return s+(l.valor_estimado||0);},0);
    return '<div class="kanban-col"><div class="kanban-col-head"><h3>'+etapa+'</h3><div class="meta">'+items.length+' · '+fmtMoney(total)+'</div></div>'+
      '<div class="kanban-col-body">'+
      (items.length===0? '<div class="empty" style="padding:16px 6px;">Nenhuma oportunidade.</div>' :
      items.map(function(l){
        var abertas = tarefasAbertasDoLead(l.id);
        return '<div class="kanban-card">'+
          '<div class="k-title">'+escapeHtml(l.nome||"—")+(l.empresa?' <span class="muted">('+escapeHtml(l.empresa)+')</span>':'')+'</div>'+
          '<div class="muted">'+escapeHtml(l.produto||"—")+' · '+escapeHtml(l.vendedor||"—")+'</div>'+
          (operadoraTag(l)? '<div style="margin-top:4px;">'+operadoraTag(l)+'</div>' : '')+
          '<div style="margin-top:4px;font-weight:600;">'+fmtMoney(l.valor_estimado)+'</div>'+
          (abertas.length? '<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;">'+
            abertas.map(function(t){
              var overdue = t.vencimento_em && t.vencimento_em < agoraISO;
              return '<span class="pill '+(overdue?'pill-bad':'pill-warn')+'" style="justify-content:space-between;">'+escapeHtml(t.titulo)+' — '+fmtDateTime(t.vencimento_em)+' <button class="linklike" data-concluir-tarefa-lead="'+t.id+'" style="margin-left:6px;">concluir</button></span>';
            }).join("")+
          '</div>' : '')+
          '<select class="lead-etapa" data-lead="'+l.id+'" style="margin-top:8px;">'+ETAPAS.map(function(e2){return '<option'+(l.etapa===e2?' selected':'')+'>'+e2+'</option>';}).join("")+'</select>'+
          '<div class="rowflex" style="margin-top:6px;">'+
            '<button class="linklike" data-edit-lead="'+l.id+'">editar</button>'+
            (l.etapa==="Ganho"? '<button class="linklike" data-convert-lead="'+l.id+'">virar cliente</button>' : '')+
            '<button class="linklike" data-agendar-tarefa-lead="'+l.id+'">+ tarefa</button>'+
          '</div>'+
        '</div>';
      }).join(""))+
      '</div></div>';
  }).join("")+'</div>';

  return header + pipeTiles + metaChart + atrasoBanner + board;
}
function leadTarefaFormHtml(){
  return '<div class="field"><label>O que fazer</label><input id="lt-titulo" placeholder="ex: Ligar para o cliente"></div>'+
  '<div class="field row2"><div class="field"><label>Canal</label><select id="lt-canal">'+CANAIS_TAREFA.map(function(c){return '<option>'+c+'</option>';}).join("")+'</select></div><div class="field"><label>Data e hora</label><input type="datetime-local" id="lt-venc"></div></div>'+
  '<div class="field"><label>Observação (opcional)</label><textarea id="lt-desc"></textarea></div>';
}
function openLeadTarefaModal(lead){
  openModal("Agendar tarefa — "+(lead.nome||lead.empresa||"lead"), leadTarefaFormHtml(), function(closeFn){
    var titulo = document.getElementById("lt-titulo").value.trim();
    var venc = document.getElementById("lt-venc").value;
    if(!titulo){ toast("Descreva a tarefa."); return; }
    if(!venc){ toast("Escolha data e hora."); return; }
    var data = {
      tipo: "Tarefa",
      titulo: titulo,
      responsavel: lead.vendedor || currentUser(),
      lead_id: lead.id,
      canal: document.getElementById("lt-canal").value,
      vencimento_em: new Date(venc).toISOString(),
      data_vencimento: venc.slice(0,10),
      status: "Pendente",
      descricao: document.getElementById("lt-desc").value.trim()
    };
    dbInsert("tarefas", data);
    closeFn();
  });
}
function leadFormHtml(l){
  l=l||{etapa:"Qualificação",produto:"Saúde",vendedor:"Henrique"};
  var operadoraAtual = l.operadora && OPERADORAS.indexOf(l.operadora)===-1 ? "Outros" : (l.operadora||"");
  var operadoraOutrosValor = (l.operadora && OPERADORAS.indexOf(l.operadora)===-1) ? l.operadora : "";
  return '<div class="field row2"><div class="field"><label>Nome do contato</label><input id="l-nome" value="'+escapeHtml(l.nome||"")+'"></div><div class="field"><label>Empresa</label><input id="l-empresa" value="'+escapeHtml(l.empresa||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Produto</label><select id="l-produto">'+PRODUTOS.map(function(p){return '<option'+(l.produto===p?' selected':'')+'>'+p+'</option>';}).join("")+'</select></div><div class="field"><label>Vendedor(a)</label><select id="l-vendedor">'+VENDEDORES.map(function(v){return '<option'+(l.vendedor===v?' selected':'')+'>'+v+'</option>';}).join("")+'</select></div></div>'+
  '<div class="field row2">'+moneyFieldHtml("l-valor", l.valor_estimado, "Valor do negócio (R$)")+'<div class="field"><label>Origem</label><input id="l-origem" value="'+escapeHtml(l.origem||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Quantidade de vidas</label><input type="number" step="1" min="0" id="l-vidas" value="'+(l.quantidade_vidas||"")+'" placeholder="ex: 4"></div>'+
    '<div class="field"><label>Operadora / plano</label><select id="l-operadora">'+
      '<option value="">—</option>'+
      OPERADORAS.map(function(o){ return '<option'+(operadoraAtual===o?' selected':'')+'>'+o+'</option>'; }).join("")+
    '</select></div></div>'+
  '<div class="field" id="l-operadora-outros-wrap" style="'+(operadoraAtual==="Outros"?"":"display:none;")+'"><label>Qual operadora?</label><input id="l-operadora-outros" value="'+escapeHtml(operadoraOutrosValor)+'"></div>'+
  '<div class="field"><label>Etapa</label><select id="l-etapa">'+ETAPAS.map(function(e){return '<option'+(l.etapa===e?' selected':'')+'>'+e+'</option>';}).join("")+'</select></div>'+
  '<div class="field"><label>Observações</label><textarea id="l-obs">'+escapeHtml(l.observacoes||"")+'</textarea></div>';
}
function wireLeadFormExtra(){
  var sel = document.getElementById("l-operadora");
  var wrap = document.getElementById("l-operadora-outros-wrap");
  if(sel && wrap){
    sel.addEventListener("change", function(){ wrap.style.display = sel.value==="Outros" ? "" : "none"; });
  }
}
function openLeadModal(existing){
  openModal(existing?"Editar oportunidade":"Nova oportunidade", leadFormHtml(existing), async function(closeFn){
    var operadoraSel = document.getElementById("l-operadora").value;
    var operadoraOutros = document.getElementById("l-operadora-outros");
    var operadoraFinal = operadoraSel==="Outros" ? (operadoraOutros? operadoraOutros.value.trim() : "") : operadoraSel;
    var novaEtapa = document.getElementById("l-etapa").value;
    var data = {
      nome: document.getElementById("l-nome").value.trim(),
      empresa: document.getElementById("l-empresa").value.trim(),
      produto: document.getElementById("l-produto").value,
      vendedor: document.getElementById("l-vendedor").value,
      valor_estimado: parseMoneyBR(document.getElementById("l-valor").value),
      quantidade_vidas: parseInt(document.getElementById("l-vidas").value,10)||null,
      operadora: operadoraFinal,
      origem: document.getElementById("l-origem").value.trim(),
      etapa: novaEtapa,
      observacoes: document.getElementById("l-obs").value.trim()
    };
    if(!data.nome && !data.empresa){ toast("Informe nome ou empresa."); return; }
    if(novaEtapa==="Ganho" && !(existing && existing.data_ganho)){ data.data_ganho = todayISO(); }
    var leadId = existing ? existing.id : null;
    if(existing){ await dbUpdate("leads", existing.id, data); }
    else { var created = await dbInsert("leads", data); leadId = created && created.id; }
    if(leadId && novaEtapa==="Ganho"){ await ensureImplantacao(leadId); }
    closeFn();
  });
  wireLeadFormExtra();
}

/* ================= IMPLANTAÇÃO ================= */
function clienteDoLead(leadId){ return state.clientes.filter(function(c){ return c.lead_id===leadId; })[0]; }
function implantacaoDoLead(leadId){ return state.implantacoes.filter(function(i){ return i.lead_id===leadId; })[0]; }
function viewImplantacao(){
  var ganhos = state.leads.filter(function(l){ return l.etapa==="Ganho"; })
    .sort(function(a,b){ return (b.data_ganho||"")<(a.data_ganho||"")?-1:1; });
  var header = '<div class="topbar"><div><h1>Implantação</h1><div class="desc">Negócios ganhos — documentação, acompanhamento com a operadora, boas-vindas e boleto</div></div></div>';
  if(ganhos.length===0) return header + '<div class="card"><div class="card-body"><div class="empty">Nenhum negócio ganho ainda — assim que marcar um negócio como "Ganho" no funil, ele aparece aqui.</div></div></div>';
  var mesAtual = todayMonthKey();
  var cards = ganhos.map(function(l){
    var imp = implantacaoDoLead(l.id) || {};
    var cli = clienteDoLead(l.id);
    var boletoEmDia = imp.boleto_mes_referencia === mesAtual;
    var pronta = !!(imp.documentos_solicitados && imp.subiu_operadora && imp.implantacao_confirmada);
    return '<div class="card"><div class="card-head"><h2>'+escapeHtml(l.nome||l.empresa||"—")+'</h2><div class="meta">'+fmtMoney(l.valor_estimado)+(l.data_ganho? ' · ganho em '+fmtDateISO(l.data_ganho):'')+' · <button class="linklike" data-edit-lead="'+l.id+'">editar negócio</button></div></div>'+
      '<div class="card-body">'+
      (operadoraTag(l)? '<div style="margin-bottom:10px;">'+operadoraTag(l)+'</div>' : '')+
      '<div class="helpbox">'+(cli? '✅ Cadastro do cliente concluído — <b>'+escapeHtml(clienteLabel(cli))+'</b>.' : '⚠️ Cadastro do cliente ainda não foi concluído.'+' <button class="linklike" data-convert-lead="'+l.id+'">completar cadastro</button>')+'</div>'+
      '<div class="field row3">'+
        '<label class="rowflex" style="font-weight:400;"><input type="checkbox" class="imp-check" data-imp-lead="'+l.id+'" data-field="documentos_solicitados" '+(imp.documentos_solicitados?'checked':'')+'> Relação de documentos solicitada</label>'+
        '<label class="rowflex" style="font-weight:400;"><input type="checkbox" class="imp-check" data-imp-lead="'+l.id+'" data-field="subiu_operadora" '+(imp.subiu_operadora?'checked':'')+'> Documentos enviados à operadora</label>'+
        '<label class="rowflex" style="font-weight:400;"><input type="checkbox" class="imp-check" data-imp-lead="'+l.id+'" data-field="implantacao_confirmada" '+(imp.implantacao_confirmada?'checked':'')+'> Implantação confirmada pela operadora</label>'+
      '</div>'+
      '<div class="field row2"><div class="field"><label>Responsável</label><select class="imp-resp" data-imp-lead="'+l.id+'">'+TEAM.map(function(t){return '<option'+((imp.responsavel||"Kelly")===t?' selected':'')+'>'+t+'</option>';}).join("")+'</select></div><div class="field"></div></div>'+
      '<div class="field"><label>Observações do acompanhamento</label><textarea class="imp-obs" data-imp-lead="'+l.id+'">'+escapeHtml(imp.observacoes||"")+'</textarea></div>'+
      (pronta? (
        '<div style="border-top:1px solid var(--line); margin-top:10px; padding-top:10px;">'+
        '<label class="rowflex" style="font-weight:400;margin-bottom:8px;"><input type="checkbox" class="imp-check" data-imp-lead="'+l.id+'" data-field="boas_vindas_enviada" '+(imp.boas_vindas_enviada?'checked':'')+'> Mensagem de boas-vindas enviada</label>'+
        '<div class="rowflex"><span>Boleto de '+monthLabel(mesAtual)+': '+(boletoEmDia? '<span class="pill pill-ok">enviado</span>' : '<span class="pill pill-warn">pendente</span>')+'</span>'+
        (boletoEmDia? '' : '<button class="linklike" data-boleto-enviado="'+l.id+'">marcar como enviado</button>')+
        '</div></div>'
      ) : '<div class="muted" style="font-size:12px;margin-top:4px;">Marque os 3 passos acima para liberar boas-vindas e o controle de boleto mensal.</div>')+
      '</div></div>';
  }).join("");
  return header + cards;
}

/* ================= TAREFAS ================= */
var tarefasFilterTipo = "";
function viewTarefas(){
  var hoje = todayISO();
  var list = state.tarefas.filter(function(t){ return !tarefasFilterTipo || t.tipo===tarefasFilterTipo; })
    .sort(function(a,b){ return (a.data_vencimento||"9999")<(b.data_vencimento||"9999")?-1:1; });
  return '<div class="topbar"><div><h1>Tarefas</h1><div class="desc">Tarefas diárias, demandas, inclusões e exclusões</div></div><button class="btn btn-primary" id="btn-nova-tarefa">+ Nova tarefa</button></div>'+
  '<div class="tabs2">'+ ['',...TIPOS_TAREFA].map(function(t){ return tabbtn("tarefa-tipo", t, t||"Todas", tarefasFilterTipo); }).join("") +'</div>'+
  '<div class="card"><div class="tablewrap"><table class="grid"><thead><tr><th>Tipo</th><th>Título</th><th>Cliente / Negócio</th><th>Responsável</th><th>Vencimento</th><th>Status</th><th></th></tr></thead><tbody>'+
  (list.length===0? '<tr><td colspan="7"><div class="empty">Nenhuma tarefa cadastrada.</div></td></tr>' :
  list.map(function(t){
    var cli = state.clientes.filter(function(c){return c.id===t.cliente_id;})[0];
    var lead = !cli && t.lead_id ? state.leads.filter(function(l){return l.id===t.lead_id;})[0] : null;
    var quem = cli ? escapeHtml(clienteLabel(cli)) : (lead ? escapeHtml(lead.nome||lead.empresa||"—")+' <span class="tag">Funil</span>' : '—');
    var atrasada = t.status!=="Concluída" && t.data_vencimento && t.data_vencimento<hoje;
    return '<tr><td><span class="tag">'+t.tipo+'</span></td><td>'+escapeHtml(t.titulo)+(t.beneficiario_nome?' <span class="muted">('+escapeHtml(t.beneficiario_nome)+')</span>':'')+'</td>'+
    '<td>'+quem+'</td><td>'+escapeHtml(t.responsavel||"—")+'</td>'+
    '<td>'+(atrasada?'<span class="pill pill-bad">'+fmtDateISO(t.data_vencimento)+'</span>':fmtDateISO(t.data_vencimento))+'</td>'+
    '<td><select class="tarefa-status" data-tarefa="'+t.id+'">'+STATUS_TAREFA.map(function(s){return '<option'+(t.status===s?' selected':'')+'>'+s+'</option>';}).join("")+'</select></td>'+
    '<td><button class="linklike" data-edit-tarefa="'+t.id+'">editar</button></td></tr>';
  }).join(""))+
  '</tbody></table></div></div>';
}
function tarefaFormHtml(t){
  t=t||{tipo:"Tarefa",status:"Pendente",data_vencimento:todayISO()};
  return '<div class="field row2"><div class="field"><label>Tipo</label><select id="t-tipo">'+TIPOS_TAREFA.map(function(x){return '<option'+(t.tipo===x?' selected':'')+'>'+x+'</option>';}).join("")+'</select></div><div class="field"><label>Responsável</label><select id="t-resp">'+TEAM.map(function(x){return '<option'+(t.responsavel===x?' selected':'')+'>'+x+'</option>';}).join("")+'</select></div></div>'+
  '<div class="field"><label>Título</label><input id="t-titulo" value="'+escapeHtml(t.titulo||"")+'"></div>'+
  '<div class="field row2"><div class="field"><label>Cliente (opcional)</label><select id="t-cliente"><option value="">—</option>'+state.clientes.map(function(c){return '<option value="'+c.id+'"'+(t.cliente_id===c.id?' selected':'')+'>'+escapeHtml(clienteLabel(c))+'</option>';}).join("")+'</select></div><div class="field"><label>Beneficiário (opcional)</label><input id="t-benef" value="'+escapeHtml(t.beneficiario_nome||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Vencimento</label><input type="date" id="t-venc" value="'+(t.data_vencimento||"")+'"></div><div class="field"><label>Status</label><select id="t-status">'+STATUS_TAREFA.map(function(x){return '<option'+(t.status===x?' selected':'')+'>'+x+'</option>';}).join("")+'</select></div></div>'+
  '<div class="field"><label>Descrição</label><textarea id="t-desc">'+escapeHtml(t.descricao||"")+'</textarea></div>';
}
function openTarefaModal(existing){
  openModal(existing?"Editar tarefa":"Nova tarefa", tarefaFormHtml(existing), function(closeFn){
    var data = {
      tipo: document.getElementById("t-tipo").value,
      responsavel: document.getElementById("t-resp").value,
      titulo: document.getElementById("t-titulo").value.trim(),
      cliente_id: document.getElementById("t-cliente").value || null,
      beneficiario_nome: document.getElementById("t-benef").value.trim(),
      data_vencimento: document.getElementById("t-venc").value || null,
      status: document.getElementById("t-status").value,
      descricao: document.getElementById("t-desc").value.trim()
    };
    if(!data.titulo){ toast("Informe um título."); return; }
    if(existing) dbUpdate("tarefas", existing.id, data); else dbInsert("tarefas", data);
    closeFn();
  });
}

/* ================= AGENDA (visão unificada por data) ================= */
function viewAgenda(){
  var hoje = todayISO();
  var items = [];
  state.tarefas.filter(function(t){return t.status!=="Concluída" && t.data_vencimento;}).forEach(function(t){
    items.push({data:t.data_vencimento, tipo:"Tarefa: "+t.tipo, titulo:t.titulo, resp:t.responsavel, ref:t});
  });
  state.agendamentos.filter(function(a){return a.status==="Agendado" && a.data_hora;}).forEach(function(a){
    var cli = state.clientes.filter(function(c){return c.id===a.cliente_id;})[0];
    items.push({data:a.data_hora.slice(0,10), tipo:a.tipo, titulo:(a.beneficiario_nome||clienteLabel(cli))+" — "+(a.especialidade||""), resp:"", ref:a, hora:a.data_hora});
  });
  items.sort(function(a,b){ return a.data<b.data?-1:(a.data>b.data?1:0); });
  var futuros = items.filter(function(i){ return i.data>=hoje; });
  var atrasados = items.filter(function(i){ return i.data<hoje; });

  function table(rows){
    if(rows.length===0) return '<div class="empty">Nada por aqui.</div>';
    return '<div class="tablewrap"><table class="grid"><thead><tr><th>Data</th><th>Tipo</th><th>O quê</th><th>Responsável</th></tr></thead><tbody>'+
      rows.map(function(i){ return '<tr><td>'+(i.hora?fmtDateTime(i.hora):fmtDateISO(i.data))+'</td><td><span class="tag">'+escapeHtml(i.tipo)+'</span></td><td>'+escapeHtml(i.titulo)+'</td><td>'+escapeHtml(i.resp||"—")+'</td></tr>'; }).join("")+
      '</tbody></table></div>';
  }
  return '<div class="topbar"><div><h1>Agenda</h1><div class="desc">Tarefas e agendamentos combinados por data</div></div></div>'+
  (atrasados.length? '<div class="card"><div class="card-head"><h2>Atrasados</h2><div class="meta">'+atrasados.length+'</div></div><div class="card-body">'+table(atrasados)+'</div></div>' : '')+
  '<div class="card"><div class="card-head"><h2>Próximos</h2><div class="meta">'+futuros.length+'</div></div><div class="card-body">'+table(futuros.slice(0,60))+'</div></div>';
}

/* ================= ATENDIMENTOS (agendamentos + reembolsos) ================= */
var atendimentosTab = "agendamentos";
function viewAtendimentos(){
  return '<div class="topbar"><div><h1>Atendimentos</h1><div class="desc">Consultas, exames e reembolsos</div></div>'+
    '<button class="btn btn-primary" id="btn-novo-atendimento">+ '+(atendimentosTab==="agendamentos"?"Novo agendamento":"Novo reembolso")+'</button></div>'+
  '<div class="tabs2">'+tabbtn("atend","agendamentos","Agendamentos",atendimentosTab)+tabbtn("atend","reembolsos","Reembolsos",atendimentosTab)+'</div>'+
  (atendimentosTab==="agendamentos"? viewAgendamentosList() : viewReembolsosList());
}
function viewAgendamentosList(){
  var list = state.agendamentos.slice().sort(function(a,b){ return (a.data_hora||"")<(b.data_hora||"")?-1:1; });
  return '<div class="card"><div class="tablewrap"><table class="grid"><thead><tr><th>Data/Hora</th><th>Cliente</th><th>Beneficiário</th><th>Tipo</th><th>Especialidade</th><th>Local</th><th>Status</th><th></th></tr></thead><tbody>'+
  (list.length===0? '<tr><td colspan="8"><div class="empty">Nenhum agendamento.</div></td></tr>' :
  list.map(function(a){
    var cli = state.clientes.filter(function(c){return c.id===a.cliente_id;})[0];
    return '<tr><td>'+fmtDateTime(a.data_hora)+'</td><td>'+(cli?escapeHtml(clienteLabel(cli)):'—')+'</td><td>'+escapeHtml(a.beneficiario_nome||"—")+'</td><td>'+escapeHtml(a.tipo)+'</td><td>'+escapeHtml(a.especialidade||"—")+'</td><td>'+escapeHtml(a.local||"—")+(a.local? ' <a class="linklike" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(a.local)+'">📍 mapa</a>' : '')+'</td>'+
    '<td><select class="agend-status" data-agend="'+a.id+'">'+STATUS_AGENDAMENTO.map(function(s){return '<option'+(a.status===s?' selected':'')+'>'+s+'</option>';}).join("")+'</select></td>'+
    '<td><button class="linklike" data-edit-agend="'+a.id+'">editar</button> <button class="linklike" data-del-agend="'+a.id+'" style="color:var(--danger);">excluir</button></td></tr>';
  }).join(""))+
  '</tbody></table></div></div>';
}
function viewReembolsosList(){
  var list = state.reembolsos.slice();
  return '<div class="card"><div class="tablewrap"><table class="grid"><thead><tr><th>Solicitado em</th><th>Cliente</th><th>Beneficiário</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead><tbody>'+
  (list.length===0? '<tr><td colspan="6"><div class="empty">Nenhum reembolso.</div></td></tr>' :
  list.map(function(r){
    var cli = state.clientes.filter(function(c){return c.id===r.cliente_id;})[0];
    return '<tr><td>'+fmtDateISO(r.data_solicitacao)+'</td><td>'+(cli?escapeHtml(clienteLabel(cli)):'—')+'</td><td>'+escapeHtml(r.beneficiario_nome||"—")+'</td><td class="num">'+fmtMoney(r.valor_solicitado)+'</td>'+
    '<td><select class="reemb-status" data-reemb="'+r.id+'">'+STATUS_REEMBOLSO.map(function(s){return '<option'+(r.status===s?' selected':'')+'>'+s+'</option>';}).join("")+'</select></td>'+
    '<td><button class="linklike" data-edit-reemb="'+r.id+'">editar</button> <button class="linklike" data-del-reemb="'+r.id+'" style="color:var(--danger);">excluir</button></td></tr>';
  }).join(""))+
  '</tbody></table></div></div>';
}
function agendFormHtml(a){
  a=a||{tipo:"Consulta",status:"Agendado"};
  var dtLocal = a.data_hora ? a.data_hora.slice(0,16) : "";
  return '<div class="field row2"><div class="field"><label>Cliente</label><select id="a-cliente">'+state.clientes.map(function(c){return '<option value="'+c.id+'"'+(a.cliente_id===c.id?' selected':'')+'>'+escapeHtml(clienteLabel(c))+'</option>';}).join("")+'</select></div><div class="field"><label>Beneficiário</label><input id="a-benef" value="'+escapeHtml(a.beneficiario_nome||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Tipo</label><select id="a-tipo">'+TIPOS_AGENDAMENTO.map(function(t){return '<option'+(a.tipo===t?' selected':'')+'>'+t+'</option>';}).join("")+'</select></div><div class="field"><label>Especialidade</label><input id="a-esp" value="'+escapeHtml(a.especialidade||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Data e hora</label><input type="datetime-local" id="a-data" value="'+dtLocal+'"></div><div class="field"><label>Local (hospital, laboratório, médico)</label><input id="a-local" value="'+escapeHtml(a.local||"")+'"><div class="muted" style="font-size:11.5px;">Salve e depois use o link "📍 mapa" na lista para abrir o local no Google Maps.</div></div></div>'+
  '<div class="field"><label>Status</label><select id="a-status">'+STATUS_AGENDAMENTO.map(function(s){return '<option'+(a.status===s?' selected':'')+'>'+s+'</option>';}).join("")+'</select></div>'+
  '<div class="field"><label>Observações</label><textarea id="a-obs">'+escapeHtml(a.observacoes||"")+'</textarea></div>';
}
function openAgendModal(existing){
  openModal(existing?"Editar agendamento":"Novo agendamento", agendFormHtml(existing), function(closeFn){
    var dt = document.getElementById("a-data").value;
    var data = {
      cliente_id: document.getElementById("a-cliente").value || null,
      beneficiario_nome: document.getElementById("a-benef").value.trim(),
      tipo: document.getElementById("a-tipo").value,
      especialidade: document.getElementById("a-esp").value.trim(),
      data_hora: dt ? new Date(dt).toISOString() : null,
      local: document.getElementById("a-local").value.trim(),
      status: document.getElementById("a-status").value,
      observacoes: document.getElementById("a-obs").value.trim()
    };
    if(!data.cliente_id){ toast("Selecione um cliente."); return; }
    if(existing) dbUpdate("agendamentos", existing.id, data); else dbInsert("agendamentos", data);
    closeFn();
  });
}
function reembFormHtml(r){
  r=r||{status:"Solicitado",data_solicitacao:todayISO()};
  return '<div class="field row2"><div class="field"><label>Cliente</label><select id="r-cliente">'+state.clientes.map(function(c){return '<option value="'+c.id+'"'+(r.cliente_id===c.id?' selected':'')+'>'+escapeHtml(clienteLabel(c))+'</option>';}).join("")+'</select></div><div class="field"><label>Beneficiário</label><input id="r-benef" value="'+escapeHtml(r.beneficiario_nome||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Data da solicitação</label><input type="date" id="r-data" value="'+(r.data_solicitacao||"")+'"></div>'+moneyFieldHtml("r-valor", r.valor_solicitado, "Valor solicitado (R$)")+'</div>'+
  '<div class="field"><label>Descrição</label><input id="r-desc" value="'+escapeHtml(r.descricao||"")+'"></div>'+
  '<div class="field"><label>Status</label><select id="r-status">'+STATUS_REEMBOLSO.map(function(s){return '<option'+(r.status===s?' selected':'')+'>'+s+'</option>';}).join("")+'</select></div>'+
  '<div class="field"><label>Observações</label><textarea id="r-obs">'+escapeHtml(r.observacoes||"")+'</textarea></div>';
}
function openReembModal(existing){
  openModal(existing?"Editar reembolso":"Novo reembolso", reembFormHtml(existing), function(closeFn){
    var data = {
      cliente_id: document.getElementById("r-cliente").value || null,
      beneficiario_nome: document.getElementById("r-benef").value.trim(),
      data_solicitacao: document.getElementById("r-data").value || null,
      valor_solicitado: parseMoneyBR(document.getElementById("r-valor").value),
      descricao: document.getElementById("r-desc").value.trim(),
      status: document.getElementById("r-status").value,
      observacoes: document.getElementById("r-obs").value.trim()
    };
    if(!data.cliente_id){ toast("Selecione um cliente."); return; }
    if(existing) dbUpdate("reembolsos", existing.id, data); else dbInsert("reembolsos", data);
    closeFn();
  });
}

/* ================= PÓS-VENDA ================= */
var posvendaTab = "atencao";
function viewPosvenda(){
  var hoje = todayISO();
  var ativos = state.clientes.filter(function(c){return c.status!=="Cancelado";});
  var revisoes = ativos.map(function(c){return {c:c,r:nextRevisao(c)};}).filter(function(x){return x.r && daysBetween(hoje,x.r.date)<=60;});
  var mesNum = parseInt(hoje.split("-")[1],10);
  var aniversariantes = ativos.filter(function(c){return c.data_nascimento && parseInt(String(c.data_nascimento).split("-")[1],10)===mesNum;});
  var semContato = ativos.filter(function(c){
    var logs = state.interacoes.filter(function(i){return i.cliente_id===c.id;}).sort(function(a,b){return a.data<b.data?1:-1;});
    if(logs.length===0) return true;
    return daysBetween(logs[0].data, hoje) > 21;
  });
  var log = state.interacoes.slice(0,40);

  return '<div class="topbar"><div><h1>Pós-venda &amp; Relacionamento</h1><div class="desc">Cadência de conteúdo e histórico</div></div><button class="btn btn-primary" id="btn-nova-interacao">+ Registrar interação</button></div>'+
  '<div class="tabs2">'+tabbtn("posvenda","atencao","Precisa de atenção",posvendaTab)+tabbtn("posvenda","sugestao","Modelos de mensagem",posvendaTab)+tabbtn("posvenda","historico","Histórico",posvendaTab)+'</div>'+
  (posvendaTab==="atencao"? (
    '<div class="card"><div class="card-head"><h2>Sem contato há mais de 21 dias</h2><div class="meta">'+semContato.length+'</div></div><div class="card-body">'+
    (semContato.length===0?'<div class="empty">Todo mundo em dia.</div>':'<div class="tablewrap"><table class="grid"><thead><tr><th>Cliente</th><th>Plano</th></tr></thead><tbody>'+semContato.map(function(c){return '<tr><td>'+escapeHtml(clienteLabel(c))+'</td><td>'+escapeHtml(c.plano_nome||c.produto||"—")+'</td></tr>';}).join("")+'</tbody></table></div>')+
    '</div></div>'+
    '<div class="card"><div class="card-head"><h2>Revisão de plano (60 dias)</h2><div class="meta">'+revisoes.length+'</div></div><div class="card-body">'+
    (revisoes.length===0?'<div class="empty">Nenhuma no período.</div>':'<div class="tablewrap"><table class="grid"><thead><tr><th>Cliente</th><th>Data</th></tr></thead><tbody>'+revisoes.map(function(x){return '<tr><td>'+escapeHtml(clienteLabel(x.c))+'</td><td>'+(x.r.overdue?'<span class="pill pill-bad">atrasada — '+fmtDateISO(x.r.date)+'</span>':fmtDateISO(x.r.date))+'</td></tr>';}).join("")+'</tbody></table></div>')+
    '</div></div>'+
    '<div class="card"><div class="card-head"><h2>Aniversariantes do mês</h2><div class="meta">'+aniversariantes.length+'</div></div><div class="card-body">'+
    (aniversariantes.length===0?'<div class="empty">Ninguém este mês.</div>':'<div class="tablewrap"><table class="grid"><thead><tr><th>Cliente</th><th>Data</th><th>WhatsApp</th><th>E-mail</th></tr></thead><tbody>'+aniversariantes.map(function(c){return '<tr><td>'+escapeHtml(clienteLabel(c))+'</td><td>'+fmtDateISO(c.data_nascimento)+'</td><td>'+escapeHtml(c.telefone||"—")+'</td><td>'+escapeHtml(c.email||"—")+'</td></tr>';}).join("")+'</tbody></table></div>')+
    '</div></div>'
  ) : posvendaTab==="sugestao"? viewSugestao() : viewHistorico(log));
}
function viewSugestao(){
  var opts = state.clientes.filter(function(c){return c.status!=="Cancelado";});
  return '<div class="card"><div class="card-body">'+
    '<div class="helpbox">Modelos prontos para copiar e personalizar — edite o texto conforme o caso antes de enviar.</div>'+
    '<div class="field row2"><div class="field"><label>Cliente</label><select id="sg-cliente">'+opts.map(function(c){return '<option value="'+c.id+'">'+escapeHtml(clienteLabel(c))+'</option>';}).join("")+'</select></div><div class="field"><label>Tema</label><select id="sg-tema">'+Object.keys(CONTENT_TEMPLATES).map(function(t){return '<option>'+t+'</option>';}).join("")+'</select></div></div>'+
    '<button class="btn btn-primary" id="btn-gerar-sugestao" style="margin-top:6px;">Gerar mensagem</button>'+
    '<div class="suggest-box" id="sugestao-out">A mensagem sugerida aparece aqui.</div>'+
  '</div></div>';
}
function viewHistorico(log){
  return '<div class="card"><div class="tablewrap"><table class="grid"><thead><tr><th>Data</th><th>Cliente</th><th>Canal</th><th>Tipo</th><th>Nota</th><th>Por</th></tr></thead><tbody>'+
  (log.length===0?'<tr><td colspan="6"><div class="empty">Nenhuma interação registrada.</div></td></tr>':
  log.map(function(i){return '<tr><td>'+fmtDateISO(i.data)+'</td><td>'+escapeHtml(i.cliente_nome||"—")+'</td><td>'+escapeHtml(i.canal||"—")+'</td><td>'+escapeHtml(i.tipo||"—")+'</td><td>'+escapeHtml(i.nota||"")+'</td><td class="muted">'+escapeHtml(i.autor||"—")+'</td></tr>';}).join(""))+
  '</tbody></table></div></div>';
}
function interacaoFormHtml(){
  return '<div class="field"><label>Cliente</label><select id="i-cliente">'+state.clientes.map(function(c){return '<option value="'+c.id+'">'+escapeHtml(clienteLabel(c))+'</option>';}).join("")+'</select></div>'+
  '<div class="field row2"><div class="field"><label>Data</label><input type="date" id="i-data" value="'+todayISO()+'"></div><div class="field"><label>Canal</label><select id="i-canal">'+CANAIS.map(function(c){return '<option>'+c+'</option>';}).join("")+'</select></div></div>'+
  '<div class="field"><label>Tipo</label><select id="i-tipo">'+TIPOS_INTERACAO.map(function(t){return '<option>'+t+'</option>';}).join("")+'</select></div>'+
  '<div class="field"><label>Nota</label><textarea id="i-nota"></textarea></div>';
}

/* ================= PARÂMETROS ================= */
function viewParametros(){
  var p = state.params;
  return '<div class="topbar"><div><h1>Parâmetros</h1><div class="desc">Premissas usadas nos cálculos</div></div></div>'+
  '<div class="card"><div class="card-body">'+
    '<div class="field row2"><div class="field"><label>Alíquota de imposto (%)</label><input type="number" step="0.1" id="p-imposto" value="'+(p.taxa_imposto*100)+'"></div><div class="field"><label>% vitalício mensal</label><input type="number" step="0.1" id="p-vitalicio" value="'+(p.percentual_vitalicio*100)+'"></div></div>'+
    '<div class="field row2">'+moneyFieldHtml("p-meta", p.meta_mensal_padrao||0, "Meta mensal padrão (R$)")+'<div class="field"><label>Nº parcelas cheias</label><input type="number" step="1" id="p-parcelas" value="'+(p.parcelas_cheias||3)+'"></div></div>'+
    '<div class="field row2"><div class="field"><label>Meta de vendas mensal (quantidade)</label><input type="number" step="1" id="p-meta-vendas" value="'+(p.meta_vendas_mensal||0)+'"></div><div class="field"></div></div>'+
    '<button class="btn btn-primary" id="btn-salvar-params" style="width:fit-content;">Salvar</button>'+
  '</div></div>'+
  '<div class="card"><div class="card-head"><h2>Equipe com acesso</h2></div><div class="card-body"><div class="helpbox">Para adicionar ou remover o acesso de alguém da equipe, use o painel do Supabase: Authentication &gt; Users.</div>'+
  '<div class="tablewrap"><table class="grid"><thead><tr><th>Nome</th></tr></thead><tbody>'+TEAM.map(function(t){return '<tr><td>'+t+'</td></tr>';}).join("")+'</tbody></table></div></div></div>';
}

/* ================= WIRE ================= */
function wireActions(){
  wireMoneyInputs(document);
  var btnNovoCliente = document.getElementById("btn-novo-cliente"); if(btnNovoCliente) btnNovoCliente.onclick=function(){openClienteModal(null);};
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-cliente]"), function(btn){ btn.onclick=function(){ var c=state.clientes.filter(function(x){return x.id===btn.getAttribute("data-edit-cliente");})[0]; openClienteModal(c); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-del-cliente]"), function(btn){
    btn.onclick=function(){
      var id = btn.getAttribute("data-del-cliente");
      var c = state.clientes.filter(function(x){return x.id===id;})[0];
      if(!confirm("Excluir o cliente \""+clienteLabel(c)+"\"? Isso também apaga os dependentes, agendamentos, reembolsos e interações ligados a ele. Essa ação não pode ser desfeita.")) return;
      dbDelete("clientes", id, ["dependentes","agendamentos","reembolsos","interacoes","tarefas"]);
    };
  });
  var searchInput = document.getElementById("cli-search");
  if(searchInput){ searchInput.oninput=function(){ clientesFilter=searchInput.value; render(); var el=document.getElementById("cli-search"); if(el){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} }; }
  var btnModelo = document.getElementById("btn-modelo-excel"); if(btnModelo) btnModelo.onclick=function(){ baixarModeloClientes(); };
  var btnExportar = document.getElementById("btn-exportar-excel"); if(btnExportar) btnExportar.onclick=function(){ exportarClientesExcel(state.clientes); };
  var btnImportar = document.getElementById("btn-importar-excel"); var inputImportar = document.getElementById("input-importar-excel");
  if(btnImportar && inputImportar){
    btnImportar.onclick = function(){ inputImportar.click(); };
    inputImportar.onchange = async function(){
      if(!inputImportar.files || !inputImportar.files[0]) return;
      btnImportar.disabled = true; btnImportar.textContent = "Importando…";
      try{ await importarClientesExcel(inputImportar.files[0]); }
      finally{ btnImportar.disabled = false; btnImportar.textContent = "Importar Excel"; inputImportar.value = ""; }
    };
  }

  var btnNovoLead = document.getElementById("btn-novo-lead"); if(btnNovoLead) btnNovoLead.onclick=function(){openLeadModal(null);};
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-lead]"), function(btn){ btn.onclick=function(){ var l=state.leads.filter(function(x){return x.id===btn.getAttribute("data-edit-lead");})[0]; openLeadModal(l); }; });
  Array.prototype.forEach.call(document.querySelectorAll(".lead-etapa"), function(sel){ sel.onchange=function(){ setLeadEtapa(sel.getAttribute("data-lead"), sel.value); }; });
  Array.prototype.forEach.call(document.querySelectorAll(".imp-check"), function(chk){
    chk.onchange = function(){
      var leadId = chk.getAttribute("data-imp-lead");
      var field = chk.getAttribute("data-field");
      var imp = implantacaoDoLead(leadId);
      var patch = {}; patch[field] = chk.checked;
      if(imp) dbUpdate("implantacoes", imp.id, patch);
      else { patch.lead_id = leadId; patch.responsavel = "Kelly"; dbInsert("implantacoes", patch); }
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll(".imp-resp"), function(sel){
    sel.onchange = function(){
      var leadId = sel.getAttribute("data-imp-lead");
      var imp = implantacaoDoLead(leadId);
      if(imp) dbUpdate("implantacoes", imp.id, {responsavel:sel.value});
      else dbInsert("implantacoes", {lead_id:leadId, responsavel:sel.value});
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll(".imp-obs"), function(ta){
    ta.onblur = function(){
      var leadId = ta.getAttribute("data-imp-lead");
      var imp = implantacaoDoLead(leadId);
      if(imp) dbUpdate("implantacoes", imp.id, {observacoes:ta.value.trim()});
      else dbInsert("implantacoes", {lead_id:leadId, responsavel:"Kelly", observacoes:ta.value.trim()});
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-boleto-enviado]"), function(btn){
    btn.onclick = function(){
      var leadId = btn.getAttribute("data-boleto-enviado");
      var imp = implantacaoDoLead(leadId);
      if(imp) dbUpdate("implantacoes", imp.id, {boleto_mes_referencia: todayMonthKey()});
    };
  });
  var btnSalvarMeta = document.getElementById("btn-salvar-meta");
  if(btnSalvarMeta) btnSalvarMeta.onclick = async function(){
    var mk = todayMonthKey();
    var valor = parseMoneyBR(document.getElementById("meta-valor-input").value);
    var existing = state.metas_mensais.filter(function(m){ return m.mes===mk; })[0];
    if(existing){ await dbUpdate("metas_mensais", existing.id, {valor_meta:valor}); }
    else { await dbInsert("metas_mensais", {mes:mk, valor_meta:valor}); }
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-convert-lead]"), function(btn){
    btn.onclick=function(){ var l=state.leads.filter(function(x){return x.id===btn.getAttribute("data-convert-lead");})[0]; if(!l) return;
      openClienteModal({lead_id:l.id, titular_nome:l.nome, razao_social:l.empresa, produto:l.produto, plano_nome:(l.operadora||""), vendedor:l.vendedor, valor_contrato_total:l.valor_estimado, data_fechamento:l.data_ganho||todayISO(), data_inclusao:todayISO(), status:"Ativo"});
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-agendar-tarefa-lead]"), function(btn){
    btn.onclick=function(){ var l=state.leads.filter(function(x){return x.id===btn.getAttribute("data-agendar-tarefa-lead");})[0]; if(l) openLeadTarefaModal(l); };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-concluir-tarefa-lead]"), function(btn){
    btn.onclick=function(){ dbUpdate("tarefas", btn.getAttribute("data-concluir-tarefa-lead"), {status:"Concluída"}); };
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-tarefa-tipo-tab]"), function(el){ el.onclick=function(){ tarefasFilterTipo=el.getAttribute("data-tarefa-tipo-tab"); render(); }; });
  var btnNovaTarefa = document.getElementById("btn-nova-tarefa"); if(btnNovaTarefa) btnNovaTarefa.onclick=function(){openTarefaModal(null);};
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-tarefa]"), function(btn){ btn.onclick=function(){ var t=state.tarefas.filter(function(x){return x.id===btn.getAttribute("data-edit-tarefa");})[0]; openTarefaModal(t); }; });
  Array.prototype.forEach.call(document.querySelectorAll(".tarefa-status"), function(sel){ sel.onchange=function(){ dbUpdate("tarefas", sel.getAttribute("data-tarefa"), {status:sel.value}); }; });

  Array.prototype.forEach.call(document.querySelectorAll("[data-atend-tab]"), function(el){ el.onclick=function(){ atendimentosTab=el.getAttribute("data-atend-tab"); render(); }; });
  var btnNovoAtend = document.getElementById("btn-novo-atendimento");
  if(btnNovoAtend) btnNovoAtend.onclick=function(){ if(atendimentosTab==="agendamentos") openAgendModal(null); else openReembModal(null); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-agend]"), function(btn){ btn.onclick=function(){ var a=state.agendamentos.filter(function(x){return x.id===btn.getAttribute("data-edit-agend");})[0]; openAgendModal(a); }; });
  Array.prototype.forEach.call(document.querySelectorAll(".agend-status"), function(sel){ sel.onchange=function(){ dbUpdate("agendamentos", sel.getAttribute("data-agend"), {status:sel.value}); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-del-agend]"), function(btn){
    btn.onclick=function(){
      if(!confirm("Excluir este agendamento? Essa ação não pode ser desfeita.")) return;
      dbDelete("agendamentos", btn.getAttribute("data-del-agend"));
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-reemb]"), function(btn){ btn.onclick=function(){ var r=state.reembolsos.filter(function(x){return x.id===btn.getAttribute("data-edit-reemb");})[0]; openReembModal(r); }; });
  Array.prototype.forEach.call(document.querySelectorAll(".reemb-status"), function(sel){ sel.onchange=function(){ dbUpdate("reembolsos", sel.getAttribute("data-reemb"), {status:sel.value}); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-del-reemb]"), function(btn){
    btn.onclick=function(){
      if(!confirm("Excluir este reembolso? Essa ação não pode ser desfeita.")) return;
      dbDelete("reembolsos", btn.getAttribute("data-del-reemb"));
    };
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-posvenda-tab]"), function(el){ el.onclick=function(){ posvendaTab=el.getAttribute("data-posvenda-tab"); render(); }; });
  var btnNovaInteracao = document.getElementById("btn-nova-interacao");
  if(btnNovaInteracao) btnNovaInteracao.onclick=function(){
    openModal("Registrar interação", interacaoFormHtml(), function(closeFn){
      var clienteId = document.getElementById("i-cliente").value;
      var cliente = state.clientes.filter(function(c){return c.id===clienteId;})[0];
      var data = { cliente_id:clienteId, cliente_nome: cliente?clienteLabel(cliente):"—", data: document.getElementById("i-data").value||todayISO(), canal: document.getElementById("i-canal").value, tipo: document.getElementById("i-tipo").value, nota: document.getElementById("i-nota").value.trim(), autor: currentUser() };
      dbInsert("interacoes", data);
      closeFn();
    });
  };
  var btnGerar = document.getElementById("btn-gerar-sugestao");
  if(btnGerar) btnGerar.onclick=function(){
    var out = document.getElementById("sugestao-out");
    var clienteId = document.getElementById("sg-cliente").value;
    var tema = document.getElementById("sg-tema").value;
    var cliente = state.clientes.filter(function(c){return c.id===clienteId;})[0];
    if(!cliente){ toast("Cadastre um cliente primeiro."); return; }
    var nome = (clienteLabel(cliente)||"cliente").split(" ")[0];
    var tpl = CONTENT_TEMPLATES[tema] || "";
    out.textContent = tpl.replace(/\{nome\}/g, nome);
  };

  var btnSalvarParams = document.getElementById("btn-salvar-params");
  if(btnSalvarParams) btnSalvarParams.onclick=function(){
    saveParams({
      taxa_imposto: parseFloat(document.getElementById("p-imposto").value)/100, percentual_vitalicio: parseFloat(document.getElementById("p-vitalicio").value)/100, meta_mensal_padrao: parseMoneyBR(document.getElementById("p-meta").value), parcelas_cheias: parseInt(document.getElementById("p-parcelas").value,10)||3, meta_vendas_mensal: parseInt(document.getElementById("p-meta-vendas").value,10)||0 });
  };
}

/* ================= boot: link de recuperação/convite por e-mail (token_hash) ================= */
/* Corrige o bug do link de recuperação/convite expirando antes do clique (otp_expired):
   scanners de segurança de e-mail (ex: Google Workspace) "pré-visitam" o link do Supabase
   e consomem o token de uso único antes da pessoa clicar de verdade. Por isso o template
   de e-mail no Supabase (Authentication > Emails > Templates) deve apontar para o próprio
   site com token_hash e type na URL, em vez do endpoint /auth/v1/verify do Supabase:
     {{ .SiteURL }}/?type=recovery&token_hash={{ .TokenHash }}   (Reset password / Invite user)
   Aqui o token só é de fato consumido quando o app carrega e chama verifyOtp — depois disso
   o evento PASSWORD_RECOVERY do onAuthStateChange dispara normalmente. */
(function(){
  try{
    var qp = new URLSearchParams(window.location.search);
    var tokenHash = qp.get("token_hash");
    var type = qp.get("type");
    if(tokenHash && type){
      sb.auth.verifyOtp({token_hash: tokenHash, type: type}).then(function(res){
        if(res.error) console.error(res.error);
        history.replaceState(null, "", window.location.pathname);
      });
    }
  }catch(e){ console.error(e); }
})();

render();

})();
