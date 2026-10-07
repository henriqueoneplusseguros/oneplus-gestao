/* One Plus Gestão — movimento. Script clássico, sem dependências.
   Inclua depois do script do sistema. Respeita prefers-reduced-motion. Não altera dados: só anima o que já está na tela. */
(function () {
  var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var TRACO = 'M0 16 H70 L78 12 L86 16 H98 L106 2 L114 26 L122 9 L128 16 H162 L170 13 L178 16 H234';

  function linhaDePulso(extraClass) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 28');
    svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'op-pulso' + (extraClass ? ' ' + extraClass : ''));
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', TRACO);
    p.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(p);
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '236'); c.setAttribute('cy', '16'); c.setAttribute('r', '3.5');
    c.setAttribute('class', 'op-pulso-ponto');
    svg.appendChild(c);
    try { var len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 300); svg.style.setProperty('--len', len || 300); } catch (e) { svg.style.setProperty('--len', 300); }
    return svg;
  }

  // "R$ 49.998,95" -> {pre:"R$ ", num:49998.95, dec:2, suf:""}
  function lerNumero(txt) {
    if (!txt || /[\/:]/.test(txt)) return null;
    var m = /(-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?)/.exec(txt);
    if (!m) return null;
    var raw = m[1], dec = (raw.split(',')[1] || '').length;
    var num = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    if (!isFinite(num)) return null;
    return { pre: txt.slice(0, m.index), num: num, dec: dec, suf: txt.slice(m.index + raw.length) };
  }
  function formatar(n, dec) {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function contar(el) {
    var alvo = el.textContent, info = lerNumero(alvo);
    if (!info || info.num === 0) return;
    var t0 = null, dur = 900, ultimo = null;
    el.__opAnimando = true;
    el.classList.add('op-contando');
    function quadro(t) {
      if (ultimo !== null && el.textContent !== ultimo) { el.__opAnimando = false; el.classList.remove('op-contando'); return; } // o sistema atualizou o valor: para de animar
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      ultimo = k < 1 ? info.pre + formatar(info.num * e, info.dec) + info.suf : alvo;
      el.textContent = ultimo;
      if (k < 1) requestAnimationFrame(quadro); else { el.__opAnimando = false; el.classList.remove('op-contando'); }
    }
    requestAnimationFrame(quadro);
  }


  // ---------- Menu em coluna com grupos que expandem ----------
  var GRUPOS = [
    { nome: 'Comercial', itens: ['clientes', 'funil comercial'] },
    { nome: 'Implantação', itens: ['implantação', 'implantacao', 'funil de implantação'] },
    { nome: 'Concierge', itens: ['pós-venda', 'pos-venda', 'agenda', 'tarefas', 'reembolsos'] },
    { nome: 'Gestão', itens: ['financeiro', 'parâmetros', 'parametros'] },
    { nome: 'Experiência do cliente', itens: ['app do cliente', 'planos de gestão'] }
  ];
  var SOLTOS = ['painel'];
  function rotulo(el) { return (el.textContent || '').trim().toLowerCase(); }
  function lerAberto(n) { try { return localStorage.getItem('op-menu-' + n); } catch (e) { return null; } }
  function salvarAberto(n, v) { try { localStorage.setItem('op-menu-' + n, v ? '1' : '0'); } catch (e) {} }

  function agruparMenu() {
    var nav = document.querySelector('.sidebar nav');
    if (!nav || nav.querySelector('.op-grupo')) return;
    var itens = Array.prototype.slice.call(nav.querySelectorAll('.navitem'));
    if (itens.length < 4) return;
    var usados = [];
    var frag = document.createDocumentFragment();
    itens.forEach(function (it) { if (SOLTOS.indexOf(rotulo(it)) >= 0) { frag.appendChild(it); usados.push(it); } });
    GRUPOS.forEach(function (g) {
      var membros = itens.filter(function (it) { return usados.indexOf(it) < 0 && g.itens.indexOf(rotulo(it)) >= 0; });
      if (!membros.length) return;
      if (membros.length === 1 && g.nome.toLowerCase() === rotulo(membros[0])) { frag.appendChild(membros[0]); usados.push(membros[0]); return; }
      var box = document.createElement('div'); box.className = 'op-grupo';
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'op-grupo-btn';
      btn.innerHTML = '<svg class="op-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg><span></span><span class="op-grupo-n"></span>';
      btn.children[1].textContent = g.nome; btn.children[2].textContent = membros.length;
      var wrap = document.createElement('div'); wrap.className = 'op-grupo-itens';
      var inner = document.createElement('div'); wrap.appendChild(inner);
      membros.forEach(function (m) { inner.appendChild(m); usados.push(m); });
      box.appendChild(btn); box.appendChild(wrap);
      var salvo = lerAberto(g.nome);
      if (salvo === '1' || (salvo === null)) box.classList.add('aberto');
      btn.setAttribute('aria-expanded', box.classList.contains('aberto'));
      btn.addEventListener('click', function () {
        var ab = box.classList.toggle('aberto'); btn.setAttribute('aria-expanded', ab); salvarAberto(g.nome, ab);
      });
      frag.appendChild(box);
    });
    itens.forEach(function (it) { if (usados.indexOf(it) < 0) frag.appendChild(it); });
    nav.appendChild(frag);
  }
  function marcarGrupoAtivo() {
    var gs = document.querySelectorAll('.op-grupo');
    for (var i = 0; i < gs.length; i++) {
      var tem = !!gs[i].querySelector('.navitem.active');
      gs[i].classList.toggle('tem-ativo', tem);
      if (tem && !gs[i].classList.contains('aberto')) gs[i].classList.add('aberto');
    }
  }

  // ---------- Guia de cada módulo ("me ajude") ----------
  var GUIAS = {
    'painel': ['Comece o dia aqui', 'Veja quem precisa de cuidado nos cards em destaque', 'Confira metas e a projeção de faturamento', 'Clique em qualquer indicador para ir ao módulo'],
    'clientes': ['Como usar Clientes', 'Busque por nome, razão social, CNPJ ou CPF', 'Abra o cliente para ver contrato, vidas e faixa etária', 'Revisões em vermelho pedem contato com o cliente'],
    'funil comercial': ['Como usar o Funil Comercial', 'Cadastre em “+ Nova oportunidade”', 'Arraste o cartão para a próxima etapa', 'Negócio ganho segue sozinho para a Implantação'],
    'implantação': ['Como usar a Implantação', 'Cada contrato ganho aparece aqui automaticamente', 'Avance as etapas: documentos, assinatura, análise, carteirinhas, vigência', 'Pendências viram tarefas com prazo'],
    'tarefas': ['Como usar Tarefas', 'Vencidas aparecem primeiro', 'Conclua com um clique', 'Tarefas do funil e da implantação caem aqui'],
    'agenda': ['Como usar a Agenda', 'Consultas e exames agendados pelo concierge', 'Confirme com o cliente 24h antes', 'Registre o retorno depois do atendimento'],
    'pós-venda': ['Como usar o Pós-venda', 'Reembolsos, agendamentos e contatos proativos', 'Acompanhe cada pedido até a conclusão', 'Meta: o cliente nunca precisa falar com a operadora'],
    'financeiro': ['Como usar o Financeiro', 'Comissões das 3 primeiras parcelas e vitalício', 'Compare previsto e meta mês a mês', 'Impostos já descontados no líquido'],
    'parâmetros': ['Parâmetros', 'Metas de vendas e de vidas', 'Vendedores, operadoras e produtos', 'Alterações valem para toda a equipe']
  };
  function guiaPara(h1) {
    var t = (h1.textContent || '').trim().toLowerCase();
    for (var k in GUIAS) if (t.indexOf(k) === 0) return { chave: k, g: GUIAS[k] };
    return null;
  }
  function inserirGuia(topbar) {
    var h1 = topbar.querySelector('h1'); if (!h1) return;
    var info = guiaPara(h1); if (!info) return;
    var oculto = false; try { oculto = localStorage.getItem('op-guia-' + info.chave) === '0'; } catch (e) {}
    var guia = document.createElement('div'); guia.className = 'op-guia';
    guia.innerHTML = '<div class="op-guia-ic">i</div><div style="flex:1"><h4></h4><ol></ol></div><button type="button" class="op-guia-x">Ocultar</button>';
    guia.querySelector('h4').textContent = info.g[0];
    var ol = guia.querySelector('ol');
    info.g.slice(1).forEach(function (p) { var li = document.createElement('li'); li.textContent = p; ol.appendChild(li); });
    var abrir = document.createElement('button'); abrir.type = 'button'; abrir.className = 'op-guia-abrir'; abrir.textContent = 'Como funciona esta tela?';
    function mostrar(v) { guia.style.display = v ? '' : 'none'; abrir.style.display = v ? 'none' : ''; try { localStorage.setItem('op-guia-' + info.chave, v ? '1' : '0'); } catch (e) {} }
    guia.querySelector('.op-guia-x').addEventListener('click', function () { mostrar(false); });
    abrir.addEventListener('click', function () { mostrar(true); });
    topbar.insertAdjacentElement('afterend', guia);
    var alvo = h1.parentNode.querySelector('.op-pulso') || h1.parentNode.querySelector('.desc') || h1;
    alvo.insertAdjacentElement('afterend', abrir);
    guia.style.display = oculto ? 'none' : ''; abrir.style.display = oculto ? '' : 'none';
  }

  function marcar(lista) {
    for (var i = 0; i < lista.length; i++) lista[i].style.setProperty('--i', Math.min(i, 12));
  }

  function aplicar(root) {
    root = root || document;
    var body = document.body;
    if (!body) return;

    // linha de pulso na marca (uma vez)
    agruparMenu(); marcarGrupoAtivo();
    var brand = document.querySelector('.brand');
    if (brand && !brand.querySelector('.op-pulso')) brand.appendChild(linhaDePulso());

    // título de cada página ganha a linha de pulso logo abaixo
    var tops = document.querySelectorAll('.topbar');
    for (var t = 0; t < tops.length; t++) {
      var tb = tops[t];
      if (tb.getAttribute('data-op')) continue;
      tb.setAttribute('data-op', '1');
      var h1 = tb.querySelector('h1');
      var tela = h1 ? (h1.textContent || '').trim() : '';
      var mesmaTela = tela === telaAtual;
      telaAtual = tela;
      if (h1 && h1.parentNode) {
        var desc = h1.parentNode.querySelector('.desc');
        (desc || h1).insertAdjacentElement('afterend', linhaDePulso(mesmaTela ? 'op-estatico' : ''));
        inserirGuia(tb);
      }
      // nova tela: refaz a cascata e a contagem; mesma tela redesenhada: sem animar de novo
      body.classList.remove('op-anima');
      if (!mesmaTela && !reduz) { void body.offsetWidth; body.classList.add('op-anima'); }
      contarAgora = !mesmaTela;
    }

    marcar(document.querySelectorAll('.tiles > .tile'));
    marcar(document.querySelectorAll('.main > .card, .main > div > .card'));
    marcar(document.querySelectorAll('.kanban-col'));
    marcar(document.querySelectorAll('.op-care-grid > .op-care'));
    marcar(document.querySelectorAll('.op-plan-tier'));
    var tabelas = document.querySelectorAll('table.grid');
    for (var g = 0; g < tabelas.length; g++) marcar(tabelas[g].querySelectorAll('tbody tr'));

    // números dos indicadores chegam contando
    var vals = document.querySelectorAll('.tile .value, .op-hero-stat .v, [data-conta]');
    for (var v = 0; v < vals.length; v++) {
      var el = vals[v];
      if (el.__opAnimando || el.__opAlvo === el.textContent) continue;
      el.__opAlvo = el.textContent;
      if (!reduz && contarAgora) contar(el);
    }

    // meta batida: uma batida de comemoração
    var fills = document.querySelectorAll('.progress-fill');
    for (var f = 0; f < fills.length; f++) {
      var w = parseFloat(fills[f].style.width);
      fills[f].classList.toggle('op-meta-batida', w >= 100);
    }
  }

  var telaAtual = null, contarAgora = true;
  var agendado = false;
  function agendar() {
    if (agendado) return; agendado = true;
    requestAnimationFrame(function () { agendado = false; aplicar(document); });
  }

  function iniciar() {
    aplicar(document);
    if (window.MutationObserver) new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
  }

  window.OnePlus = { movimento: { iniciar: iniciar, aplicar: aplicar, linhaDePulso: linhaDePulso }, menu: { agrupar: agruparMenu, grupos: GRUPOS }, guias: GUIAS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
