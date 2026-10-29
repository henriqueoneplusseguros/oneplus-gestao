(function(){
"use strict";

/* ================= SETUP ================= */
var cfg = window.ONEPLUS_CONFIG || {};
if(!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("COLE_AQUI") === 0){
  document.body.innerHTML = '<div style="max-width:520px;margin:80px auto;font-family:sans-serif;padding:24px;border:1px solid #ddd;border-radius:12px;">' +
        '<h2>Falta configurar</h2>' +
    '<p>Abra o arquivo <code>config.js</code> e cole a Project URL e a anon public key do seu projeto Supabase (Settings &gt; API). Depois recarregue esta página.</p></div>';
  return;
}
var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

var TEAM = ["Henrique","Alana","Agatha","Kelly"];
var VENDEDORES = ["Henrique","Alana"];
var PRODUTOS = ["Saúde","Vida","Consórcio"];
var ETAPAS = ["Qualificação","Primeiro Contato","Proposta Enviada","Negociação","Ganho","Perdido"];
var LIMITE_DIAS_PARADO = 14; // acima disso o cartão ganha o selo de "negócio parado"
var MOTIVOS_PERDA = ["Preço","Concorrência","Sem retorno do cliente","Desistiu","Desistência após fechamento (durante a implantação)","Recusa da operadora (sem solução)","Outro"];
var OPERADORAS = ["Omint","Care Plus","Amil","SulAmérica","Bradesco","NotreDame","Prevent Sênior","MedSênior","Porto Seguro","São Cristóvão","Ever","Alice","Outros"];
var CANAIS = ["WhatsApp","Ligação","E-mail","Presencial"];
var CANAIS_TAREFA = ["Ligar","Reunião","WhatsApp","E-mail","Outro"];
var ATIVIDADE_ICON = {"Ligar":"📞","Reunião":"🤝","WhatsApp":"💬","E-mail":"✉️","Outro":"•"};
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
    clientes: [], dependentes: [], tarefas: [], reembolsos: [], agendamentos: [], leads: [], interacoes: [], metas_mensais: [], implantacoes: [], equipe: [], tabelas_precos_cliente: [], historico_reajustes: [], boletos_clientes: [], carencia_modelos: [], lead_notas: [], comissoes_recebidas: [], lead_anexos: [],
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
/* Data de vencimento de um "dia do mês" (1-31) dentro do mês mk ("AAAA-MM") — se o mês não
   tiver esse dia (ex: dia 31 em fevereiro), usa o último dia do mês. */
function vencimentoDoMes(mk, dia){
  if(!mk || !dia) return null;
  var p = mk.split("-"); var y=parseInt(p[0],10), m=parseInt(p[1],10)-1;
  var ultimoDia = new Date(y, m+1, 0).getDate();
  var d = Math.min(parseInt(dia,10)||1, ultimoDia);
  return y+"-"+pad2(m+1)+"-"+pad2(d);
}
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
/* Máscara de CNPJ (00.000.000/0000-00) e CPF (000.000.000-00) — formata enquanto digita,
   sempre a partir só dos dígitos (cola de qualquer jeito que a pessoa digitar/colar). */
function maskCNPJ(v){
  var d = String(v||"").replace(/\D/g,"").slice(0,14);
  d = d.replace(/^(\d{2})(\d)/,"$1.$2");
  d = d.replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3");
  d = d.replace(/\.(\d{3})(\d)/,".$1/$2");
  d = d.replace(/(\d{4})(\d)/,"$1-$2");
  return d;
}
function maskCPF(v){
  var d = String(v||"").replace(/\D/g,"").slice(0,11);
  d = d.replace(/(\d{3})(\d)/,"$1.$2");
  d = d.replace(/(\d{3})(\d)/,"$1.$2");
  d = d.replace(/(\d{3})(\d{1,2})$/,"$1-$2");
  return d;
}
/* UUID v4 gerado no navegador — usado pra já saber o id de um dependente/titular antes de
   salvar, assim um dependente pode referenciar o titular adicional dele no mesmo lote de
   inserção (crypto.randomUUID quando existe, senão um gerador simples de reserva). */
function genUUID(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
    var r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8);
    return v.toString(16);
  });
}
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
/* Campo de data + hora em dois inputs nativos separados (mais fácil de usar que datetime-local). */
function dateTimeFieldHtml(prefix, isoValue, label, opts){
  opts = opts || {};
  var dataVal = "", horaVal = opts.defaultHora || "";
  if(isoValue){
    var d = new Date(isoValue);
    if(!isNaN(d.getTime())){
      dataVal = d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
      horaVal = pad2(d.getHours())+":"+pad2(d.getMinutes());
    }
  }
  return '<div class="field"><label>'+label+'</label><div class="rowflex" style="flex-wrap:nowrap;">'+
    '<input type="date" id="'+prefix+'-data" value="'+dataVal+'" style="flex:1.3;">'+
    '<input type="time" id="'+prefix+'-hora" value="'+horaVal+'" style="flex:1;">'+
    '</div></div>';
}
/* Lê os dois campos de dateTimeFieldHtml e devolve {iso, dateOnly} ou null se não preenchido. */
function readDateTime(prefix, horaPadrao){
  var elData = document.getElementById(prefix+"-data");
  var elHora = document.getElementById(prefix+"-hora");
  if(!elData || !elData.value) return null;
  var hora = (elHora && elHora.value) ? elHora.value : (horaPadrao || "09:00");
  var iso = new Date(elData.value+"T"+hora+":00").toISOString();
  return {iso: iso, dateOnly: elData.value, hora: hora};
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
function addDaysISO(s,n){
  if(!s) return null;
  var d = parseISO(s);
  d.setDate(d.getDate()+parseInt(n,10));
  return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
}
/* Calcula, para um cliente (vigência início + modelo + categoria escolhidos), quando
   cada procedimento do quadro de carências fica liberado. Retorna null se faltar algum
   dos três dados; retorna um array de {nome, unidade, valor, liberadoEm} caso contrário. */
function calcularCarencias(vigInicio, modeloId, categoriaNome){
  if(!vigInicio || !modeloId || !categoriaNome) return null;
  var modelo = state.carencia_modelos.filter(function(m){ return m.id===modeloId; })[0];
  if(!modelo) return null;
  var ci = (modelo.categorias||[]).indexOf(categoriaNome);
  if(ci<0) return null;
  return (modelo.itens||[]).map(function(item){
    var v = item.valores ? item.valores[ci] : null;
    var liberadoEm = null;
    if(v!=null && v!==""){
      liberadoEm = item.unidade==="meses" ? addMonthsISO(vigInicio, v) : addDaysISO(vigInicio, v);
    }
    return {nome:item.nome, unidade:item.unidade, valor:v, liberadoEm:liberadoEm};
  });
}
function carenciaCategoriaOptionsHtml(modeloId, selected){
  var modelo = state.carencia_modelos.filter(function(m){ return m.id===modeloId; })[0];
  var cats = modelo ? (modelo.categorias||[]) : [];
  return '<option value="">—</option>'+cats.map(function(cat){ return '<option'+(selected===cat?' selected':'')+'>'+escapeHtml(cat)+'</option>'; }).join("");
}
function carenciasTableHtml(rows){
  if(!rows || !rows.length) return '<div class="empty">Escolha o modelo, a faixa/categoria e a vigência (início) para calcular as datas.</div>';
  var hoje = todayISO();
  return '<div class="tablewrap"><table class="grid"><thead><tr><th>Procedimento</th><th>Carência</th><th>Liberado em</th></tr></thead><tbody>'+
    rows.map(function(r){
      var carenciaTxt = (r.valor==null||r.valor==="") ? "—" : (r.valor===0 ? "Isento" : r.valor+" "+(r.unidade==="meses"?"meses":"dias"));
      var liberadoTxt = r.liberadoEm ? fmtDateISO(r.liberadoEm) : "—";
      var badge = r.liberadoEm ? (r.liberadoEm<=hoje ? ' <span class="pill pill-ok">já liberado</span>' : ' <span class="pill pill-warn">aguardando</span>') : "";
      return '<tr><td>'+escapeHtml(r.nome)+'</td><td>'+carenciaTxt+'</td><td>'+liberadoTxt+badge+'</td></tr>';
    }).join("")+
  '</tbody></table></div>';
}
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

document.getElementById("btn-notif").addEventListener("click", function(e){
  e.stopPropagation();
  notifOpen = !notifOpen;
  renderNotifBell();
});
document.addEventListener("click", function(e){
  if(!notifOpen) return;
  var panel = document.getElementById("notif-panel");
  var btn = document.getElementById("btn-notif");
  if(panel && !panel.contains(e.target) && btn && !btn.contains(e.target)){
    notifOpen = false;
    renderNotifBell();
  }
});
document.getElementById("notif-panel").addEventListener("click", function(e){
  var btn = e.target.closest("[data-concluir-notif]");
    if(btn){ setTarefaStatus(btn.getAttribute("data-concluir-notif"), "Concluída"); }
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
      sb.from("implantacoes").select("*"),
            sb.from("equipe").select("*"),
            sb.from("tabelas_precos_cliente").select("*").order("ano_vigencia",{ascending:false}),
            sb.from("historico_reajustes").select("*").order("data_reajuste",{ascending:false}),
            sb.from("boletos_clientes").select("*"),
            sb.from("carencia_modelos").select("*").order("nome"),
            sb.from("lead_notas").select("*").order("criado_em",{ascending:false}),
            sb.from("comissoes_recebidas").select("*").order("data_recebimento",{ascending:false})
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
    state.equipe = results[10].data || [];
    state.tabelas_precos_cliente = results[11].data || [];
    state.historico_reajustes = results[12].data || [];
    state.boletos_clientes = results[13].data || [];
    state.carencia_modelos = results[14].data || [];
    state.lead_notas = results[15].data || [];
    state.comissoes_recebidas = results[16].data || [];
    var anx = await sb.from("lead_anexos").select("*").order("criado_em",{ascending:false});
    state.lead_anexos = anx.error ? [] : (anx.data || []);
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
    implantacoes: function(){ return sb.from("implantacoes").select("*"); },
        equipe: function(){ return sb.from("equipe").select("*"); },
        tabelas_precos_cliente: function(){ return sb.from("tabelas_precos_cliente").select("*").order("ano_vigencia",{ascending:false}); },
        historico_reajustes: function(){ return sb.from("historico_reajustes").select("*").order("data_reajuste",{ascending:false}); },
        boletos_clientes: function(){ return sb.from("boletos_clientes").select("*"); },
        carencia_modelos: function(){ return sb.from("carencia_modelos").select("*").order("nome"); },
        lead_notas: function(){ return sb.from("lead_notas").select("*").order("criado_em",{ascending:false}); },
        comissoes_recebidas: function(){ return sb.from("comissoes_recebidas").select("*").order("data_recebimento",{ascending:false}); },
        lead_anexos: function(){ return sb.from("lead_anexos").select("*").order("criado_em",{ascending:false}); }
  };
  var r = await map[table]();
  if(r.error){ console.error(r.error); toast("Erro ao atualizar "+table); return; }
  state[table] = r.data || [];
  render();
}

function currentUser(){ return (state.session && state.session.user && state.session.user.email) || "—"; }
/* Descobre o nome (TEAM) da pessoa logada a partir do e-mail, usando a tabela "equipe". */
function currentUserName(){
  var email = currentUser().toLowerCase();
  var e = state.equipe.filter(function(x){ return (x.email||"").toLowerCase()===email; })[0];
  return e ? e.nome : null;
}
function emailDoResponsavel(nome){
  var e = state.equipe.filter(function(x){ return x.nome===nome; })[0];
  return e ? e.email : null;
}
/* Relatórios de vendas e previsão de comissão: só o Henrique. */
function podeVerRelatorios(){ return currentUserName()==="Henrique"; }
/* Financeiro é restrito — só Henrique e Kelly veem esse setor. */
function podeVerFinanceiro(){
  var nome = currentUserName();
  return nome==="Henrique" || nome==="Kelly";
}
/* Tarefas do usuário logado que já venceram ou vencem hoje e ainda não foram concluídas. */
function minhasTarefasPendentes(){
  var nome = currentUserName();
  if(!nome) return [];
  var hoje = todayISO();
  return state.tarefas.filter(function(t){
    if(t.responsavel!==nome || t.status==="Concluída") return false;
    if(t.vencimento_em) return t.vencimento_em <= new Date().toISOString();
    return t.data_vencimento && t.data_vencimento<=hoje;
  }).sort(function(a,b){ return (a.vencimento_em||a.data_vencimento||"")<(b.vencimento_em||b.data_vencimento||"")?-1:1; });
}
var notifOpen = false;
function renderNotifBell(){
  var pend = minhasTarefasPendentes();
  var badge = document.getElementById("notif-badge");
  var btn = document.getElementById("btn-notif");
  if(!btn) return;
  if(pend.length){ badge.textContent = pend.length; badge.style.display = "inline-flex"; }
  else { badge.style.display = "none"; }
  var panel = document.getElementById("notif-panel");
  if(notifOpen){
    panel.style.display = "block";
    panel.innerHTML = pend.length===0 ? '<div class="empty" style="padding:14px;">Nenhuma tarefa pendente para você. 🎉</div>' :
      pend.map(function(t){
        var quando = t.vencimento_em ? fmtDateTime(t.vencimento_em) : fmtDateISO(t.data_vencimento);
        return '<div class="notif-item"><div class="notif-item-title">'+escapeHtml(t.titulo)+'</div><div class="notif-item-meta">'+quando+'</div><button class="linklike" data-concluir-notif="'+t.id+'">concluir</button></div>';
      }).join("");
  } else {
    panel.style.display = "none";
  }
}

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
  {id:"relatorios", label:"Relatórios", icon:"chart"},
  {id:"empresas", label:"Empresas", icon:"building"},
  {id:"implantacao", label:"Implantação", icon:"flag"},
  {id:"tarefas", label:"Tarefas", icon:"check"},
  {id:"agenda", label:"Agenda", icon:"calendar"},
  {id:"posvenda", label:"Pós-venda", icon:"message"},
  {id:"financeiro", label:"Financeiro", icon:"receipt"},
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
  flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V4"/><path d="M5 4h13l-3 4.5L18 13H5"/></svg>',
  building:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M3 21h18M8 8h3M8 12h3M8 16h3"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  receipt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>'
};
var NAV_GRUPOS = [
  {nome:null, itens:["painel"]},
  {nome:null, itens:["clientes"]},
  {nome:null, itens:["funil","relatorios","empresas"]},
  {nome:null, itens:["implantacao"]},
  {nome:"Concierge", itens:["tarefas","agenda","posvenda"]},
  {nome:"Gestão", itens:["financeiro","parametros"]}
];
function navGrupoAberto(nome){ try { return localStorage.getItem("op-menu-"+nome) !== "0"; } catch(e){ return true; } }
function renderNav(){
  var nav = document.getElementById("nav");
  var itens = NAV.filter(function(n){ if(n.id==="financeiro") return podeVerFinanceiro(); if(n.id==="relatorios") return podeVerRelatorios(); return true; });
  var porId = {}; itens.forEach(function(n){ porId[n.id]=n; });
  var usados = {};
  function item(n){ usados[n.id]=1; return '<div class="navitem'+(state.tab===n.id?' active':'')+'" data-tab="'+n.id+'">'+ICONS[n.icon]+'<span>'+n.label+'</span></div>'; }
  var html = NAV_GRUPOS.map(function(g){
    var membros = g.itens.map(function(id){ return porId[id]; }).filter(Boolean);
    if(!membros.length) return "";
    if(!g.nome) return membros.map(item).join("");
    var temAtivo = membros.some(function(n){ return n.id===state.tab; });
    var aberto = temAtivo || navGrupoAberto(g.nome);
    return '<div class="op-grupo'+(aberto?' aberto':'')+(temAtivo?' tem-ativo':'')+'" data-grupo="'+g.nome+'">'+
      '<button type="button" class="op-grupo-btn" aria-expanded="'+aberto+'"><svg class="op-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg><span>'+g.nome+'</span><span class="op-grupo-n">'+membros.length+'</span></button>'+
      '<div class="op-grupo-itens"><div>'+membros.map(item).join("")+'</div></div></div>';
  }).join("") + itens.filter(function(n){ return !usados[n.id]; }).map(item).join("");
  nav.innerHTML = html;
  Array.prototype.forEach.call(nav.querySelectorAll(".navitem"), function(el){
    el.addEventListener("click", function(){ state.tab = el.getAttribute("data-tab"); render(); });
  });
  Array.prototype.forEach.call(nav.querySelectorAll(".op-grupo-btn"), function(btn){
    btn.addEventListener("click", function(){
      var box = btn.parentNode, ab = box.classList.toggle("aberto");
      btn.setAttribute("aria-expanded", ab);
      try { localStorage.setItem("op-menu-"+box.getAttribute("data-grupo"), ab?"1":"0"); } catch(e){}
    });
  });
}

function render(){
  renderNav();
  renderNotifBell();
  var main = document.getElementById("main");
  if(state.loading){ main.innerHTML = '<div class="empty">Carregando…</div>'; return; }
  if(state.tab==="painel") main.innerHTML = viewPainel();
  else if(state.tab==="clientes") main.innerHTML = viewClientes();
  else if(state.tab==="funil") main.innerHTML = viewFunil();
  else if(state.tab==="empresas") main.innerHTML = viewEmpresas();
  else if(state.tab==="relatorios") main.innerHTML = podeVerRelatorios()? viewRelatorios() : '<div class="empty">Você não tem acesso a este setor.</div>';
  else if(state.tab==="implantacao") main.innerHTML = viewImplantacao();
  else if(state.tab==="tarefas") main.innerHTML = viewTarefas();
  else if(state.tab==="agenda") main.innerHTML = viewAgenda();
  else if(state.tab==="atendimentos"){ posvendaSection="atendimentos"; main.innerHTML = viewPosvenda(); }
  else if(state.tab==="posvenda") main.innerHTML = viewPosvenda();
  else if(state.tab==="boletos"){ posvendaSection="boletos"; main.innerHTML = viewPosvenda(); }
  else if(state.tab==="financeiro") main.innerHTML = podeVerFinanceiro()? viewFinanceiro() : '<div class="empty">Você não tem acesso a este setor.</div>';
  else if(state.tab==="parametros") main.innerHTML = viewParametros();
  wireActions();
}
function tile(label,value,sub){ return '<div class="tile"><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="sub">'+(sub||"")+'</div></div>'; }
function tabbtn(group,id,label,current){ return '<div class="tab2'+(current===id?' active':'')+'" data-'+group+'-tab="'+id+'">'+label+'</div>'; }
function clienteLabel(c){ return c ? (c.razao_social || c.titular_nome || "Cliente") : "—"; }

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
  (list.length===0? '<div class="card"><div class="card-body"><div class="empty">Nenhum cliente cadastrado ainda.</div></div></div>' :
  '<div class="client-cards">'+list.map(function(c){
    var faixa = computeFaixa(c.data_nascimento);
    var rev = nextRevisao(c);
    var deps = depsOf(c.id);
    var nTitularesExtra = deps.filter(function(d){ return d.tipo==="Titular adicional"; }).length;
    var nDeps = deps.length - nTitularesExtra;
    var nVidas = 1 + deps.length;
    var nTitulares = 1 + nTitularesExtra;
    return '<div class="client-card">'+
      '<div class="client-card-head">'+
        '<div>'+
          '<h3>'+escapeHtml(clienteLabel(c))+'</h3>'+
          (c.razao_social && c.titular_nome? '<div class="muted">'+escapeHtml(c.titular_nome)+'</div>' : '')+
          '<div class="muted">'+escapeHtml(c.cnpj_cpf||c.cpf||"—")+'</div>'+
        '</div>'+
        '<div class="rowflex" style="gap:6px;">'+
          (c.status==="Cancelado"?'<span class="pill pill-bad">Cancelado</span>':'<span class="pill pill-ok">Ativo</span>')+
          (c.boleto_ativo? '<span class="tag">Boleto dia '+(c.boleto_dia_vencimento||"?")+'</span>' : '')+
        '</div>'+
      '</div>'+
      '<div class="info-grid">'+
        '<div class="info-item"><span class="k">Contato</span><span>'+(c.responsavel_financeiro? escapeHtml(c.responsavel_financeiro)+' · ' : '')+escapeHtml(c.telefone||"—")+'</span></div>'+
        '<div class="info-item"><span class="k">Plano</span><span>'+escapeHtml(c.plano_nome||c.produto||"—")+'</span></div>'+
        '<div class="info-item"><span class="k">Vendedor(a)</span><span>'+escapeHtml(c.vendedor||"—")+'</span></div>'+
        '<div class="info-item"><span class="k">Vigência</span><span>'+fmtDateISO(c.vigencia_inicio)+(c.vigencia_fim? ' – '+fmtDateISO(c.vigencia_fim):'')+'</span></div>'+
        '<div class="info-item"><span class="k">Valor contrato</span><span><b>'+fmtMoney(c.valor_contrato_total)+'</b></span></div>'+
        '<div class="info-item"><span class="k">Vidas</span><span>'+nVidas+' <span class="muted">('+nTitulares+' titular'+(nTitulares===1?'':'es')+' · '+nDeps+' dep.)</span></span></div>'+
        '<div class="info-item"><span class="k">Faixa etária (titular)</span><span>'+(faixa? faixa.label+(faixa.nextChangeISO?' <span class="muted">· muda '+fmtDateISO(faixa.nextChangeISO)+'</span>':'') : '—')+'</span></div>'+
        '<div class="info-item"><span class="k">Revisão</span><span>'+(rev? (rev.overdue?'<span class="pill pill-bad">atrasada</span>':fmtDateISO(rev.date)) : '—')+'</span></div>'+
      '</div>'+
      vidasValoresHtml(c)+
      '<div class="client-card-foot">'+
        '<button class="linklike" data-edit-cliente="'+c.id+'">editar</button> <button class="linklike" data-hist-cliente="'+c.id+'">tabela & upgrade</button>'+(c.boleto_ativo? ' <button class="linklike" data-boleto-cliente="'+c.id+'">boletos</button>' : '')+' <button class="linklike" data-carencias-cliente="'+c.id+'">carências</button> <button class="linklike" data-acesso-cliente="'+c.id+'">'+(c.portal_login||c.portal_senha? '🔑 acesso' : 'acesso')+'</button>'+(c.drive_link? ' <a class="linklike" href="'+escapeHtml(c.drive_link)+'" target="_blank" rel="noopener">📁 Drive</a>' : '')+' <button class="linklike" data-del-cliente="'+c.id+'" style="color:var(--danger);">excluir</button>'+
      '</div>'+
    '</div>';
  }).join("")+'</div>');
}

/* ================= CLIENTES: acesso ao portal da operadora (login/senha da empresa) ================= */
function acessoPortalModal(c){
  var url = c.portal_url || "";
  var href = url && !/^https?:\/\//i.test(url) ? "https://"+url : url;
  var body = '<div class="kv-list">'+
    '<div class="kv-row"><span class="k">Portal</span><span>'+(href? '<a class="linklike" href="'+escapeHtml(href)+'" target="_blank" rel="noopener">'+escapeHtml(url)+'</a>' : '<span class="muted">—</span>')+'</span></div>'+
    '<div class="kv-row"><span class="k">Login</span><span>'+(c.portal_login? '<b>'+escapeHtml(c.portal_login)+'</b> <button type="button" class="linklike" id="ap-copiar-login">copiar</button>' : '<span class="muted">—</span>')+'</span></div>'+
    '<div class="kv-row"><span class="k">Senha</span><span>'+(c.portal_senha? '<b id="ap-senha">••••••••</b> <button type="button" class="linklike" id="ap-mostrar">mostrar</button> <button type="button" class="linklike" id="ap-copiar-senha">copiar</button>' : '<span class="muted">—</span>')+'</span></div>'+
  '</div>'+
  (!c.portal_login && !c.portal_senha? '<div class="muted" style="margin-top:10px;">Ainda não cadastrado. Clique em "editar" no cliente e preencha a parte "Acesso ao portal da operadora".</div>' : '');
  openModal("Acesso ao portal — "+clienteLabel(c), body, function(fechar){ fechar(); }, "Fechar");
  function copiar(txt, msg){
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){ toast(msg); }, function(){ toast("Não consegui copiar — selecione e copie manualmente."); }); }
    else toast("Não consegui copiar — selecione e copie manualmente.");
  }
  var bl = document.getElementById("ap-copiar-login"); if(bl) bl.onclick = function(){ copiar(c.portal_login, "Login copiado."); };
  var bs = document.getElementById("ap-copiar-senha"); if(bs) bs.onclick = function(){ copiar(c.portal_senha, "Senha copiada."); };
  var bm = document.getElementById("ap-mostrar"); if(bm) bm.onclick = function(){
    var el = document.getElementById("ap-senha"); var vis = bm.textContent==="ocultar";
    el.textContent = vis ? "••••••••" : c.portal_senha; bm.textContent = vis ? "mostrar" : "ocultar";
  };
}

function clienteFormHtml(c, deps, opts){
  c = c || {produto:"Saúde", vendedor:"Henrique", status:"Ativo"};
  deps = deps || [];
  opts = opts || {};
  /* Modo pré-cadastro (Implantação, antes dos documentos chegarem): esconde CPF/RG/
     carteirinha e data de nascimento do titular (ainda não dá pra preencher — isso é
     feito depois, ao cadastrar titular do plano e dependentes) e renomeia "Titular" pra
     "Responsável", já que nesse momento é só o contato da empresa. Os campos continuam
     no DOM (só escondidos), pra não quebrar readClienteForm() nem o cadastro completo
     depois — eles reaparecem normalmente quando o mesmo formulário é usado em "Editar
     cliente" (clientes.html, opts.preCadastro ausente). */
  var pc = !!opts.preCadastro;
  var banco = c.dados_bancarios || {};
  var linhaDoc = pc ?
    '<div class="field"><label>CNPJ (empresa)</label><input id="f-cnpj" value="'+escapeHtml(c.cnpj_cpf||"")+'" placeholder="00.000.000/0000-00" maxlength="18"></div>'+
    '<div style="display:none;"><input id="f-cpf" value="'+escapeHtml(c.cpf||"")+'"><input id="f-rg" value="'+escapeHtml(c.rg||"")+'"></div>'
    : '<div class="field row3"><div class="field"><label>CNPJ (empresa)</label><input id="f-cnpj" value="'+escapeHtml(c.cnpj_cpf||"")+'" placeholder="00.000.000/0000-00" maxlength="18"></div><div class="field"><label>CPF (titular)</label><input id="f-cpf" value="'+escapeHtml(c.cpf||"")+'" placeholder="000.000.000-00" maxlength="14"></div><div class="field"><label>RG (titular)</label><input id="f-rg" value="'+escapeHtml(c.rg||"")+'"></div></div>';
  var linhaContato = pc ?
    '<div class="field row2"><div class="field"><label>E-mail</label><input type="email" id="f-email" value="'+escapeHtml(c.email||"")+'"></div><div class="field"><label>Telefone (WhatsApp)</label><input id="f-telefone" value="'+escapeHtml(c.telefone||"")+'"></div></div>'+
    '<div style="display:none;"><input id="f-carteirinha" value="'+escapeHtml(c.numero_carteirinha||"")+'"></div>'
    : '<div class="field row3"><div class="field"><label>E-mail</label><input type="email" id="f-email" value="'+escapeHtml(c.email||"")+'"></div><div class="field"><label>Telefone (WhatsApp)</label><input id="f-telefone" value="'+escapeHtml(c.telefone||"")+'"></div><div class="field"><label>Nº da carteirinha</label><input id="f-carteirinha" value="'+escapeHtml(c.numero_carteirinha||"")+'"></div></div>';
  return ''+
  '<fieldset><legend>'+(pc?'Responsável':'Titular')+'</legend>'+
  '<div class="field row2"><div class="field"><label>'+(pc?'Nome do responsável':'Nome do titular')+'</label><input id="f-titular" value="'+escapeHtml(c.titular_nome||"")+'"></div><div class="field"><label>Razão social (se PJ)</label><input id="f-razao" value="'+escapeHtml(c.razao_social||"")+'"></div></div>'+
  linhaDoc+
  '<div class="muted" id="f-cnpj-status" style="font-size:11.5px;"></div>'+
  (pc?
    '<div style="display:none;"><input type="date" id="f-nasc" value="'+(c.data_nascimento||"")+'"><span id="f-idade-out"></span></div>'
    :'<div class="field row2"><div class="field"><label>Data de nascimento <span id="f-idade-out" class="muted"></span></label><input type="date" id="f-nasc" value="'+(c.data_nascimento||"")+'"></div><div class="field"></div></div>')+
  linhaContato+
  '<div class="field"><label>Responsável financeiro (quem recebe o boleto, se for diferente do titular)</label><input id="f-resp-financeiro" value="'+escapeHtml(c.responsavel_financeiro||"")+'" placeholder="ex: nome de quem cuida do financeiro na empresa"></div>'+
  '<div class="field"><label>Link da pasta no Drive (documentos do cliente)</label><input id="f-drive-link" value="'+escapeHtml(c.drive_link||"")+'" placeholder="https://drive.google.com/..."></div>'+
  '</fieldset>'+
  '<fieldset><legend>Acesso ao portal da operadora (login da empresa)</legend>'+
  '<div class="field"><label>Site do portal</label><input id="f-portal-url" value="'+escapeHtml(c.portal_url||"")+'" placeholder="ex: https://portal.operadora.com.br"></div>'+
  '<div class="field row2"><div class="field"><label>Login</label><input id="f-portal-login" autocomplete="off" value="'+escapeHtml(c.portal_login||"")+'"></div>'+
    '<div class="field"><label>Senha</label><div class="rowflex" style="flex-wrap:nowrap;"><input id="f-portal-senha" type="password" autocomplete="new-password" style="flex:1" value="'+escapeHtml(c.portal_senha||"")+'"><button type="button" class="btn btn-ghost btn-sm" id="f-portal-mostrar">mostrar</button></div></div></div>'+
  '<div class="muted" style="font-size:11.5px;">Fica visível só para a equipe logada no sistema.</div>'+
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
  '<div class="field row2"><div class="field"><label>Categoria contratada (da tabela)</label><select id="f-categoria" data-atual="'+escapeHtml(c.categoria_contratada||"")+'"><option value="">—</option></select><span class="muted op-valor-hint" id="f-categoria-hint"></span></div>'+
    '<div class="field"><label>&nbsp;</label><div class="op-soma-tabela" id="f-soma-tabela"></div></div></div>'+
  '<div class="field row3">'+moneyFieldHtml("f-valor-benef", c.valor_por_beneficiario, "Valor do titular (R$)")+moneyFieldHtml("f-valor-total", c.valor_contrato_total, "Valor do contrato total (R$)")+moneyFieldHtml("f-bonus", c.bonus_parcela4||0, "Bônus parcela 4 (R$, opcional)")+'</div>'+
  '<div class="field row3"><div class="field"><label>Data de fechamento (p/ comissão)</label><input type="date" id="f-fechamento" value="'+(c.data_fechamento||c.data_inclusao||"")+'"></div><div class="field"><label>Última revisão de plano</label><input type="date" id="f-revisao" value="'+(c.ultima_revisao||"")+'"></div><div class="field"><label>Status</label><select id="f-status"><option'+(c.status==="Ativo"?' selected':'')+'>Ativo</option><option'+(c.status==="Cancelado"?' selected':'')+'>Cancelado</option></select></div></div>'+
  '<div class="field row3"><div class="field"><label>Reajuste (índice %)</label><input type="number" step="0.01" id="f-reajuste-pct" value="'+(c.percentual_reajuste||"")+'" placeholder="ex: 8,5"></div><div class="field"><label>&nbsp;</label><button type="button" class="btn btn-ghost" id="btn-aplicar-reajuste">Aplicar reajuste ao valor do contrato</button></div><div class="field"><label>Último reajuste em</label><input type="date" id="f-reajuste-data" value="'+(c.data_ultimo_reajuste||"")+'" readonly></div></div>'+
  '</fieldset>'+
  '<fieldset><legend>Plano anterior e carências</legend>'+
  '<div class="field row2"><div class="field"><label>Já possuía plano de saúde?</label><select id="f-plano-atual-tem"><option value="">—</option><option value="Sim"'+(c.plano_atual_tem===true?' selected':'')+'>Sim</option><option value="Não"'+(c.plano_atual_tem===false?' selected':'')+'>Não</option></select></div>'+
    '<div class="field" id="f-plano-atual-nome-wrap" style="'+(c.plano_atual_tem?"":"display:none;")+'"><label>Qual plano?</label><input id="f-plano-atual-nome" value="'+escapeHtml(c.plano_atual_nome||"")+'" placeholder="ex: Bradesco"></div></div>'+
  '<div class="field row2"><div class="field"><label>Compra de carências?</label><select id="f-compra-carencias"><option value="">—</option><option value="Sim"'+(c.compra_carencias===true?' selected':'')+'>Sim</option><option value="Não"'+(c.compra_carencias===false?' selected':'')+'>Não</option></select></div>'+
    '<div class="field"><label>Coparticipação?</label><select id="f-coparticipacao"><option value="">—</option><option value="Sim"'+(c.coparticipacao===true?' selected':'')+'>Sim</option><option value="Não"'+(c.coparticipacao===false?' selected':'')+'>Não</option></select></div></div>'+
  '<div class="field row2"><div class="field"><label>Modelo de carência (quadro da operadora)</label><select id="f-carencia-modelo"><option value="">—</option>'+
    state.carencia_modelos.map(function(m){ return '<option value="'+m.id+'"'+(c.carencia_modelo_id===m.id?' selected':'')+'>'+escapeHtml(m.nome)+'</option>'; }).join("")+
  '</select></div><div class="field"><label>Faixa / categoria</label><select id="f-carencia-categoria">'+carenciaCategoriaOptionsHtml(c.carencia_modelo_id, c.carencia_categoria)+'</select></div></div>'+
  (state.carencia_modelos.length===0? '<div class="muted" style="font-size:11.5px;">Nenhum modelo cadastrado ainda — cadastre em Parâmetros &gt; Modelos de carência.</div>' : '')+
  '<div id="carencia-preview" style="margin-top:6px;"></div>'+
  '</fieldset>'+
  '<fieldset><legend>Boleto mensal</legend>'+
  '<div class="field row2">'+
    '<label class="rowflex" style="font-weight:400;"><input type="checkbox" id="f-boleto-ativo" '+(c.boleto_ativo?'checked':'')+'> Enviamos boleto mensalmente para este cliente (recorrente)</label>'+
    '<div class="field"><label>Dia do vencimento (1 a 31)</label><input type="number" id="f-boleto-dia" min="1" max="31" value="'+(c.boleto_dia_vencimento||"")+'" placeholder="ex: 10"></div>'+
  '</div>'+
  '</fieldset>'+
  '<fieldset><legend>Dados bancários do titular (opcional)</legend>'+
  '<div class="field row3"><div class="field"><label>Banco</label><input id="f-banco" value="'+escapeHtml(banco.banco||"")+'"></div><div class="field"><label>Agência</label><input id="f-agencia" value="'+escapeHtml(banco.agencia||"")+'"></div><div class="field"><label>Conta</label><input id="f-conta" value="'+escapeHtml(banco.conta||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Tipo de conta</label><input id="f-tipo-conta" value="'+escapeHtml(banco.tipo_conta||"")+'" placeholder="Corrente / Poupança"></div><div class="field"><label>Chave PIX</label><input id="f-pix" value="'+escapeHtml(banco.pix||"")+'"></div></div>'+
  '</fieldset>'+
  '<fieldset><legend>Titulares e dependentes</legend>'+
  '<div class="muted" style="font-size:11.5px;margin-bottom:8px;">Contratos com mais de um titular (ex: sócios da mesma empresa): cadastre cada um como "Titular adicional" e depois escolha, em cada dependente, a qual titular ele pertence.</div>'+
  '<div id="dep-list">'+(function(){
    var oldIdToRowIndex = {};
    deps.forEach(function(d,i){ if(d.id) oldIdToRowIndex[d.id] = String(i); });
    return deps.map(function(d,i){
      var hint = (d.titular_ref_id && oldIdToRowIndex.hasOwnProperty(d.titular_ref_id)) ? oldIdToRowIndex[d.titular_ref_id] : "";
      return depRowHtml(d, i, hint);
    }).join("");
  })()+'</div>'+
  '<button type="button" class="linklike" id="btn-add-dep" style="margin-top:6px;">+ adicionar dependente</button></fieldset>'+
  '<div class="field"><label>Observações</label><textarea id="f-obs">'+escapeHtml(c.observacoes||"")+'</textarea></div>';
}

/* ===== Valor de cada vida pela tabela do contrato (titular e dependentes) ===== */
function tabelaParaFormulario(c){
  if(c && c.id){ var t = tabelaAtualDoCliente(c.id); if(t) return t; }
  if(c && c.lead_id){ var tl = tabelasDoLead(c.lead_id)[0]; if(tl) return tl; }
  return null;
}
function wireValoresPorFaixa(c){
  var tabela = tabelaParaFormulario(c);
  var sel = document.getElementById("f-categoria");
  if(!sel) return;
  var cats = categoriasDaTabela(tabela);
  var atual = sel.getAttribute("data-atual") || "";
  if(!atual && c && c.lead_id){
    var lead = state.leads.filter(function(l){ return l.id===c.lead_id; })[0];
    var palpite = lead && lead.categoria_plano ? cats.filter(function(k){ return k.toLowerCase().indexOf(String(lead.categoria_plano).toLowerCase())===0; })[0] : null;
    if(palpite) atual = palpite;
  }
  sel.innerHTML = '<option value="">—</option>'+cats.map(function(k){ return '<option'+(k===atual?' selected':'')+'>'+escapeHtml(k)+'</option>'; }).join("");
  var catHint = document.getElementById("f-categoria-hint");
  if(!cats.length && catHint) catHint.textContent = "Cadastre a tabela comercializada (implantação ou “tabela & upgrade”) para o sistema calcular o valor de cada vida.";
  function valorDe(nasc, cat){
    if(!tabela || !cat || !nasc) return null;
    var f = computeFaixa(nasc); if(!f) return null;
    var v = valorNaTabela(tabela, cat, f.label);
    return v==null ? null : {valor:v, faixa:f.label};
  }
  function dica(input){
    var h = input.nextElementSibling;
    if(!h || !h.classList || !h.classList.contains("op-valor-hint")){ h = document.createElement("span"); h.className = "op-valor-hint"; input.insertAdjacentElement("afterend", h); }
    return h;
  }
  function pintar(preencherVazios){
    var cat = sel.value;
    var soma = 0, n = 0, completos = 0;
    var nascT = document.getElementById("f-nasc").value;
    var rT = valorDe(nascT, cat);
    var inT = document.getElementById("f-valor-benef");
    var hT = dica(inT);
    if(hT) hT.textContent = rT ? "Tabela: "+fmtMoney(rT.valor)+" · "+rT.faixa : "";
    if(rT){ if(preencherVazios && !inT.value) inT.value = moneyDisplay(rT.valor); soma += rT.valor; completos++; }
    n++;
    Array.prototype.forEach.call(document.querySelectorAll("[data-dep-row]"), function(row){
      var nasc = row.querySelector(".dep-nasc").value;
      if(!nasc && !row.querySelector(".dep-nome").value) return;
      n++;
      var catDep = (row.querySelector(".dep-categoria")||{}).value || cat;
      var r = valorDe(nasc, catDep);
      var inp = row.querySelector(".dep-valor");
      var h = dica(inp);
      if(h) h.textContent = r ? "Tabela: "+fmtMoney(r.valor)+" · "+r.faixa : (nasc && cat ? "Sem valor nessa faixa" : "");
      if(r){ if(preencherVazios && !inp.value) inp.value = moneyDisplay(r.valor); soma += r.valor; completos++; }
    });
    var box = document.getElementById("f-soma-tabela");
    if(box){
      box.innerHTML = (cat && completos) ? '<div class="op-soma-linha"><span>Soma pela tabela ('+completos+' de '+n+' vida'+(n===1?'':'s')+')</span><b>'+fmtMoney(soma)+'</b></div><button type="button" class="linklike" id="f-usar-soma">usar como valor do contrato</button>' : '';
      var usar = document.getElementById("f-usar-soma");
      if(usar) usar.onclick = function(){ document.getElementById("f-valor-total").value = moneyDisplay(Math.round(soma*100)/100); toast("Valor do contrato atualizado pela soma da tabela."); };
    }
  }
  sel.addEventListener("change", function(){ pintar(true); });
  var form = document.getElementById("modal-body") || document;
  form.addEventListener("input", function(e){ if(e.target.matches && e.target.matches("#f-nasc, .dep-nasc, .dep-nome")) pintar(true); });
  form.addEventListener("click", function(e){ if(e.target && (e.target.id==="btn-add-dep" || e.target.hasAttribute("data-remove-dep"))) setTimeout(function(){ pintar(false); }, 0); });
  pintar(true);
}
/* Lista "vidas e valores" no cartão do cliente */
function vidasValoresHtml(c){
  var tabela = tabelaAtualDoCliente(c.id);
  var pessoas = [{nome: c.titular_nome || clienteLabel(c), tipo:"Titular", nasc:c.data_nascimento, valor:c.valor_por_beneficiario, cat:c.categoria_contratada}]
    .concat(depsOf(c.id).map(function(d){ return {nome:d.nome, tipo:d.tipo||"Dependente", nasc:d.data_nascimento, valor:d.valor_beneficiario, cat:d.categoria_contratada||c.categoria_contratada}; }));
  var total = 0, algum = false;
  var linhas = pessoas.map(function(p){
    var f = p.nasc ? computeFaixa(p.nasc) : null;
    var idade = p.nasc ? ageOnISO(p.nasc, todayISO()) : null;
    var v = (p.valor!=null && p.valor!=="" && Number(p.valor)>0) ? Number(p.valor) : null, origem = "";
    if(v==null && tabela && p.cat && f){ v = valorNaTabela(tabela, p.cat, f.label); origem = v!=null ? ' <span class="muted" title="calculado pela tabela do contrato">· tabela</span>' : ''; }
    if(v!=null){ total += v; algum = true; }
    return '<div class="op-vida"><span class="op-vida-nome">'+escapeHtml(p.nome||"—")+' <span class="muted">'+escapeHtml(p.tipo)+(idade!=null? ' · '+idade+' anos':'')+'</span></span>'+
      '<span class="op-vida-faixa">'+(f? f.label : '<span class="muted">sem nascimento</span>')+'</span>'+
      '<span class="op-vida-valor">'+(v!=null? fmtMoney(v)+origem : '<span class="muted">—</span>')+'</span></div>';
  }).join("");
  return '<details class="op-vidas"'+(pessoas.length<=4?' open':'')+'><summary><span>Vidas e valores</span><span class="muted">'+pessoas.length+' vida'+(pessoas.length===1?'':'s')+(algum? ' · '+fmtMoney(total)+'/mês' : '')+(c.categoria_contratada? ' · '+escapeHtml(c.categoria_contratada) : '')+'</span></summary>'+linhas+(!algum && tabela && !c.categoria_contratada? '<div class="op-vida muted" style="display:block;font-size:12.5px;">Escolha a <b>categoria contratada</b> em “editar” para o sistema mostrar o valor de cada vida pela tabela.</div>' : '')+'</details>';
}

function depRowHtml(d,i,titularHint){
  d=d||{};
  var tipo = d.tipo||"Dependente";
  return '<div class="deprow" data-dep-row="'+i+'">'+
    '<div class="deprow-fields">'+
      '<div class="field"><label>Nome</label><input class="dep-nome" value="'+escapeHtml(d.nome||"")+'"></div>'+
      '<div class="field"><label>CPF</label><input class="dep-cpf" value="'+escapeHtml(d.cpf||"")+'"></div>'+
      '<div class="field"><label>Nascimento <span class="dep-idade-out muted">'+(d.data_nascimento? "("+ageOnISO(d.data_nascimento, todayISO())+" ano"+(ageOnISO(d.data_nascimento, todayISO())===1?"":"s")+")" : "")+'</span></label><input type="date" class="dep-nasc" value="'+(d.data_nascimento||"")+'"></div>'+
      '<div class="field"><label>Nº carteirinha</label><input class="dep-carteirinha" value="'+escapeHtml(d.numero_carteirinha||"")+'"></div>'+
      '<div class="field"><label>Tipo</label><select class="dep-tipo">'+TIPOS_TITULARIDADE.map(function(t){return '<option'+(tipo===t?' selected':'')+'>'+t+'</option>';}).join("")+'</select></div>'+
      '<div class="field"><label>Valor benefíc. (R$)</label><input type="text" inputmode="decimal" class="money-input dep-valor" value="'+escapeHtml(moneyDisplay(d.valor_beneficiario))+'" placeholder="0,00"><input type="hidden" class="dep-categoria" value="'+escapeHtml(d.categoria_contratada||"")+'"></div>'+
      '<button type="button" class="iconbtn" data-remove-dep="'+i+'">✕</button>'+
    '</div>'+
    '<div class="field dep-titular-wrap" style="margin-top:6px;'+(tipo==="Dependente"?"":"display:none;")+'"><label>Titular responsável</label><select class="dep-titular-ref" data-dep-titular-value="'+escapeHtml(titularHint||"")+'"><option value="">Titular principal</option></select></div>'+
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
    refreshTitularSelects();
  };
  wireDepRemovals();
  list.addEventListener("change", function(e){
    if(e.target.classList.contains("dep-tipo")){
      var wrap = e.target.closest("[data-dep-row]").querySelector(".dep-titular-wrap");
      if(wrap) wrap.style.display = e.target.value==="Dependente" ? "" : "none";
      refreshTitularSelects();
    }
  });
  list.addEventListener("input", function(e){
    if(e.target.classList.contains("dep-nome")) refreshTitularSelects();
    if(e.target.classList.contains("dep-nasc")){
      var out = e.target.closest("[data-dep-row]").querySelector(".dep-idade-out");
      if(!out) return;
      if(!e.target.value){ out.textContent = ""; return; }
      var idade = ageOnISO(e.target.value, todayISO());
      out.textContent = "("+idade+" ano"+(idade===1?"":"s")+")";
    }
  });
  refreshTitularSelects();
}
function wireDepRemovals(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-remove-dep]"), function(btn){
    btn.onclick = function(){ btn.closest("[data-dep-row]").remove(); refreshTitularSelects(); };
  });
}
/* Recalcula as opções de "Titular responsável" de todo mundo, a partir das linhas
   marcadas como "Titular adicional" no momento — chamado sempre que alguém adiciona,
   remove ou muda o tipo/nome de uma linha, pra manter a lista de titulares em dia. */
function refreshTitularSelects(){
  var list = document.getElementById("dep-list");
  if(!list) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll("[data-dep-row]"));
  var titulares = rows.map(function(row){
    var tipoEl = row.querySelector(".dep-tipo");
    var nomeEl = row.querySelector(".dep-nome");
    return {rowIndex: row.getAttribute("data-dep-row"), tipo: tipoEl?tipoEl.value:"Dependente", nome: nomeEl?nomeEl.value.trim():""};
  }).filter(function(r){ return r.tipo==="Titular adicional"; });
  rows.forEach(function(row){
    var sel = row.querySelector(".dep-titular-ref");
    if(!sel) return;
    var current = sel.value || sel.getAttribute("data-dep-titular-value") || "";
    sel.innerHTML = '<option value="">Titular principal</option>'+titulares.map(function(t){ return '<option value="'+t.rowIndex+'">'+escapeHtml(t.nome||("Titular adicional (linha "+(parseInt(t.rowIndex,10)+1)+")"))+'</option>'; }).join("");
    if(titulares.some(function(t){return t.rowIndex===current;})) sel.value = current;
    sel.removeAttribute("data-dep-titular-value");
  });
}
function wireClienteFormExtra(){
  var btnMostrarSenha = document.getElementById("f-portal-mostrar");
  if(btnMostrarSenha) btnMostrarSenha.onclick = function(){ var el = document.getElementById("f-portal-senha"); var vis = el.type==="text"; el.type = vis ? "password" : "text"; btnMostrarSenha.textContent = vis ? "mostrar" : "ocultar"; };
  var elNasc = document.getElementById("f-nasc");
  var elIdadeOut = document.getElementById("f-idade-out");
  function updateIdade(){
    if(!elNasc.value){ elIdadeOut.textContent = ""; return; }
    var idade = ageOnISO(elNasc.value, todayISO());
    elIdadeOut.textContent = "("+idade+" ano"+(idade===1?"":"s")+")";
  }
  if(elNasc){ elNasc.addEventListener("input", updateIdade); updateIdade(); }

  var elCnpj = document.getElementById("f-cnpj");
  var elCnpjStatus = document.getElementById("f-cnpj-status");
  if(elCnpj){
    elCnpj.addEventListener("input", function(){ elCnpj.value = maskCNPJ(elCnpj.value); });
    elCnpj.addEventListener("blur", async function(){
      var digits = elCnpj.value.replace(/\D/g,"");
      if(digits.length !== 14){ return; }
      elCnpjStatus.textContent = "Buscando empresa na Receita Federal…";
      try{
        var resp = await fetch("https://brasilapi.com.br/api/cnpj/v1/"+digits);
        if(!resp.ok){ elCnpjStatus.textContent = "CNPJ não encontrado."; return; }
        var data = await resp.json();
        var elRazao = document.getElementById("f-razao");
        if(elRazao && !elRazao.value.trim()) elRazao.value = data.razao_social || data.nome_fantasia || "";
        elCnpjStatus.textContent = "Empresa encontrada: "+(data.razao_social||data.nome_fantasia||"—")+" — confira os demais dados.";
      }catch(e){
        console.error(e);
        elCnpjStatus.textContent = "Não foi possível buscar o CNPJ agora — preencha manualmente.";
      }
    });
  }
  var elCpf = document.getElementById("f-cpf");
  if(elCpf){ elCpf.addEventListener("input", function(){ elCpf.value = maskCPF(elCpf.value); }); }

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

  var elPlanoAtualTem = document.getElementById("f-plano-atual-tem");
  var elPlanoAtualNomeWrap = document.getElementById("f-plano-atual-nome-wrap");
  if(elPlanoAtualTem && elPlanoAtualNomeWrap){
    elPlanoAtualTem.addEventListener("change", function(){ elPlanoAtualNomeWrap.style.display = elPlanoAtualTem.value==="Sim" ? "" : "none"; });
  }
  var elCarModelo = document.getElementById("f-carencia-modelo");
  var elCarCategoria = document.getElementById("f-carencia-categoria");
  function updateCarenciaPreview(){
    var preview = document.getElementById("carencia-preview");
    if(!preview) return;
    var vig = elVigInicio ? elVigInicio.value : "";
    var modeloId = elCarModelo ? elCarModelo.value : "";
    var categoria = elCarCategoria ? elCarCategoria.value : "";
    var rows = calcularCarencias(vig, modeloId, categoria);
    preview.innerHTML = rows ? ('<div class="muted" style="font-size:11.5px;margin-bottom:4px;">Carências calculadas a partir da vigência (início):</div>'+carenciasTableHtml(rows)) : '';
  }
  if(elCarModelo){
    elCarModelo.addEventListener("change", function(){
      if(elCarCategoria) elCarCategoria.innerHTML = carenciaCategoriaOptionsHtml(elCarModelo.value, "");
      updateCarenciaPreview();
    });
  }
  if(elCarCategoria){ elCarCategoria.addEventListener("change", updateCarenciaPreview); }
  if(elVigInicio){ elVigInicio.addEventListener("change", updateCarenciaPreview); }
  updateCarenciaPreview();

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
  var rows = Array.prototype.slice.call(document.querySelectorAll("[data-dep-row]"));
  var rowIdMap = {};
  rows.forEach(function(row){ rowIdMap[row.getAttribute("data-dep-row")] = genUUID(); });
  var deps=[];
  rows.forEach(function(row){
    var idx = row.getAttribute("data-dep-row");
    var nome = row.querySelector(".dep-nome").value.trim();
    var cpf = row.querySelector(".dep-cpf").value.trim();
    var nasc = row.querySelector(".dep-nasc").value;
    var carteirinhaEl = row.querySelector(".dep-carteirinha");
    var carteirinha = carteirinhaEl ? carteirinhaEl.value.trim() : "";
    var valor = parseMoneyBR(row.querySelector(".dep-valor").value);
    var catEl = row.querySelector(".dep-categoria");
    var catTit = document.getElementById("f-categoria");
    var categoriaDep = (catEl && catEl.value) || (catTit && catTit.value) || null;
    var tipoEl = row.querySelector(".dep-tipo");
    var tipo = tipoEl ? tipoEl.value : "Dependente";
    var titularSel = row.querySelector(".dep-titular-ref");
    var titularRefRowIndex = (tipo==="Dependente" && titularSel && titularSel.value) ? titularSel.value : null;
    if(nome||cpf||nasc) deps.push({
      id: rowIdMap[idx], nome:nome, cpf:cpf, data_nascimento:nasc||null, numero_carteirinha:carteirinha, valor_beneficiario:valor, tipo:tipo, categoria_contratada:categoriaDep,
      titular_ref_id: titularRefRowIndex ? rowIdMap[titularRefRowIndex] : null
    });
  });
  // titulares adicionais precisam ser inseridos antes dos dependentes que apontam pra eles
  // (a chave estrangeira é checada linha a linha, na ordem do insert).
  deps.sort(function(a,b){ return (a.tipo==="Titular adicional"?0:1) - (b.tipo==="Titular adicional"?0:1); });
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
      rg: document.getElementById("f-rg").value.trim(),
      responsavel_financeiro: document.getElementById("f-resp-financeiro").value.trim(),
      drive_link: document.getElementById("f-drive-link").value.trim(),
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
      categoria_contratada: (document.getElementById("f-categoria") && document.getElementById("f-categoria").value) || null,
      valor_contrato_total: parseMoneyBR(document.getElementById("f-valor-total").value),
      bonus_parcela4: parseMoneyBR(document.getElementById("f-bonus").value),
      data_fechamento: document.getElementById("f-fechamento").value || null,
      ultima_revisao: document.getElementById("f-revisao").value || null,
      status: document.getElementById("f-status").value,
      percentual_reajuste: parseFloat(document.getElementById("f-reajuste-pct").value)||null,
      data_ultimo_reajuste: document.getElementById("f-reajuste-data").value || null,
      boleto_ativo: document.getElementById("f-boleto-ativo").checked,
      boleto_dia_vencimento: parseInt(document.getElementById("f-boleto-dia").value,10) || null,
      plano_atual_tem: (function(){ var v=document.getElementById("f-plano-atual-tem").value; return v===""?null:(v==="Sim"); })(),
      plano_atual_nome: document.getElementById("f-plano-atual-nome").value.trim(),
      compra_carencias: (function(){ var v=document.getElementById("f-compra-carencias").value; return v===""?null:(v==="Sim"); })(),
      coparticipacao: (function(){ var v=document.getElementById("f-coparticipacao").value; return v===""?null:(v==="Sim"); })(),
      carencia_modelo_id: document.getElementById("f-carencia-modelo").value || null,
      carencia_categoria: document.getElementById("f-carencia-categoria").value || null,
      cep: document.getElementById("f-cep").value.trim(),
      endereco_numero: document.getElementById("f-end-numero").value.trim(),
      endereco_complemento: document.getElementById("f-end-compl").value.trim(),
      endereco_rua: document.getElementById("f-end-rua").value.trim(),
      endereco_bairro: document.getElementById("f-end-bairro").value.trim(),
      endereco_cidade: document.getElementById("f-end-cidade").value.trim(),
      endereco_uf: document.getElementById("f-end-uf").value.trim(),
      dados_bancarios: banco,
      portal_url: document.getElementById("f-portal-url").value.trim() || null,
      portal_login: document.getElementById("f-portal-login").value.trim() || null,
      portal_senha: document.getElementById("f-portal-senha").value || null,
      observacoes: document.getElementById("f-obs").value.trim()
    },
    deps: deps
  };
}
function openClienteModal(existing, afterSave, seedDeps){
  var isEdit = !!(existing && existing.id);
  var deps = isEdit? depsOf(existing.id) : (seedDeps || []);
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
    if(typeof afterSave === "function") afterSave(clienteId);
  });
  wireClienteFormDeps();
  wireClienteFormExtra();
  wireValoresPorFaixa(existing);
}

/* ================= BOLETOS (envio mensal recorrente) =================
   Cliente com boleto_ativo=true tem um dia de vencimento fixo (boleto_dia_vencimento).
   Cada mês gera, sob demanda, um registro em boletos_clientes (mes_referencia "AAAA-MM")
   guardando vencimento, data planejada de envio, valor conferido, anexos e se já foi
   enviado — histórico completo, mês a mês. */
function boletoDoMes(clienteId, mk){
  return state.boletos_clientes.filter(function(b){ return b.cliente_id===clienteId && b.mes_referencia===mk; })[0];
}
/* Sugestão de data de envio: 10 dias antes do vencimento, mas nunca cai em fim de semana
   (Agatha só manda segunda e sexta) — se cair sábado ou domingo, volta pra sexta anterior,
   nunca empurra pra frente, senão furaria os 10 dias de antecedência. Continua editável. */
function sugerirDataEnvio(vencISO){
  if(!vencISO) return null;
  var d = addDaysISO(vencISO, -10);
  var dow = parseISO(d).getDay(); // 0=domingo … 6=sábado
  if(dow===6) d = addDaysISO(d, -1);
  else if(dow===0) d = addDaysISO(d, -2);
  return d;
}
/* Valor esperado do boleto = valor do contrato mantido no cadastro do cliente (é o campo
   que a equipe já atualiza quando entra/sai beneficiário — não criamos um livro-razão novo). */
function valorEsperadoCliente(c){ return c.valor_contrato_total || 0; }
/* Teve alguma tarefa de Inclusão/Exclusão de beneficiário vencendo neste mês pra este cliente? */
function clienteTeveAlteracaoNoMes(clienteId, mk){
  return state.tarefas.some(function(t){
    return t.cliente_id===clienteId && (t.tipo==="Inclusão"||t.tipo==="Exclusão") && t.data_vencimento && monthKeyFromISO(t.data_vencimento)===mk;
  });
}
function conferenciaBadgeHtml(valorEsperado, valorBoleto){
  if(valorBoleto==null || valorBoleto==="") return '<div class="muted" style="font-size:12px;">Informe o valor do boleto pra conferir.</div>';
  var diff = Math.round((valorBoleto-valorEsperado)*100)/100;
  if(Math.abs(diff)<0.01) return '<span class="pill pill-ok">✓ bate com o esperado</span>';
  return '<span class="pill pill-bad">não bate — diferença de '+fmtMoney(Math.abs(diff))+(diff>0?" a mais":" a menor")+'</span>';
}
async function salvarCampoBoleto(cliente, mk, patch){
  var b = boletoDoMes(cliente.id, mk);
  if(b){ await dbUpdate("boletos_clientes", b.id, patch); }
  else {
    var venc = vencimentoDoMes(mk, cliente.boleto_dia_vencimento);
    var data = Object.assign({cliente_id:cliente.id, mes_referencia:mk, data_vencimento:venc}, patch);
    await dbInsert("boletos_clientes", data);
  }
  openBoletoModal(cliente, mk);
}
async function uploadBoletoAnexo(cliente, mk, tipo, file){
  var ext = (file.name.split(".").pop()||"pdf").toLowerCase();
  var path = cliente.id+"/"+mk+"/"+tipo+"."+ext;
  var up = await sb.storage.from("boletos").upload(path, file, {upsert:true});
  if(up.error){ toast("Erro ao enviar arquivo: "+up.error.message); return; }
  var patch = {}; patch[tipo==="boleto"?"boleto_arquivo_path":"demonstrativo_arquivo_path"] = path;
  await salvarCampoBoleto(cliente, mk, patch);
}
async function baixarBoletoAnexo(path){
  var r = await sb.storage.from("boletos").createSignedUrl(path, 3600);
  if(r.error || !r.data){ toast("Erro ao gerar link do arquivo."); return; }
  window.open(r.data.signedUrl, "_blank");
}
function arquivoFieldHtml(prefix, path){
  return '<div class="rowflex">'+
    '<input type="file" accept="application/pdf,image/*" id="'+prefix+'-file">'+
    (path? '<button type="button" class="linklike" data-baixar-anexo="'+escapeHtml(path)+'">baixar atual</button>' : '<span class="muted" style="font-size:12px;">nenhum arquivo ainda</span>')+
  '</div>';
}
function viewBoletos(){
  var mk = todayMonthKey();
  var hoje = todayISO();
  var clientesBoleto = state.clientes.filter(function(c){ return c.boleto_ativo && c.status!=="Cancelado"; })
    .sort(function(a,b){ return (a.boleto_dia_vencimento||99)-(b.boleto_dia_vencimento||99); });
  var header = '<div class="topbar"><div><h1>Boletos</h1><div class="desc">Envio mensal recorrente de boleto — '+monthLabel(mk)+' · clique numa linha pra conferir, anexar e marcar como enviado</div></div></div>';
  if(clientesBoleto.length===0) return header + '<div class="card"><div class="card-body"><div class="empty">Nenhum cliente com envio de boleto ativo — marque "Enviamos boleto mensalmente" no cadastro do cliente (aba Clientes).</div></div></div>';
  var enviados = clientesBoleto.filter(function(c){ var b=boletoDoMes(c.id,mk); return b && b.enviado; }).length;
  return header + '<div class="card"><div class="card-head"><h2>'+monthLabel(mk)+'</h2><div class="meta">'+enviados+' de '+clientesBoleto.length+' enviados</div></div>'+
    '<div class="tablewrap"><table class="grid"><thead><tr><th>Cliente</th><th>Vencimento</th><th>Envio planejado</th><th>Status</th><th>Anexos</th><th></th></tr></thead><tbody>'+
    clientesBoleto.map(function(c){
      var venc = vencimentoDoMes(mk, c.boleto_dia_vencimento);
      var b = boletoDoMes(c.id, mk);
      var enviado = !!(b && b.enviado);
      var envioPlanejado = (b && b.data_envio_planejada) || sugerirDataEnvio(venc);
      var atrasado = !enviado && envioPlanejado && envioPlanejado<hoje;
      var alerta = clienteTeveAlteracaoNoMes(c.id, mk);
      return '<tr class="rowlink" data-abrir-boleto-linha="'+c.id+'" style="cursor:pointer;">'+
        '<td>'+escapeHtml(clienteLabel(c))+(alerta? ' <span class="tag">alteração no mês</span>' : '')+'</td>'+
        '<td>'+(venc? fmtDateISO(venc) : '<span class="muted">defina o dia no cadastro</span>')+'</td>'+
        '<td>'+(envioPlanejado? (atrasado? '<span class="pill pill-bad">'+fmtDateISO(envioPlanejado)+'</span>' : fmtDateISO(envioPlanejado)) : '—')+'</td>'+
        '<td>'+(enviado? '<span class="pill pill-ok">enviado'+(b.enviado_em? ' em '+fmtDateISO(b.enviado_em):'')+'</span>' : '<span class="pill pill-warn">pendente</span>')+(b&&b.conferido? ' <span class="pill pill-ok">conferido</span>' : '')+'</td>'+
        '<td>'+(b&&b.boleto_arquivo_path?'📎':'—')+' '+(b&&b.demonstrativo_arquivo_path?'📎':'—')+'</td>'+
        '<td><button class="linklike" data-boleto-historico="'+c.id+'">histórico</button></td>'+
        '</tr>';
    }).join("")+
    '</tbody></table></div></div>';
}
function openBoletoHistoricoModal(cliente){
  var rows = state.boletos_clientes.filter(function(b){ return b.cliente_id===cliente.id; })
    .sort(function(a,b){ return (b.mes_referencia||"")<(a.mes_referencia||"")?-1:1; });
  var mesAtual = todayMonthKey();
  var meses = rows.map(function(b){ return b.mes_referencia; });
  if(meses.indexOf(mesAtual)===-1) meses = [mesAtual].concat(meses);
  var body = '<fieldset><legend>Histórico de boletos'+(cliente.boleto_dia_vencimento? ' — vencimento todo dia '+cliente.boleto_dia_vencimento : '')+'</legend>'+
    '<div class="tablewrap"><table class="grid"><thead><tr><th>Mês</th><th>Vencimento</th><th>Status</th><th>Anexos</th><th></th></tr></thead><tbody>'+
    meses.map(function(mk){
      var b = rows.filter(function(x){ return x.mes_referencia===mk; })[0] || {};
      var venc = b.data_vencimento || vencimentoDoMes(mk, cliente.boleto_dia_vencimento);
      return '<tr>'+
        '<td>'+monthLabel(mk)+'</td>'+
        '<td>'+(venc? fmtDateISO(venc) : '—')+'</td>'+
        '<td>'+(b.enviado? '<span class="pill pill-ok">enviado</span>' : '<span class="pill pill-warn">pendente</span>')+(b.conferido? ' <span class="pill pill-ok">conferido</span>' : '')+'</td>'+
        '<td>'+(b.boleto_arquivo_path?'📎':'—')+' '+(b.demonstrativo_arquivo_path?'📎':'—')+'</td>'+
        '<td><button class="linklike" data-abrir-boleto-mes="'+mk+'">abrir</button></td>'+
        '</tr>';
    }).join("")+
    '</tbody></table></div></fieldset>';
  openModal("Histórico de boletos — "+clienteLabel(cliente), body, function(closeFn){ closeFn(); }, "Fechar");
  Array.prototype.forEach.call(document.querySelectorAll("[data-abrir-boleto-mes]"), function(btn){
    btn.onclick = function(){ openBoletoModal(cliente, btn.getAttribute("data-abrir-boleto-mes")); };
  });
}
function openBoletoModal(cliente, mk){
  var b = boletoDoMes(cliente.id, mk) || {};
  var venc = b.data_vencimento || vencimentoDoMes(mk, cliente.boleto_dia_vencimento);
  var sugestao = sugerirDataEnvio(venc);
  var valorEsperado = valorEsperadoCliente(cliente);
  var alerta = clienteTeveAlteracaoNoMes(cliente.id, mk);
  var body =
    '<div class="field row2"><div class="field"><label>Mês de referência</label><input value="'+monthLabel(mk)+'" disabled></div><div class="field"><label>Vencimento</label><input value="'+(venc? fmtDateISO(venc) : "—")+'" disabled></div></div>'+
    '<div class="field"><label>Data planejada de envio (segunda ou sexta)</label><input type="date" id="bm-envio" value="'+(b.data_envio_planejada||sugestao||"")+'"></div>'+
    (alerta? '<div class="helpbox">⚠️ Teve inclusão/exclusão de beneficiário registrada neste mês — confira o valor com atenção.</div>' : '')+
    '<div class="field row2">'+
      '<div class="field"><label>Valor esperado (cadastro do cliente)</label><input value="'+moneyDisplay(valorEsperado)+'" disabled></div>'+
      moneyFieldHtml("bm-valor-boleto", b.valor_boleto, "Valor do boleto baixado (R$)")+
    '</div>'+
    '<div id="bm-conferencia" style="margin:-6px 0 10px;">'+conferenciaBadgeHtml(valorEsperado, b.valor_boleto)+'</div>'+
    '<fieldset><legend>Anexos (baixados do site da operadora)</legend>'+
      '<div class="field"><label>Boleto (PDF)</label>'+arquivoFieldHtml("bm-boleto", b.boleto_arquivo_path)+'</div>'+
      '<div class="field"><label>Demonstrativo analítico (PDF)</label>'+arquivoFieldHtml("bm-demonstrativo", b.demonstrativo_arquivo_path)+'</div>'+
    '</fieldset>'+
    '<label class="rowflex" style="font-weight:400;"><input type="checkbox" id="bm-conferido" '+(b.conferido?"checked":"")+'> Conferi o valor e está tudo certo</label>'+
    '<label class="rowflex" style="font-weight:400;margin-top:6px;"><input type="checkbox" id="bm-enviado" '+(b.enviado?"checked":"")+'> Já enviei este boleto pro cliente no WhatsApp</label>';

  openModal("Boleto — "+monthLabel(mk)+" · "+clienteLabel(cliente), body, function(closeFn){ closeFn(); }, "Fechar");

  var valorBoletoEl = document.getElementById("bm-valor-boleto");
  if(valorBoletoEl){
    valorBoletoEl.addEventListener("input", function(){
      var v = valorBoletoEl.value===""? null : parseMoneyBR(valorBoletoEl.value);
      document.getElementById("bm-conferencia").innerHTML = conferenciaBadgeHtml(valorEsperado, v);
    });
    valorBoletoEl.addEventListener("blur", function(){
      var v = valorBoletoEl.value===""? null : parseMoneyBR(valorBoletoEl.value);
      salvarCampoBoleto(cliente, mk, {valor_boleto:v});
    });
  }
  var envioEl = document.getElementById("bm-envio");
  if(envioEl) envioEl.addEventListener("change", function(){ salvarCampoBoleto(cliente, mk, {data_envio_planejada: envioEl.value||null}); });
  var conferidoEl = document.getElementById("bm-conferido");
  if(conferidoEl) conferidoEl.addEventListener("change", function(){ salvarCampoBoleto(cliente, mk, {conferido: conferidoEl.checked}); });
  var enviadoEl = document.getElementById("bm-enviado");
  if(enviadoEl) enviadoEl.addEventListener("change", function(){ salvarCampoBoleto(cliente, mk, {enviado: enviadoEl.checked, enviado_em: enviadoEl.checked? new Date().toISOString() : null}); });
  var boletoFileEl = document.getElementById("bm-boleto-file");
  if(boletoFileEl) boletoFileEl.addEventListener("change", function(){ if(boletoFileEl.files[0]) uploadBoletoAnexo(cliente, mk, "boleto", boletoFileEl.files[0]); });
  var demoFileEl = document.getElementById("bm-demonstrativo-file");
  if(demoFileEl) demoFileEl.addEventListener("change", function(){ if(demoFileEl.files[0]) uploadBoletoAnexo(cliente, mk, "demonstrativo", demoFileEl.files[0]); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-baixar-anexo]"), function(btn){
    btn.onclick = function(){ baixarBoletoAnexo(btn.getAttribute("data-baixar-anexo")); };
  });
}

/* ================= FINANCEIRO (acesso restrito: só Henrique e Kelly) =================
   Comissionamento recebido por cliente (com anexo do demonstrativo) e baixa de cliente.
   Reaproveita o bucket de storage próprio "financeiro" e a tabela comissoes_recebidas. */
/* Comissionamento (empresarial): até 3 parcelas cheias (100% cada, então "300%" do valor do
   contrato) + 2% vitalício a partir da 4ª parcela em diante — mas na prática cada contrato
   pode variar (às vezes só vêm 2 parcelas cheias, nem todo contrato tem vitalício, e o %
   pode não ser sempre 2), por isso tudo isso fica manual, lançamento por lançamento. */
var PARCELAS_COMISSAO = ["Parcela 1","Parcela 2","Parcela 3","Vitalício"];
function totalComissoesCliente(clienteId){
  return state.comissoes_recebidas.filter(function(c){ return c.cliente_id===clienteId; }).reduce(function(s,c){ return s+(c.valor||0); },0);
}
function comissaoLiquida(bruto){ return bruto * (1-(state.params.taxa_imposto||0)); }
function resumoComissoesCliente(clienteId){
  var rows = state.comissoes_recebidas.filter(function(c){ return c.cliente_id===clienteId; });
  var vitalicio = rows.filter(function(r){ return r.parcela==="Vitalício"; });
  var parcelas = rows.filter(function(r){ return r.parcela!=="Vitalício"; });
  var brutoParcelas = parcelas.reduce(function(s,r){ return s+(r.valor||0); },0);
  var brutoVitalicio = vitalicio.reduce(function(s,r){ return s+(r.valor||0); },0);
  return {
    brutoParcelas: brutoParcelas, liquidoParcelas: comissaoLiquida(brutoParcelas),
    brutoVitalicio: brutoVitalicio, liquidoVitalicio: comissaoLiquida(brutoVitalicio),
    brutoTotal: brutoParcelas+brutoVitalicio, liquidoTotal: comissaoLiquida(brutoParcelas+brutoVitalicio)
  };
}
async function uploadFinanceiroArquivo(clienteId, tipo, file){
  var ext = (file.name.split(".").pop()||"pdf").toLowerCase();
  var path = clienteId+"/"+tipo+"-"+Date.now()+"."+ext;
  var up = await sb.storage.from("financeiro").upload(path, file, {upsert:true});
  if(up.error){ toast("Erro ao enviar arquivo: "+up.error.message); return null; }
  return path;
}
async function baixarFinanceiroArquivo(path){
  var r = await sb.storage.from("financeiro").createSignedUrl(path, 3600);
  if(r.error || !r.data){ toast("Erro ao gerar link do arquivo."); return; }
  window.open(r.data.signedUrl, "_blank");
}
function viewFinanceiro(){
  var clientes = state.clientes.slice().sort(function(a,b){ return clienteLabel(a).localeCompare(clienteLabel(b)); });
  var header = '<div class="topbar"><div><h1>Financeiro</h1><div class="desc">Acesso restrito (Henrique e Kelly) · comissionamento recebido, demonstrativos e baixa de cliente</div></div></div>';
  if(!clientes.length) return header + '<div class="card"><div class="card-body"><div class="empty">Nenhum cliente cadastrado ainda.</div></div></div>';
  return header + '<div class="card"><div class="tablewrap"><table class="grid"><thead><tr><th>Cliente</th><th class="num">Valor contrato</th><th class="num">Comissão recebida</th><th>Status</th><th></th></tr></thead><tbody>'+
    clientes.map(function(c){
      var total = totalComissoesCliente(c.id);
      return '<tr>'+
        '<td>'+escapeHtml(clienteLabel(c))+'</td>'+
        '<td class="num">'+fmtMoney(c.valor_contrato_total)+'</td>'+
        '<td class="num">'+fmtMoney(total)+'</td>'+
        '<td>'+(c.baixado_financeiro? '<span class="pill pill-ok">baixado'+(c.baixado_financeiro_em? ' em '+fmtDateISO(c.baixado_financeiro_em):'')+'</span>' : '<span class="pill pill-warn">em aberto</span>')+'</td>'+
        '<td><button class="linklike" data-abrir-financeiro-cliente="'+c.id+'">abrir</button></td>'+
      '</tr>';
    }).join("")+
    '</tbody></table></div></div>';
}
function openFinanceiroModal(cliente){
  var comissoes = state.comissoes_recebidas.filter(function(c){ return c.cliente_id===cliente.id; })
    .sort(function(a,b){ return (b.data_recebimento||"")<(a.data_recebimento||"")?-1:1; });
  var resumo = resumoComissoesCliente(cliente.id);
  var esperado300 = (cliente.valor_contrato_total||0)*3;
  var vitalicioPct = cliente.comissao_vitalicio_pct!=null ? cliente.comissao_vitalicio_pct : 2;
  var taxaImposto = state.params.taxa_imposto||0;
  var body =
    '<div class="kv-list" style="margin-bottom:12px;">'+
      '<div class="kv-row"><span class="k">Valor do contrato</span><span>'+fmtMoney(cliente.valor_contrato_total)+'</span></div>'+
      '<div class="kv-row"><span class="k">Comissão esperada (3 parcelas · 300%)</span><span>'+fmtMoney(esperado300)+'</span></div>'+
    '</div>'+
    '<label class="rowflex" style="font-weight:400;margin-bottom:12px;"><input type="checkbox" id="fin-baixado" '+(cliente.baixado_financeiro?"checked":"")+'> Cliente baixado (encerrado financeiramente)</label>'+
    '<fieldset><legend>Comissionamento deste contrato</legend>'+
      '<div class="field row2">'+
        '<div class="field"><label>Tem vitalício?</label><select id="fin-vitalicio-sn"><option value="nao"'+(!cliente.comissao_vitalicio?' selected':'')+'>Não</option><option value="sim"'+(cliente.comissao_vitalicio?' selected':'')+'>Sim</option></select></div>'+
        '<div class="field" id="fin-vitalicio-pct-wrap" style="'+(cliente.comissao_vitalicio?'':'display:none;')+'"><label>% vitalício</label><input type="number" step="0.1" id="fin-vitalicio-pct" value="'+vitalicioPct+'"></div>'+
      '</div>'+
    '</fieldset>'+
    '<fieldset style="margin-top:12px;"><legend>Lançar comissionamento recebido</legend>'+
      '<div class="field row3"><div class="field"><label>Parcela</label><select id="fin-parcela">'+PARCELAS_COMISSAO.map(function(p){ return '<option'+(p==="Vitalício"&&!cliente.comissao_vitalicio?' disabled':'')+'>'+p+'</option>'; }).join("")+'</select></div>'+moneyFieldHtml("fin-valor", null, "Valor recebido (R$)")+'<div class="field"><label>Data de recebimento</label><input type="date" id="fin-data" value="'+todayISO()+'"></div></div>'+
      '<div class="field row2"><div class="field"><label>Mês de referência</label><input id="fin-mes" placeholder="ex: 2026-09"></div><div class="field"><label>Observações</label><input id="fin-obs"></div></div>'+
      '<div class="field"><label>Demonstrativo (opcional)</label><input type="file" id="fin-arquivo" accept="application/pdf,image/*"></div>'+
      '<button type="button" class="btn btn-primary" id="fin-add" style="margin-top:6px;">+ lançar</button>'+
    '</fieldset>'+
    '<fieldset style="margin-top:12px;"><legend>Resumo (líquido já descontando '+fmtPct(taxaImposto)+' de imposto)</legend>'+
      '<div class="kv-list">'+
        '<div class="kv-row"><span class="k">Recebido em parcelas</span><span>'+fmtMoney(resumo.brutoParcelas)+' <span class="muted">→ líquido '+fmtMoney(resumo.liquidoParcelas)+'</span></span></div>'+
        '<div class="kv-row"><span class="k">Recebido em vitalício</span><span>'+fmtMoney(resumo.brutoVitalicio)+' <span class="muted">→ líquido '+fmtMoney(resumo.liquidoVitalicio)+'</span></span></div>'+
        '<div class="kv-row"><span class="k">Total recebido</span><span><b>'+fmtMoney(resumo.brutoTotal)+'</b> <span class="muted">→ líquido <b>'+fmtMoney(resumo.liquidoTotal)+'</b></span></span></div>'+
        '<div class="kv-row"><span class="k">% do esperado (300%) já recebido</span><span>'+(esperado300>0? fmtPct(resumo.brutoParcelas/esperado300) : '—')+'</span></div>'+
      '</div>'+
    '</fieldset>'+
    '<fieldset style="margin-top:12px;"><legend>Histórico</legend>'+
      (comissoes.length? comissoes.map(function(c){
        return '<div class="activity-item" style="margin-top:6px;">'+
          '<div><b>'+fmtMoney(c.valor)+'</b>'+(c.parcela? ' · '+escapeHtml(c.parcela):'')+(c.mes_referencia? ' · '+monthLabel(c.mes_referencia):'')+'</div>'+
          '<div class="meta">'+(c.data_recebimento? fmtDateISO(c.data_recebimento):"—")+(c.observacoes? ' · '+escapeHtml(c.observacoes):'')+(c.arquivo_path? ' · <button class="linklike" data-baixar-financeiro="'+escapeHtml(c.arquivo_path)+'">baixar demonstrativo</button>':'')+'</div>'+
        '</div>';
      }).join("") : '<div class="empty">Nenhum lançamento ainda.</div>')+
    '</fieldset>';
  openModal("Financeiro — "+clienteLabel(cliente), body, function(closeFn){ closeFn(); }, "Fechar");

  var baixadoEl = document.getElementById("fin-baixado");
  if(baixadoEl) baixadoEl.onchange = function(){
    dbUpdate("clientes", cliente.id, {baixado_financeiro: baixadoEl.checked, baixado_financeiro_em: baixadoEl.checked? new Date().toISOString() : null});
  };
  var vitalicioSnEl = document.getElementById("fin-vitalicio-sn");
  var vitalicioPctWrap = document.getElementById("fin-vitalicio-pct-wrap");
  if(vitalicioSnEl) vitalicioSnEl.onchange = function(){
    vitalicioPctWrap.style.display = vitalicioSnEl.value==="sim" ? "" : "none";
    dbUpdate("clientes", cliente.id, {comissao_vitalicio: vitalicioSnEl.value==="sim"}).then(function(){ openFinanceiroModal(cliente); });
  };
  var vitalicioPctEl = document.getElementById("fin-vitalicio-pct");
  if(vitalicioPctEl) vitalicioPctEl.addEventListener("blur", function(){
    var pct = parseFloat(vitalicioPctEl.value)||0;
    dbUpdate("clientes", cliente.id, {comissao_vitalicio_pct: pct});
  });
  var addBtn = document.getElementById("fin-add");
  if(addBtn) addBtn.onclick = async function(){
    var valor = parseMoneyBR(document.getElementById("fin-valor").value);
    if(!valor){ toast("Informe o valor recebido."); return; }
    var fileEl = document.getElementById("fin-arquivo");
    var arquivoPath = null;
    if(fileEl.files[0]) arquivoPath = await uploadFinanceiroArquivo(cliente.id, "demonstrativo", fileEl.files[0]);
    await dbInsert("comissoes_recebidas", {
      cliente_id: cliente.id, valor: valor,
      parcela: document.getElementById("fin-parcela").value,
      data_recebimento: document.getElementById("fin-data").value || null,
      mes_referencia: document.getElementById("fin-mes").value.trim() || null,
      observacoes: document.getElementById("fin-obs").value.trim(),
      arquivo_path: arquivoPath
    });
    openFinanceiroModal(cliente);
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-baixar-financeiro]"), function(btn){
    btn.onclick = function(){ baixarFinanceiroArquivo(btn.getAttribute("data-baixar-financeiro")); };
  });
  wireMoneyInputs(document.getElementById("modal-body"));
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

/* ================= CLIENTES: tabela de preços & histórico de reajustes ================= */
  /* Cada cliente/empresa tem sua própria tabela negociada (categoria x faixa
     etária ANS), por ano de vigência — clientes diferentes podem ter
        categorias diferentes mesmo na mesma operadora/plano. O reajuste anual
           aplica um índice percentual sobre os valores vigentes e gera uma nova
              tabela (ano seguinte) + um registro no histórico, preservando as tabelas
                 anteriores intactas. A faixa etária de cada beneficiário nunca é
                    guardada separadamente — é sempre calculada a partir da data de
                       nascimento, o que permite reconstruir todo o histórico (reajustes +
                          mudanças de faixa) a qualquer momento. */
  
  function tabelasDoCliente(clienteId){
      var cli = state.clientes.filter(function(c){ return c.id===clienteId; })[0];
      var leadId = cli && cli.lead_id;
      return state.tabelas_precos_cliente.filter(function(t){ return t.cliente_id===clienteId || (leadId && !t.cliente_id && t.lead_id===leadId); })
        .sort(function(a,b){ return b.ano_vigencia-a.ano_vigencia; });
  }
  function tabelaAtualDoCliente(clienteId){
      var ts = tabelasDoCliente(clienteId);
      return ts.length ? ts[0] : null;
  }
  function reajustesDoCliente(clienteId){
      return state.historico_reajustes.filter(function(r){ return r.cliente_id===clienteId; })
        .sort(function(a,b){ return (b.data_reajuste||"")<(a.data_reajuste||"")?-1:1; });
  }
  function categoriasDaTabela(tabela){
      return tabela && tabela.tabela ? Object.keys(tabela.tabela) : [];
  }
  function valorNaTabela(tabela, categoria, faixaLabel){
      if(!tabela || !tabela.tabela || !categoria || !tabela.tabela[categoria]) return null;
      var v = tabela.tabela[categoria][faixaLabel];
      return (v===undefined||v===null||v==="") ? null : parseFloat(v);
  }
  /* Titular + dependentes de um cliente, no formato usado pela grade de preços. */
  function beneficiariosDoCliente(cliente){
      var list = [{ nome: clienteLabel(cliente), data_nascimento: cliente.data_nascimento, categoria_contratada: cliente.categoria_contratada, tipo:"Titular" }];
      depsOf(cliente.id).forEach(function(d){
            list.push({ nome:d.nome, data_nascimento:d.data_nascimento, categoria_contratada:d.categoria_contratada, tipo:d.tipo||"Dependente", dep:d });
      });
      return list;
  }
  function categoriaOptionsHtml(selId, categorias, selected){
      return '<select id="'+selId+'"><option value="">—</option>'+categorias.map(function(cat){
            return '<option value="'+escapeHtml(cat)+'"'+(selected===cat?' selected':'')+'>'+escapeHtml(cat)+'</option>';
      }).join("")+'</select>';
  }
  /* Grade (tabela) de uma tabelas_precos_cliente: categorias nas colunas, faixas ANS nas linhas. */
  function tabelaGridHtml(tabela){
      var categorias = categoriasDaTabela(tabela);
      if(!categorias.length) return '<div class="empty">Nenhuma categoria cadastrada nesta tabela ainda.</div>';
      return '<div class="tablewrap"><table class="grid"><thead><tr><th>Faixa etária</th>'+
            categorias.map(function(c){ return '<th class="num">'+escapeHtml(c)+'</th>'; }).join("")+
            '</tr></thead><tbody>'+
            ANS_BANDS.map(function(b){
                    return '<tr><td>'+b.label+'</td>'+categorias.map(function(c){
                              var v = valorNaTabela(tabela, c, b.label);
                              return '<td class="num">'+(v==null?'—':fmtMoney(v))+'</td>';
                    }).join("")+'</tr>';
            }).join("")+
            '</tbody></table></div>';
  }
  /* Formulário para adicionar uma nova categoria (coluna) à tabela de um ano
     — ou criar a tabela do ano, se ainda não existir. */
  function novaCategoriaFormHtml(tabelaAtual){
      var ano = tabelaAtual ? tabelaAtual.ano_vigencia : new Date().getFullYear();
      return '<fieldset><legend>Adicionar uma categoria manualmente</legend>'+
            '<div class="field row3">'+
              '<div class="field"><label>Ano de vigência</label><input type="number" id="ntc-ano" value="'+ano+'"></div>'+
              '<div class="field"><label>Operadora</label><select id="ntc-operadora">'+OPERADORAS.map(function(o){return '<option'+(tabelaAtual&&tabelaAtual.operadora===o?' selected':'')+'>'+o+'</option>';}).join("")+'</select></div>'+
              '<div class="field"><label>Nome da categoria</label><input id="ntc-categoria" placeholder="ex: Enfermaria, Quarto, Apartamento…"></div>'+
            '</div>'+
            '<div class="field">'+
              '<label>Valores por faixa etária (R$)</label>'+
              '<div class="tablewrap"><table class="grid"><thead><tr>'+ANS_BANDS.map(function(b){return '<th>'+b.label+'</th>';}).join("")+'</tr></thead><tbody><tr>'+
                ANS_BANDS.map(function(b){ return '<td><input type="number" step="0.01" min="0" class="ntc-faixa" data-faixa="'+escapeHtml(b.label)+'" style="width:90px;"></td>'; }).join("")+
              '</tr></tbody></table></div>'+
            '</div>'+
            '<div class="rowflex"><button type="button" class="btn btn-primary" id="btn-salvar-categoria">Salvar categoria</button></div>'+
          '</fieldset>';
  }
  /* Formulário de registro de reajuste anual — só o índice percentual, que o
     sistema aplica sobre a tabela vigente, gerando a tabela do ano seguinte. */
  function reajusteFormHtml(tabelaAtual){
      var proximoAno = tabelaAtual ? tabelaAtual.ano_vigencia+1 : new Date().getFullYear();
      return '<fieldset><legend>Registrar reajuste anual</legend>'+
            (tabelaAtual ? '' : '<div class="empty">Cadastre ao menos uma categoria antes de registrar um reajuste.</div>')+
            '<div class="field row3">'+
              '<div class="field"><label>Índice de reajuste (%)</label><input type="number" step="0.01" id="rj-indice" placeholder="ex: 12,5"'+(tabelaAtual?'':' disabled')+'></div>'+
              '<div class="field"><label>Data do reajuste</label><input type="date" id="rj-data" value="'+todayISO()+'"'+(tabelaAtual?'':' disabled')+'></div>'+
              '<div class="field"><label>Nova tabela terá vigência</label><input value="'+proximoAno+'" disabled></div>'+
            '</div>'+
            '<div class="field"><label>Observações (opcional)</label><input id="rj-obs" placeholder="ex: reajuste anual conforme cláusula contratual"'+(tabelaAtual?'':' disabled')+'></div>'+
            '<div class="rowflex"><button type="button" class="btn btn-primary" id="btn-aplicar-reajuste-cliente"'+(tabelaAtual?'':' disabled')+'>Aplicar reajuste e gerar tabela '+proximoAno+'</button></div>'+
          '</fieldset>';
  }

  /* ===== Colar a tabela inteira da cotação (todas as categorias de uma vez) ===== */
  var FAIXA_RE = /\b(0|19|24|29|34|39|44|49|54)\s*(?:a|à|-|–|até)\s*(18|23|28|33|38|43|48|53|58)\b(?:\s*anos)?|\b59\s*(?:anos)?\s*(?:ou\s*\+|\+|ou\s*mais|em\s*diante)/gi;
  function faixaLabelPorIdadeInicial(n){
      for(var i=0;i<ANS_BANDS.length;i++){ if(n<=ANS_BANDS[i].max) return ANS_BANDS[i].label; }
      return ANS_BANDS[ANS_BANDS.length-1].label;
  }
  function numeroBR(tok){
      tok = String(tok).replace(/R\$|\s/g,"");
      if(!/\d/.test(tok)) return null;
      if(/,\d{1,2}$/.test(tok)) tok = tok.replace(/\./g,"").replace(",",".");
      else if(/^\d{1,3}(\.\d{3})+$/.test(tok)) tok = tok.replace(/\./g,"");
      var v = parseFloat(tok);
      return isNaN(v) ? null : v;
  }
  function lerTabelaColada(texto){
      texto = String(texto||"").replace(/ /g," ");
      var marcas = [], m;
      FAIXA_RE.lastIndex = 0;
      while((m = FAIXA_RE.exec(texto))){ marcas.push({ini:m.index, fim:m.index+m[0].length, idade: m[1]!==undefined ? parseInt(m[1],10) : 59}); }
      if(!marcas.length) return {erro:"Não encontrei as faixas etárias (0 a 18, 19 a 23… 59 ou +). Copie a tabela inteira, incluindo a coluna das idades."};
      var linhas = {};
      marcas.forEach(function(mk, i){
          var trecho = texto.slice(mk.fim, i+1<marcas.length ? marcas[i+1].ini : texto.length);
          var nums = (trecho.match(/R?\$?\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?/g) || []).map(numeroBR).filter(function(v){ return v!==null; });
          linhas[faixaLabelPorIdadeInicial(mk.idade)] = nums;
      });
      var tamanhos = {}; Object.keys(linhas).forEach(function(k){ var n=linhas[k].length; tamanhos[n]=(tamanhos[n]||0)+1; });
      var n = parseInt(Object.keys(tamanhos).sort(function(a,b){ return tamanhos[b]-tamanhos[a]; })[0],10);
      if(!n) return {erro:"Encontrei as faixas, mas nenhum valor em reais ao lado delas."};
      /* nomes das colunas: tenta ler o cabeçalho (antes da 1ª faixa) */
      var cab = texto.slice(0, marcas[0].ini);
      var linhasCab = cab.split(/\r?\n/).map(function(x){ return x.trim(); }).filter(Boolean);
      var nomes = null;
      var comTab = linhasCab.map(function(l){ return l.split(/\t+/).map(function(x){return x.trim();}).filter(Boolean); }).map(function(a){ return a.length===n+1 ? a.slice(1) : a; }).filter(function(a){ return a.length===n; });
      if(comTab.length){ nomes = comTab[0].map(function(_,i){ return comTab.map(function(r){ return r[i]; }).join(" "); }); }
      else if(linhasCab.length>=n){
          var ult = linhasCab.slice(-n);
          var ult2 = linhasCab.slice(-2*n);
          var acomod = /^(enf|enfermaria|quarto|apto|apartamento)$/i;
          if(linhasCab.length>=2*n && ult2.filter(function(x,i){ return i%2===1 && acomod.test(x); }).length===n){
              nomes = []; for(var i=0;i<2*n;i+=2) nomes.push(ult2[i]+" "+ult2[i+1]);
          } else nomes = ult;
      }
      if(!nomes){ nomes = []; for(var j=0;j<n;j++) nomes.push("Categoria "+(j+1)); }
      var titulo = linhasCab.length && !comTab.length && linhasCab.length<n ? linhasCab.join(" · ") : (linhasCab.length>n*2 ? linhasCab.slice(0, linhasCab.length-(nomes.length*(linhasCab.length>=2*n?2:1))).join(" · ") : "");
      return {colunas:n, nomes:nomes, linhas:linhas, titulo:titulo};
  }
  function colarTabelaFormHtml(tabelaAtual){
      var ano = tabelaAtual ? tabelaAtual.ano_vigencia : new Date().getFullYear();
      return '<fieldset class="op-colar-tabela"><legend>Cadastrar a tabela comercializada (colar)</legend>'+
            '<div class="muted" style="font-size:13px;margin-bottom:10px;">Copie a tabela inteira da cotação (todas as categorias e faixas, como foi vendida) e cole abaixo. O sistema separa as categorias sozinho — você confere os nomes antes de salvar.</div>'+
            '<div class="field row3">'+
              '<div class="field"><label>Ano de vigência</label><input type="number" id="ct-ano" value="'+ano+'"></div>'+
              '<div class="field"><label>Operadora</label><select id="ct-operadora">'+OPERADORAS.map(function(o){return '<option'+(tabelaAtual&&tabelaAtual.operadora===o?' selected':'')+'>'+o+'</option>';}).join("")+'</select></div>'+
              '<div class="field"><label>Descrição da tabela</label><input id="ct-desc" value="'+escapeHtml(tabelaAtual&&tabelaAtual.observacoes||"")+'" placeholder="ex: Linha Amil · 2 a 2 vidas · Coparticipação parcial · MEI"></div>'+
            '</div>'+
            '<div class="field"><label>Cole a tabela aqui</label><textarea id="ct-texto" style="min-height:140px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;" placeholder="0 a 18   177,10   214,37   237,95 …&#10;19 a 23   240,50   291,11 …&#10;…&#10;59 ou +   1.060,31 …"></textarea></div>'+
            '<div class="rowflex"><button type="button" class="btn" id="btn-ler-tabela">Ler tabela</button></div>'+
            '<div id="ct-preview"></div>'+
          '</fieldset>';
  }
  function previewTabelaColadaHtml(lida){
      if(lida.erro) return '<div class="helpbox" style="margin-top:12px;">'+escapeHtml(lida.erro)+'</div>';
      var faltam = ANS_BANDS.filter(function(b){ return !lida.linhas[b.label]; }).map(function(b){ return b.label; });
      return '<div style="margin-top:14px;">'+
        '<div class="muted" style="font-size:12.5px;margin-bottom:8px;">'+lida.colunas+' categoria(s) encontradas'+(faltam.length? ' · faltando: '+faltam.join(", ") : ' · 10 faixas completas')+'. Ajuste os nomes das categorias se precisar (ex.: “Bronze SP Enf”).</div>'+
        '<div class="tablewrap"><table class="grid"><thead><tr><th>Faixa etária</th>'+
          lida.nomes.map(function(nm,i){ return '<th><input class="ct-nome" data-col="'+i+'" value="'+escapeHtml(nm)+'" style="min-width:120px;height:32px;font-size:12.5px;"></th>'; }).join("")+
        '</tr></thead><tbody>'+
          ANS_BANDS.map(function(b){
            var row = lida.linhas[b.label]||[];
            return '<tr><td>'+b.label+'</td>'+lida.nomes.map(function(_,i){ return '<td class="num">'+(row[i]==null?'—':fmtMoney(row[i]))+'</td>'; }).join("")+'</tr>';
          }).join("")+
        '</tbody></table></div>'+
        '<div class="rowflex" style="margin-top:10px;"><button type="button" class="btn btn-primary btn-seta" id="btn-salvar-tabela-colada">Salvar '+lida.colunas+' categorias na tabela do cliente</button></div>'+
      '</div>';
  }

  /* ===== Simulador de upgrade: quanto ficaria em cada categoria da tabela do contrato ===== */
  function simulacaoUpgrade(cliente, tabela){
      var benefs = beneficiariosDoCliente(cliente).map(function(b){ var f = computeFaixa(b.data_nascimento); return {nome:b.nome, tipo:b.tipo, faixa: f? f.label : null, categoria: b.categoria_contratada}; });
      var comFaixa = benefs.filter(function(b){ return b.faixa; });
      var atual = 0, atualOk = comFaixa.length>0;
      comFaixa.forEach(function(b){ var v = b.categoria? valorNaTabela(tabela, b.categoria, b.faixa) : null; if(v==null) atualOk=false; else atual+=v; });
      var cats = categoriasDaTabela(tabela).map(function(cat){
          var total=0, ok=true;
          comFaixa.forEach(function(b){ var v = valorNaTabela(tabela, cat, b.faixa); if(v==null) ok=false; else total+=v; });
          return {categoria:cat, total:total, completo:ok};
      }).sort(function(a,b){ return a.total-b.total; });
      return {benefs:benefs, semFaixa: benefs.length-comFaixa.length, atual: atualOk? atual : null, categorias:cats, catTitular: cliente.categoria_contratada||null};
  }
  function upgradeHtml(cliente, tabela){
      if(!tabela || !categoriasDaTabela(tabela).length) return '';
      var sim = simulacaoUpgrade(cliente, tabela);
      if(sim.benefs.length===sim.semFaixa) return '<fieldset><legend>Simular upgrade</legend><div class="empty">Cadastre a data de nascimento do titular e dos dependentes para simular os valores em outras categorias.</div></fieldset>';
      return '<fieldset class="op-upgrade"><legend>Simular upgrade — tabela do contrato '+tabela.ano_vigencia+'</legend>'+
        '<div class="muted" style="font-size:13px;margin-bottom:10px;">Valores pela tabela que foi comercializada para este cliente (já com os reajustes registrados), somando titular e dependentes pelas faixas etárias de hoje'+(sim.semFaixa? ' · '+sim.semFaixa+' beneficiário(s) sem data de nascimento ficaram de fora' : '')+'.</div>'+
        '<div class="tablewrap"><table class="grid"><thead><tr><th>Categoria</th><th class="num">Mensalidade total</th><th class="num">Diferença por mês</th><th class="num">Diferença</th></tr></thead><tbody>'+
          sim.categorias.map(function(c){
            var ehAtual = sim.catTitular===c.categoria;
            var dif = (sim.atual!=null) ? c.total - sim.atual : null;
            var pct = (sim.atual) ? (dif/sim.atual*100) : null;
            return '<tr'+(ehAtual?' class="op-linha-atual"':'')+'><td>'+escapeHtml(c.categoria)+(ehAtual?' <span class="pill pill-vital">Atual</span>':'')+(c.completo?'':' <span class="muted" style="font-size:12px;">(faixa sem valor)</span>')+'</td>'+
              '<td class="num"><b>'+fmtMoney(c.total)+'</b></td>'+
              '<td class="num">'+(dif==null||ehAtual? '—' : (dif>0?'+ ':dif<0?'− ':'')+fmtMoney(Math.abs(dif)))+'</td>'+
              '<td class="num">'+(pct==null||ehAtual? '—' : (pct>0?'+':'')+pct.toFixed(1).replace(".",",")+'%')+'</td></tr>';
          }).join("")+
        '</tbody></table></div>'+
        '<div class="rowflex" style="margin-top:10px;"><button type="button" class="btn btn-concierge" id="btn-copiar-upgrade">Copiar simulação para o WhatsApp</button></div>'+
      '</fieldset>';
  }
  function textoUpgrade(cliente, tabela){
      var sim = simulacaoUpgrade(cliente, tabela);
      var nome = (clienteLabel(cliente)||"").split(" ")[0];
      var linhas = ["Olá, "+nome+"! Fiz a simulação de upgrade do seu plano pela tabela do seu contrato ("+(tabela.operadora||"")+" · vigência "+tabela.ano_vigencia+"), já somando todas as vidas:",""];
      if(sim.atual!=null && sim.catTitular) linhas.push("• Hoje — "+sim.catTitular+": "+fmtMoney(sim.atual)+"/mês");
      sim.categorias.forEach(function(c){
        if(c.categoria===sim.catTitular) return;
        if(sim.atual!=null && c.total<=sim.atual) return;
        var dif = sim.atual!=null ? " (+"+fmtMoney(c.total-sim.atual)+")" : "";
        linhas.push("• "+c.categoria+": "+fmtMoney(c.total)+"/mês"+dif);
      });
      linhas.push("","Quer que eu te explique as diferenças de rede e cobertura de cada opção? — One Plus");
      return linhas.join("\n");
  }

  function historicoModalBodyHtml(cliente){
      var tabelas = tabelasDoCliente(cliente.id);
      var atual = tabelas[0] || null;
      var benefs = beneficiariosDoCliente(cliente);
      var categorias = categoriasDaTabela(atual);
      return '<div id="histmodal-wrap">'+
            '<fieldset><legend>Beneficiários — categoria contratada</legend>'+
            '<div class="tablewrap"><table class="grid"><thead><tr><th>Beneficiário</th><th>Faixa etária atual</th><th>Categoria contratada</th><th class="num">Valor atual</th></tr></thead><tbody>'+
            benefs.map(function(b,i){
                    var faixa = computeFaixa(b.data_nascimento);
                    var v = (atual && b.categoria_contratada && faixa) ? valorNaTabela(atual, b.categoria_contratada, faixa.label) : null;
                    return '<tr>'+
                              '<td>'+escapeHtml(b.nome)+' <span class="muted">('+escapeHtml(b.tipo)+')</span></td>'+
                              '<td>'+(faixa? faixa.label : '—')+'</td>'+
                              '<td>'+categoriaOptionsHtml('hb-cat-'+i, categorias, b.categoria_contratada)+'</td>'+
                              '<td class="num">'+(v==null?'—':fmtMoney(v))+'</td>'+
                            '</tr>';
            }).join("")+
            '</tbody></table></div>'+
            '<div class="rowflex" style="margin-top:8px;"><button type="button" class="btn btn-ghost" id="btn-salvar-categorias-benef">Salvar categorias dos beneficiários</button></div>'+
            '</fieldset>'+
            upgradeHtml(cliente, atual)+
            '<fieldset><legend>Tabela comercializada'+(atual? ' — vigência '+atual.ano_vigencia+(atual.operadora?' · '+escapeHtml(atual.operadora):'') : '')+'</legend>'+
            (atual && atual.observacoes? '<div class="muted" style="font-size:13px;margin-bottom:8px;">'+escapeHtml(atual.observacoes)+'</div>' : '')+
            tabelaGridHtml(atual)+
            '</fieldset>'+
            colarTabelaFormHtml(atual)+
            novaCategoriaFormHtml(atual)+
            reajusteFormHtml(atual)+
            '<fieldset><legend>Histórico</legend>'+
            (function(){
                    var reaj = reajustesDoCliente(cliente.id);
                    if(!reaj.length && tabelas.length<=1) return '<div class="empty">Ainda sem histórico de reajustes.</div>';
                    var rows = "";
                    tabelas.slice().reverse().forEach(function(t){
                              rows += '<tr><td>'+t.ano_vigencia+'</td><td>Tabela cadastrada'+(t.operadora?' — '+escapeHtml(t.operadora):'')+'</td><td>'+escapeHtml(t.observacoes||"—")+'</td></tr>';
                    });
                    reaj.slice().reverse().forEach(function(r){
                              rows += '<tr><td>'+fmtDateISO(r.data_reajuste)+'</td><td>Reajuste de '+r.indice_percentual+'%'+((r.valor_total_antes&&r.valor_total_depois)? ' ('+fmtMoney(r.valor_total_antes)+' → '+fmtMoney(r.valor_total_depois)+')':'')+'</td><td>'+escapeHtml(r.observacoes||"—")+'</td></tr>';
                    });
                    return '<div class="tablewrap"><table class="grid"><thead><tr><th>Quando</th><th>Evento</th><th>Observações</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
            })()+
            '</fieldset>'+
          '</div>';
  }
  function openCarenciasModal(cliente){
      var rows = calcularCarencias(cliente.vigencia_inicio, cliente.carencia_modelo_id, cliente.carencia_categoria);
      var modelo = state.carencia_modelos.filter(function(m){ return m.id===cliente.carencia_modelo_id; })[0];
      var info = modelo ?
        ('<div class="muted" style="font-size:12px;margin-bottom:8px;">Modelo: <b>'+escapeHtml(modelo.nome)+'</b> · Faixa: <b>'+escapeHtml(cliente.carencia_categoria||"—")+'</b> · Vigência início: '+fmtDateISO(cliente.vigencia_inicio)+'</div>')
        : '<div class="empty">Este cliente ainda não tem modelo de carência configurado — edite o cadastro para escolher um modelo e uma faixa.</div>';
      openModal("Carências — "+clienteLabel(cliente), info + carenciasTableHtml(rows), function(closeFn){ closeFn(); }, "Fechar");
  }
  function openHistoricoModal(cliente){
      var close = openModal("Tabela do contrato & upgrade — "+clienteLabel(cliente), historicoModalBodyHtml(cliente), function(closeFn){ closeFn(); }, "Fechar");
      var mEl = document.querySelector(".modal"); if(mEl) mEl.style.maxWidth = "min(1180px, 96vw)";
      wireHistoricoModal(cliente, close);
  }
  function refreshHistoricoModalBody(cliente, closeFn){
      var body = document.getElementById("modal-body");
      if(!body) return;
      body.innerHTML = historicoModalBodyHtml(cliente);
      wireMoneyInputs(body);
      wireHistoricoModal(cliente, closeFn);
  }
  function wireHistoricoModal(cliente, closeFn){
      var lida = null;
      var btnLer = document.getElementById("btn-ler-tabela");
      if(btnLer){
            btnLer.onclick = function(){
                    lida = lerTabelaColada(document.getElementById("ct-texto").value);
                    var prev = document.getElementById("ct-preview");
                    prev.innerHTML = previewTabelaColadaHtml(lida);
                    if(lida.titulo && !document.getElementById("ct-desc").value) document.getElementById("ct-desc").value = lida.titulo;
                    var txtLow = document.getElementById("ct-texto").value.toLowerCase();
                    var opSel = document.getElementById("ct-operadora");
                    var achou = OPERADORAS.filter(function(o){ return o!=="Outros" && txtLow.indexOf(o.toLowerCase())>=0; })[0];
                    if(achou && opSel) opSel.value = achou;
                    var bt = document.getElementById("btn-salvar-tabela-colada");
                    if(bt) bt.onclick = async function(){
                              var ano = parseInt(document.getElementById("ct-ano").value,10) || new Date().getFullYear();
                              var operadora = document.getElementById("ct-operadora").value;
                              var desc = document.getElementById("ct-desc").value.trim();
                              var nomes = Array.prototype.map.call(document.querySelectorAll(".ct-nome"), function(i){ return i.value.trim(); });
                              if(nomes.some(function(n){ return !n; })){ toast("Dê um nome para cada categoria."); return; }
                              if(new Set(nomes).size!==nomes.length){ toast("Há categorias com o mesmo nome — ajuste para ficarem diferentes."); return; }
                              var novas = {};
                              nomes.forEach(function(nm, i){
                                    novas[nm] = {};
                                    ANS_BANDS.forEach(function(b){ var row = lida.linhas[b.label]; if(row && row[i]!=null) novas[nm][b.label] = row[i]; });
                              });
                              var existente = tabelasDoCliente(cliente.id).filter(function(t){ return t.ano_vigencia===ano; })[0];
                              var r;
                              if(existente){
                                    var merged = {}; Object.keys(existente.tabela||{}).forEach(function(k){ merged[k]=existente.tabela[k]; });
                                    Object.keys(novas).forEach(function(k){ merged[k]=novas[k]; });
                                    r = await sb.from("tabelas_precos_cliente").update({tabela:merged, operadora:operadora, observacoes: desc||existente.observacoes||null, cliente_id: cliente.id}).eq("id", existente.id);
                              } else {
                                    r = await sb.from("tabelas_precos_cliente").insert({cliente_id:cliente.id, ano_vigencia:ano, operadora:operadora, tabela:novas, observacoes: desc||null, criado_por:currentUser()});
                              }
                              if(r.error){ console.error(r.error); toast("Erro ao salvar a tabela: "+r.error.message); return; }
                              toast("Tabela "+ano+" salva com "+nomes.length+" categorias.");
                              await reload("tabelas_precos_cliente");
                              var fresh = state.clientes.filter(function(c){return c.id===cliente.id;})[0] || cliente;
                              refreshHistoricoModalBody(fresh, closeFn);
                    };
            };
      }
      var btnCopiar = document.getElementById("btn-copiar-upgrade");
      if(btnCopiar){
            btnCopiar.onclick = function(){
                    var t = textoUpgrade(cliente, tabelaAtualDoCliente(cliente.id));
                    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){ toast("Simulação copiada — é só colar no WhatsApp."); }, function(){ window.prompt("Copie o texto:", t); });
            };
      }
      var btnSalvarCat = document.getElementById("btn-salvar-categoria");
      if(btnSalvarCat){
            btnSalvarCat.onclick = async function(){
                    var ano = parseInt(document.getElementById("ntc-ano").value,10) || new Date().getFullYear();
                    var operadora = document.getElementById("ntc-operadora").value;
                    var categoria = document.getElementById("ntc-categoria").value.trim();
                    if(!categoria){ toast("Informe o nome da categoria."); return; }
                    var faixaInputs = document.querySelectorAll(".ntc-faixa");
                    var valores = {};
                    var algumPreenchido = false;
                    Array.prototype.forEach.call(faixaInputs, function(inp){
                              var v = parseFloat(inp.value);
                              if(!isNaN(v)){ valores[inp.getAttribute("data-faixa")] = v; algumPreenchido = true; }
                    });
                    if(!algumPreenchido){ toast("Informe ao menos um valor de faixa etária."); return; }
                    var existente = tabelasDoCliente(cliente.id).filter(function(t){ return t.ano_vigencia===ano; })[0];
                    var r;
                    if(existente){
                              var novaTabela = {};
                              Object.keys(existente.tabela||{}).forEach(function(k){ novaTabela[k] = existente.tabela[k]; });
                              novaTabela[categoria] = valores;
                              r = await sb.from("tabelas_precos_cliente").update({tabela:novaTabela, operadora:operadora}).eq("id", existente.id);
                    } else {
                              var obj = {}; obj[categoria] = valores;
                              r = await sb.from("tabelas_precos_cliente").insert({cliente_id:cliente.id, ano_vigencia:ano, operadora:operadora, tabela:obj, criado_por:currentUser()});
                    }
                    if(r.error){ console.error(r.error); toast("Erro ao salvar categoria: "+r.error.message); return; }
                    toast("Categoria \"" + categoria + "\" salva na tabela "+ano+".");
                    await reload("tabelas_precos_cliente");
                    var freshCliente = state.clientes.filter(function(c){return c.id===cliente.id;})[0] || cliente;
                    refreshHistoricoModalBody(freshCliente, closeFn);
            };
      }
      var btnSalvarBenef = document.getElementById("btn-salvar-categorias-benef");
      if(btnSalvarBenef){
            btnSalvarBenef.onclick = async function(){
                    var benefs = beneficiariosDoCliente(cliente);
                    var changedCliente = false;
                    for(var i=0;i<benefs.length;i++){
                              var sel = document.getElementById("hb-cat-"+i);
                              if(!sel) continue;
                              var val = sel.value || null;
                              if(benefs[i].tipo==="Titular"){
                                          if(val !== (cliente.categoria_contratada||null)){ await sb.from("clientes").update({categoria_contratada:val}).eq("id",cliente.id); changedCliente=true; }
                              } else if(benefs[i].dep){
                                          if(val !== (benefs[i].dep.categoria_contratada||null)){ await sb.from("dependentes").update({categoria_contratada:val}).eq("id",benefs[i].dep.id); }
                              }
                    }
                    toast("Categorias dos beneficiários atualizadas.");
                    await reload("dependentes");
                    if(changedCliente) await reload("clientes");
                    var freshCliente = state.clientes.filter(function(c){return c.id===cliente.id;})[0] || cliente;
                    refreshHistoricoModalBody(freshCliente, closeFn);
            };
      }
      var btnReajuste = document.getElementById("btn-aplicar-reajuste-cliente");
      if(btnReajuste){
            btnReajuste.onclick = async function(){
                    var atual = tabelaAtualDoCliente(cliente.id);
                    if(!atual){ toast("Cadastre uma categoria antes de aplicar o reajuste."); return; }
                    var pct = parseFloat(document.getElementById("rj-indice").value);
                    if(!pct){ toast("Informe o índice percentual do reajuste."); return; }
                    var data = document.getElementById("rj-data").value || todayISO();
                    var obs = document.getElementById("rj-obs").value.trim();
                    var novoAno = atual.ano_vigencia+1;
                    var jaExiste = tabelasDoCliente(cliente.id).filter(function(t){ return t.ano_vigencia===novoAno; })[0];
                    if(jaExiste){ toast("Já existe uma tabela cadastrada para "+novoAno+"."); return; }
                    var novaTabela = {};
                    Object.keys(atual.tabela||{}).forEach(function(cat){
                              novaTabela[cat] = {};
                              Object.keys(atual.tabela[cat]).forEach(function(faixa){
                                          var v = parseFloat(atual.tabela[cat][faixa]) || 0;
                                          novaTabela[cat][faixa] = Math.round(v*(1+pct/100)*100)/100;
                              });
                    });
                    var totalAntes = null, totalDepois = null, faixaTitular = computeFaixa(cliente.data_nascimento);
                    if(cliente.categoria_contratada && faixaTitular && atual.tabela[cliente.categoria_contratada]){
                              totalAntes = parseFloat(atual.tabela[cliente.categoria_contratada][faixaTitular.label])||0;
                              totalDepois = (novaTabela[cliente.categoria_contratada]||{})[faixaTitular.label]||0;
                    }
                    var r1 = await sb.from("tabelas_precos_cliente").insert({cliente_id:cliente.id, ano_vigencia:novoAno, operadora:atual.operadora, tabela:novaTabela, observacoes:obs, criado_por:currentUser()}).select();
                    if(r1.error){ console.error(r1.error); toast("Erro ao salvar nova tabela: "+r1.error.message); return; }
                    var novaTabelaRow = r1.data[0];
                    var r2 = await sb.from("historico_reajustes").insert({
                              cliente_id:cliente.id, data_reajuste:data, indice_percentual:pct,
                              tabela_anterior_id:atual.id, tabela_nova_id:novaTabelaRow.id,
                              valor_total_antes: totalAntes, valor_total_depois: totalDepois,
                              observacoes: obs, criado_por: currentUser()
                    });
                    if(r2.error){ console.error(r2.error); toast("Erro ao registrar histórico: "+r2.error.message); return; }
                    toast("Reajuste de "+pct+"% aplicado — tabela "+novoAno+" criada.");
                    await reload("tabelas_precos_cliente");
                    await reload("historico_reajustes");
                    var freshCliente = state.clientes.filter(function(c){return c.id===cliente.id;})[0] || cliente;
                    refreshHistoricoModalBody(freshCliente, closeFn);
            };
      }
  }
  
  /* ================= FUNIL ================= */
function tarefasDoLead(leadId){
  return state.tarefas.filter(function(t){ return t.lead_id===leadId; })
    .sort(function(a,b){ return (a.vencimento_em||"")<(b.vencimento_em||"")?-1:1; });
}
function tarefasAbertasDoLead(leadId){
  return tarefasDoLead(leadId).filter(function(t){ return t.status!=="Concluída"; });
}
function notasDoLead(leadId){
  return state.lead_notas.filter(function(n){ return n.lead_id===leadId; })
    .sort(function(a,b){ return (a.criado_em||"")<(b.criado_em||"")?1:-1; });
}
/* Data da última "coisa que aconteceu" no negócio: mudança de etapa, atividade criada/
   concluída ou nota — usada pro selo de negócio parado (estilo "rotten deal" do Pipedrive). */
function ultimaMovimentacaoLead(l){
  var datas = [l.etapa_atualizada_em, l.criado_em];
  tarefasDoLead(l.id).forEach(function(t){ datas.push(t.concluido_em || t.criado_em); });
  notasDoLead(l.id).forEach(function(n){ datas.push(n.criado_em); });
  datas = datas.filter(Boolean);
  return datas.length ? datas.reduce(function(a,b){ return a>b?a:b; }) : null;
}
function diasParado(l){
  var ult = ultimaMovimentacaoLead(l);
  if(!ult) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(ult).getTime())/86400000));
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
  var partes = [escapeHtml(l.operadora)];
  if(l.categoria_plano) partes.push(escapeHtml(l.categoria_plano));
  if(l.quantidade_vidas) partes.push(l.quantidade_vidas+" vida"+(l.quantidade_vidas==1?"":"s"));
  return '<span class="tag">'+partes.join(" · ")+'</span>';
}
async function setLeadEtapa(leadId, novaEtapa, motivoPerda){
  var lead = state.leads.filter(function(l){ return l.id===leadId; })[0];
  var patch = {etapa: novaEtapa, etapa_atualizada_em: new Date().toISOString()};
  if(novaEtapa==="Ganho" && lead && !lead.data_ganho){ patch.data_ganho = todayISO(); }
  if(novaEtapa==="Perdido" && motivoPerda){ patch.motivo_perda = motivoPerda; }
  var ok = await dbUpdate("leads", leadId, patch);
  if(ok && novaEtapa==="Ganho"){ await ensureImplantacao(leadId); }
  return ok;
}
/* Ponto único usado pelo drag-and-drop, pelo select de etapa e pelo stepper do painel de
   detalhes: se o destino é "Perdido", pede o motivo antes de gravar (estilo Pipedrive).
   onCancel (opcional) é chamado se o usuário desistir — usado pra "desfazer" a troca visual
   do <select>, já que ele muda de valor sozinho antes do JS rodar. onDone (opcional) roda
   depois que a etapa foi salva com sucesso (usado pra atualizar o painel de detalhes). */
function requestEtapaChange(leadId, novaEtapa, onCancel, onDone){
  var lead = state.leads.filter(function(l){ return l.id===leadId; })[0];
  if(!lead) return;
  if(novaEtapa==="Perdido" && lead.etapa!=="Perdido"){
    openMotivoPerdaModal(lead, function(motivo){
      setLeadEtapa(leadId, novaEtapa, motivo).then(function(){ if(onDone) onDone(); });
    }, onCancel);
  } else {
    setLeadEtapa(leadId, novaEtapa).then(function(){ if(onDone) onDone(); });
  }
}
function openMotivoPerdaModal(lead, onConfirm, onCancel){
  var body = '<div class="field"><label>Motivo da perda</label><select id="mp-motivo">'+
      MOTIVOS_PERDA.map(function(m){ return '<option>'+m+'</option>'; }).join("")+
    '</select></div>'+
    '<div class="field" id="mp-outro-wrap" style="display:none;"><label>Qual motivo?</label><input id="mp-outro"></div>';
  openModal("Motivo da perda — "+(lead.nome||lead.empresa||"negócio"), body, function(closeFn){
    var sel = document.getElementById("mp-motivo").value;
    var outroEl = document.getElementById("mp-outro");
    var motivo = sel==="Outro" ? (outroEl? outroEl.value.trim() : "") : sel;
    closeFn();
    onConfirm(motivo);
  }, "Marcar como perdido");
  var sel = document.getElementById("mp-motivo");
  var wrap = document.getElementById("mp-outro-wrap");
  if(sel && wrap){ sel.addEventListener("change", function(){ wrap.style.display = sel.value==="Outro" ? "" : "none"; }); }
  if(onCancel){
    var closeBtn = document.getElementById("modal-close");
    var cancelBtn = document.getElementById("modal-cancel");
    var backdrop = document.getElementById("modal-backdrop");
    if(closeBtn) closeBtn.addEventListener("click", onCancel);
    if(cancelBtn) cancelBtn.addEventListener("click", onCancel);
    if(backdrop) backdrop.addEventListener("click", function(e){ if(e.target.id==="modal-backdrop") onCancel(); });
  }
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
/* Histórico de vendas mês a mês — não some quando o mês vira: lê direto de state.leads
   (negócios "Ganho" nunca são apagados, só saem do Kanban) e de state.metas_mensais,
   então os últimos 12 meses ficam sempre visíveis, mesmo depois que o mês atual mudar.
   Fica recolhido por padrão (só o título + botão) pra não ocupar a tela toda do Funil —
   o botão "ver histórico"/"ocultar" alterna historicoVendasAberto e manda re-renderizar. */
var historicoVendasAberto = false;
function historicoVendasTableHtml(mesAtual){
  var toggleBtn = '<button class="btn btn-ghost" id="btn-toggle-historico-vendas" type="button">'+(historicoVendasAberto? 'Ocultar' : 'Ver histórico')+'</button>';
  var head = '<div class="card-head"><h2>Histórico de vendas por mês</h2>'+
    '<div class="meta">'+(historicoVendasAberto? 'clique num mês para ver os negócios ganhos' : 'últimos 12 meses — vendido, meta e diferença')+'</div>'+
    toggleBtn+
  '</div>';
  if(!historicoVendasAberto){ return '<div class="card">'+head+'</div>'; }
  var meses=[]; for(var i=0;i<12;i++){ meses.push(monthKeyAdd(mesAtual,-i)); }
  return '<div class="card">'+head+
    '<div class="card-body tablewrap"><table class="grid"><thead><tr><th>Mês</th><th class="num">Vendido</th><th class="num">Meta</th><th class="num">Diferença</th><th class="num">Negócios ganhos</th></tr></thead><tbody>'+
    meses.map(function(mk){
      var vendido = vendasValorDoMes(mk);
      var meta = metaValorDoMes(mk);
      var qtd = vendasQtdDoMes(mk);
      var diff = vendido-meta;
      var semDado = vendido===0 && meta===0;
      return '<tr class="rowlink" data-ver-historico-mes="'+mk+'" style="cursor:pointer;'+(semDado?'opacity:.55;':'')+'">'+
        '<td>'+monthLabel(mk)+(mk===mesAtual?' <span class="tag">atual</span>':'')+'</td>'+
        '<td class="num">'+fmtMoney(vendido)+'</td>'+
        '<td class="num">'+(meta? fmtMoney(meta) : '—')+'</td>'+
        '<td class="num" style="color:'+(meta? (diff>=0?'var(--success)':'var(--danger)') : 'inherit')+'">'+(meta? fmtMoney(diff) : '—')+'</td>'+
        '<td class="num">'+qtd+'</td>'+
      '</tr>';
    }).join("")+
    '</tbody></table></div></div>';
}
function openHistoricoMesModal(mk){
  var leads = leadsGanhosDoMes(mk).slice().sort(function(a,b){ return (a.data_ganho||"")<(b.data_ganho||"")?1:-1; });
  var vendido = vendasValorDoMes(mk);
  var meta = metaValorDoMes(mk);
  var diff = vendido-meta;
  var resumo = '<div class="rowflex" style="justify-content:space-between;margin-bottom:12px;font-size:13px;">'+
    '<span><b>'+fmtMoney(vendido)+'</b> vendido · '+leads.length+' negócio(s)</span>'+
    (meta? '<span class="muted">Meta: '+fmtMoney(meta)+' — '+(diff>=0? 'superada em '+fmtMoney(diff) : 'faltaram '+fmtMoney(-diff)+' para bater')+'</span>' : '<span class="muted">Meta não definida para este mês</span>')+
  '</div>';
  var body = resumo+(leads.length?
    '<div class="tablewrap"><table class="grid"><thead><tr><th>Nome/Empresa</th><th>Produto</th><th>Vendedor(a)</th><th>Operadora</th><th class="num">Valor</th><th>Ganho em</th></tr></thead><tbody>'+
    leads.map(function(l){
      return '<tr><td>'+escapeHtml(l.nome||"—")+(l.empresa?' <span class="muted">('+escapeHtml(l.empresa)+')</span>':'')+'</td>'+
        '<td>'+escapeHtml(l.produto||"—")+'</td>'+
        '<td>'+escapeHtml(l.vendedor||"—")+'</td>'+
        '<td>'+escapeHtml(l.operadora||"—")+'</td>'+
        '<td class="num">'+fmtMoney(l.valor_estimado)+'</td>'+
        '<td>'+fmtDateISO(l.data_ganho)+'</td>'+
      '</tr>';
    }).join("")+
    '</tbody></table></div>' :
    '<div class="empty">Nenhum negócio ganho neste mês.</div>');
  openModal("Vendas — "+monthLabel(mk), body, function(closeFn){ closeFn(); }, "Fechar");
}
var funilView = "kanban"; // "kanban" ou "lista"
var funilFiltro = {busca:"", vendedor:"", produto:"", atrasados:false};
function leadsFiltrados(){
  var agoraISO = new Date().toISOString();
  return state.leads.filter(function(l){
    if(funilFiltro.vendedor && l.vendedor!==funilFiltro.vendedor) return false;
    if(funilFiltro.produto && l.produto!==funilFiltro.produto) return false;
    if(funilFiltro.busca){
      var alvo = ((l.nome||"")+" "+(l.empresa||"")).toLowerCase();
      if(alvo.indexOf(funilFiltro.busca.toLowerCase())===-1) return false;
    }
    if(funilFiltro.atrasados){
      var temAtraso = tarefasAbertasDoLead(l.id).some(function(t){ return t.vencimento_em && t.vencimento_em<agoraISO; });
      if(!temAtraso) return false;
    }
    return true;
  });
}
function funilFilterBarHtml(){
  return '<div class="funil-filterbar">'+
    '<div class="field grow"><label>Buscar</label><input id="ff-busca" placeholder="Nome ou empresa" value="'+escapeHtml(funilFiltro.busca)+'"></div>'+
    '<div class="field"><label>Vendedor(a)</label><select id="ff-vendedor"><option value="">Todos</option>'+VENDEDORES.map(function(v){return '<option'+(funilFiltro.vendedor===v?' selected':'')+'>'+v+'</option>';}).join("")+'</select></div>'+
    '<div class="field"><label>Produto</label><select id="ff-produto"><option value="">Todos</option>'+PRODUTOS.map(function(p){return '<option'+(funilFiltro.produto===p?' selected':'')+'>'+p+'</option>';}).join("")+'</select></div>'+
    '<label class="rowflex" style="font-weight:400;font-size:12.5px;padding-bottom:9px;white-space:nowrap;"><input type="checkbox" id="ff-atrasados" '+(funilFiltro.atrasados?'checked':'')+'> só c/ atividade atrasada</label>'+
    '<div class="viewtoggle"><button id="ff-view-kanban" class="'+(funilView==="kanban"?"active":"")+'" type="button">Kanban</button><button id="ff-view-lista" class="'+(funilView==="lista"?"active":"")+'" type="button">Lista</button></div>'+
  '</div>';
}
function kanbanCardAtividadesHtml(l, agoraISO){
  var abertas = tarefasAbertasDoLead(l.id);
  if(!abertas.length) return "";
  return '<div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;">'+
    abertas.map(function(t){
      var overdue = t.vencimento_em && t.vencimento_em < agoraISO;
      return '<span class="pill '+(overdue?'pill-bad':'pill-warn')+'" style="justify-content:space-between;"><span class="k-activity-icon">'+(ATIVIDADE_ICON[t.canal]||"•")+'</span> '+escapeHtml(t.titulo)+' — '+fmtDateTime(t.vencimento_em)+' <button class="linklike" data-concluir-tarefa-lead="'+t.id+'" style="margin-left:6px;">concluir</button></span>';
    }).join("")+
  '</div>';
}
function viewFunil(){
  var leadsBase = leadsFiltrados();
  var byEtapa={}; ETAPAS.forEach(function(e){byEtapa[e]=[];});
  leadsBase.forEach(function(l){ (byEtapa[l.etapa]||(byEtapa[l.etapa]=[])).push(l); });

  var agoraISO = new Date().toISOString();
  var tarefasAtrasadas = state.tarefas.filter(function(t){ return t.lead_id && t.status!=="Concluída" && t.vencimento_em && t.vencimento_em < agoraISO; })
    .sort(function(a,b){ return a.vencimento_em<b.vencimento_em?-1:1; });

  var mesAtual = todayMonthKey();
  var vendasQtdMes = vendasQtdDoMes(mesAtual);
  var metaQtd = state.params.meta_vendas_mensal||0;
  var faltamQtd = Math.max(metaQtd - vendasQtdMes, 0);

  var header = '<div class="topbar"><div><h1>Funil Comercial</h1><div class="desc">'+leadsBase.length+' de '+state.leads.length+' oportunidade(s) · arraste o cartão (ou clique nele) · negócios ganhos seguem na aba Implantação</div></div><div class="rowflex">'+(podeVerRelatorios()? '<button class="btn btn-ghost" id="btn-relatorios">📊 Relatórios</button>' : '')+'<button class="btn btn-primary" id="btn-novo-lead">+ Nova oportunidade</button></div></div>';

  var abertosFiltrados = leadsBase.filter(function(l){ return l.etapa!=="Ganho" && l.etapa!=="Perdido"; });
  var valorAberto = abertosFiltrados.reduce(function(s,l){ return s+(l.valor_estimado||0); },0);

  var pipeTiles = '<div class="tiles">'+
    tile("Negócios ganhos — "+monthLabel(mesAtual), vendasQtdMes, metaQtd? (faltamQtd>0? "Faltam "+faltamQtd+" para a meta de "+metaQtd : "Meta de "+metaQtd+" atingida! 🎉") : "Defina a meta (quantidade) em Parâmetros")+
    tile("Valor em aberto no funil", fmtMoney(valorAberto), abertosFiltrados.length+" oportunidade(s)")+
    tile("Tarefas do funil atrasadas", tarefasAtrasadas.length, tarefasAtrasadas.length? "Veja a lista abaixo" : "Tudo em dia")+
  '</div>';

  var metaChart = metaChartHtml(mesAtual);
  var historicoVendas = historicoVendasTableHtml(mesAtual);

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

  var filterBar = funilFilterBarHtml();
  var corpo = funilView==="lista" ? viewFunilLista(leadsBase, agoraISO) : viewFunilKanban(byEtapa, agoraISO);

  return header + pipeTiles + metaChart + historicoVendas + atrasoBanner + filterBar + corpo;
}
function viewFunilKanban(byEtapa, agoraISO){
  var ETAPAS_PIPELINE = ETAPAS.filter(function(e){ return e!=="Ganho"; });
  return '<div class="kanban-board">'+ETAPAS_PIPELINE.map(function(etapa){
    var items = byEtapa[etapa]||[];
    var total = items.reduce(function(s,l){return s+(l.valor_estimado||0);},0);
    return '<div class="kanban-col"><div class="kanban-col-head"><h3>'+etapa+'</h3><div class="meta">'+items.length+' · '+fmtMoney(total)+'</div></div>'+
      '<div class="kanban-col-body" data-drop-etapa="'+etapa+'">'+
      (items.length===0? '<div class="empty" style="padding:16px 6px;">Nenhuma oportunidade.</div>' :
      items.map(function(l){
        var parado = diasParado(l);
        return '<div class="kanban-card" draggable="true" data-drag-lead="'+l.id+'" data-open-lead="'+l.id+'">'+
          '<div class="k-title">'+escapeHtml(l.nome||"—")+(l.empresa?' <span class="muted">('+escapeHtml(l.empresa)+')</span>':'')+'</div>'+
          '<div class="muted">'+escapeHtml(l.produto||"—")+' · '+escapeHtml(l.vendedor||"—")+'</div>'+
          '<div class="rowflex" style="margin-top:4px;gap:6px;">'+
            (operadoraTag(l)||'')+
            (parado>LIMITE_DIAS_PARADO? '<span class="badge-stale">🔥 parado '+parado+'d</span>' : '')+
          '</div>'+
          '<div style="margin-top:4px;font-weight:600;">'+fmtMoney(l.valor_estimado)+'</div>'+
          (normalizarIdades(l.idades).length? '<div class="muted op-card-idades">'+normalizarIdades(l.idades).length+' vida(s) · '+normalizarIdades(l.idades).join(", ")+' anos</div>' : '')+
          (anexosDoLead(l.id).length? '<div class="muted op-card-idades">'+anexosDoLead(l.id).length+' documento(s)</div>' : '')+
          kanbanCardAtividadesHtml(l, agoraISO)+
          '<select class="lead-etapa kanban-card-noopen" data-lead="'+l.id+'" style="margin-top:8px;">'+ETAPAS.map(function(e2){return '<option'+(l.etapa===e2?' selected':'')+'>'+e2+'</option>';}).join("")+'</select>'+
          '<div class="rowflex k-actions kanban-card-noopen" style="margin-top:6px;">'+
            '<button class="linklike" data-edit-lead="'+l.id+'">editar</button>'+
            '<button class="linklike" data-agendar-tarefa-lead="'+l.id+'">+ tarefa</button>'+
          '</div>'+
        '</div>';
      }).join(""))+
      '</div></div>';
  }).join("")+'</div>';
}
function viewFunilLista(leads, agoraISO){
  if(!leads.length) return '<div class="card"><div class="card-body"><div class="empty">Nenhuma oportunidade encontrada com esses filtros.</div></div></div>';
  var ordenados = leads.slice().sort(function(a,b){ return (b.valor_estimado||0)-(a.valor_estimado||0); });
  return '<div class="card"><div class="card-body"><div class="tablewrap"><table class="grid"><thead><tr>'+
    '<th>Nome / Empresa</th><th>Produto</th><th>Vendedor(a)</th><th>Etapa</th><th>Valor</th><th>Próxima atividade</th><th>Parado</th>'+
    '</tr></thead><tbody>'+
    ordenados.map(function(l){
      var proximas = tarefasAbertasDoLead(l.id);
      var proxima = proximas[0];
      var parado = diasParado(l);
      return '<tr class="rowlink" data-open-lead="'+l.id+'" style="cursor:pointer;">'+
        '<td>'+escapeHtml(l.nome||"—")+(l.empresa?' <span class="muted">('+escapeHtml(l.empresa)+')</span>':'')+'</td>'+
        '<td>'+escapeHtml(l.produto||"—")+'</td>'+
        '<td>'+escapeHtml(l.vendedor||"—")+'</td>'+
        '<td><span class="tag">'+escapeHtml(l.etapa||"—")+'</span></td>'+
        '<td>'+fmtMoney(l.valor_estimado)+'</td>'+
        '<td>'+(proxima? escapeHtml(proxima.titulo)+' — '+fmtDateTime(proxima.vencimento_em) : '—')+'</td>'+
        '<td>'+(parado>LIMITE_DIAS_PARADO? '<span class="badge-stale">🔥 '+parado+'d</span>' : parado+'d')+'</td>'+
      '</tr>';
    }).join("")+
    '</tbody></table></div></div></div>';
}
function leadTarefaFormHtml(){
  return '<div class="field"><label>O que fazer</label><input id="lt-titulo" placeholder="ex: Ligar para o cliente"></div>'+
  '<div class="field row2"><div class="field"><label>Canal</label><select id="lt-canal">'+CANAIS_TAREFA.map(function(c){return '<option>'+c+'</option>';}).join("")+'</select></div>'+dateTimeFieldHtml("lt-venc", null, "Data e hora")+'</div>'+
  '<div class="field"><label>Observação (opcional)</label><textarea id="lt-desc"></textarea></div>';
}
function openLeadTarefaModal(lead, onSaved){
  openModal("Agendar tarefa — "+(lead.nome||lead.empresa||"lead"), leadTarefaFormHtml(), function(closeFn){
    var titulo = document.getElementById("lt-titulo").value.trim();
    var venc = readDateTime("lt-venc");
    if(!titulo){ toast("Descreva a tarefa."); return; }
    if(!venc){ toast("Escolha a data."); return; }
    var data = {
      tipo: "Tarefa",
      titulo: titulo,
      responsavel: lead.vendedor || currentUser(),
      lead_id: lead.id,
      canal: document.getElementById("lt-canal").value,
      vencimento_em: venc.iso,
      data_vencimento: venc.dateOnly,
      status: "Pendente",
      descricao: document.getElementById("lt-desc").value.trim()
    };
    dbInsert("tarefas", data).then(function(){ if(onSaved) onSaved(); });
    closeFn();
  });
}

/* ===== Idades das vidas (cotação) — campo de "chips", estilo Pipedrive ===== */
function normalizarIdades(v){
  if(!v) return [];
  if(typeof v==="string"){ try{ v = JSON.parse(v); }catch(e){ v = v.split(/[,;\s]+/); } }
  if(!Array.isArray(v)) return [];
  return v.map(function(x){ return parseInt(x,10); }).filter(function(n){ return !isNaN(n) && n>=0 && n<=120; });
}
function faixaDaIdade(idade){
  for(var i=0;i<ANS_BANDS.length;i++){ if(idade<=ANS_BANDS[i].max) return ANS_BANDS[i].label; }
  return null;
}
function resumoFaixas(idades){
  var cont = {};
  idades.forEach(function(i){ var f = faixaDaIdade(i)||"—"; cont[f]=(cont[f]||0)+1; });
  return ANS_BANDS.map(function(b){ return cont[b.label]? b.label+" ("+cont[b.label]+")" : null; }).filter(Boolean).join(" · ");
}
function idadesChipsHtml(idades, removivel){
  return idades.map(function(idade, i){
    return '<span class="op-idade-chip" title="Faixa ANS: '+escapeHtml(faixaDaIdade(idade)||"—")+'">'+idade+' anos'+
      (removivel? '<button type="button" class="op-idade-x" data-rm-idade="'+i+'" aria-label="Remover idade">&times;</button>' : '')+'</span>';
  }).join("");
}
function idadesFieldHtml(valor){
  var idades = normalizarIdades(valor);
  return '<div class="field op-idades-field"><label>Idades das vidas</label>'+
    '<div class="op-idades-box" id="l-idades-box">'+
      '<div class="op-idades-chips" id="l-idades-chips">'+idadesChipsHtml(idades,true)+'</div>'+
      '<div class="op-idades-add"><input id="l-idade-input" type="text" inputmode="numeric" placeholder="Idade (ex: 34) ou várias: 34, 32, 8">'+
      '<button type="button" class="btn btn-sm" id="l-idade-add">+ adicionar</button></div>'+
    '</div>'+
    '<span class="muted op-idades-resumo" id="l-idades-resumo">'+(idades.length? idades.length+' vida(s) · '+resumoFaixas(idades) : 'Adicione uma idade por vida desta cotação — 3, 4, 20 vidas, o que for.')+'</span>'+
    '<input type="hidden" id="l-idades-json" value="'+escapeHtml(JSON.stringify(idades))+'">'+
  '</div>';
}
function wireIdadesField(){
  var box = document.getElementById("l-idades-box"); if(!box) return;
  var hidden = document.getElementById("l-idades-json");
  var input = document.getElementById("l-idade-input");
  var chips = document.getElementById("l-idades-chips");
  var resumo = document.getElementById("l-idades-resumo");
  var vidas = document.getElementById("l-vidas");
  var hint = document.getElementById("l-vidas-hint");
  var idades = normalizarIdades(hidden.value);
  function pintar(){
    hidden.value = JSON.stringify(idades);
    chips.innerHTML = idadesChipsHtml(idades, true);
    resumo.textContent = idades.length? idades.length+" vida(s) · "+resumoFaixas(idades) : "Adicione uma idade por vida desta cotação — 3, 4, 20 vidas, o que for.";
    if(vidas && idades.length){ vidas.value = idades.length; if(hint) hint.textContent = "calculado pelas idades"; }
    else if(hint){ hint.textContent = ""; }
  }
  function adicionar(){
    var novas = normalizarIdades(input.value);
    if(!novas.length){ input.focus(); return; }
    idades = idades.concat(novas); input.value = ""; pintar(); input.focus();
  }
  document.getElementById("l-idade-add").addEventListener("click", adicionar);
  input.addEventListener("keydown", function(e){
    if(e.key==="Enter"||e.key===","){ e.preventDefault(); adicionar(); }
    else if(e.key==="Backspace" && !input.value && idades.length){ idades.pop(); pintar(); }
  });
  chips.addEventListener("click", function(e){
    var b = e.target.closest("[data-rm-idade]"); if(!b) return;
    idades.splice(parseInt(b.getAttribute("data-rm-idade"),10),1); pintar();
  });
  pintar();
}
/* Salva o negócio; se o banco ainda não tiver as colunas novas, salva o resto e avisa. */
var LEAD_CAMPOS_NOVOS = ["email","telefone","idades"];
async function salvarLead(existing, data){
  async function tentar(d){
    if(existing){ return await sb.from("leads").update(d).eq("id", existing.id).select(); }
    d.criado_por = currentUser();
    return await sb.from("leads").insert(d).select();
  }
  var r = await tentar(Object.assign({}, data));
  if(r.error && /column|schema cache/i.test(r.error.message||"") && LEAD_CAMPOS_NOVOS.some(function(c){ return (r.error.message||"").indexOf(c)>=0; })){
    var semNovos = Object.assign({}, data); LEAD_CAMPOS_NOVOS.forEach(function(c){ delete semNovos[c]; });
    r = await tentar(semNovos);
    if(!r.error) toast("Salvo, mas e-mail, telefone e idades precisam da atualização do banco (SQL).");
  } else if(!r.error){ toast(existing? "Atualizado." : "Salvo."); }
  if(r.error){ console.error(r.error); toast("Erro ao salvar: "+r.error.message); return null; }
  await reload("leads");
  return existing ? existing.id : (r.data && r.data[0] && r.data[0].id);
}
function soDigitos(s){ return String(s||"").replace(/\D/g,""); }
function linkWhatsApp(tel){
  var d = soDigitos(tel); if(!d) return null;
  if(d.length<=11) d = "55"+d;
  return "https://wa.me/"+d;
}
/* ===== Documentos do negócio (propostas, cotações) — bucket "leads" ===== */
function anexosDoLead(leadId){ return (state.lead_anexos||[]).filter(function(a){ return a.lead_id===leadId; }); }
function fmtTamanho(b){ if(!b) return ""; if(b<1024) return b+" B"; if(b<1048576) return Math.round(b/1024)+" KB"; return (b/1048576).toFixed(1).replace(".",",")+" MB"; }
async function enviarAnexosLead(leadId, files){
  if(!files || !files.length) return;
  var ok = 0;
  for(var i=0;i<files.length;i++){
    var f = files[i];
    if(f.size > 25*1024*1024){ toast("“"+f.name+"” passa de 25 MB."); continue; }
    var seguro = f.name.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9._-]+/g,"-");
    var path = leadId+"/"+Date.now()+"-"+seguro;
    toast("Enviando "+f.name+"…");
    var up = await sb.storage.from("leads").upload(path, f, {upsert:false, contentType: f.type||undefined});
    if(up.error){ console.error(up.error); toast("Erro ao enviar arquivo: "+up.error.message); continue; }
    var ins = await sb.from("lead_anexos").insert({lead_id: leadId, nome_arquivo: f.name, path: path, tamanho: f.size, tipo: f.type||null, criado_por: currentUser()});
    if(ins.error){ console.error(ins.error); toast("Arquivo enviado, mas não registrado: "+ins.error.message); continue; }
    ok++;
  }
  if(ok){ toast(ok===1? "Documento anexado." : ok+" documentos anexados."); await reload("lead_anexos"); }
}
async function abrirAnexoLead(path){
  var w = window.open("", "_blank");
  var r = await sb.storage.from("leads").createSignedUrl(path, 3600);
  if(r.error || !r.data){ if(w) w.close(); toast("Erro ao gerar link do arquivo."); return; }
  if(w) w.location = r.data.signedUrl; else window.location.href = r.data.signedUrl;
}
async function removerAnexoLead(anexo){
  if(!confirm("Remover o documento “"+anexo.nome_arquivo+"”?")) return false;
  await sb.storage.from("leads").remove([anexo.path]);
  return await dbDelete("lead_anexos", anexo.id);
}

function leadFormHtml(l){
  l=l||{etapa:"Qualificação",produto:"Saúde",vendedor:"Henrique"};
  var operadoraAtual = l.operadora && OPERADORAS.indexOf(l.operadora)===-1 ? "Outros" : (l.operadora||"");
  var operadoraOutrosValor = (l.operadora && OPERADORAS.indexOf(l.operadora)===-1) ? l.operadora : "";
  return '<div class="field row2"><div class="field"><label>Nome do contato</label><input id="l-nome" value="'+escapeHtml(l.nome||"")+'"></div><div class="field"><label>Empresa</label><input id="l-empresa" value="'+escapeHtml(l.empresa||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Telefone / WhatsApp</label><input id="l-telefone" type="tel" inputmode="tel" value="'+escapeHtml(l.telefone||"")+'" placeholder="(11) 99999-9999"></div><div class="field"><label>E-mail</label><input id="l-email" type="email" value="'+escapeHtml(l.email||"")+'" placeholder="nome@empresa.com.br"></div></div>'+
  idadesFieldHtml(l.idades)+
  '<div class="field row2"><div class="field"><label>Produto</label><select id="l-produto">'+PRODUTOS.map(function(p){return '<option'+(l.produto===p?' selected':'')+'>'+p+'</option>';}).join("")+'</select></div><div class="field"><label>Vendedor(a)</label><select id="l-vendedor">'+VENDEDORES.map(function(v){return '<option'+(l.vendedor===v?' selected':'')+'>'+v+'</option>';}).join("")+'</select></div></div>'+
  '<div class="field row2">'+moneyFieldHtml("l-valor", l.valor_estimado, "Valor do negócio (R$)")+'<div class="field"><label>Origem</label><input id="l-origem" value="'+escapeHtml(l.origem||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Quantidade de vidas</label><input type="number" step="1" min="0" id="l-vidas" value="'+(l.quantidade_vidas||"")+'" placeholder="ex: 4"><span class="muted" id="l-vidas-hint" style="font-size:12px;"></span></div>'+
    '<div class="field"><label>Operadora / plano</label><select id="l-operadora">'+
      '<option value="">—</option>'+
      OPERADORAS.map(function(o){ return '<option'+(operadoraAtual===o?' selected':'')+'>'+o+'</option>'; }).join("")+
    '</select></div></div>'+
  '<div class="field" id="l-operadora-outros-wrap" style="'+(operadoraAtual==="Outros"?"":"display:none;")+'"><label>Qual operadora?</label><input id="l-operadora-outros" value="'+escapeHtml(operadoraOutrosValor)+'"></div>'+
  '<div class="field"><label>Categoria do plano</label><input id="l-categoria-plano" value="'+escapeHtml(l.categoria_plano||"")+'" placeholder="ex: Alice Conforto, SulAmérica Clássico Vital, Amil 700..."></div>'+
  '<div class="field"><label>Etapa</label><select id="l-etapa">'+ETAPAS.map(function(e){return '<option'+(l.etapa===e?' selected':'')+'>'+e+'</option>';}).join("")+'</select></div>'+
  '<div class="field" id="l-motivo-perda-wrap" style="'+(l.etapa==="Perdido"?"":"display:none;")+'"><label>Motivo da perda</label><input id="l-motivo-perda" value="'+escapeHtml(l.motivo_perda||"")+'"></div>'+
  '<div class="field"><label>Observações</label><textarea id="l-obs">'+escapeHtml(l.observacoes||"")+'</textarea></div>';
}
function wireLeadFormExtra(){
  wireIdadesField();
  var sel = document.getElementById("l-operadora");
  var wrap = document.getElementById("l-operadora-outros-wrap");
  if(sel && wrap){
    sel.addEventListener("change", function(){ wrap.style.display = sel.value==="Outros" ? "" : "none"; });
  }
  var etapaSel = document.getElementById("l-etapa");
  var motivoWrap = document.getElementById("l-motivo-perda-wrap");
  if(etapaSel && motivoWrap){
    etapaSel.addEventListener("change", function(){ motivoWrap.style.display = etapaSel.value==="Perdido" ? "" : "none"; });
  }
}
function openLeadModal(existing, onSaved, seed){
  openModal(existing?"Editar oportunidade":"Nova oportunidade", leadFormHtml(existing||seed), async function(closeFn){
    var operadoraSel = document.getElementById("l-operadora").value;
    var operadoraOutros = document.getElementById("l-operadora-outros");
    var operadoraFinal = operadoraSel==="Outros" ? (operadoraOutros? operadoraOutros.value.trim() : "") : operadoraSel;
    var novaEtapa = document.getElementById("l-etapa").value;
    var motivoEl = document.getElementById("l-motivo-perda");
    var data = {
      nome: document.getElementById("l-nome").value.trim(),
      empresa: document.getElementById("l-empresa").value.trim(),
      produto: document.getElementById("l-produto").value,
      vendedor: document.getElementById("l-vendedor").value,
      valor_estimado: parseMoneyBR(document.getElementById("l-valor").value),
      quantidade_vidas: parseInt(document.getElementById("l-vidas").value,10)||null,
      telefone: document.getElementById("l-telefone").value.trim() || null,
      email: document.getElementById("l-email").value.trim() || null,
      idades: normalizarIdades(document.getElementById("l-idades-json").value),
      operadora: operadoraFinal,
      categoria_plano: document.getElementById("l-categoria-plano").value.trim(),
      origem: document.getElementById("l-origem").value.trim(),
      etapa: novaEtapa,
      motivo_perda: novaEtapa==="Perdido" ? (motivoEl? motivoEl.value.trim() : "") : null,
      observacoes: document.getElementById("l-obs").value.trim()
    };
    if(!data.nome && !data.empresa){ toast("Informe nome ou empresa."); return; }
    if(!existing && seed && seed.empresa_id) data.empresa_id = seed.empresa_id;
    if(novaEtapa==="Ganho" && !(existing && existing.data_ganho)){ data.data_ganho = todayISO(); }
    if(!existing || existing.etapa!==novaEtapa){ data.etapa_atualizada_em = new Date().toISOString(); }
    if(data.idades.length) data.quantidade_vidas = data.idades.length;
    var leadId = await salvarLead(existing, data);
    if(!leadId) return;
    if(leadId && novaEtapa==="Ganho"){ await ensureImplantacao(leadId); }
    closeFn();
    if(onSaved) onSaved(leadId);
  });
  wireLeadFormExtra();
}
/* ================= PAINEL DE DETALHES DO NEGÓCIO (funil) ================= */

function contatoLeadHtml(lead){
  var tel = lead.telefone, mail = lead.email, wa = linkWhatsApp(tel);
  return '<div class="side-panel-section">'+
    '<h4>Contato</h4>'+
    '<div class="kv-list">'+
      '<div class="kv-row"><span class="k">Telefone</span><span>'+(tel? escapeHtml(tel) : '<span class="muted">—</span>')+'</span></div>'+
      '<div class="kv-row"><span class="k">E-mail</span><span>'+(mail? '<a class="linklike" href="mailto:'+escapeHtml(mail)+'">'+escapeHtml(mail)+'</a>' : '<span class="muted">—</span>')+'</span></div>'+
    '</div>'+
    '<div class="op-contato-acoes">'+
      (wa? '<a class="btn btn-sm btn-concierge" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>' : '')+
      (tel? '<a class="btn btn-sm" href="tel:'+soDigitos(tel)+'">Ligar</a>' : '')+
      (mail? '<a class="btn btn-sm" href="mailto:'+escapeHtml(mail)+'">Enviar e-mail</a>' : '')+
      (!tel && !mail? '<button class="linklike" id="panel-add-contato">+ adicionar telefone e e-mail</button>' : '')+
    '</div>'+
  '</div>';
}
function documentosLeadHtml(leadId){
  var anexos = anexosDoLead(leadId);
  return '<div class="side-panel-section">'+
    '<h4>Documentos</h4>'+
    '<label class="op-upload" id="panel-upload-label"><input type="file" id="panel-upload" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt">'+
      '<span><b>+ anexar documento</b><span class="muted">Proposta, cotação, tabela — PDF, imagem, Word ou Excel (até 25 MB). Pode arrastar o arquivo aqui.</span></span></label>'+
    (anexos.length? '<div class="op-anexos">'+anexos.map(function(a){
      return '<div class="op-anexo">'+
        '<span class="op-anexo-ic">'+escapeHtml(((a.nome_arquivo||"").split(".").pop()||"doc").slice(0,4).toUpperCase())+'</span>'+
        '<span class="op-anexo-info"><button class="linklike" data-abrir-anexo="'+escapeHtml(a.path)+'">'+escapeHtml(a.nome_arquivo)+'</button>'+
        '<span class="meta">'+fmtTamanho(a.tamanho)+' · '+fmtDateTime(a.criado_em)+(a.criado_por? ' · '+escapeHtml(String(a.criado_por).split("@")[0]) : '')+'</span></span>'+
        '<button class="iconbtn" data-rm-anexo="'+a.id+'" title="Remover">&times;</button>'+
      '</div>';
    }).join("")+'</div>' : '<div class="empty" style="padding:14px 6px;">Nenhum documento ainda.</div>')+
  '</div>';
}
function wireDocumentosLead(root, leadId){
  var inp = root.querySelector("#panel-upload");
  var label = root.querySelector("#panel-upload-label");
  if(inp){ inp.addEventListener("change", function(){ var fs = Array.prototype.slice.call(inp.files); enviarAnexosLead(leadId, fs).then(function(){ openLeadDetailPanel(leadId); }); }); }
  if(label){
    label.addEventListener("dragover", function(e){ e.preventDefault(); label.classList.add("arrastando"); });
    label.addEventListener("dragleave", function(){ label.classList.remove("arrastando"); });
    label.addEventListener("drop", function(e){ e.preventDefault(); label.classList.remove("arrastando");
      var fs = Array.prototype.slice.call(e.dataTransfer.files||[]); enviarAnexosLead(leadId, fs).then(function(){ openLeadDetailPanel(leadId); }); });
  }
  Array.prototype.forEach.call(root.querySelectorAll("[data-abrir-anexo]"), function(b){ b.onclick = function(){ abrirAnexoLead(b.getAttribute("data-abrir-anexo")); }; });
  Array.prototype.forEach.call(root.querySelectorAll("[data-rm-anexo]"), function(b){
    b.onclick = function(){
      var a = (state.lead_anexos||[]).filter(function(x){ return x.id===b.getAttribute("data-rm-anexo"); })[0];
      if(a) removerAnexoLead(a).then(function(ok){ if(ok) openLeadDetailPanel(leadId); });
    };
  });
}

function closeLeadDetailPanel(){
  var root = document.getElementById("panel-root");
  if(root) root.innerHTML = "";
}
function openLeadDetailPanel(leadId){
  var lead = state.leads.filter(function(l){ return l.id===leadId; })[0];
  var root = document.getElementById("panel-root");
  if(!root) return;
  if(!lead){ root.innerHTML=""; return; }
  var parado = diasParado(lead);
  var etapasStepper = ETAPAS.filter(function(e){ return e!=="Perdido"; });
  var curIdx = etapasStepper.indexOf(lead.etapa);
  var stepperHtml = etapasStepper.map(function(e,idx){
    var cls = lead.etapa===e ? "current" : (curIdx>=0 && idx<curIdx ? "done" : "");
    return '<div class="stage-step '+cls+'" data-panel-etapa="'+e+'">'+e+'</div>';
  }).join("") + '<div class="stage-step'+(lead.etapa==="Perdido"?" current":"")+'" data-panel-etapa="Perdido" style="flex:0 0 84px;'+(lead.etapa==="Perdido"?"":"background:var(--danger-bg);color:var(--danger);border-color:transparent;")+'">Perdido</div>';

  var atividades = tarefasDoLead(leadId);
  var notas = notasDoLead(leadId);
  var agoraISO = new Date().toISOString();

  var body =
    '<div class="side-panel-head">'+
      '<div class="rowflex"><div><h2>'+escapeHtml(lead.nome||lead.empresa||"—")+'</h2><div class="muted">'+escapeHtml(lead.produto||"—")+' · '+escapeHtml(lead.vendedor||"—")+'</div></div><button class="panel-close" id="panel-close">&times;</button></div>'+
      '<div class="stage-stepper" style="margin-top:12px;">'+stepperHtml+'</div>'+
    '</div>'+
    '<div class="side-panel-body">'+
      contatoLeadHtml(lead)+
      '<div class="side-panel-section">'+
        '<h4>Negócio</h4>'+
        '<div class="kv-list">'+
          '<div class="kv-row"><span class="k">Valor</span><span><b>'+fmtMoney(lead.valor_estimado)+'</b></span></div>'+
          (lead.operadora? '<div class="kv-row"><span class="k">Operadora</span><span>'+escapeHtml(lead.operadora)+'</span></div>' : '')+
          (lead.quantidade_vidas? '<div class="kv-row"><span class="k">Vidas</span><span>'+lead.quantidade_vidas+'</span></div>' : '')+
          (normalizarIdades(lead.idades).length? '<div class="kv-row op-kv-idades"><span class="k">Idades</span><span><span class="op-idades-chips">'+idadesChipsHtml(normalizarIdades(lead.idades),false)+'</span><span class="muted op-idades-resumo">'+resumoFaixas(normalizarIdades(lead.idades))+'</span></span></div>' : '')+
          (lead.origem? '<div class="kv-row"><span class="k">Origem</span><span>'+escapeHtml(lead.origem)+'</span></div>' : '')+
          '<div class="kv-row"><span class="k">Parado há</span><span>'+(parado>0? parado+" dia(s)" : "atualizado hoje")+'</span></div>'+
          (lead.etapa==="Perdido" && lead.motivo_perda? '<div class="kv-row"><span class="k">Motivo da perda</span><span>'+escapeHtml(lead.motivo_perda)+'</span></div>' : '')+
          (lead.observacoes? '<div class="kv-row"><span class="k">Observações</span><span>'+escapeHtml(lead.observacoes)+'</span></div>' : '')+
        '</div>'+
        '<button class="linklike" id="panel-edit-lead" style="margin-top:4px;">editar negócio</button>'+
      '</div>'+
      documentosLeadHtml(leadId)+
      '<div class="side-panel-section">'+
        '<h4>Atividades</h4>'+
        '<button class="linklike" id="panel-add-atividade">+ nova atividade</button>'+
        (atividades.length? atividades.map(function(t){
          var overdue = t.status!=="Concluída" && t.vencimento_em && t.vencimento_em<agoraISO;
          return '<div class="activity-item">'+
            '<div><span class="k-activity-icon">'+(ATIVIDADE_ICON[t.canal]||"•")+'</span> '+escapeHtml(t.titulo)+
            (t.status==="Concluída"? ' <span class="pill pill-ok">concluída</span>' : (overdue? ' <span class="pill pill-bad">atrasada</span>' : ''))+
            '</div>'+
            '<div class="meta">'+escapeHtml(t.canal||"—")+' · '+fmtDateTime(t.vencimento_em)+(t.status!=="Concluída"? ' · <button class="linklike" data-panel-concluir-tarefa="'+t.id+'">concluir</button>' : '')+'</div>'+
          '</div>';
        }).join("") : '<div class="empty">Nenhuma atividade ainda.</div>')+
      '</div>'+
      '<div class="side-panel-section">'+
        '<h4>Notas</h4>'+
        '<textarea id="panel-nota-texto" placeholder="Escreva uma nota sobre este negócio..."></textarea>'+
        '<button class="btn btn-primary" id="panel-add-nota" style="justify-self:start;">Adicionar nota</button>'+
        (notas.length? notas.map(function(n){
          return '<div class="note-item">'+escapeHtml(n.texto)+'<div class="meta">'+escapeHtml(n.autor||"—")+' · '+fmtDateTime(n.criado_em)+'</div></div>';
        }).join("") : '<div class="empty">Nenhuma nota ainda.</div>')+
      '</div>'+
    '</div>';

  root.innerHTML = '<div class="panel-backdrop" id="panel-backdrop"><div class="side-panel">'+body+'</div></div>';
  document.getElementById("panel-close").onclick = closeLeadDetailPanel;
  document.getElementById("panel-backdrop").addEventListener("click", function(e){ if(e.target.id==="panel-backdrop") closeLeadDetailPanel(); });
  document.getElementById("panel-edit-lead").onclick = function(){ openLeadModal(lead, function(id){ openLeadDetailPanel(id||leadId); }); };
  document.getElementById("panel-add-atividade").onclick = function(){ openLeadTarefaModal(lead, function(){ openLeadDetailPanel(leadId); }); };
  var addContato = document.getElementById("panel-add-contato");
  if(addContato) addContato.onclick = function(){ openLeadModal(lead, function(id){ openLeadDetailPanel(id||leadId); }); };
  wireDocumentosLead(root, leadId);
  document.getElementById("panel-add-nota").onclick = function(){
    var txt = document.getElementById("panel-nota-texto").value.trim();
    if(!txt){ toast("Escreva algo antes de salvar a nota."); return; }
    dbInsert("lead_notas", {lead_id: leadId, texto: txt}).then(function(){ openLeadDetailPanel(leadId); });
  };
  Array.prototype.forEach.call(root.querySelectorAll("[data-panel-concluir-tarefa]"), function(btn){
    btn.onclick = function(){ setTarefaStatus(btn.getAttribute("data-panel-concluir-tarefa"), "Concluída").then(function(){ openLeadDetailPanel(leadId); }); };
  });
  Array.prototype.forEach.call(root.querySelectorAll("[data-panel-etapa]"), function(step){
    step.onclick = function(){
      var etapa = step.getAttribute("data-panel-etapa");
      if(etapa===lead.etapa) return;
      requestEtapaChange(leadId, etapa, function(){ openLeadDetailPanel(leadId); }, function(){ openLeadDetailPanel(leadId); });
    };
  });
}

/* ================= EMPRESAS (base migrada do Agendor + novas) =================
   Carrega sob demanda (só ao abrir a aba), porque são milhares de registros. */
var EMP_COLS_EMPRESA = "id,agendor_id,nome,razao_social,cnpj,email,telefone,website,instagram,linkedin,responsavel,categoria,origem,setor,ranking,cep,logradouro,numero,complemento,bairro,cidade,uf,plano_atual,valor_plano_atual,novo_plano,valor_novo_plano,socio_1,socio_2,cnpj_adicional,nome_contato,porte,representante_legal,numero_vidas,beneficiarios,vigencia,coparticipacao,produtos,ultima_atividade,ultima_atividade_em,proxima_atividade,proxima_atividade_em,observacoes,agendor_criado_em,criado_em";
var EMP_COLS_CONTATO = "id,agendor_id,empresa_id,nome,cargo,cpf,email,telefone,aniversario,responsavel,categoria,origem,produtos,observacoes,agendor_criado_em,criado_em";
var EMP_COLS_NEGOCIO = "id,agendor_id,empresa_id,contato_id,empresa_nome,contato_nome,titulo,valor,status,etapa,funil,responsavel,data_inicio,data_fim,motivo_perda,n_vidas,plano_contratado,data_vigencia,informacoes,produtos,agendor_criado_em";
var EMP_POR_PAGINA = 50;
var emp = {carregado:false, carregando:false, erro:null, empresas:[], contatos:[], negocios:[], aba:"empresas",
  f:{busca:"", responsavel:"", categoria:"", porte:"", status:""}, pagina:0};

async function empBuscarTudo(tabela, colunas, ordem){
  var out = [], de = 0, passo = 1000;
  while(true){
    var r = await sb.from(tabela).select(colunas).order(ordem).range(de, de+passo-1);
    if(r.error) throw r.error;
    out = out.concat(r.data||[]);
    if(!r.data || r.data.length < passo) break;
    de += passo;
  }
  return out;
}
async function carregarEmpresas(forcar){
  if(emp.carregando || (emp.carregado && !forcar)) return;
  emp.carregando = true; emp.erro = null;
  if(state.tab==="empresas") render();
  try{
    var res = await Promise.all([
      empBuscarTudo("empresas", EMP_COLS_EMPRESA, "nome"),
      empBuscarTudo("empresa_contatos", EMP_COLS_CONTATO, "nome"),
      empBuscarTudo("empresa_negocios_agendor", EMP_COLS_NEGOCIO, "agendor_criado_em")
    ]);
    emp.empresas = res[0]; emp.contatos = res[1]; emp.negocios = res[2].reverse();
    emp.carregado = true;
  }catch(e){ console.error(e); emp.erro = (e && e.message) || "erro"; }
  emp.carregando = false;
  if(state.tab==="empresas") render();
}
function empSemAcento(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }
function empPorId(id){ for(var i=0;i<emp.empresas.length;i++){ if(emp.empresas[i].id===id) return emp.empresas[i]; } return null; }
function empContatosDa(id){ return emp.contatos.filter(function(c){ return c.empresa_id===id; }); }
function empNegociosAgendorDa(id){ return emp.negocios.filter(function(n){ return n.empresa_id===id; }); }
function empLeadsDa(id){ return state.leads.filter(function(l){ return l.empresa_id===id; }); }
function empFmtCNPJ(v){ var d = soDigitos(v); return d.length===14 ? maskCNPJ(d) : (v||""); }
function empOpcoes(lista, campo){
  var vistos = {}; lista.forEach(function(x){ var v = x[campo]; if(v) vistos[v] = (vistos[v]||0)+1; });
  return Object.keys(vistos).sort();
}
function empSelect(id, rotulo, valores, atual, todos){
  return '<div class="field"><label>'+rotulo+'</label><select id="'+id+'"><option value="">'+(todos||"Todos")+'</option>'+
    valores.map(function(v){ return '<option'+(atual===v?' selected':'')+'>'+escapeHtml(v)+'</option>'; }).join("")+'</select></div>';
}
function empCombina(e, q, qd){
  if(empSemAcento(e.nome).indexOf(q)>=0) return true;
  if(e.razao_social && empSemAcento(e.razao_social).indexOf(q)>=0) return true;
  if(e.email && e.email.toLowerCase().indexOf(q)>=0) return true;
  if(e.cidade && empSemAcento(e.cidade).indexOf(q)>=0) return true;
  if(e.nome_contato && empSemAcento(e.nome_contato).indexOf(q)>=0) return true;
  if(qd && qd.length>=3 && (soDigitos(e.cnpj).indexOf(qd)>=0 || soDigitos(e.telefone).indexOf(qd)>=0)) return true;
  return false;
}
function empresasFiltradas(){
  var f = emp.f, q = empSemAcento(f.busca.trim()), qd = soDigitos(f.busca);
  return emp.empresas.filter(function(e){
    if(f.responsavel && e.responsavel!==f.responsavel) return false;
    if(f.categoria && e.categoria!==f.categoria) return false;
    if(f.porte && e.porte!==f.porte) return false;
    if(q && !empCombina(e, q, qd)) return false;
    return true;
  });
}
function contatosFiltrados(){
  var f = emp.f, q = empSemAcento(f.busca.trim()), qd = soDigitos(f.busca);
  return emp.contatos.filter(function(c){
    if(f.responsavel && c.responsavel!==f.responsavel) return false;
    if(q){
      var e = c.empresa_id ? empPorId(c.empresa_id) : null;
      var alvo = empSemAcento(c.nome+" "+(c.email||"")+" "+(c.cargo||"")+" "+(e? e.nome : ""));
      if(alvo.indexOf(q)===-1 && !(qd.length>=3 && soDigitos(c.telefone).indexOf(qd)>=0)) return false;
    }
    return true;
  });
}
function negociosAgendorFiltrados(){
  var f = emp.f, q = empSemAcento(f.busca.trim());
  return emp.negocios.filter(function(n){
    if(f.responsavel && n.responsavel!==f.responsavel) return false;
    if(f.status && n.status!==f.status) return false;
    if(q && empSemAcento((n.titulo||"")+" "+(n.empresa_nome||"")+" "+(n.contato_nome||"")).indexOf(q)===-1) return false;
    return true;
  });
}
function empPaginacaoHtml(total){
  var paginas = Math.max(1, Math.ceil(total/EMP_POR_PAGINA));
  if(emp.pagina>=paginas) emp.pagina = paginas-1;
  var ini = total? emp.pagina*EMP_POR_PAGINA+1 : 0, fim = Math.min(total, (emp.pagina+1)*EMP_POR_PAGINA);
  return '<div class="rowflex emp-paginacao" style="justify-content:space-between;margin-top:12px;">'+
    '<span class="muted">Mostrando '+ini.toLocaleString("pt-BR")+'–'+fim.toLocaleString("pt-BR")+' de '+total.toLocaleString("pt-BR")+'</span>'+
    '<span class="rowflex" style="gap:6px;">'+
      '<button class="btn btn-ghost btn-sm" id="emp-pag-ant"'+(emp.pagina<=0?' disabled':'')+'>‹ Anterior</button>'+
      '<span class="muted">página '+(emp.pagina+1)+' de '+paginas+'</span>'+
      '<button class="btn btn-ghost btn-sm" id="emp-pag-prox"'+(emp.pagina>=paginas-1?' disabled':'')+'>Próxima ›</button>'+
    '</span></div>';
}
function empPagina(lista){ return lista.slice(emp.pagina*EMP_POR_PAGINA, (emp.pagina+1)*EMP_POR_PAGINA); }

function viewEmpresas(){
  if(!emp.carregado){
    if(!emp.carregando && !emp.erro) setTimeout(function(){ carregarEmpresas(); }, 0);
    return '<div class="topbar"><div><h1>Empresas</h1><div class="desc">Base de empresas, pessoas e histórico do Agendor</div></div></div>'+
      '<div class="card"><div class="card-body"><div class="empty">'+(emp.erro? 'Não foi possível carregar as empresas ('+escapeHtml(emp.erro)+'). <button class="linklike" id="emp-recarregar">tentar de novo</button>' : 'Carregando empresas…')+'</div></div></div>';
  }
  var noFunil = state.leads.filter(function(l){ return l.empresa_id; }).length;
  var header = '<div class="topbar"><div><h1>Empresas</h1><div class="desc">'+emp.empresas.length.toLocaleString("pt-BR")+' empresas · '+emp.contatos.length.toLocaleString("pt-BR")+' pessoas · '+emp.negocios.length.toLocaleString("pt-BR")+' negócios do Agendor'+(noFunil? ' · '+noFunil+' já no funil' : '')+'</div></div>'+
    '<div class="rowflex"><button class="btn btn-ghost" id="emp-exportar">Exportar Excel</button><button class="btn btn-primary" id="emp-nova">+ Nova empresa</button></div></div>';
  var abas = '<div class="tabs2">'+
    tabbtn("emp-aba","empresas","Empresas ("+emp.empresas.length.toLocaleString("pt-BR")+")",emp.aba)+
    tabbtn("emp-aba","pessoas","Pessoas ("+emp.contatos.length.toLocaleString("pt-BR")+")",emp.aba)+
    tabbtn("emp-aba","negocios","Negócios do Agendor ("+emp.negocios.length.toLocaleString("pt-BR")+")",emp.aba)+
  '</div>';
  var fonte = emp.aba==="pessoas" ? emp.contatos : (emp.aba==="negocios" ? emp.negocios : emp.empresas);
  var placeholder = emp.aba==="pessoas" ? "Nome, e-mail, telefone ou empresa" : (emp.aba==="negocios" ? "Título, empresa ou contato" : "Nome, razão social, CNPJ, telefone, e-mail ou cidade");
  var filtros = '<div class="funil-filterbar">'+
    '<div class="field grow"><label>Buscar</label><input id="emp-busca" placeholder="'+placeholder+'" value="'+escapeHtml(emp.f.busca)+'"></div>'+
    empSelect("emp-f-resp","Responsável", empOpcoes(fonte,"responsavel"), emp.f.responsavel)+
    (emp.aba==="empresas"? empSelect("emp-f-cat","Categoria", empOpcoes(emp.empresas,"categoria"), emp.f.categoria, "Todas") + empSelect("emp-f-porte","Porte", empOpcoes(emp.empresas,"porte"), emp.f.porte) : '')+
    (emp.aba==="negocios"? empSelect("emp-f-status","Situação", empOpcoes(emp.negocios,"status"), emp.f.status, "Todas") : '')+
    ((emp.f.busca||emp.f.responsavel||emp.f.categoria||emp.f.porte||emp.f.status)? '<button class="linklike" id="emp-limpar" style="padding-bottom:9px;">limpar filtros</button>' : '')+
  '</div>';
  var corpo = emp.aba==="pessoas" ? viewEmpPessoas() : (emp.aba==="negocios" ? viewEmpNegocios() : viewEmpLista());
  return header + abas + filtros + corpo;
}
function viewEmpLista(){
  var lista = empresasFiltradas();
  if(!lista.length) return '<div class="card"><div class="card-body"><div class="empty">Nenhuma empresa encontrada com esses filtros.</div></div></div>';
  return '<div class="card"><div class="card-body"><div class="tablewrap"><table class="grid"><thead><tr>'+
    '<th style="min-width:260px;">Empresa</th><th>CNPJ</th><th>Responsável</th><th>Telefone</th><th>Cidade</th><th>Vidas</th><th>Plano atual</th><th></th>'+
    '</tr></thead><tbody>'+
    empPagina(lista).map(function(e){
      var nf = empLeadsDa(e.id).length;
      return '<tr class="rowlink" data-open-empresa="'+e.id+'" style="cursor:pointer;">'+
        '<td><b>'+escapeHtml(e.nome)+'</b>'+(e.razao_social && e.razao_social!==e.nome? '<div class="muted" style="font-size:12px;">'+escapeHtml(e.razao_social)+'</div>' : '')+(nf? ' <span class="tag">'+nf+' no funil</span>' : '')+'</td>'+
        '<td style="white-space:nowrap;">'+escapeHtml(empFmtCNPJ(e.cnpj)||"—")+'</td>'+
        '<td>'+escapeHtml(e.responsavel||"—")+'</td>'+
        '<td style="white-space:nowrap;">'+escapeHtml(e.telefone||"—")+'</td>'+
        '<td>'+escapeHtml(e.cidade? e.cidade+(e.uf? "/"+e.uf : "") : "—")+'</td>'+
        '<td>'+(e.numero_vidas!=null? e.numero_vidas : "—")+'</td>'+
        '<td>'+escapeHtml(e.plano_atual||"—")+'</td>'+
        '<td><button class="linklike" data-emp-criar-negocio="'+e.id+'" style="white-space:nowrap;">+ negócio</button></td>'+
      '</tr>';
    }).join("")+
    '</tbody></table></div>'+empPaginacaoHtml(lista.length)+'</div></div>';
}
function viewEmpPessoas(){
  var lista = contatosFiltrados();
  if(!lista.length) return '<div class="card"><div class="card-body"><div class="empty">Nenhuma pessoa encontrada com esses filtros.</div></div></div>';
  return '<div class="card"><div class="card-body"><div class="tablewrap"><table class="grid"><thead><tr>'+
    '<th style="min-width:180px;">Nome</th><th style="min-width:200px;">Empresa</th><th>Cargo</th><th>Telefone</th><th>E-mail</th><th>Responsável</th><th>Origem</th><th></th>'+
    '</tr></thead><tbody>'+
    empPagina(lista).map(function(c){
      var e = c.empresa_id ? empPorId(c.empresa_id) : null;
      return '<tr>'+
        '<td><b>'+escapeHtml(c.nome)+'</b></td>'+
        '<td>'+(e? '<button class="linklike" style="text-align:left;" data-open-empresa="'+e.id+'">'+escapeHtml(e.nome)+'</button>' : '<span class="muted">—</span>')+'</td>'+
        '<td>'+escapeHtml(c.cargo||"—")+'</td>'+
        '<td style="white-space:nowrap;">'+(c.telefone? (linkWhatsApp(c.telefone)? '<a class="linklike" href="'+linkWhatsApp(c.telefone)+'" target="_blank" rel="noopener">'+escapeHtml(c.telefone)+'</a>' : escapeHtml(c.telefone)) : "—")+'</td>'+
        '<td>'+escapeHtml(c.email||"—")+'</td>'+
        '<td>'+escapeHtml(c.responsavel||"—")+'</td>'+
        '<td>'+escapeHtml(c.origem||"—")+'</td>'+
        '<td><button class="linklike" data-emp-negocio-contato="'+c.id+'" style="white-space:nowrap;">+ negócio</button></td>'+
      '</tr>';
    }).join("")+
    '</tbody></table></div>'+empPaginacaoHtml(lista.length)+'</div></div>';
}
function empStatusPill(s){
  if(s==="Ganho") return '<span class="pill pill-ok">Ganho</span>';
  if(s==="Perdido") return '<span class="pill pill-bad">Perdido</span>';
  return '<span class="pill pill-warn">'+escapeHtml(s||"—")+'</span>';
}
function viewEmpNegocios(){
  var lista = negociosAgendorFiltrados();
  var soma = function(arr){ return arr.reduce(function(s,n){ return s+(Number(n.valor)||0); },0); };
  var porStatus = function(st){ return lista.filter(function(n){ return n.status===st; }); };
  var tiles = '<div class="tiles">'+
    tile("Em andamento (Agendor)", porStatus("Em andamento").length, fmtMoney(soma(porStatus("Em andamento"))))+
    tile("Ganhos (Agendor)", porStatus("Ganho").length, fmtMoney(soma(porStatus("Ganho"))))+
    tile("Perdidos (Agendor)", porStatus("Perdido").length, fmtMoney(soma(porStatus("Perdido"))))+
  '</div>';
  if(!lista.length) return tiles+'<div class="card"><div class="card-body"><div class="empty">Nenhum negócio encontrado com esses filtros.</div></div></div>';
  return tiles+'<div class="card"><div class="card-head"><h2>Histórico de negócios do Agendor</h2><div class="meta">somente consulta · para trabalhar um deles, use "levar ao funil"</div></div><div class="card-body"><div class="tablewrap"><table class="grid"><thead><tr>'+
    '<th>Negócio</th><th>Empresa / contato</th><th>Etapa no Agendor</th><th>Situação</th><th>Valor</th><th>Responsável</th><th>Início</th><th></th>'+
    '</tr></thead><tbody>'+
    empPagina(lista).map(function(n){
      return '<tr>'+
        '<td><b>'+escapeHtml(n.titulo||"—")+'</b>'+(n.plano_contratado? '<div class="muted" style="font-size:12px;">'+escapeHtml(n.plano_contratado)+'</div>' : '')+'</td>'+
        '<td style="min-width:200px;">'+(n.empresa_id? '<button class="linklike" style="text-align:left;" data-open-empresa="'+n.empresa_id+'">'+escapeHtml(n.empresa_nome||"empresa")+'</button>' : escapeHtml(n.empresa_nome||""))+(n.contato_nome? '<div class="muted" style="font-size:12px;">'+escapeHtml(n.contato_nome)+'</div>' : '')+(!n.empresa_nome && !n.contato_nome? '—' : '')+'</td>'+
        '<td>'+escapeHtml(n.etapa||"—")+'</td>'+
        '<td>'+empStatusPill(n.status)+(n.motivo_perda? '<div class="muted" style="font-size:12px;">'+escapeHtml(n.motivo_perda)+'</div>' : '')+'</td>'+
        '<td style="white-space:nowrap;">'+fmtMoney(Number(n.valor)||0)+'</td>'+
        '<td>'+escapeHtml(n.responsavel||"—")+'</td>'+
        '<td style="white-space:nowrap;">'+fmtDateISO(n.data_inicio)+'</td>'+
        '<td>'+(n.status==="Em andamento"? '<button class="linklike" data-emp-levar-funil="'+n.id+'" style="white-space:nowrap;">levar ao funil</button>' : '')+'</td>'+
      '</tr>';
    }).join("")+
    '</tbody></table></div>'+empPaginacaoHtml(lista.length)+'</div></div>';
}

/* ---- ficha da empresa (painel lateral) ---- */
function empKv(k, v){ return (v===null || v===undefined || v==="") ? "" : '<div class="kv-row"><span class="k">'+k+'</span><span style="text-align:right;">'+v+'</span></div>'; }
function openEmpresaPanel(id){
  var e = empPorId(id);
  var root = document.getElementById("panel-root");
  if(!root) return;
  if(!e){ root.innerHTML=""; return; }
  var wa = linkWhatsApp(e.telefone);
  var contatos = empContatosDa(id), negAg = empNegociosAgendorDa(id), leads = empLeadsDa(id);
  var endereco = [e.logradouro, e.numero, e.complemento].filter(Boolean).join(", ");
  var cidade = [e.bairro, e.cidade? e.cidade+(e.uf? "/"+e.uf : "") : ""].filter(Boolean).join(" · ");
  var body =
    '<div class="side-panel-head"><div class="rowflex"><div><h2>'+escapeHtml(e.nome)+'</h2><div class="muted">'+escapeHtml(empFmtCNPJ(e.cnpj)||"sem CNPJ")+(e.responsavel? ' · '+escapeHtml(e.responsavel) : '')+'</div></div><button class="panel-close" id="panel-close">&times;</button></div>'+
      '<div class="rowflex" style="margin-top:12px;gap:8px;">'+
        '<button class="btn btn-primary btn-sm" id="emp-p-negocio">+ Criar negócio no funil</button>'+
        '<button class="btn btn-ghost btn-sm" id="emp-p-editar">Editar empresa</button>'+
      '</div></div>'+
    '<div class="side-panel-body">'+
      '<div class="side-panel-section"><h4>Contato</h4><div class="kv-list">'+
        empKv("Telefone", e.telefone? escapeHtml(e.telefone) : '<span class="muted">—</span>')+
        empKv("E-mail", e.email? '<a class="linklike" href="mailto:'+escapeHtml(e.email)+'">'+escapeHtml(e.email)+'</a>' : '<span class="muted">—</span>')+
        empKv("Falar com", escapeHtml(e.nome_contato||e.representante_legal||""))+
        empKv("Site", e.website? escapeHtml(e.website) : "")+
        empKv("Instagram", escapeHtml(e.instagram||""))+
        empKv("LinkedIn", escapeHtml(e.linkedin||""))+
      '</div><div class="op-contato-acoes">'+
        (wa? '<a class="btn btn-sm btn-concierge" href="'+wa+'" target="_blank" rel="noopener">WhatsApp</a>' : '')+
        (e.telefone? '<a class="btn btn-sm" href="tel:'+soDigitos(e.telefone)+'">Ligar</a>' : '')+
        (e.email? '<a class="btn btn-sm" href="mailto:'+escapeHtml(e.email)+'">Enviar e-mail</a>' : '')+
      '</div></div>'+
      '<div class="side-panel-section"><h4>Plano de saúde</h4><div class="kv-list">'+
        empKv("Plano atual", escapeHtml(e.plano_atual||""))+
        empKv("Valor plano atual", escapeHtml(e.valor_plano_atual||""))+
        empKv("Novo plano", escapeHtml(e.novo_plano||""))+
        empKv("Valor novo plano", e.valor_novo_plano!=null? fmtMoney(Number(e.valor_novo_plano)) : "")+
        empKv("Porte", escapeHtml(e.porte||""))+
        empKv("Nº de vidas", e.numero_vidas!=null? String(e.numero_vidas) : "")+
        empKv("Beneficiários", escapeHtml(e.beneficiarios||""))+
        empKv("Vigência", escapeHtml(e.vigencia||""))+
        empKv("Coparticipação", escapeHtml(e.coparticipacao||""))+
      '</div>'+(!(e.plano_atual||e.novo_plano||e.porte||e.numero_vidas!=null||e.beneficiarios||e.vigencia)? '<div class="muted">Sem informações de plano ainda.</div>' : '')+'</div>'+
      '<div class="side-panel-section"><h4>Empresa</h4><div class="kv-list">'+
        empKv("Razão social", escapeHtml(e.razao_social||""))+
        empKv("Sócio I", escapeHtml(e.socio_1||""))+
        empKv("Sócio II", escapeHtml(e.socio_2||""))+
        empKv("Representante legal", escapeHtml(e.representante_legal||""))+
        empKv("+ CNPJ", escapeHtml(e.cnpj_adicional||""))+
        empKv("Endereço", escapeHtml(endereco))+
        empKv("Bairro / cidade", escapeHtml(cidade))+
        empKv("CEP", escapeHtml(e.cep||""))+
        empKv("Categoria", escapeHtml(e.categoria||""))+
        empKv("Origem", escapeHtml(e.origem||""))+
        empKv("Setor", escapeHtml(e.setor||""))+
        empKv("Produtos", escapeHtml(e.produtos||""))+
        empKv("Cadastro", e.agendor_criado_em? fmtDateISO(e.agendor_criado_em)+' <span class="muted">(Agendor)</span>' : fmtDateISO(e.criado_em))+
      '</div>'+(e.observacoes? '<div class="note-item">'+escapeHtml(e.observacoes)+'</div>' : '')+'</div>'+
      (e.ultima_atividade || e.proxima_atividade? '<div class="side-panel-section"><h4>Última atividade no Agendor</h4>'+
        (e.ultima_atividade? '<div class="activity-item"><div>'+escapeHtml(e.ultima_atividade)+'</div><div class="meta">'+fmtDateTime(e.ultima_atividade_em)+'</div></div>' : '')+
        (e.proxima_atividade && e.proxima_atividade!==e.ultima_atividade? '<div class="activity-item"><div>Próxima: '+escapeHtml(e.proxima_atividade)+'</div><div class="meta">'+fmtDateTime(e.proxima_atividade_em)+'</div></div>' : '')+
      '</div>' : '')+
      '<div class="side-panel-section"><h4>Negócios no funil ('+leads.length+')</h4>'+
        (leads.length? leads.map(function(l){
          return '<div class="activity-item"><div><button class="linklike" data-emp-abrir-lead="'+l.id+'">'+escapeHtml(l.nome||l.empresa||"Negócio")+'</button> <span class="tag">'+escapeHtml(l.etapa||"—")+'</span></div><div class="meta">'+escapeHtml(l.produto||"")+' · '+escapeHtml(l.vendedor||"")+' · '+fmtMoney(l.valor_estimado)+'</div></div>';
        }).join("") : '<div class="empty" style="padding:10px 6px;">Nenhum negócio no funil ainda.</div>')+
      '</div>'+
      '<div class="side-panel-section"><h4>Pessoas ('+contatos.length+')</h4>'+
        (contatos.length? contatos.map(function(c){
          var w = linkWhatsApp(c.telefone);
          return '<div class="activity-item"><div><b>'+escapeHtml(c.nome)+'</b>'+(c.cargo? ' <span class="muted">· '+escapeHtml(c.cargo)+'</span>' : '')+'</div><div class="meta">'+
            (c.telefone? (w? '<a class="linklike" href="'+w+'" target="_blank" rel="noopener">'+escapeHtml(c.telefone)+'</a>' : escapeHtml(c.telefone)) : '')+
            (c.email? (c.telefone? ' · ' : '')+escapeHtml(c.email) : '')+
            (!c.telefone && !c.email? 'sem contato' : '')+'</div></div>';
        }).join("") : '<div class="empty" style="padding:10px 6px;">Nenhuma pessoa vinculada.</div>')+
      '</div>'+
      '<div class="side-panel-section"><h4>Histórico do Agendor ('+negAg.length+')</h4>'+
        (negAg.length? negAg.map(function(n){
          return '<div class="activity-item"><div><b>'+escapeHtml(n.titulo||"Negócio")+'</b> '+empStatusPill(n.status)+'</div><div class="meta">'+escapeHtml(n.etapa||"")+' · '+fmtMoney(Number(n.valor)||0)+' · '+escapeHtml(n.responsavel||"")+' · '+fmtDateISO(n.data_inicio)+
            (n.status==="Em andamento"? ' · <button class="linklike" data-emp-levar-funil="'+n.id+'">levar ao funil</button>' : '')+'</div></div>';
        }).join("") : '<div class="empty" style="padding:10px 6px;">Nenhum negócio no Agendor.</div>')+
      '</div>'+
    '</div>';
  root.innerHTML = '<div class="panel-backdrop" id="panel-backdrop"><div class="side-panel">'+body+'</div></div>';
  document.getElementById("panel-close").onclick = closeLeadDetailPanel;
  document.getElementById("panel-backdrop").addEventListener("click", function(ev){ if(ev.target.id==="panel-backdrop") closeLeadDetailPanel(); });
  document.getElementById("emp-p-negocio").onclick = function(){ empCriarNegocio(e); };
  document.getElementById("emp-p-editar").onclick = function(){ openEmpresaModal(e); };
  Array.prototype.forEach.call(root.querySelectorAll("[data-emp-abrir-lead]"), function(b){ b.onclick = function(){ openLeadDetailPanel(b.getAttribute("data-emp-abrir-lead")); }; });
  Array.prototype.forEach.call(root.querySelectorAll("[data-emp-levar-funil]"), function(b){ b.onclick = function(){ empLevarAoFunil(b.getAttribute("data-emp-levar-funil")); }; });
}

/* ---- criar negócio no funil a partir da empresa / pessoa / negócio do Agendor ---- */
function empVendedorPadrao(nome){
  if(nome && VENDEDORES.indexOf(nome)>=0) return nome;
  var eu = currentUserName();
  return (eu && VENDEDORES.indexOf(eu)>=0) ? eu : VENDEDORES[0];
}
function empSeedNegocio(e, extra){
  var c = e ? empContatosDa(e.id)[0] : null;
  var seed = {
    etapa:"Qualificação", produto:"Saúde",
    vendedor: empVendedorPadrao(e && e.responsavel),
    nome: (e && (e.nome_contato || e.representante_legal)) || (c && c.nome) || "",
    empresa: e ? e.nome : "",
    telefone: (e && e.telefone) || (c && c.telefone) || "",
    email: (e && e.email) || (c && c.email) || "",
    quantidade_vidas: e && e.numero_vidas ? e.numero_vidas : null,
    origem: (e && e.origem) || "Base de empresas",
    observacoes: e && e.plano_atual ? "Plano atual: "+e.plano_atual+(e.valor_plano_atual? " ("+e.valor_plano_atual+")" : "") : "",
    empresa_id: e ? e.id : null
  };
  return Object.assign(seed, extra||{});
}
function empAbrirModalNegocio(seed, empresaId){
  openLeadModal(null, function(leadId){
    toast("Negócio criado no Funil Comercial.");
    if(empresaId) openEmpresaPanel(empresaId);
    else if(leadId) openLeadDetailPanel(leadId);
  }, seed);
}
function empCriarNegocio(e){ empAbrirModalNegocio(empSeedNegocio(e), e.id); }
function empCriarNegocioContato(contatoId){
  var c = emp.contatos.filter(function(x){ return x.id===contatoId; })[0]; if(!c) return;
  var e = c.empresa_id ? empPorId(c.empresa_id) : null;
  var seed = empSeedNegocio(e, {nome:c.nome, telefone:c.telefone||(e&&e.telefone)||"", email:c.email||(e&&e.email)||"", vendedor: empVendedorPadrao(c.responsavel || (e&&e.responsavel)), origem: c.origem || (e&&e.origem) || "Base de empresas"});
  if(!e){ seed.empresa = ""; seed.empresa_id = null; }
  empAbrirModalNegocio(seed, e ? e.id : null);
}
function empLevarAoFunil(negocioId){
  var n = emp.negocios.filter(function(x){ return x.id===negocioId; })[0]; if(!n) return;
  var e = n.empresa_id ? empPorId(n.empresa_id) : null;
  var c = n.contato_id ? emp.contatos.filter(function(x){ return x.id===n.contato_id; })[0] : null;
  var obs = ["Trazido do Agendor: "+(n.titulo||""), n.etapa? "Etapa no Agendor: "+n.etapa : "", n.plano_contratado? "Plano: "+n.plano_contratado : "", n.informacoes||""].filter(Boolean).join("\n");
  var seed = empSeedNegocio(e, {
    nome: (c && c.nome) || n.contato_nome || (e && (e.nome_contato||e.representante_legal)) || "",
    empresa: n.empresa_nome || (e && e.nome) || "",
    vendedor: empVendedorPadrao(n.responsavel),
    valor_estimado: Number(n.valor)||null,
    quantidade_vidas: parseInt(n.n_vidas,10) || (e && e.numero_vidas) || null,
    observacoes: obs
  });
  if(c){ seed.telefone = c.telefone || seed.telefone; seed.email = c.email || seed.email; }
  empAbrirModalNegocio(seed, e ? e.id : null);
}

/* ---- cadastrar / editar empresa ---- */
function empresaFormHtml(e){
  e = e || {};
  function inp(id, rot, v, extra){ return '<div class="field"><label>'+rot+'</label><input id="'+id+'" value="'+escapeHtml(v==null?"":v)+'"'+(extra||"")+'></div>'; }
  var resp = TEAM.slice(); if(e.responsavel && resp.indexOf(e.responsavel)<0) resp.push(e.responsavel);
  return '<div class="field row2">'+inp("ef-nome","Nome da empresa *",e.nome)+inp("ef-razao","Razão social",e.razao_social)+'</div>'+
    '<div class="field row2">'+inp("ef-cnpj","CNPJ",empFmtCNPJ(e.cnpj),' inputmode="numeric"')+'<div class="field"><label>Responsável</label><select id="ef-resp"><option value="">—</option>'+resp.map(function(r){ return '<option'+(e.responsavel===r?' selected':'')+'>'+escapeHtml(r)+'</option>'; }).join("")+'</select></div></div>'+
    '<div class="field row2">'+inp("ef-tel","Telefone / WhatsApp",e.telefone,' type="tel"')+inp("ef-email","E-mail",e.email,' type="email"')+'</div>'+
    '<div class="field row2">'+inp("ef-contato","Falar com (nome do contato)",e.nome_contato)+inp("ef-rep","Representante legal",e.representante_legal)+'</div>'+
    '<div class="field row2">'+inp("ef-plano","Plano atual",e.plano_atual)+inp("ef-vplano","Valor plano atual",e.valor_plano_atual)+'</div>'+
    '<div class="field row3">'+inp("ef-vidas","Nº de vidas",e.numero_vidas,' type="number" min="0" step="1"')+
      '<div class="field"><label>Porte</label><select id="ef-porte"><option value="">—</option>'+["02 A 29 VIDAS","30 A 99 VIDAS"].concat(e.porte && ["02 A 29 VIDAS","30 A 99 VIDAS"].indexOf(e.porte)<0? [e.porte] : []).map(function(p){ return '<option'+(e.porte===p?' selected':'')+'>'+escapeHtml(p)+'</option>'; }).join("")+'</select></div>'+
      inp("ef-vig","Vigência",e.vigencia)+'</div>'+
    '<div class="field row3">'+inp("ef-cidade","Cidade",e.cidade)+inp("ef-uf","UF",e.uf,' maxlength="2"')+inp("ef-cat","Categoria",e.categoria||"Cliente em potencial")+'</div>'+
    '<div class="field"><label>Observações</label><textarea id="ef-obs">'+escapeHtml(e.observacoes||"")+'</textarea></div>';
}
function openEmpresaModal(existente){
  openModal(existente? "Editar empresa" : "Nova empresa", empresaFormHtml(existente), async function(fechar){
    function v(id){ var el=document.getElementById(id); return el ? el.value.trim() : ""; }
    var dados = {
      nome: v("ef-nome"), razao_social: v("ef-razao")||null, cnpj: soDigitos(v("ef-cnpj"))||null,
      responsavel: v("ef-resp")||null, telefone: v("ef-tel")||null, email: v("ef-email")||null,
      nome_contato: v("ef-contato")||null, representante_legal: v("ef-rep")||null,
      plano_atual: v("ef-plano")||null, valor_plano_atual: v("ef-vplano")||null,
      numero_vidas: parseInt(v("ef-vidas"),10)||null, porte: v("ef-porte")||null, vigencia: v("ef-vig")||null,
      cidade: v("ef-cidade")||null, uf: (v("ef-uf")||"").toUpperCase()||null, categoria: v("ef-cat")||null,
      observacoes: v("ef-obs")||null
    };
    if(!dados.nome){ toast("Informe o nome da empresa."); return; }
    if(!existente && dados.cnpj){
      var dup = emp.empresas.filter(function(x){ return soDigitos(x.cnpj)===dados.cnpj; })[0];
      if(dup && !confirm("Já existe uma empresa com esse CNPJ (\""+dup.nome+"\"). Cadastrar mesmo assim?")) return;
    }
    var r;
    if(existente){
      dados.atualizado_em = new Date().toISOString();
      r = await sb.from("empresas").update(dados).eq("id", existente.id).select(EMP_COLS_EMPRESA);
    } else {
      dados.criado_por = currentUser();
      r = await sb.from("empresas").insert(dados).select(EMP_COLS_EMPRESA);
    }
    if(r.error){ console.error(r.error); toast("Erro ao salvar: "+r.error.message); return; }
    var salvo = r.data && r.data[0];
    if(salvo){
      if(existente){ emp.empresas = emp.empresas.map(function(x){ return x.id===salvo.id ? salvo : x; }); }
      else { emp.empresas.unshift(salvo); }
    }
    toast(existente? "Empresa atualizada." : "Empresa cadastrada.");
    fechar(); render();
    if(salvo) openEmpresaPanel(salvo.id);
  });
}
function exportarEmpresasExcel(){
  var lista = empresasFiltradas();
  var cab = ["Nome","Razão social","CNPJ","Responsável","Telefone","E-mail","Falar com","Cidade","UF","Categoria","Origem","Porte","Nº vidas","Plano atual","Valor plano atual","Vigência","Coparticipação","Observações"];
  var linhas = lista.map(function(e){ return [e.nome,e.razao_social,empFmtCNPJ(e.cnpj),e.responsavel,e.telefone,e.email,e.nome_contato||e.representante_legal,e.cidade,e.uf,e.categoria,e.origem,e.porte,e.numero_vidas,e.plano_atual,e.valor_plano_atual,e.vigencia,e.coparticipacao,e.observacoes].map(function(x){ return x==null? "" : x; }); });
  var ws = XLSX.utils.aoa_to_sheet([cab].concat(linhas));
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Empresas");
  XLSX.writeFile(wb, "empresas-oneplus-"+todayISO()+".xlsx");
}
function wireEmpresas(){
  if(state.tab!=="empresas") return;
  var rec = document.getElementById("emp-recarregar"); if(rec) rec.onclick = function(){ emp.erro=null; carregarEmpresas(true); };
  var nova = document.getElementById("emp-nova"); if(nova) nova.onclick = function(){ openEmpresaModal(null); };
  var exp = document.getElementById("emp-exportar"); if(exp) exp.onclick = exportarEmpresasExcel;
  Array.prototype.forEach.call(document.querySelectorAll("[data-emp-aba-tab]"), function(t){
    t.onclick = function(){ emp.aba = t.getAttribute("data-emp-aba-tab"); emp.pagina = 0; emp.f.responsavel=""; emp.f.status=""; render(); };
  });
  var busca = document.getElementById("emp-busca");
  if(busca){ busca.oninput = function(){ emp.f.busca = busca.value; emp.pagina = 0; render(); var el=document.getElementById("emp-busca"); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }; }
  [["emp-f-resp","responsavel"],["emp-f-cat","categoria"],["emp-f-porte","porte"],["emp-f-status","status"]].forEach(function(p){
    var el = document.getElementById(p[0]); if(el) el.onchange = function(){ emp.f[p[1]] = el.value; emp.pagina = 0; render(); };
  });
  var limpar = document.getElementById("emp-limpar"); if(limpar) limpar.onclick = function(){ emp.f = {busca:"", responsavel:"", categoria:"", porte:"", status:""}; emp.pagina = 0; render(); };
  var ant = document.getElementById("emp-pag-ant"); if(ant) ant.onclick = function(){ if(emp.pagina>0){ emp.pagina--; render(); window.scrollTo(0,0); } };
  var prox = document.getElementById("emp-pag-prox"); if(prox) prox.onclick = function(){ emp.pagina++; render(); window.scrollTo(0,0); };
  Array.prototype.forEach.call(document.querySelectorAll("#main [data-open-empresa]"), function(el){
    el.onclick = function(ev){ if(ev.target.closest("[data-emp-criar-negocio]")) return; openEmpresaPanel(el.getAttribute("data-open-empresa")); };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-emp-criar-negocio]"), function(b){
    b.onclick = function(ev){ ev.stopPropagation(); var e = empPorId(b.getAttribute("data-emp-criar-negocio")); if(e) empCriarNegocio(e); };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-emp-negocio-contato]"), function(b){ b.onclick = function(){ empCriarNegocioContato(b.getAttribute("data-emp-negocio-contato")); }; });
  Array.prototype.forEach.call(document.querySelectorAll("#main [data-emp-levar-funil]"), function(b){ b.onclick = function(){ empLevarAoFunil(b.getAttribute("data-emp-levar-funil")); }; });
}

/* ================= IMPLANTAÇÃO: troca de plano / valor / vigência =================
   Quando a operadora recusa o contrato (ou o cliente muda de ideia) durante a implantação,
   o negócio continua o mesmo — só muda operadora, plano, valor e vigência. A troca atualiza o
   negócio (e por isso a meta/relatórios), o pré-cadastro e o cliente (se já existir), e fica
   registrada no histórico da implantação (implantacoes.historico_plano). */
var MOTIVOS_TROCA_PLANO = ["Recusa da operadora","Pedido do cliente","Ajuste de valor / tabela","Mudança de vigência","Outro"];
var EDITAM_PLANO_IMPLANTACAO = ["Henrique","Kelly","Alana"];
function podeEditarPlanoImplantacao(){ return EDITAM_PLANO_IMPLANTACAO.indexOf(currentUserName()) >= 0; }
function historicoPlanoDe(leadId){
  var imp = implantacaoDoLead(leadId);
  var h = imp && imp.historico_plano;
  if(typeof h === "string"){ try { h = JSON.parse(h); } catch(e){ h = []; } }
  return Array.isArray(h) ? h : [];
}
function planoNomeDoLead(l){ return [l.operadora, l.categoria_plano].filter(Boolean).join(" — "); }
function resumoPlanoTexto(p){
  return [p.operadora||"sem operadora", p.categoria_plano||"", fmtMoney(p.valor_estimado||0), p.quantidade_vidas? p.quantidade_vidas+" vida(s)" : "", p.vigencia_inicio? "vigência "+fmtDateISO(p.vigencia_inicio) : ""].filter(Boolean).join(" · ");
}
function planoContratadoHtml(lead){
  var hist = historicoPlanoDe(lead.id);
  return '<fieldset style="margin-bottom:12px;"><legend>Plano contratado</legend>'+
    '<div class="kv-list">'+
      '<div class="kv-row"><span class="k">Operadora</span><span>'+escapeHtml(lead.operadora||"—")+'</span></div>'+
      '<div class="kv-row"><span class="k">Plano / categoria</span><span>'+escapeHtml(lead.categoria_plano||"—")+'</span></div>'+
      '<div class="kv-row"><span class="k">Valor mensal do contrato</span><span><b>'+fmtMoney(lead.valor_estimado||0)+'</b></span></div>'+
      '<div class="kv-row"><span class="k">Vidas</span><span>'+(lead.quantidade_vidas||"—")+'</span></div>'+
      '<div class="kv-row"><span class="k">Início de vigência</span><span>'+(lead.vigencia_inicio? fmtDateISO(lead.vigencia_inicio) : "—")+'</span></div>'+
    '</div>'+
    (podeEditarPlanoImplantacao()?
      '<button type="button" class="btn btn-ghost btn-sm" id="im-trocar-plano" style="justify-self:start;">✏️ Alterar operadora, plano, valor ou vigência</button>' :
      '<div class="muted" style="font-size:12px;">Alteração de plano/valor/vigência: só Henrique, Kelly e Alana.</div>')+
    (hist.length? '<div style="margin-top:6px;"><div class="muted" style="font-size:12px;font-weight:700;">Histórico de trocas</div>'+
      hist.slice().reverse().map(function(h){
        return '<div class="activity-item" style="margin-top:4px;"><div><span class="tag">'+escapeHtml(h.motivo||"Troca")+'</span> '+escapeHtml(resumoPlanoTexto(h.de||{}))+' <b>→</b> '+escapeHtml(resumoPlanoTexto(h.para||{}))+'</div>'+
          '<div class="meta">'+fmtDateTime(h.em)+(h.por? ' · '+escapeHtml(String(h.por).split("@")[0]) : '')+(h.obs? ' · '+escapeHtml(h.obs) : '')+'</div></div>';
      }).join("")+'</div>' : '')+
  '</fieldset>';
}
function openTrocaPlanoModal(lead){
  if(!podeEditarPlanoImplantacao()){ toast("Só Henrique, Kelly e Alana podem alterar o plano."); return; }
  var operadoraAtual = lead.operadora && OPERADORAS.indexOf(lead.operadora)===-1 ? "Outros" : (lead.operadora||"");
  var operadoraOutros = (lead.operadora && OPERADORAS.indexOf(lead.operadora)===-1) ? lead.operadora : "";
  var body =
    '<div class="helpbox">Use quando a operadora recusar o contrato ou o cliente mudar de plano. O negócio continua o mesmo: a meta, as vendas do mês e os relatórios passam a usar os valores novos, e a troca fica registrada no histórico.</div>'+
    '<div class="field row2"><div class="field"><label>Nova operadora</label><select id="tp-operadora"><option value="">—</option>'+
      OPERADORAS.map(function(o){ return '<option'+(operadoraAtual===o?' selected':'')+'>'+o+'</option>'; }).join("")+'</select></div>'+
      '<div class="field" id="tp-outros-wrap" style="'+(operadoraAtual==="Outros"?"":"display:none;")+'"><label>Qual operadora?</label><input id="tp-outros" value="'+escapeHtml(operadoraOutros)+'"></div></div>'+
    '<div class="field"><label>Plano / categoria</label><input id="tp-categoria" value="'+escapeHtml(lead.categoria_plano||"")+'" placeholder="ex: Alice Conforto, Amil S750..."></div>'+
    '<div class="field row2">'+moneyFieldHtml("tp-valor", lead.valor_estimado, "Novo valor mensal do contrato (R$)")+
      '<div class="field"><label>Vidas</label><input type="number" min="0" step="1" id="tp-vidas" value="'+(lead.quantidade_vidas||"")+'"></div></div>'+
    '<div class="field row2"><div class="field"><label>Início de vigência</label><input type="date" id="tp-vigencia" value="'+escapeHtml((lead.vigencia_inicio||"").slice(0,10))+'"></div>'+
      '<div class="field"><label>Motivo da troca</label><select id="tp-motivo">'+MOTIVOS_TROCA_PLANO.map(function(m){ return '<option>'+m+'</option>'; }).join("")+'</select></div></div>'+
    '<div class="field"><label>Observação (opcional)</label><input id="tp-obs" placeholder="ex: Amil recusou por DLP; fechado Alice com vigência 01/11"></div>';
  openModal("Alterar plano — "+(lead.nome||lead.empresa||"negócio"), body, async function(closeFn){
    var opSel = document.getElementById("tp-operadora").value;
    var operadora = opSel==="Outros" ? document.getElementById("tp-outros").value.trim() : opSel;
    var novo = {
      operadora: operadora || null,
      categoria_plano: document.getElementById("tp-categoria").value.trim() || null,
      valor_estimado: parseMoneyBR(document.getElementById("tp-valor").value),
      quantidade_vidas: parseInt(document.getElementById("tp-vidas").value,10) || null,
      vigencia_inicio: document.getElementById("tp-vigencia").value || null
    };
    var antigo = {operadora: lead.operadora||null, categoria_plano: lead.categoria_plano||null, valor_estimado: lead.valor_estimado||0, quantidade_vidas: lead.quantidade_vidas||null, vigencia_inicio: lead.vigencia_inicio? String(lead.vigencia_inicio).slice(0,10) : null};
    var mudou = Object.keys(novo).some(function(k){ return String(novo[k]==null?"":novo[k]) !== String(antigo[k]==null?"":antigo[k]); });
    if(!mudou){ toast("Nada foi alterado."); return; }
    var btn = document.getElementById("modal-save"); if(btn){ btn.disabled = true; btn.textContent = "Salvando…"; }
    var r = await sb.from("leads").update(novo).eq("id", lead.id);
    if(r.error){
      console.error(r.error);
      if(btn){ btn.disabled = false; btn.textContent = "Salvar alteração"; }
      toast(/vigencia_inicio/.test(r.error.message||"") ? "Falta a atualização do banco (coluna de vigência)." : "Erro ao salvar: "+r.error.message);
      return;
    }
    var entrada = {em: new Date().toISOString(), por: currentUser(), motivo: document.getElementById("tp-motivo").value, obs: document.getElementById("tp-obs").value.trim(), de: antigo, para: novo};
    var imp = implantacaoDoLead(lead.id);
    var hist = historicoPlanoDe(lead.id).concat([entrada]);
    var patchImp = {historico_plano: hist};
    if(imp && imp.pre_cadastro && imp.pre_cadastro.data){
      var pc = JSON.parse(JSON.stringify(imp.pre_cadastro));
      pc.data.plano_nome = planoNomeDoLead(novo) || pc.data.plano_nome;
      pc.data.valor_contrato_total = novo.valor_estimado;
      if(novo.vigencia_inicio) pc.data.vigencia_inicio = novo.vigencia_inicio;
      patchImp.pre_cadastro = pc;
    }
    var ri = imp ? await sb.from("implantacoes").update(patchImp).eq("id", imp.id)
                 : await sb.from("implantacoes").insert(Object.assign({lead_id: lead.id, responsavel: "Kelly", criado_por: currentUser()}, patchImp));
    if(ri.error){ console.error(ri.error); toast("Plano salvo, mas o histórico não gravou: "+ri.error.message); }
    var cli = clienteDoLead(lead.id);
    if(cli){
      var patchCli = {plano_nome: planoNomeDoLead(novo) || cli.plano_nome, valor_contrato_total: novo.valor_estimado};
      if(novo.vigencia_inicio) patchCli.vigencia_inicio = novo.vigencia_inicio;
      var rc = await sb.from("clientes").update(patchCli).eq("id", cli.id);
      if(rc.error) console.error(rc.error);
      await reload("clientes");
    }
    await reload("leads");
    await reload("implantacoes");
    toast("Plano atualizado.");
    closeFn();
    var atualizado = state.leads.filter(function(x){ return x.id===lead.id; })[0];
    if(atualizado) openImplantacaoModal(atualizado);
  }, "Salvar alteração");
  var sel = document.getElementById("tp-operadora"), wrap = document.getElementById("tp-outros-wrap");
  if(sel && wrap) sel.addEventListener("change", function(){ wrap.style.display = sel.value==="Outros" ? "" : "none"; });
}

/* ================= RELATÓRIOS DE VENDAS =================
   Tudo calculado a partir dos negócios do funil que já foram "Ganho" (têm data_ganho).
   Situação de cada venda:
     Ativa          → implantação concluída ou já virou cliente
     Em implantação → ganho, ainda na aba Implantação
     Recusada       → voltou para "Perdido" com motivo de recusa da operadora
     Desistência    → voltou para "Perdido" por outro motivo (ex: "cliente desistiu")
   Comissão (só Henrique e Kelly veem): mesma regra do Financeiro — parcelas cheias
   (params.parcelas_cheias) + vitalício mensal (params.percentual_vitalicio), líquido de imposto. */
var relFiltro = {de:"", ate:"", vendedor:"", produto:"", operadora:"", situacao:""};
var REL_SITUACOES = ["Ativa","Em implantação","Recusada","Desistência"];
function relSituacao(l){
  if(l.etapa==="Perdido") return /recus/i.test(l.motivo_perda||"") ? "Recusada" : "Desistência";
  var imp = implantacaoDoLead(l.id);
  if((imp && imp.concluida) || clienteDoLead(l.id)) return "Ativa";
  return "Em implantação";
}
function relSituacaoPill(s){
  var cls = s==="Ativa" ? "pill-ok" : (s==="Em implantação" ? "pill-warn" : "pill-bad");
  return '<span class="pill '+cls+'">'+s+'</span>';
}
function relVendasTodas(){ return state.leads.filter(function(l){ return !!l.data_ganho; }); }
function relPrimeiroMes(){
  var ds = state.leads.map(function(l){ return l.data_ganho || l.criado_em; }).filter(Boolean).sort();
  return ds.length ? monthKeyFromISO(ds[0]) : todayMonthKey();
}
function relMeses(de, ate){
  var out = [], mk = de, n = 0;
  while(mk <= ate && n < 60){ out.push(mk); mk = monthKeyAdd(mk,1); n++; }
  return out;
}
function relValorContrato(l){
  var cli = clienteDoLead(l.id);
  return (cli && cli.valor_contrato_total) || l.valor_estimado || 0;
}
function relComissao(l){
  var p = state.params || {}, v = relValorContrato(l), liq = 1 - (p.taxa_imposto||0);
  var cli = clienteDoLead(l.id);
  return {
    parcelas: v * (p.parcelas_cheias||3) * liq,
    bonus: ((cli && cli.bonus_parcela4)||0) * liq,
    vitalicio: v * (p.percentual_vitalicio||0) * liq
  };
}
function relVendasFiltradas(){
  var f = relFiltro;
  return relVendasTodas().filter(function(l){
    var mk = monthKeyFromISO(l.data_ganho);
    if(f.de && mk < f.de) return false;
    if(f.ate && mk > f.ate) return false;
    if(f.vendedor && l.vendedor!==f.vendedor) return false;
    if(f.produto && l.produto!==f.produto) return false;
    if(f.operadora && (l.operadora||"—")!==f.operadora) return false;
    if(f.situacao && relSituacao(l)!==f.situacao) return false;
    return true;
  }).sort(function(a,b){ return (b.data_ganho||"") < (a.data_ganho||"") ? -1 : 1; });
}
function relSoma(arr, fn){ return arr.reduce(function(s,x){ return s + (fn(x)||0); }, 0); }
function relAgrupar(arr, chaveFn){
  var m = {}; arr.forEach(function(x){ var k = chaveFn(x) || "—"; (m[k] = m[k] || []).push(x); }); return m;
}
/* Previsão de comissão para um mês: carteira (clientes cadastrados) + vendas ainda em implantação. */
function relPrevisaoMes(mk){
  var carteira = faturamentoDoMes(mk, state.clientes, state.params);
  var novas = 0;
  state.leads.forEach(function(l){
    if(!l.data_ganho || l.etapa!=="Ganho" || clienteDoLead(l.id)) return;
    novas += faturamentoDoMes(mk, [{data_fechamento: l.vigencia_inicio || l.data_ganho, valor_contrato_total: l.valor_estimado||0, status:"Ativo"}], state.params);
  });
  return {carteira: carteira, novas: novas, total: carteira + novas};
}
function relTrocasDePlano(vendas){
  var n = 0, revertidas = 0;
  vendas.forEach(function(l){
    var h = historicoPlanoDe(l.id);
    if(h.length) n++;
    if(h.some(function(x){ return /recus/i.test(x.motivo||""); }) && l.etapa!=="Perdido") revertidas++;
  });
  return {comTroca: n, recusasRevertidas: revertidas};
}
function relSelect(id, rotulo, valores, atual, todos){
  return '<div class="field"><label>'+rotulo+'</label><select id="'+id+'"><option value="">'+(todos||"Todos")+'</option>'+
    valores.map(function(v){ var val = (typeof v==="object")? v[0] : v, lab = (typeof v==="object")? v[1] : v; return '<option value="'+escapeHtml(val)+'"'+(atual===val?' selected':'')+'>'+escapeHtml(lab)+'</option>'; }).join("")+'</select></div>';
}

function viewRelatorios(){
  var hoje = todayMonthKey(), inicio = relPrimeiroMes();
  if(!relFiltro.de) relFiltro.de = inicio;
  if(!relFiltro.ate) relFiltro.ate = hoje;
  var mesesOpc = relMeses(inicio < monthKeyAdd(hoje,-24) ? monthKeyAdd(hoje,-24) : inicio, hoje).map(function(mk){ return [mk, monthLabel(mk)]; });
  var verComissao = podeVerFinanceiro();
  var vendas = relVendasFiltradas();
  var sit = relAgrupar(vendas, relSituacao);
  var ativas = sit["Ativa"]||[], emImpl = sit["Em implantação"]||[], recusadas = sit["Recusada"]||[], desist = sit["Desistência"]||[];
  var validas = ativas.concat(emImpl);
  var valorValidas = relSoma(validas, relValorContrato);
  var vidasValidas = relSoma(validas, function(l){ return l.quantidade_vidas; });
  var trocas = relTrocasDePlano(vendas);
  var perdidasNegociacao = state.leads.filter(function(l){
    if(l.etapa!=="Perdido" || l.data_ganho) return false;
    var mk = monthKeyFromISO(l.etapa_atualizada_em || l.criado_em);
    return (!relFiltro.de || mk>=relFiltro.de) && (!relFiltro.ate || mk<=relFiltro.ate) && (!relFiltro.vendedor || l.vendedor===relFiltro.vendedor) && (!relFiltro.produto || l.produto===relFiltro.produto);
  });
  var conversao = (vendas.length + perdidasNegociacao.length) ? vendas.length/(vendas.length+perdidasNegociacao.length) : 0;
  var comParcelas = relSoma(validas, function(l){ var c = relComissao(l); return c.parcelas + c.bonus; });
  var comVitalicio = relSoma(validas, function(l){ return relComissao(l).vitalicio; });
  var meses = relMeses(relFiltro.de, relFiltro.ate);
  var metaPeriodo = relSoma(meses, metaValorDoMes);

  var header = '<div class="topbar"><div><h1>Relatórios de vendas</h1><div class="desc">Vendas fechadas no funil desde '+monthLabel(inicio)+' · situação, valores'+(verComissao? ' e previsão de comissão' : '')+'</div></div>'+
    '<div class="rowflex"><button class="btn btn-ghost" id="rel-voltar-funil">← Funil</button><button class="btn btn-primary" id="rel-exportar">Exportar Excel</button></div></div>';
  var filtros = '<div class="funil-filterbar">'+
    relSelect("rel-de","De", mesesOpc, relFiltro.de, "Início")+
    relSelect("rel-ate","Até", mesesOpc, relFiltro.ate, "Hoje")+
    relSelect("rel-vendedor","Vendedor(a)", VENDEDORES.concat(Object.keys(relAgrupar(relVendasTodas(), function(l){ return l.vendedor; })).filter(function(v){ return v!=="—" && VENDEDORES.indexOf(v)<0; })), relFiltro.vendedor)+
    relSelect("rel-produto","Produto", PRODUTOS, relFiltro.produto)+
    relSelect("rel-operadora","Operadora", Object.keys(relAgrupar(relVendasTodas(), function(l){ return l.operadora; })).sort(), relFiltro.operadora, "Todas")+
    relSelect("rel-situacao","Situação", REL_SITUACOES, relFiltro.situacao, "Todas")+
    ((relFiltro.vendedor||relFiltro.produto||relFiltro.operadora||relFiltro.situacao||relFiltro.de!==inicio||relFiltro.ate!==hoje)? '<button class="linklike" id="rel-limpar" style="padding-bottom:9px;">limpar</button>' : '')+
  '</div>';

  var tiles = '<div class="tiles">'+
    tile("Vendas fechadas", vendas.length, fmtMoney(relSoma(vendas, relValorContrato))+" em contratos mensais")+
    tile("Ativas", ativas.length, fmtMoney(relSoma(ativas, relValorContrato))+"/mês")+
    tile("Em implantação", emImpl.length, fmtMoney(relSoma(emImpl, relValorContrato))+"/mês")+
    tile("Recusadas pela operadora", recusadas.length, fmtMoney(relSoma(recusadas, relValorContrato))+(trocas.recusasRevertidas? " · "+trocas.recusasRevertidas+" revertida(s) com troca de plano" : ""))+
    tile("Desistências após fechar", desist.length, fmtMoney(relSoma(desist, relValorContrato)))+
    tile("Vendido (ativas + implantação)", fmtMoney(valorValidas), (metaPeriodo? fmtPct(valorValidas/metaPeriodo)+" da meta de "+fmtMoney(metaPeriodo) : "sem meta no período")+(vidasValidas? " · "+vidasValidas+" vidas" : ""))+
    tile("Ticket médio", fmtMoney(validas.length? valorValidas/validas.length : 0), "por contrato")+
    tile("Conversão", fmtPct(conversao), vendas.length+" ganhos × "+perdidasNegociacao.length+" perdidos na negociação")+
    (verComissao?
      tile("Comissão das vendas (parcelas)", fmtMoney(comParcelas), "líquido · "+(state.params.parcelas_cheias||3)+" parcelas por contrato")+
      tile("Vitalício gerado", fmtMoney(comVitalicio)+"/mês", "recorrente, líquido") : '')+
  '</div>';

  /* resumo por mês */
  var linhasMes = meses.map(function(mk){
    var vm = vendas.filter(function(l){ return monthKeyFromISO(l.data_ganho)===mk; });
    var g = relAgrupar(vm, relSituacao);
    var val = relSoma((g["Ativa"]||[]).concat(g["Em implantação"]||[]), relValorContrato);
    var meta = metaValorDoMes(mk);
    var com = relSoma((g["Ativa"]||[]).concat(g["Em implantação"]||[]), function(l){ var c = relComissao(l); return c.parcelas + c.bonus; });
    return {mk:mk, n:vm.length, ativas:(g["Ativa"]||[]).length, impl:(g["Em implantação"]||[]).length, rec:(g["Recusada"]||[]).length, des:(g["Desistência"]||[]).length,
      valor:val, perdido: relSoma((g["Recusada"]||[]).concat(g["Desistência"]||[]), relValorContrato), meta:meta, com:com};
  });
  var tabelaMes = '<div class="card"><div class="card-head"><h2>Resumo por mês</h2><div class="meta">pelo mês em que o negócio foi ganho</div></div><div class="card-body"><div class="tablewrap"><table class="grid"><thead><tr>'+
    '<th>Mês</th><th class="num">Fechadas</th><th class="num">Ativas</th><th class="num">Em implantação</th><th class="num">Recusadas</th><th class="num">Desistências</th><th class="num">Valor vendido</th><th class="num">Meta</th><th>Meta atingida</th><th class="num">Valor perdido</th>'+(verComissao? '<th class="num">Comissão (parcelas)</th>' : '')+
    '</tr></thead><tbody>'+
    linhasMes.map(function(r){
      var pct = r.meta ? r.valor/r.meta : 0;
      return '<tr><td>'+monthLabel(r.mk)+(r.mk===hoje?' <span class="tag">atual</span>':'')+'</td><td class="num">'+r.n+'</td><td class="num">'+r.ativas+'</td><td class="num">'+r.impl+'</td><td class="num">'+r.rec+'</td><td class="num">'+r.des+'</td>'+
        '<td class="num" style="white-space:nowrap;"><b>'+fmtMoney(r.valor)+'</b></td><td class="num" style="white-space:nowrap;">'+(r.meta? fmtMoney(r.meta) : '—')+'</td>'+
        '<td style="min-width:120px;">'+(r.meta? '<div style="display:flex;align-items:center;gap:6px;"><div style="flex:1;height:6px;border-radius:4px;background:var(--line);overflow:hidden;"><div style="height:100%;width:'+Math.min(100,Math.round(pct*100))+'%;background:'+(pct>=1?'var(--success)':'var(--navy)')+';"></div></div><span style="font-size:12px;">'+fmtPct(pct)+'</span></div>' : '<span class="muted">—</span>')+'</td>'+
        '<td class="num">'+(r.perdido? fmtMoney(r.perdido) : '—')+'</td>'+(verComissao? '<td class="num">'+fmtMoney(r.com)+'</td>' : '')+'</tr>';
    }).join("")+
    '</tbody></table></div></div></div>';

  /* por vendedor e por operadora */
  function tabelaGrupo(titulo, grupos){
    var chaves = Object.keys(grupos).sort(function(a,b){ return relSoma(grupos[b], relValorContrato) - relSoma(grupos[a], relValorContrato); });
    return '<div class="card"><div class="card-head"><h2>'+titulo+'</h2></div><div class="card-body"><div class="tablewrap"><table class="grid"><thead><tr><th>'+(titulo.indexOf("vendedor")>=0?"Vendedor(a)":"Operadora")+'</th><th class="num">Fechadas</th><th class="num">Ativas</th><th class="num">Em implantação</th><th class="num">Recusadas / desist.</th><th class="num">Valor vendido</th>'+(verComissao? '<th class="num">Comissão (parcelas)</th><th class="num">Vitalício/mês</th>' : '')+'</tr></thead><tbody>'+
      chaves.map(function(k){
        var arr = grupos[k], g = relAgrupar(arr, relSituacao), val = (g["Ativa"]||[]).concat(g["Em implantação"]||[]);
        return '<tr><td>'+escapeHtml(k)+'</td><td class="num">'+arr.length+'</td><td class="num">'+(g["Ativa"]||[]).length+'</td><td class="num">'+(g["Em implantação"]||[]).length+'</td><td class="num">'+((g["Recusada"]||[]).length+(g["Desistência"]||[]).length)+'</td><td class="num"><b>'+fmtMoney(relSoma(val, relValorContrato))+'</b></td>'+
          (verComissao? '<td class="num">'+fmtMoney(relSoma(val, function(l){ var c=relComissao(l); return c.parcelas+c.bonus; }))+'</td><td class="num">'+fmtMoney(relSoma(val, function(l){ return relComissao(l).vitalicio; }))+'</td>' : '')+'</tr>';
      }).join("")+
      '</tbody></table></div></div></div>';
  }
  var grupos = vendas.length ? '<div>'+tabelaGrupo("Por vendedor(a)", relAgrupar(vendas, function(l){ return l.vendedor; }))+tabelaGrupo("Por operadora", relAgrupar(vendas, function(l){ return l.operadora; }))+'</div>' : '';

  /* contratos */
  var tabelaContratos = '<div class="card"><div class="card-head"><h2>Contratos ('+vendas.length+')</h2><div class="meta">clique para abrir o negócio</div></div><div class="card-body">'+
    (vendas.length? '<div class="tablewrap"><table class="grid"><thead><tr>'+
      '<th>Cliente / empresa</th><th>Situação</th><th>Vendedor(a)</th><th>Operadora / plano</th><th class="num">Vidas</th><th class="num">Valor mensal</th><th>Ganho em</th><th>Vigência</th>'+(verComissao? '<th class="num">Comissão (parcelas)</th><th class="num">Vitalício/mês</th>' : '')+'<th>Obs.</th>'+
      '</tr></thead><tbody>'+
      vendas.map(function(l){
        var s = relSituacao(l), h = historicoPlanoDe(l.id), c = relComissao(l);
        var obs = [];
        if(h.length){ var ult = h[h.length-1]; obs.push('troca de plano ('+escapeHtml(ult.motivo||"")+'): '+escapeHtml((ult.de&&ult.de.operadora)||"—")+' → '+escapeHtml((ult.para&&ult.para.operadora)||"—")); }
        if(l.etapa==="Perdido" && l.motivo_perda) obs.push(escapeHtml(l.motivo_perda));
        return '<tr class="rowlink" data-rel-open-lead="'+l.id+'" style="cursor:pointer;">'+
          '<td><b>'+escapeHtml(l.empresa||l.nome||"—")+'</b>'+(l.empresa && l.nome? '<div class="muted" style="font-size:12px;">'+escapeHtml(l.nome)+'</div>' : '')+'</td>'+
          '<td>'+relSituacaoPill(s)+'</td><td>'+escapeHtml(l.vendedor||"—")+'</td>'+
          '<td>'+escapeHtml(l.operadora||"—")+(l.categoria_plano? '<div class="muted" style="font-size:12px;">'+escapeHtml(l.categoria_plano)+'</div>' : '')+'</td>'+
          '<td class="num">'+(l.quantidade_vidas||"—")+'</td><td class="num"><b>'+fmtMoney(relValorContrato(l))+'</b></td>'+
          '<td style="white-space:nowrap;">'+fmtDateISO(l.data_ganho)+'</td><td style="white-space:nowrap;">'+(l.vigencia_inicio? fmtDateISO(l.vigencia_inicio) : '—')+'</td>'+
          (verComissao? (s==="Ativa"||s==="Em implantação"? '<td class="num">'+fmtMoney(c.parcelas+c.bonus)+'</td><td class="num">'+fmtMoney(c.vitalicio)+'</td>' : '<td class="num muted">—</td><td class="num muted">—</td>') : '')+
          '<td style="font-size:12px;max-width:260px;">'+(obs.join(" · ")||'<span class="muted">—</span>')+'</td></tr>';
      }).join("")+
      '</tbody></table></div>' : '<div class="empty">Nenhuma venda com esses filtros.</div>')+
  '</div></div>';

  /* previsibilidade de comissão */
  var previsao = '';
  if(verComissao){
    var metaFat = state.params.meta_mensal_padrao||0;
    var prox = []; for(var i=0;i<12;i++){ prox.push(monthKeyAdd(hoje,i)); }
    var linhas = prox.map(function(mk){ return {mk:mk, p:relPrevisaoMes(mk)}; });
    previsao = '<div class="card"><div class="card-head"><h2>Previsibilidade de comissionamento — próximos 12 meses</h2><div class="meta">líquido de '+fmtPct(state.params.taxa_imposto||0)+' de imposto · carteira + vendas em implantação</div></div><div class="card-body"><div class="tablewrap"><table class="grid"><thead><tr>'+
      '<th>Mês</th><th class="num">Carteira (clientes)</th><th class="num">Vendas em implantação</th><th class="num">Total previsto</th>'+(metaFat? '<th class="num">Meta de faturamento</th><th class="num">Diferença</th>' : '')+
      '</tr></thead><tbody>'+
      linhas.map(function(r){
        var diff = r.p.total - metaFat;
        return '<tr><td>'+monthLabel(r.mk)+(r.mk===hoje?' <span class="tag">atual</span>':'')+'</td><td class="num">'+fmtMoney(r.p.carteira)+'</td><td class="num">'+fmtMoney(r.p.novas)+'</td><td class="num"><b>'+fmtMoney(r.p.total)+'</b></td>'+
          (metaFat? '<td class="num">'+fmtMoney(metaFat)+'</td><td class="num" style="color:'+(diff<0?'var(--danger)':'var(--success)')+'">'+fmtMoney(diff)+'</td>' : '')+'</tr>';
      }).join("")+
      '<tr><td><b>Total 12 meses</b></td><td class="num">'+fmtMoney(relSoma(linhas,function(r){return r.p.carteira;}))+'</td><td class="num">'+fmtMoney(relSoma(linhas,function(r){return r.p.novas;}))+'</td><td class="num"><b>'+fmtMoney(relSoma(linhas,function(r){return r.p.total;}))+'</b></td>'+(metaFat? '<td class="num">'+fmtMoney(metaFat*12)+'</td><td></td>' : '')+'</tr>'+
      '</tbody></table></div><div class="muted" style="font-size:12px;margin-top:8px;">Vendas em implantação entram com '+(state.params.parcelas_cheias||3)+' parcelas cheias a partir do mês de início da vigência (ou do mês do ganho, se a vigência ainda não foi preenchida) e depois o vitalício de '+fmtPct(state.params.percentual_vitalicio||0)+'. Recusadas e desistências não entram. Ao virar cliente, o cálculo passa a usar o cadastro do cliente.</div></div></div>';
  }
  return header + filtros + tiles + tabelaMes + previsao + grupos + tabelaContratos;
}
function exportarRelatoriosExcel(){
  if(!podeVerRelatorios()) return;
  var vendas = relVendasFiltradas(), verComissao = podeVerFinanceiro();
  var wb = XLSX.utils.book_new();
  var cabC = ["Cliente / empresa","Contato","Situação","Vendedor(a)","Produto","Operadora","Plano","Vidas","Valor mensal (R$)","Ganho em","Início vigência","Motivo (recusa/desistência)","Trocas de plano"];
  if(verComissao) cabC = cabC.concat(["Comissão parcelas (R$, líquido)","Vitalício/mês (R$, líquido)"]);
  var linhasC = vendas.map(function(l){
    var s = relSituacao(l), c = relComissao(l), h = historicoPlanoDe(l.id);
    var row = [l.empresa||l.nome||"", l.empresa? (l.nome||"") : "", s, l.vendedor||"", l.produto||"", l.operadora||"", l.categoria_plano||"", l.quantidade_vidas||"", Math.round(relValorContrato(l)*100)/100,
      l.data_ganho? fmtDateISO(l.data_ganho) : "", l.vigencia_inicio? fmtDateISO(l.vigencia_inicio) : "", l.etapa==="Perdido"? (l.motivo_perda||"") : "",
      h.map(function(x){ return (x.motivo||"")+": "+((x.de&&x.de.operadora)||"—")+" → "+((x.para&&x.para.operadora)||"—"); }).join(" | ")];
    if(verComissao){ var ok = s==="Ativa"||s==="Em implantação"; row.push(ok? Math.round((c.parcelas+c.bonus)*100)/100 : 0, ok? Math.round(c.vitalicio*100)/100 : 0); }
    return row;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cabC].concat(linhasC)), "Contratos");
  var meses = relMeses(relFiltro.de || relPrimeiroMes(), relFiltro.ate || todayMonthKey());
  var cabM = ["Mês","Fechadas","Ativas","Em implantação","Recusadas","Desistências","Valor vendido (R$)","Meta (R$)","% meta","Valor perdido (R$)"];
  if(verComissao) cabM.push("Comissão parcelas (R$)");
  var linhasM = meses.map(function(mk){
    var vm = vendas.filter(function(l){ return monthKeyFromISO(l.data_ganho)===mk; }), g = relAgrupar(vm, relSituacao);
    var val = (g["Ativa"]||[]).concat(g["Em implantação"]||[]), v = relSoma(val, relValorContrato), meta = metaValorDoMes(mk);
    var row = [monthLabel(mk), vm.length, (g["Ativa"]||[]).length, (g["Em implantação"]||[]).length, (g["Recusada"]||[]).length, (g["Desistência"]||[]).length, Math.round(v*100)/100, meta, meta? Math.round(v/meta*1000)/10+"%" : "", Math.round(relSoma((g["Recusada"]||[]).concat(g["Desistência"]||[]), relValorContrato)*100)/100];
    if(verComissao) row.push(Math.round(relSoma(val, function(l){ var c=relComissao(l); return c.parcelas+c.bonus; })*100)/100);
    return row;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cabM].concat(linhasM)), "Resumo por mês");
  if(verComissao){
    var hoje = todayMonthKey(), linhasP = [];
    for(var i=0;i<12;i++){ var mk = monthKeyAdd(hoje,i), p = relPrevisaoMes(mk); linhasP.push([monthLabel(mk), Math.round(p.carteira*100)/100, Math.round(p.novas*100)/100, Math.round(p.total*100)/100, state.params.meta_mensal_padrao||0]); }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Mês","Carteira (R$)","Vendas em implantação (R$)","Total previsto (R$)","Meta de faturamento (R$)"]].concat(linhasP)), "Previsão de comissão");
  }
  XLSX.writeFile(wb, "relatorio-vendas-oneplus-"+todayISO()+".xlsx");
}
function wireRelatorios(){
  if(state.tab!=="relatorios" || !podeVerRelatorios()) return;
  [["rel-de","de"],["rel-ate","ate"],["rel-vendedor","vendedor"],["rel-produto","produto"],["rel-operadora","operadora"],["rel-situacao","situacao"]].forEach(function(p){
    var el = document.getElementById(p[0]); if(el) el.onchange = function(){ relFiltro[p[1]] = el.value; render(); };
  });
  var limpar = document.getElementById("rel-limpar"); if(limpar) limpar.onclick = function(){ relFiltro = {de:"", ate:"", vendedor:"", produto:"", operadora:"", situacao:""}; render(); };
  var exp = document.getElementById("rel-exportar"); if(exp) exp.onclick = exportarRelatoriosExcel;
  var voltar = document.getElementById("rel-voltar-funil"); if(voltar) voltar.onclick = function(){ state.tab = "funil"; render(); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-rel-open-lead]"), function(tr){
    tr.onclick = function(){ openLeadDetailPanel(tr.getAttribute("data-rel-open-lead")); };
  });
}

/* ================= IMPLANTAÇÃO ================= */
function clienteDoLead(leadId){ return state.clientes.filter(function(c){ return c.lead_id===leadId; })[0]; }
function implantacaoDoLead(leadId){ return state.implantacoes.filter(function(i){ return i.lead_id===leadId; })[0]; }
/* A implantação só vira "Cliente" de verdade depois do onboarding (boas-vindas) — antes disso
   ela pode ser negada pela operadora, então não cadastramos como cliente ainda. */
var IMPLANTACAO_ETAPAS = ["A fazer","Documentos solicitados","Enviado à operadora","Confirmado pela operadora","Boas-vindas / Onboard"];
var ESTAGIO_ONBOARD = IMPLANTACAO_ETAPAS.length - 1;
function estagioImplantacao(imp){
  imp = imp || {};
  if(imp.boas_vindas_enviada) return ESTAGIO_ONBOARD;
  if(imp.implantacao_confirmada) return 3;
  if(imp.subiu_operadora) return 2;
  if(imp.documentos_solicitados) return 1;
  return 0;
}
async function setEstagioImplantacao(leadId, estagio){
  var imp = implantacaoDoLead(leadId);
  var patch = {documentos_solicitados: estagio>=1, subiu_operadora: estagio>=2, implantacao_confirmada: estagio>=3, boas_vindas_enviada: estagio>=ESTAGIO_ONBOARD};
  if(imp){ await dbUpdate("implantacoes", imp.id, patch); }
  else { patch.lead_id=leadId; patch.responsavel="Kelly"; await dbInsert("implantacoes", patch); }
}
function viewImplantacao(){
  var ganhos = state.leads.filter(function(l){
    if(l.etapa!=="Ganho") return false;
    var imp = implantacaoDoLead(l.id);
    return !(imp && imp.concluida);
  }).sort(function(a,b){ return (b.data_ganho||"")<(a.data_ganho||"")?-1:1; });
  var header = '<div class="topbar"><div><h1>Implantação</h1><div class="desc">Negócios ganhos — arraste o cartão (ou clique nele) · implantações concluídas somem daqui e continuam em Clientes</div></div></div>';
  if(ganhos.length===0) return header + '<div class="card"><div class="card-body"><div class="empty">Nenhum negócio ganho ainda — assim que marcar um negócio como "Ganho" no funil, ele aparece aqui.</div></div></div>';
  var byEstagio = IMPLANTACAO_ETAPAS.map(function(){ return []; });
  ganhos.forEach(function(l){ byEstagio[estagioImplantacao(implantacaoDoLead(l.id))].push(l); });
  var board = '<div class="kanban-board">'+IMPLANTACAO_ETAPAS.map(function(label, idx){
    var items = byEstagio[idx];
    return '<div class="kanban-col"><div class="kanban-col-head"><h3>'+label+'</h3><div class="meta">'+items.length+'</div></div>'+
      '<div class="kanban-col-body" data-drop-estagio-impl="'+idx+'">'+
      (items.length===0? '<div class="empty" style="padding:16px 6px;">Nenhuma.</div>' :
      items.map(function(l){
        var imp = implantacaoDoLead(l.id) || {};
        var cli = clienteDoLead(l.id);
        return '<div class="kanban-card" draggable="true" data-drag-impl-lead="'+l.id+'" data-open-impl="'+l.id+'">'+
          '<div class="k-title">'+escapeHtml(l.nome||l.empresa||"—")+'</div>'+
          '<div class="muted">'+fmtMoney(l.valor_estimado)+' · '+escapeHtml(imp.responsavel||"—")+'</div>'+
          (operadoraTag(l)? '<div style="margin-top:4px;">'+operadoraTag(l)+'</div>' : '')+
          (l.vigencia_inicio || historicoPlanoDe(l.id).length? '<div class="muted" style="margin-top:4px;font-size:12px;">'+(l.vigencia_inicio? 'vigência '+fmtDateISO(l.vigencia_inicio) : '')+(historicoPlanoDe(l.id).length? (l.vigencia_inicio?' · ':'')+'<span class="tag">plano trocado</span>' : '')+'</div>' : '')+
          (idx>=ESTAGIO_ONBOARD? '<div style="margin-top:4px;">'+(cli? '<span class="pill pill-ok">cadastro ok</span>' : '<span class="pill pill-warn">falta cadastro</span>')+'</div>' : '')+
          '<div class="rowflex k-actions kanban-card-noopen" style="margin-top:6px;">'+
            (idx===ESTAGIO_ONBOARD? '<button class="linklike" data-finalizar-implantacao="'+l.id+'">concluir</button>' : '')+
            '<button class="linklike" data-agendar-tarefa-lead="'+l.id+'">+ tarefa</button>'+
            '<button class="linklike" data-perdido-implantacao="'+l.id+'" style="color:var(--danger);">cliente desistiu</button>'+
            '<button class="linklike" data-excluir-implantacao="'+l.id+'" style="color:var(--danger);">excluir</button>'+
          '</div>'+
        '</div>';
      }).join(""))+
      '</div></div>';
  }).join("")+'</div>';
  return header + board;
}
/* Pré-cadastro: RG, CPF, dependentes, plano etc. já ficam registrados durante a implantação
   (documentos chegam aos poucos), mas guardados só em implantacoes.pre_cadastro (JSON) — não
   cria linha em "clientes" ainda. Reaproveita o mesmo formulário/leitura do cadastro real. */
function openPreCadastroModal(lead){
  var imp = implantacaoDoLead(lead.id) || {};
  var draft = imp.pre_cadastro || null;
  var seed = (draft && draft.data) || {produto: lead.produto, titular_nome: lead.nome, razao_social: lead.empresa, vendedor: lead.vendedor, valor_contrato_total: lead.valor_estimado, plano_nome: (planoNomeDoLead(lead)||""), vigencia_inicio: lead.vigencia_inicio||null, status:"Ativo", data_inclusao: todayISO()};
  var seedDeps = (draft && draft.deps) || [];
  openModal("Pré-cadastro (documentos) — "+(lead.nome||lead.empresa||"—"), clienteFormHtml(seed, seedDeps, {preCadastro:true}), function(closeFn){
    var parsed = readClienteForm();
    var patch = {pre_cadastro: parsed};
    var imp2 = implantacaoDoLead(lead.id);
    if(imp2){ dbUpdate("implantacoes", imp2.id, patch).then(function(){ openImplantacaoModal(lead); }); }
    else { patch.lead_id = lead.id; patch.responsavel = "Kelly"; dbInsert("implantacoes", patch).then(function(){ openImplantacaoModal(lead); }); }
    closeFn();
  }, "Salvar pré-cadastro");
  wireClienteFormExtra();
  wireClienteFormDeps();
  wireValoresPorFaixa(Object.assign({}, seed, {lead_id: lead.id}));
}

/* ===== Tabela comercializada já na IMPLANTAÇÃO (antes de virar cliente) ===== */
function tabelasDoLead(leadId){
  return state.tabelas_precos_cliente.filter(function(t){ return t.lead_id===leadId; })
    .sort(function(a,b){ return b.ano_vigencia-a.ano_vigencia; });
}
function simulacaoPorIdadesHtml(tabela, idades){
  var faixas = idades.map(function(i){ return faixaDaIdade(i); }).filter(Boolean);
  if(!tabela || !categoriasDaTabela(tabela).length) return '';
  if(!faixas.length) return '<fieldset><legend>Simular categorias</legend><div class="empty">Adicione as idades das vidas no negócio (Funil) para simular o valor total em cada categoria.</div></fieldset>';
  var linhas = categoriasDaTabela(tabela).map(function(cat){
    var total=0, ok=true; faixas.forEach(function(f){ var v = valorNaTabela(tabela, cat, f); if(v==null) ok=false; else total+=v; });
    return {cat:cat, total:total, ok:ok};
  }).sort(function(a,b){ return a.total-b.total; });
  var base = linhas[0].total;
  return '<fieldset class="op-upgrade"><legend>Simular categorias — '+faixas.length+' vida(s) da cotação</legend>'+
    '<div class="muted" style="font-size:13px;margin-bottom:10px;">Idades: '+idades.join(", ")+' anos. Total mensal em cada categoria desta tabela.</div>'+
    '<div class="tablewrap"><table class="grid"><thead><tr><th>Categoria</th><th class="num">Mensalidade total</th><th class="num">A mais que a de entrada</th></tr></thead><tbody>'+
    linhas.map(function(l,i){ return '<tr'+(i===0?' class="op-linha-atual"':'')+'><td>'+escapeHtml(l.cat)+(l.ok?'':' <span class="muted" style="font-size:12px;">(faixa sem valor)</span>')+'</td><td class="num"><b>'+fmtMoney(l.total)+'</b></td><td class="num">'+(i===0?'—':'+ '+fmtMoney(l.total-base))+'</td></tr>'; }).join("")+
    '</tbody></table></div></fieldset>';
}
function tabelaLeadBodyHtml(lead){
  var atual = tabelasDoLead(lead.id)[0] || null;
  return '<div id="histmodal-wrap">'+
    '<div class="helpbox" style="margin-bottom:12px;">Cadastre aqui a tabela que foi vendida (todas as categorias). Quando o negócio virar cliente, ela vai junto automaticamente — e fica disponível em <b>Clientes → tabela & upgrade</b>.</div>'+
    simulacaoPorIdadesHtml(atual, normalizarIdades(lead.idades))+
    (atual? '<fieldset><legend>Tabela comercializada — vigência '+atual.ano_vigencia+(atual.operadora?' · '+escapeHtml(atual.operadora):'')+'</legend>'+
      (atual.observacoes? '<div class="muted" style="font-size:13px;margin-bottom:8px;">'+escapeHtml(atual.observacoes)+'</div>' : '')+
      tabelaGridHtml(atual)+'</fieldset>' : '')+
    colarTabelaFormHtml(atual || {operadora: lead.operadora, ano_vigencia: new Date().getFullYear()})+
  '</div>';
}
function openTabelaLeadModal(lead){
  var close = openModal("Tabela comercializada — "+(lead.nome||lead.empresa||"—"), tabelaLeadBodyHtml(lead), function(closeFn){ closeFn(); }, "Fechar");
  var mEl = document.querySelector(".modal"); if(mEl) mEl.style.maxWidth = "min(1180px, 96vw)";
  openTabelaLeadModal.__wire(lead);
}
openTabelaLeadModal.__wire = function(lead){
  wireColarTabela({
    existentePorAno: function(ano){ return tabelasDoLead(lead.id).filter(function(t){ return t.ano_vigencia===ano; })[0]; },
    base: {lead_id: lead.id},
    onSaved: function(){
      var fresh = state.leads.filter(function(l){ return l.id===lead.id; })[0] || lead;
      var body = document.getElementById("modal-body");
      if(body){ body.innerHTML = tabelaLeadBodyHtml(fresh); openTabelaLeadModal.__wire(fresh); }
    }
  });
};
/* Liga o "colar tabela" (ler + salvar) para cliente ou para negócio em implantação. */
function wireColarTabela(ctx){
  var btnLer = document.getElementById("btn-ler-tabela");
  if(!btnLer) return;
  btnLer.onclick = function(){
    var lida = lerTabelaColada(document.getElementById("ct-texto").value);
    document.getElementById("ct-preview").innerHTML = previewTabelaColadaHtml(lida);
    if(lida.titulo && !document.getElementById("ct-desc").value) document.getElementById("ct-desc").value = lida.titulo;
    var txtLow = document.getElementById("ct-texto").value.toLowerCase();
    var opSel = document.getElementById("ct-operadora");
    var achou = OPERADORAS.filter(function(o){ return o!=="Outros" && txtLow.indexOf(o.toLowerCase())>=0; })[0];
    if(achou && opSel) opSel.value = achou;
    var bt = document.getElementById("btn-salvar-tabela-colada");
    if(!bt) return;
    bt.onclick = async function(){
      var ano = parseInt(document.getElementById("ct-ano").value,10) || new Date().getFullYear();
      var operadora = document.getElementById("ct-operadora").value;
      var desc = document.getElementById("ct-desc").value.trim();
      var nomes = Array.prototype.map.call(document.querySelectorAll(".ct-nome"), function(i){ return i.value.trim(); });
      if(nomes.some(function(n){ return !n; })){ toast("Dê um nome para cada categoria."); return; }
      if(new Set(nomes).size!==nomes.length){ toast("Há categorias com o mesmo nome — ajuste para ficarem diferentes."); return; }
      var novas = {};
      nomes.forEach(function(nm, i){ novas[nm] = {}; ANS_BANDS.forEach(function(b){ var row = lida.linhas[b.label]; if(row && row[i]!=null) novas[nm][b.label] = row[i]; }); });
      var existente = ctx.existentePorAno(ano);
      var r;
      if(existente){
        var merged = {}; Object.keys(existente.tabela||{}).forEach(function(k){ merged[k]=existente.tabela[k]; });
        Object.keys(novas).forEach(function(k){ merged[k]=novas[k]; });
        r = await sb.from("tabelas_precos_cliente").update(Object.assign({tabela:merged, operadora:operadora, observacoes: desc||existente.observacoes||null}, ctx.base)).eq("id", existente.id);
      } else {
        r = await sb.from("tabelas_precos_cliente").insert(Object.assign({ano_vigencia:ano, operadora:operadora, tabela:novas, observacoes: desc||null, criado_por:currentUser()}, ctx.base));
      }
      if(r.error){
        console.error(r.error);
        toast(/lead_id/.test(r.error.message||"") ? "Falta rodar a atualização do banco (SQL da tabela na implantação)." : "Erro ao salvar a tabela: "+r.error.message);
        return;
      }
      toast("Tabela "+ano+" salva com "+nomes.length+" categorias.");
      await reload("tabelas_precos_cliente");
      ctx.onSaved();
    };
  };
}

function openImplantacaoModal(lead){
  var imp = implantacaoDoLead(lead.id) || {};
  var cli = clienteDoLead(lead.id);
  var estagio = estagioImplantacao(imp);
  var mesAtual = todayMonthKey();
  var boletoEmDia = imp.boleto_mes_referencia === mesAtual;
  var tarefas = tarefasDoLead(lead.id);
  var preCadastroPreenchido = !!(imp.pre_cadastro && imp.pre_cadastro.data && (imp.pre_cadastro.data.titular_nome || imp.pre_cadastro.data.razao_social));
  var tabelaImp = cli ? tabelaAtualDoCliente(cli.id) : (tabelasDoLead(lead.id)[0]||null);
  var body =
    planoContratadoHtml(lead)+
    '<div class="helpbox op-tabela-imp">'+(tabelaImp?
      '📑 Tabela comercializada salva — '+categoriasDaTabela(tabelaImp).length+' categoria(s), vigência '+tabelaImp.ano_vigencia+'. <button class="linklike" id="im-tabela">ver tabela & simular upgrade</button>' :
      '📑 Tabela comercializada ainda não cadastrada. <button class="linklike" id="im-tabela">cadastrar a tabela vendida</button>')+'</div>'+
    '<div class="helpbox">'+(
      cli? '✅ Cadastro do cliente concluído — <b>'+escapeHtml(clienteLabel(cli))+'</b>.' :
      '📋 '+(preCadastroPreenchido? 'Pré-cadastro preenchido (RG, CPF, dependentes, plano...).' : 'Pré-cadastro ainda vazio — preencha assim que os documentos chegarem.')+
      ' <button class="linklike" id="im-pre-cadastro">'+(preCadastroPreenchido?'editar':'preencher')+' pré-cadastro</button>'+
      (estagio>=ESTAGIO_ONBOARD? ' · <button class="linklike" id="im-tornar-cliente">✅ tornar cliente</button>' : ' · <span class="muted">"tornar cliente" libera depois do onboard</span>')
    )+'</div>'+
    '<div class="field"><label>Etapa</label><select id="im-estagio">'+IMPLANTACAO_ETAPAS.map(function(e,i){ return '<option value="'+i+'"'+(estagio===i?' selected':'')+'>'+e+'</option>'; }).join("")+'</select></div>'+
    '<div class="field row2"><div class="field"><label>Responsável</label><select id="im-resp">'+TEAM.map(function(t){return '<option'+((imp.responsavel||"Kelly")===t?' selected':'')+'>'+t+'</option>';}).join("")+'</select></div><div class="field"></div></div>'+
    '<div class="field"><label>Observações do acompanhamento</label><textarea id="im-obs">'+escapeHtml(imp.observacoes||"")+'</textarea></div>'+
    (estagio>=3? (
      '<div class="rowflex"><span>Boleto de '+monthLabel(mesAtual)+': '+(boletoEmDia?'<span class="pill pill-ok">enviado</span>':'<span class="pill pill-warn">pendente</span>')+'</span>'+(boletoEmDia?'':' <button class="linklike" id="im-boleto-enviado">marcar como enviado</button>')+'</div>'
    ) : '<div class="muted" style="font-size:12px;">Avance até "Confirmado pela operadora" pra liberar o controle de boleto.</div>')+
    '<fieldset style="margin-top:12px;"><legend>Tarefas deste negócio</legend>'+
      '<button type="button" class="linklike" id="im-add-tarefa">+ nova tarefa</button>'+
      (tarefas.length? tarefas.map(function(t){
        return '<div class="activity-item" style="margin-top:6px;">'+
          '<div><span class="k-activity-icon">'+(ATIVIDADE_ICON[t.canal]||"•")+'</span> '+escapeHtml(t.titulo)+(t.status==="Concluída"?' <span class="pill pill-ok">concluída</span>':'')+'</div>'+
          '<div class="meta">'+escapeHtml(t.canal||"—")+' · '+fmtDateTime(t.vencimento_em)+(t.status!=="Concluída"?' · <button class="linklike" data-concluir-tarefa-lead="'+t.id+'">concluir</button>':'')+'</div>'+
        '</div>';
      }).join("") : '<div class="empty">Nenhuma tarefa ainda.</div>')+
    '</fieldset>';

  openModal("Implantação — "+(lead.nome||lead.empresa||"—"), body, function(closeFn){
    var novoEstagio = parseInt(document.getElementById("im-estagio").value,10);
    var resp = document.getElementById("im-resp").value;
    var obs = document.getElementById("im-obs").value.trim();
    var imp2 = implantacaoDoLead(lead.id);
    var patch = {
      documentos_solicitados: novoEstagio>=1, subiu_operadora: novoEstagio>=2, implantacao_confirmada: novoEstagio>=3, boas_vindas_enviada: novoEstagio>=ESTAGIO_ONBOARD,
      responsavel: resp, observacoes: obs
    };
    if(imp2){ dbUpdate("implantacoes", imp2.id, patch); }
    else { patch.lead_id = lead.id; dbInsert("implantacoes", patch); }
    closeFn();
  }, "Salvar");

  var tabelaBtn = document.getElementById("im-tabela");
  if(tabelaBtn) tabelaBtn.onclick = function(){ if(cli) openHistoricoModal(cli); else openTabelaLeadModal(lead); };
  var trocarPlanoBtn = document.getElementById("im-trocar-plano");
  if(trocarPlanoBtn) trocarPlanoBtn.onclick = function(){ openTrocaPlanoModal(lead); };
  var preCadastroBtn = document.getElementById("im-pre-cadastro");
  if(preCadastroBtn) preCadastroBtn.onclick = function(){ openPreCadastroModal(lead); };
  var tornarClienteBtn = document.getElementById("im-tornar-cliente");
  if(tornarClienteBtn) tornarClienteBtn.onclick = function(){
    var draft = imp.pre_cadastro;
    var seed = (draft && draft.data) || {titular_nome:lead.nome, razao_social:lead.empresa, produto:lead.produto, plano_nome:(planoNomeDoLead(lead)||""), vigencia_inicio: lead.vigencia_inicio||null, vendedor:lead.vendedor, valor_contrato_total:lead.valor_estimado, status:"Ativo"};
    seed.lead_id = lead.id;
    if(!seed.data_fechamento) seed.data_fechamento = lead.data_ganho||todayISO();
    if(!seed.data_inclusao) seed.data_inclusao = todayISO();
    var seedDeps = (draft && draft.deps) || [];
    openClienteModal(seed, function(){ openImplantacaoModal(lead); }, seedDeps);
  };
  var boletoBtn = document.getElementById("im-boleto-enviado");
  if(boletoBtn) boletoBtn.onclick = function(){
    var imp2 = implantacaoDoLead(lead.id);
    if(imp2) dbUpdate("implantacoes", imp2.id, {boleto_mes_referencia: todayMonthKey()}).then(function(){ openImplantacaoModal(lead); });
  };
  var addTarefaBtn = document.getElementById("im-add-tarefa");
  if(addTarefaBtn) addTarefaBtn.onclick = function(){ openLeadTarefaModal(lead, function(){ openImplantacaoModal(lead); }); };
  Array.prototype.forEach.call(document.querySelectorAll("#modal-body [data-concluir-tarefa-lead]"), function(btn){
    btn.onclick = function(){ setTarefaStatus(btn.getAttribute("data-concluir-tarefa-lead"), "Concluída").then(function(){ openImplantacaoModal(lead); }); };
  });
}
/* Conclui a implantação de um negócio (some da aba Implantação a partir daí). Se o
   cadastro do cliente ainda não foi completado, abre o formulário primeiro — a implantação
   só é marcada como concluída depois que o cliente é salvo. */
function finalizarImplantacao(leadId){
  var l = state.leads.filter(function(x){ return x.id===leadId; })[0];
  var cli = clienteDoLead(leadId);
  function marcarConcluida(){
    var imp = implantacaoDoLead(leadId);
    var patch = {concluida:true, concluida_em:new Date().toISOString()};
    if(imp) dbUpdate("implantacoes", imp.id, patch);
    else { patch.lead_id=leadId; patch.responsavel="Kelly"; dbInsert("implantacoes", patch); }
  }
  if(!cli){
    if(!l) return;
    var imp0 = implantacaoDoLead(leadId);
    var draft = imp0 && imp0.pre_cadastro;
    var seed = (draft && draft.data) || {titular_nome:l.nome, razao_social:l.empresa, produto:l.produto, plano_nome:(planoNomeDoLead(l)||""), vigencia_inicio: l.vigencia_inicio||null, vendedor:l.vendedor, valor_contrato_total:l.valor_estimado, status:"Ativo"};
    seed.lead_id = leadId;
    if(!seed.data_fechamento) seed.data_fechamento = l.data_ganho||todayISO();
    if(!seed.data_inclusao) seed.data_inclusao = todayISO();
    openClienteModal(seed, marcarConcluida, (draft && draft.deps) || []);
    return;
  }
  if(!confirm('Concluir a implantação de "'+clienteLabel(cli)+'"? Ela vai sumir da aba Implantação (o cadastro continua em Clientes).')) return;
  marcarConcluida();
}
/* Botão "cliente desistiu" (ao lado de "excluir"): usado quando o negócio já foi marcado
   "Ganho" e está na Implantação, mas o cliente desiste antes de virar cliente de verdade
   (ex: no momento do boleto/contrato). Em vez de apagar o negócio, volta a etapa pra
   "Perdido" (reaproveitando o fluxo de motivo de perda já existente no Funil) — isso tira
   o valor automaticamente da meta e do histórico de vendas do mês (que só contam "Ganho"),
   mas mantém o registro do negócio pra histórico/relatório de motivos de perda. Veja também
   excluirImplantacao() logo abaixo, que apaga de vez (pra registros de teste/engano). */
/* Exclui de vez um negócio que não vai mais seguir (cliente desistiu etc.) — apaga o negócio,
   o pré-cadastro/implantação e as tarefas ligadas a ele. Se ele já tinha virado cliente de
   verdade, o cadastro em "Clientes" continua intacto (não é apagado por engano). Para manter
   o histórico (recomendado), use o botão "cliente desistiu" em vez deste. */
function excluirImplantacao(leadId){
  var l = state.leads.filter(function(x){ return x.id===leadId; })[0];
  if(!l) return;
  var cli = clienteDoLead(leadId);
  if(cli){ toast("Esse negócio já virou cliente — para remover, exclua o cliente pela aba Clientes."); return; }
  if(!confirm('Excluir "'+(l.nome||l.empresa||"esse negócio")+'" da implantação? Isso apaga o negócio, o pré-cadastro e as tarefas ligadas a ele — não pode ser desfeito.')) return;
  dbDelete("leads", leadId, ["implantacoes","tarefas"]);
}

/* ================= TAREFAS ================= */
var tarefasFilterTipo = "";
var tarefasViewMode = "lista"; // "lista" ou "kanban"
  var TAREFAS_DIAS_SOMEM_CONCLUIDA = 10; // dias após concluída até sumir da lista/kanban
  /* Uma tarefa concluída some da lista/kanban depois de N dias — mas nunca é apagada do banco,
     só deixa de aparecer aqui. Tarefas concluídas antes desta atualização (sem concluido_em
        registrado) continuam aparecendo, pra não sumir nada sem querer. */
  function tarefaVisivel(t){
    if(t.status!=="Concluída" || !t.concluido_em) return true;
    var dias = (Date.now() - new Date(t.concluido_em).getTime()) / 86400000;
    return dias < TAREFAS_DIAS_SOMEM_CONCLUIDA;
  }
  /* Cada pessoa só vê, na aba Tarefas, o que é dela: tarefas atribuídas a ela (responsavel)
     ou que ela mesma criou (criado_por) — assim quem agenda algo pra si mesmo é o único que
     vê, e quem agenda pra outra pessoa continua acompanhando junto com quem recebeu. */
  function tarefaMinha(t){
    var nome = currentUserName();
    var email = currentUser();
    return (!!nome && t.responsavel===nome) || (!!email && t.criado_por===email);
  }
  /* Centraliza a troca de status: registra quando a tarefa foi concluída (pra saber quando
     escondê-la depois) e limpa essa data se ela for reaberta. */
  function setTarefaStatus(id, status){
    var t = state.tarefas.filter(function(x){ return x.id===id; })[0];
    var patch = {status:status};
    patch.concluido_em = status==="Concluída" ? ((t && t.status==="Concluída" && t.concluido_em) ? t.concluido_em : new Date().toISOString()) : null;
    return dbUpdate("tarefas", id, patch);
  }
  function viewTarefas(){
    var hoje = todayISO();
    var list = state.tarefas.filter(function(t){ return (!tarefasFilterTipo || t.tipo===tarefasFilterTipo) && tarefaVisivel(t) && tarefaMinha(t); })
    .sort(function(a,b){ return (a.data_vencimento||"9999")<(b.data_vencimento||"9999")?-1:1; });
    return '<div class="topbar"><div><h1>Tarefas</h1><div class="desc">Mostrando só as suas — atribuídas a você ou criadas por você · concluídas somem daqui '+TAREFAS_DIAS_SOMEM_CONCLUIDA+' dias depois</div></div><button class="btn btn-primary" id="btn-nova-tarefa">+ Nova tarefa</button></div>'+
      '<div class="tabs2">'+ ['',...TIPOS_TAREFA].map(function(t){ return tabbtn("tarefa-tipo", t, t||"Todas", tarefasFilterTipo); }).join("") +'</div>'+
      '<div class="tabs2">'+tabbtn("tarefa-view","lista","☰ Lista",tarefasViewMode)+tabbtn("tarefa-view","kanban","▦ Kanban",tarefasViewMode)+'</div>'+
      (tarefasViewMode==="kanban" ? viewTarefasKanban(list, hoje) : viewTarefasLista(list, hoje));
  }
  function viewTarefasLista(list, hoje){
    return '<div class="card"><div class="tablewrap"><table class="grid"><thead><tr><th>Tipo</th><th>Título</th><th>Cliente / Negócio</th><th>Responsável</th><th>Vencimento</th><th>Status</th><th></th></tr></thead><tbody>'+
      (list.length===0? '<tr><td colspan="7"><div class="empty">Nenhuma tarefa por aqui.</div></td></tr>' :
       list.map(function(t){
         var cli = state.clientes.filter(function(c){return c.id===t.cliente_id;})[0];
         var lead = !cli && t.lead_id ? state.leads.filter(function(l){return l.id===t.lead_id;})[0] : null;
         var quem = cli ? escapeHtml(clienteLabel(cli)) : (lead ? escapeHtml(lead.nome||lead.empresa||"—")+' <span class="tag">Funil</span>' : '—');
         var atrasada = t.status!=="Concluída" && t.data_vencimento && t.data_vencimento<hoje;
         var quando = t.vencimento_em ? fmtDateTime(t.vencimento_em) : fmtDateISO(t.data_vencimento);
         return '<tr><td><span class="tag">'+t.tipo+'</span></td><td>'+escapeHtml(t.titulo)+(t.beneficiario_nome?' <span class="muted">('+escapeHtml(t.beneficiario_nome)+')</span>':'')+'</td>'+
           '<td>'+quem+'</td><td>'+escapeHtml(t.responsavel||"—")+'</td>'+
           '<td>'+(atrasada?'<span class="pill pill-bad">'+quando+'</span>':quando)+'</td>'+
           '<td><select class="tarefa-status" data-tarefa="'+t.id+'">'+STATUS_TAREFA.map(function(s){return '<option'+(t.status===s?' selected':'')+'>'+s+'</option>';}).join("")+'</select></td>'+
           '<td><button class="linklike" data-edit-tarefa="'+t.id+'">editar</button></td></tr>';
       }).join(""))+
      '</tbody></table></div></div>';
  }
  function viewTarefasKanban(list, hoje){
    var byStatus={}; STATUS_TAREFA.forEach(function(s){byStatus[s]=[];});
    list.forEach(function(t){ (byStatus[t.status]||(byStatus[t.status]=[])).push(t); });
    return '<div class="kanban-board">'+STATUS_TAREFA.map(function(status){
      var items = byStatus[status]||[];
      return '<div class="kanban-col"><div class="kanban-col-head"><h3>'+status+'</h3><div class="meta">'+items.length+'</div></div>'+
        '<div class="kanban-col-body">'+
        (items.length===0? '<div class="empty" style="padding:16px 6px;">Nada por aqui.</div>' :
         items.map(function(t){
           var cli = state.clientes.filter(function(c){return c.id===t.cliente_id;})[0];
           var lead = !cli && t.lead_id ? state.leads.filter(function(l){return l.id===t.lead_id;})[0] : null;
           var quem = cli ? clienteLabel(cli) : (lead ? (lead.nome||lead.empresa||"—") : "");
           var atrasada = t.status!=="Concluída" && t.data_vencimento && t.data_vencimento<hoje;
           var quando = t.vencimento_em ? fmtDateTime(t.vencimento_em) : fmtDateISO(t.data_vencimento);
           return '<div class="kanban-card">'+
             '<div class="k-title">'+escapeHtml(t.titulo)+'</div>'+
             '<div class="muted"><span class="tag">'+t.tipo+'</span> · '+escapeHtml(t.responsavel||"—")+'</div>'+
             (quem? '<div class="muted">'+escapeHtml(quem)+'</div>' : '')+
             '<div style="margin-top:4px;">'+(atrasada?'<span class="pill pill-bad">'+quando+'</span>':'<span class="muted">'+quando+'</span>')+'</div>'+
             '<select class="tarefa-status" data-tarefa="'+t.id+'">'+STATUS_TAREFA.map(function(s2){return '<option'+(t.status===s2?' selected':'')+'>'+s2+'</option>';}).join("")+'</select>'+
             '<div class="rowflex" style="margin-top:6px;"><button class="linklike" data-edit-tarefa="'+t.id+'">editar</button></div>'+
             '</div>';
         }).join(""))+
        '</div></div>';
    }).join("")+'</div>';
  }
function tarefaFormHtml(t){
  t=t||{tipo:"Tarefa",status:"Pendente",data_vencimento:todayISO()};
  return '<div class="field row2"><div class="field"><label>Tipo</label><select id="t-tipo">'+TIPOS_TAREFA.map(function(x){return '<option'+(t.tipo===x?' selected':'')+'>'+x+'</option>';}).join("")+'</select></div><div class="field"><label>Responsável</label><select id="t-resp">'+TEAM.map(function(x){return '<option'+(t.responsavel===x?' selected':'')+'>'+x+'</option>';}).join("")+'</select></div></div>'+
  '<div class="field"><label>Título</label><input id="t-titulo" value="'+escapeHtml(t.titulo||"")+'"></div>'+
  '<div class="field row2"><div class="field"><label>Cliente (opcional)</label><select id="t-cliente"><option value="">—</option>'+state.clientes.map(function(c){return '<option value="'+c.id+'"'+(t.cliente_id===c.id?' selected':'')+'>'+escapeHtml(clienteLabel(c))+'</option>';}).join("")+'</select></div><div class="field"><label>Beneficiário (opcional)</label><input id="t-benef" value="'+escapeHtml(t.beneficiario_nome||"")+'"></div></div>'+
  '<div class="field row3">'+dateTimeFieldHtml("t-venc", t.vencimento_em || (t.data_vencimento? t.data_vencimento+"T09:00:00" : null), "Vencimento")+'<div class="field"><label>Status</label><select id="t-status">'+STATUS_TAREFA.map(function(x){return '<option'+(t.status===x?' selected':'')+'>'+x+'</option>';}).join("")+'</select></div></div>'+
  '<div class="field"><label>Descrição</label><textarea id="t-desc">'+escapeHtml(t.descricao||"")+'</textarea></div>';
}
function openTarefaModal(existing){
  openModal(existing?"Editar tarefa":"Nova tarefa", tarefaFormHtml(existing), function(closeFn){
    var venc = readDateTime("t-venc");
    var data = {
      tipo: document.getElementById("t-tipo").value,
      responsavel: document.getElementById("t-resp").value,
      titulo: document.getElementById("t-titulo").value.trim(),
      cliente_id: document.getElementById("t-cliente").value || null,
      beneficiario_nome: document.getElementById("t-benef").value.trim(),
      data_vencimento: venc ? venc.dateOnly : null,
      vencimento_em: venc ? venc.iso : null,
      status: document.getElementById("t-status").value,
      descricao: document.getElementById("t-desc").value.trim()
    };
        data.concluido_em = data.status==="Concluída" ? ((existing && existing.status==="Concluída" && existing.concluido_em) ? existing.concluido_em : new Date().toISOString()) : null;
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
  return '<div class="field row2"><div class="field"><label>Cliente</label><select id="a-cliente">'+state.clientes.map(function(c){return '<option value="'+c.id+'"'+(a.cliente_id===c.id?' selected':'')+'>'+escapeHtml(clienteLabel(c))+'</option>';}).join("")+'</select></div><div class="field"><label>Beneficiário</label><input id="a-benef" value="'+escapeHtml(a.beneficiario_nome||"")+'"></div></div>'+
  '<div class="field row2"><div class="field"><label>Tipo</label><select id="a-tipo">'+TIPOS_AGENDAMENTO.map(function(t){return '<option'+(a.tipo===t?' selected':'')+'>'+t+'</option>';}).join("")+'</select></div><div class="field"><label>Especialidade</label><input id="a-esp" value="'+escapeHtml(a.especialidade||"")+'"></div></div>'+
  '<div class="field row2">'+dateTimeFieldHtml("a-venc", a.data_hora, "Data e hora")+'<div class="field"><label>Local (hospital, laboratório, médico)</label><input id="a-local" value="'+escapeHtml(a.local||"")+'"><div class="muted" style="font-size:11.5px;">Salve e depois use o link "📍 mapa" na lista para abrir o local no Google Maps.</div></div></div>'+
  '<div class="field"><label>Status</label><select id="a-status">'+STATUS_AGENDAMENTO.map(function(s){return '<option'+(a.status===s?' selected':'')+'>'+s+'</option>';}).join("")+'</select></div>'+
  '<div class="field"><label>Observações</label><textarea id="a-obs">'+escapeHtml(a.observacoes||"")+'</textarea></div>';
}
function openAgendModal(existing){
  openModal(existing?"Editar agendamento":"Novo agendamento", agendFormHtml(existing), function(closeFn){
    var venc = readDateTime("a-venc");
    var data = {
      cliente_id: document.getElementById("a-cliente").value || null,
      beneficiario_nome: document.getElementById("a-benef").value.trim(),
      tipo: document.getElementById("a-tipo").value,
      especialidade: document.getElementById("a-esp").value.trim(),
      data_hora: venc ? venc.iso : null,
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

/* ================= PÓS-VENDA (setor: relacionamento + atendimentos + boletos) ================= */
var posvendaSection = "relacionamento"; // "relacionamento" | "atendimentos" | "boletos"
var posvendaTab = "atencao";
/* Pós-venda agrupa os 3 serviços do setor num só lugar — cada um continua com sua própria
   tela (agendamentos/reembolsos, boletos, relacionamento), só a navegação principal some do
   menu lateral e vira sub-aba aqui dentro. */
function viewPosvenda(){
  var secNav = '<div class="topbar"><div><h1>Pós-venda</h1><div class="desc">Atendimentos, boletos e relacionamento com o cliente — tudo no mesmo setor</div></div></div>'+
    '<div class="tabs2">'+tabbtn("posvenda-sec","relacionamento","Relacionamento",posvendaSection)+tabbtn("posvenda-sec","atendimentos","Atendimentos",posvendaSection)+tabbtn("posvenda-sec","boletos","Boletos",posvendaSection)+'</div>';
  if(posvendaSection==="atendimentos") return secNav + viewAtendimentos();
  if(posvendaSection==="boletos") return secNav + viewBoletos();
  return secNav + viewRelacionamento();
}
function viewRelacionamento(){
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

  return '<div class="topbar" style="margin-top:14px;"><div><h2 style="margin:0;">Relacionamento</h2><div class="desc">Cadência de conteúdo e histórico</div></div><button class="btn btn-primary" id="btn-nova-interacao">+ Registrar interação</button></div>'+
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
/* ================= MODELOS DE CARÊNCIA (editor tipo planilha) ================= */
var modeloEdit = null; // {id?, nome, operadora, categorias:[...], itens:[{nome,unidade,valores:[...]}]}
function openModeloCarenciaModal(existing){
  modeloEdit = existing ? JSON.parse(JSON.stringify(existing)) : {nome:"", operadora:"", categorias:["Categoria 1"], itens:[]};
  if(!modeloEdit.categorias || !modeloEdit.categorias.length) modeloEdit.categorias = ["Categoria 1"];
  if(!modeloEdit.itens) modeloEdit.itens = [];
  openModal(existing?"Editar modelo de carência":"Novo modelo de carência", modeloEditorHtml(), async function(closeFn){
    readModeloEditorIntoState();
    var nome = document.getElementById("mc-nome").value.trim();
    var operadora = document.getElementById("mc-operadora").value.trim();
    if(!nome){ toast("Dê um nome ao modelo (ex: Porto Seguro — Linha P)."); return; }
    var data = {nome:nome, operadora:operadora, categorias:modeloEdit.categorias, itens:modeloEdit.itens};
    if(existing && existing.id){ await dbUpdate("carencia_modelos", existing.id, data); }
    else{ await dbInsert("carencia_modelos", data); }
    closeFn();
  }, "Salvar modelo");
  wireModeloEditor();
}
function modeloEditorHtml(){
  return '<div class="field row2"><div class="field"><label>Nome do modelo</label><input id="mc-nome" value="'+escapeHtml(modeloEdit.nome||"")+'" placeholder="ex: Porto Seguro — Linha P"></div><div class="field"><label>Operadora</label><input id="mc-operadora" value="'+escapeHtml(modeloEdit.operadora||"")+'" placeholder="ex: Porto Seguro"></div></div>'+
  '<div class="helpbox">Cada coluna é uma faixa/categoria (ex: "10 a 29 vidas"). Cada linha é um procedimento, com a carência (em dias ou meses) para cada faixa — deixe em branco quando não se aplica, ou 0 para "Isento".</div>'+
  '<div id="modelo-editor-body">'+modeloEditorBodyHtml()+'</div>';
}
function modeloEditorBodyHtml(){
  return '<div class="tablewrap"><table class="grid" id="mc-table"><thead><tr><th style="min-width:190px;">Procedimento</th><th style="min-width:90px;">Unidade</th>'+
    modeloEdit.categorias.map(function(cat,ci){
      return '<th style="min-width:150px;"><input class="mc-cat-input" data-cat-idx="'+ci+'" value="'+escapeHtml(cat)+'" style="width:100%;font-weight:600;"><button type="button" class="iconbtn" data-remove-cat="'+ci+'" title="Remover coluna" style="margin-top:4px;">✕</button></th>';
    }).join("")+
    '<th></th></tr></thead><tbody>'+
    (modeloEdit.itens.length===0? '<tr><td colspan="'+(modeloEdit.categorias.length+3)+'"><div class="empty">Nenhum procedimento ainda — clique em "+ linha" abaixo.</div></td></tr>' :
    modeloEdit.itens.map(function(item,ii){
      return '<tr>'+
        '<td><input class="mc-item-nome" data-item-idx="'+ii+'" value="'+escapeHtml(item.nome||"")+'" style="width:100%;"></td>'+
        '<td><select class="mc-item-unidade" data-item-idx="'+ii+'"><option value="dias"'+(item.unidade!=="meses"?' selected':'')+'>dias</option><option value="meses"'+(item.unidade==="meses"?' selected':'')+'>meses</option></select></td>'+
        modeloEdit.categorias.map(function(cat,ci){
          var v = (item.valores && item.valores[ci]!=null) ? item.valores[ci] : "";
          return '<td><input type="number" min="0" class="mc-item-valor" data-item-idx="'+ii+'" data-cat-idx="'+ci+'" value="'+v+'" style="width:80px;" placeholder="—"></td>';
        }).join("")+
        '<td><button type="button" class="iconbtn" data-remove-item="'+ii+'">✕</button></td>'+
      '</tr>';
    }).join(""))+
    '</tbody></table></div>'+
    '<div class="rowflex" style="margin-top:8px;gap:14px;"><button type="button" class="linklike" id="mc-add-cat">+ coluna (faixa/categoria)</button><button type="button" class="linklike" id="mc-add-item">+ linha (procedimento)</button></div>';
}
function readModeloEditorIntoState(){
  Array.prototype.forEach.call(document.querySelectorAll(".mc-cat-input"), function(inp){
    modeloEdit.categorias[parseInt(inp.getAttribute("data-cat-idx"),10)] = inp.value;
  });
  Array.prototype.forEach.call(document.querySelectorAll(".mc-item-nome"), function(inp){
    var idx = parseInt(inp.getAttribute("data-item-idx"),10);
    if(modeloEdit.itens[idx]) modeloEdit.itens[idx].nome = inp.value;
  });
  Array.prototype.forEach.call(document.querySelectorAll(".mc-item-unidade"), function(sel){
    var idx = parseInt(sel.getAttribute("data-item-idx"),10);
    if(modeloEdit.itens[idx]) modeloEdit.itens[idx].unidade = sel.value;
  });
  Array.prototype.forEach.call(document.querySelectorAll(".mc-item-valor"), function(inp){
    var ii = parseInt(inp.getAttribute("data-item-idx"),10), ci = parseInt(inp.getAttribute("data-cat-idx"),10);
    if(!modeloEdit.itens[ii]) return;
    if(!modeloEdit.itens[ii].valores) modeloEdit.itens[ii].valores = [];
    modeloEdit.itens[ii].valores[ci] = inp.value===""? null : parseFloat(inp.value);
  });
}
function rerenderModeloEditor(){
  var body = document.getElementById("modelo-editor-body");
  if(!body) return;
  body.innerHTML = modeloEditorBodyHtml();
  wireModeloEditor();
}
function wireModeloEditor(){
  var addCat = document.getElementById("mc-add-cat");
  if(addCat) addCat.onclick = function(){ readModeloEditorIntoState(); modeloEdit.categorias.push("Nova categoria"); rerenderModeloEditor(); };
  var addItem = document.getElementById("mc-add-item");
  if(addItem) addItem.onclick = function(){ readModeloEditorIntoState(); modeloEdit.itens.push({nome:"Novo procedimento", unidade:"dias", valores:[]}); rerenderModeloEditor(); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-remove-cat]"), function(btn){
    btn.onclick = function(){
      readModeloEditorIntoState();
      var idx = parseInt(btn.getAttribute("data-remove-cat"),10);
      if(modeloEdit.categorias.length<=1){ toast("O modelo precisa de pelo menos uma coluna."); return; }
      modeloEdit.categorias.splice(idx,1);
      modeloEdit.itens.forEach(function(it){ if(it.valores) it.valores.splice(idx,1); });
      rerenderModeloEditor();
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-remove-item]"), function(btn){
    btn.onclick = function(){ readModeloEditorIntoState(); modeloEdit.itens.splice(parseInt(btn.getAttribute("data-remove-item"),10),1); rerenderModeloEditor(); };
  });
}
function viewParametros(){
  var p = state.params;
  return '<div class="topbar"><div><h1>Parâmetros</h1><div class="desc">Premissas usadas nos cálculos</div></div></div>'+
  '<div class="card"><div class="card-body">'+
    '<div class="field row2"><div class="field"><label>Alíquota de imposto (%)</label><input type="number" step="0.1" id="p-imposto" value="'+(p.taxa_imposto*100)+'"></div><div class="field"><label>% vitalício mensal</label><input type="number" step="0.1" id="p-vitalicio" value="'+(p.percentual_vitalicio*100)+'"></div></div>'+
    '<div class="field row2">'+moneyFieldHtml("p-meta", p.meta_mensal_padrao||0, "Meta mensal padrão (R$)")+'<div class="field"><label>Nº parcelas cheias</label><input type="number" step="1" id="p-parcelas" value="'+(p.parcelas_cheias||3)+'"></div></div>'+
    '<div class="field row2"><div class="field"><label>Meta de vendas mensal (quantidade)</label><input type="number" step="1" id="p-meta-vendas" value="'+(p.meta_vendas_mensal||0)+'"></div><div class="field"></div></div>'+
    '<button class="btn btn-primary" id="btn-salvar-params" style="width:fit-content;">Salvar</button>'+
  '</div></div>'+
  '<div class="card"><div class="card-head"><h2>Modelos de carência</h2><div class="meta">quadros de operadoras/planos</div></div><div class="card-body">'+
  '<div class="helpbox">Cadastre aqui o quadro de carências de cada operadora/plano (como o da Porto Seguro — Linha P). Depois, no cadastro do cliente (fieldset "Plano anterior e carências"), escolha o modelo e a faixa certa e o sistema calcula sozinho a data em que cada carência termina, a partir da vigência (início).</div>'+
  (state.carencia_modelos.length===0? '<div class="empty">Nenhum modelo cadastrado ainda.</div>' :
  '<div class="tablewrap"><table class="grid"><thead><tr><th>Nome</th><th>Operadora</th><th>Procedimentos</th><th>Faixas</th><th></th></tr></thead><tbody>'+
  state.carencia_modelos.map(function(m){
    return '<tr><td>'+escapeHtml(m.nome)+'</td><td>'+escapeHtml(m.operadora||"—")+'</td><td>'+(m.itens||[]).length+'</td><td>'+(m.categorias||[]).length+'</td>'+
      '<td><button class="linklike" data-edit-modelo-carencia="'+m.id+'">editar</button> <button class="linklike" data-del-modelo-carencia="'+m.id+'" style="color:var(--danger);">excluir</button></td></tr>';
  }).join("")+
  '</tbody></table></div>')+
  '<button class="btn btn-ghost" id="btn-novo-modelo-carencia" style="margin-top:10px;">+ novo modelo de carência</button>'+
  '</div></div>'+
  '<div class="card"><div class="card-head"><h2>Equipe com acesso</h2></div><div class="card-body"><div class="helpbox">Para adicionar ou remover o acesso de alguém da equipe, use o painel do Supabase: Authentication &gt; Users. O e-mail cadastrado aqui é usado para saber "quem está logado" (para filtrar minhas tarefas e o sino de notificação) e para onde mandar o e-mail de tarefa vencendo.</div>'+
  '<div class="tablewrap"><table class="grid"><thead><tr><th>Nome</th><th>E-mail (notificações)</th><th></th></tr></thead><tbody>'+
  TEAM.map(function(t){
    var e = state.equipe.filter(function(x){return x.nome===t;})[0];
    return '<tr><td>'+t+'</td><td><input type="email" class="equipe-email" data-nome="'+t+'" value="'+escapeHtml(e?e.email:"")+'" placeholder="nome@oneplusseguros.com.br" style="max-width:280px;"></td><td><button class="linklike" data-salvar-equipe="'+t+'">salvar</button></td></tr>';
  }).join("")+
  '</tbody></table></div></div></div>';
}

/* ================= WIRE ================= */
function wireActions(){
  wireMoneyInputs(document);
  wireEmpresas();
  wireRelatorios();
  var btnRel = document.getElementById("btn-relatorios"); if(btnRel) btnRel.onclick = function(){ state.tab = "relatorios"; render(); window.scrollTo(0,0); };
  var btnNovoCliente = document.getElementById("btn-novo-cliente"); if(btnNovoCliente) btnNovoCliente.onclick=function(){openClienteModal(null);};
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-cliente]"), function(btn){ btn.onclick=function(){ var c=state.clientes.filter(function(x){return x.id===btn.getAttribute("data-edit-cliente");})[0]; openClienteModal(c); }; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-hist-cliente]"), function(btn){ btn.onclick=function(){ var c=state.clientes.filter(function(x){return x.id===btn.getAttribute("data-hist-cliente");})[0]; if(c) openHistoricoModal(c); }; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-acesso-cliente]"), function(btn){ btn.onclick=function(){ var c=state.clientes.filter(function(x){return x.id===btn.getAttribute("data-acesso-cliente");})[0]; if(c) acessoPortalModal(c); }; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-carencias-cliente]"), function(btn){ btn.onclick=function(){ var c=state.clientes.filter(function(x){return x.id===btn.getAttribute("data-carencias-cliente");})[0]; if(c) openCarenciasModal(c); }; });
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
  Array.prototype.forEach.call(document.querySelectorAll(".lead-etapa"), function(sel){ sel.onchange=function(){ requestEtapaChange(sel.getAttribute("data-lead"), sel.value, function(){ render(); }); }; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-drag-lead]"), function(card){
    card.addEventListener("dragstart", function(e){
      e.dataTransfer.setData("text/plain", card.getAttribute("data-drag-lead"));
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", function(){ card.classList.remove("dragging"); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-drop-etapa]"), function(col){
    col.addEventListener("dragover", function(e){ e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", function(){ col.classList.remove("drag-over"); });
    col.addEventListener("drop", function(e){
      e.preventDefault();
      col.classList.remove("drag-over");
      var leadId = e.dataTransfer.getData("text/plain");
      var novaEtapa = col.getAttribute("data-drop-etapa");
      if(leadId) requestEtapaChange(leadId, novaEtapa);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-open-lead]"), function(el){
    el.addEventListener("click", function(e){
      if(e.target.closest("select,button,.kanban-card-noopen")) return;
      openLeadDetailPanel(el.getAttribute("data-open-lead"));
    });
  });
  var ffBusca = document.getElementById("ff-busca");
  if(ffBusca){ ffBusca.oninput = function(){ funilFiltro.busca = ffBusca.value; render(); var el=document.getElementById("ff-busca"); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }; }
  var ffVendedor = document.getElementById("ff-vendedor"); if(ffVendedor) ffVendedor.onchange = function(){ funilFiltro.vendedor = ffVendedor.value; render(); };
  var ffProduto = document.getElementById("ff-produto"); if(ffProduto) ffProduto.onchange = function(){ funilFiltro.produto = ffProduto.value; render(); };
  var ffAtrasados = document.getElementById("ff-atrasados"); if(ffAtrasados) ffAtrasados.onchange = function(){ funilFiltro.atrasados = ffAtrasados.checked; render(); };
  var ffViewKanban = document.getElementById("ff-view-kanban"); if(ffViewKanban) ffViewKanban.onclick = function(){ funilView = "kanban"; render(); };
  var ffViewLista = document.getElementById("ff-view-lista"); if(ffViewLista) ffViewLista.onclick = function(){ funilView = "lista"; render(); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-finalizar-implantacao]"), function(btn){
    btn.onclick = function(){ finalizarImplantacao(btn.getAttribute("data-finalizar-implantacao")); };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-excluir-implantacao]"), function(btn){
    btn.onclick = function(){ excluirImplantacao(btn.getAttribute("data-excluir-implantacao")); };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-perdido-implantacao]"), function(btn){
    btn.onclick = function(){ requestEtapaChange(btn.getAttribute("data-perdido-implantacao"), "Perdido", undefined, function(){ render(); }); };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-drag-impl-lead]"), function(card){
    card.addEventListener("dragstart", function(e){
      e.dataTransfer.setData("text/plain", card.getAttribute("data-drag-impl-lead"));
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", function(){ card.classList.remove("dragging"); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-drop-estagio-impl]"), function(col){
    col.addEventListener("dragover", function(e){ e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", function(){ col.classList.remove("drag-over"); });
    col.addEventListener("drop", function(e){
      e.preventDefault();
      col.classList.remove("drag-over");
      var leadId = e.dataTransfer.getData("text/plain");
      var estagio = parseInt(col.getAttribute("data-drop-estagio-impl"),10);
      if(leadId) setEstagioImplantacao(leadId, estagio).then(function(){ render(); });
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-open-impl]"), function(el){
    el.addEventListener("click", function(e){
      if(e.target.closest("select,button,.kanban-card-noopen")) return;
      var l = state.leads.filter(function(x){return x.id===el.getAttribute("data-open-impl");})[0];
      if(l) openImplantacaoModal(l);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-boleto-historico],[data-boleto-cliente]"), function(btn){
    btn.onclick = function(){
      var id = btn.getAttribute("data-boleto-historico") || btn.getAttribute("data-boleto-cliente");
      var c = state.clientes.filter(function(x){return x.id===id;})[0];
      if(c) openBoletoHistoricoModal(c);
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-abrir-boleto-linha]"), function(tr){
    tr.addEventListener("click", function(e){
      if(e.target.closest("button")) return;
      var c = state.clientes.filter(function(x){return x.id===tr.getAttribute("data-abrir-boleto-linha");})[0];
      if(c) openBoletoModal(c, todayMonthKey());
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-abrir-financeiro-cliente]"), function(btn){
    btn.onclick = function(){
      var c = state.clientes.filter(function(x){return x.id===btn.getAttribute("data-abrir-financeiro-cliente");})[0];
      if(c) openFinanceiroModal(c);
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
  Array.prototype.forEach.call(document.querySelectorAll("[data-ver-historico-mes]"), function(tr){
    tr.addEventListener("click", function(){ openHistoricoMesModal(tr.getAttribute("data-ver-historico-mes")); });
  });
  var btnToggleHistoricoVendas = document.getElementById("btn-toggle-historico-vendas");
  if(btnToggleHistoricoVendas) btnToggleHistoricoVendas.onclick = function(){ historicoVendasAberto = !historicoVendasAberto; render(); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-agendar-tarefa-lead]"), function(btn){
    btn.onclick=function(){ var l=state.leads.filter(function(x){return x.id===btn.getAttribute("data-agendar-tarefa-lead");})[0]; if(l) openLeadTarefaModal(l); };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-concluir-tarefa-lead]"), function(btn){
        btn.onclick=function(){ setTarefaStatus(btn.getAttribute("data-concluir-tarefa-lead"), "Concluída"); };
  });

    Array.prototype.forEach.call(document.querySelectorAll("[data-tarefa-tipo-tab]"), function(el){ el.onclick=function(){ tarefasFilterTipo=el.getAttribute("data-tarefa-tipo-tab"); render(); }; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-tarefa-view-tab]"), function(el){ el.onclick=function(){ tarefasViewMode=el.getAttribute("data-tarefa-view-tab"); render(); }; });
  var btnNovaTarefa = document.getElementById("btn-nova-tarefa"); if(btnNovaTarefa) btnNovaTarefa.onclick=function(){openTarefaModal(null);};
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-tarefa]"), function(btn){ btn.onclick=function(){ var t=state.tarefas.filter(function(x){return x.id===btn.getAttribute("data-edit-tarefa");})[0]; openTarefaModal(t); }; });
    Array.prototype.forEach.call(document.querySelectorAll(".tarefa-status"), function(sel){ sel.onchange=function(){ setTarefaStatus(sel.getAttribute("data-tarefa"), sel.value); }; });

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

  Array.prototype.forEach.call(document.querySelectorAll("[data-posvenda-sec-tab]"), function(el){ el.onclick=function(){ posvendaSection=el.getAttribute("data-posvenda-sec-tab"); render(); }; });
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

  Array.prototype.forEach.call(document.querySelectorAll("[data-salvar-equipe]"), function(btn){
    btn.onclick = function(){
      var nome = btn.getAttribute("data-salvar-equipe");
      var input = document.querySelector('.equipe-email[data-nome="'+nome+'"]');
      var email = input.value.trim();
      if(!email){ toast("Informe um e-mail."); return; }
      var existing = state.equipe.filter(function(x){ return x.nome===nome; })[0];
      if(existing) dbUpdate("equipe", existing.id, {email:email});
      else dbInsert("equipe", {nome:nome, email:email});
    };
  });
  var btnSalvarParams = document.getElementById("btn-salvar-params");
  if(btnSalvarParams) btnSalvarParams.onclick=function(){
    saveParams({
      taxa_imposto: parseFloat(document.getElementById("p-imposto").value)/100, percentual_vitalicio: parseFloat(document.getElementById("p-vitalicio").value)/100, meta_mensal_padrao: parseMoneyBR(document.getElementById("p-meta").value), parcelas_cheias: parseInt(document.getElementById("p-parcelas").value,10)||3, meta_vendas_mensal: parseInt(document.getElementById("p-meta-vendas").value,10)||0 });
  };
  var btnNovoModeloCarencia = document.getElementById("btn-novo-modelo-carencia");
  if(btnNovoModeloCarencia) btnNovoModeloCarencia.onclick=function(){ openModeloCarenciaModal(null); };
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-modelo-carencia]"), function(btn){
    btn.onclick=function(){ var m=state.carencia_modelos.filter(function(x){return x.id===btn.getAttribute("data-edit-modelo-carencia");})[0]; openModeloCarenciaModal(m); };
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-del-modelo-carencia]"), function(btn){
    btn.onclick=function(){
      var id = btn.getAttribute("data-del-modelo-carencia");
      if(!confirm("Excluir este modelo de carência? Clientes que usam esse modelo deixam de calcular as datas automaticamente.")) return;
      dbDelete("carencia_modelos", id);
    };
  });
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
