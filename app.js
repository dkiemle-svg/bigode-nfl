// ============================================================================
// Bigode NFL — app.js
// Painel multiusuário: cada amigo tem login próprio, vê o mural de bilhetes
// compartilhados, marca quais "pegou" (com valor/retorno editável só dele) e
// tem financeiro e "minhas apostas" 100% individuais.
// ============================================================================
(function () {
  'use strict';

  var appEl = document.getElementById('app');

  var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // ---------------- estado global ----------------

  var state = {
    session: null,
    profiles: {},      // id -> {id, nome}
    bilhetes: [],       // todos os bilhetes (públicos entre logados)
    entradas: [],        // só as MINHAS entradas (RLS já filtra)
    loaded: false
  };

  var ui = {
    authMode: 'login',   // 'login' | 'signup'
    authError: '',
    authInfo: '',
    authBusy: false,
    activeTab: 'compartilhadas',
    toast: null,
    novoBilheteOpen: false,
    novoBilheteSelecoes: [{ descricao: '', jogo: '', data: '', hora: '' }],
    novoBilheteSalvando: false,
    novoBilheteArquivoImagem: null,   // File selecionado (guardado aqui pra sobreviver a re-renders)
    novoBilheteCampos: null,           // dados pré-preenchidos pela leitura automática (IA)
    novoBilheteLendo: false,
    editEntrada: null,   // id da entrada com o form de editar valor/odd aberto
    cashoutEntrada: null, // id da entrada com o form de cashout aberto
    pendingDeleteBilhete: null,
    aoVivoDados: null,      // último resultado da Edge Function "live-scores"
    aoVivoCarregando: false,
    aoVivoErro: '',
    aoVivoUltimaAtualizacao: null,
    filtros: {
      compartilhadas: { jogador: '', time: '', horario: '', casa: '', semana: '', status: '' },
      minhas: { jogador: '', time: '', horario: '', casa: '', semana: '', status: '' },
      cronograma: { jogador: '', time: '', horario: '', casa: '' },
      financeiro: { semana: '', casa: '' }
    }
  };
  var toastTimer = null;

  // ---------------- helpers de formatação ----------------

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtBRL(n) { return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function fmtOdd(n) { return (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  // Normaliza uma data pra "AAAA-MM-DD" estrito, aceitando alguns formatos
  // alternativos (ex.: a IA às vezes devolve DD-MM-AAAA ou DD/MM/AAAA em vez
  // do formato pedido). Se não reconhecer o formato, devolve null em vez de
  // arriscar interpretar os campos na ordem errada (o que gerava datas
  // completamente erradas — ex.: dia virando "ano").
  function normalizeYMD(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    var m, y, mo, da;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { y = m[1]; mo = m[2]; da = m[3]; }
    else if ((m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s))) { y = m[1]; mo = m[2]; da = m[3]; }
    else if ((m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s))) { y = m[3]; mo = m[2]; da = m[1]; }
    else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { y = m[3]; mo = m[2]; da = m[1]; }
    else return null;
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
  }
  function parseYMD(ymd) {
    var norm = normalizeYMD(ymd);
    if (!norm) return null;
    var parts = norm.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    // confere que a data "bateu" (evita rollover silencioso tipo dia 32)
    if (d.getFullYear() !== parts[0] || d.getMonth() !== parts[1] - 1 || d.getDate() !== parts[2]) return null;
    return d;
  }
  function todayYMD() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDateShort(ymd) {
    var d = parseYMD(ymd);
    if (!d) return '';
    var wd = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    var dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return wd + ' ' + dm;
  }
  function dayLabel(ymd) {
    var d = parseYMD(ymd);
    if (!d) return 'Data indefinida';
    var t = parseYMD(todayYMD());
    var diffDays = Math.round((d - t) / 86400000);
    if (diffDays === 0) return 'Hoje · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    if (diffDays === 1) return 'Amanhã · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    if (diffDays === -1) return 'Ontem · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    var wd = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    return wd.charAt(0).toUpperCase() + wd.slice(1) + ' · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  }

  // Temporada 2026 da NFL começa quarta 09/09/2026 (semana 1); cada semana de
  // calendário vai de terça a segunda, então a âncora é a terça anterior.
  var SEASON_WEEK1_START = '2026-09-08';
  function weekNumberFor(ymd) {
    var d = parseYMD(ymd);
    if (!d) return null;
    var start = parseYMD(SEASON_WEEK1_START);
    var diffDays = Math.round((d - start) / 86400000);
    if (diffDays < 0) return 1;
    var week = Math.floor(diffDays / 7) + 1;
    if (week > 18) return 'pos';
    return week;
  }
  function weekLabel(w) {
    if (w == null) return '';
    return w === 'pos' ? 'Pós-temporada' : ('Semana ' + w);
  }
  function itemPrimarySemana(item) {
    var datas = [];
    (item.selecoes || []).forEach(function (sel) { if (sel.data) datas.push(sel.data); });
    if (!datas.length) return null;
    datas.sort();
    return weekNumberFor(datas[0]);
  }

  function retorno(entrada) { return (Number(entrada.valor) || 0) * (Number(entrada.odd) || 0); }
  function lucro(entrada) {
    if (entrada.status === 'green') return retorno(entrada) - (Number(entrada.valor) || 0);
    if (entrada.status === 'red') return -(Number(entrada.valor) || 0);
    if (entrada.status === 'cashout') return (Number(entrada.valor_cashout) || 0) - (Number(entrada.valor) || 0);
    return 0;
  }
  function statusLabel(status) {
    if (status === 'green') return 'Green';
    if (status === 'red') return 'Red';
    if (status === 'cashout') return 'Cashout';
    return 'Pendente';
  }

  function extractJogador(descricao) {
    var idx = (descricao || '').indexOf(' — ');
    if (idx === -1) return null;
    var head = descricao.slice(0, idx).trim();
    if (!head || /^(mais|menos|para|ambos)\b/i.test(head)) return null;
    return head;
  }
  function extractTimes(jogo) {
    return (jogo || '').split(' x ').map(function (t) { return t.trim(); }).filter(Boolean);
  }
  function normCasa(s) { return (s || '').trim().toLowerCase(); }
  // Pega só o "mascote" do nome do time (ex.: "SF 49ers" -> "49ers") pra
  // conseguir casar com o que a ESPN devolve, já que nos bilhetes o time
  // costuma vir como "sigla + mascote".
  function mascotOf(s) {
    var parts = (s || '').trim().split(/\s+/);
    return parts.length ? parts[parts.length - 1].toLowerCase() : '';
  }
  function itemScheduleInfo(item) {
    var jogadores = {}, times = {}, horarios = [];
    (item.selecoes || []).forEach(function (sel) {
      var jogo = sel.jogo || item.evento;
      extractTimes(jogo).forEach(function (t) { times[t] = true; });
      var j = extractJogador(sel.descricao);
      if (j) jogadores[j] = true;
      if (sel.data) horarios.push({ data: sel.data, hora: sel.hora || '' });
    });
    if (!Object.keys(times).length) extractTimes(item.evento).forEach(function (t) { times[t] = true; });
    return { jogadores: Object.keys(jogadores), times: Object.keys(times), horarios: horarios };
  }
  function itemFiltroOpcoes(items) {
    var times = {}, casas = {}, horarios = {};
    items.forEach(function (b) {
      var info = itemScheduleInfo(b);
      info.times.forEach(function (t) { times[t] = true; });
      if (b.casa) { var ck = normCasa(b.casa); if (!casas[ck]) casas[ck] = b.casa.trim(); }
      info.horarios.forEach(function (h) {
        var key = h.data + '|' + h.hora;
        if (!horarios[key]) horarios[key] = { data: h.data, hora: h.hora, label: (dayLabel(h.data) + (h.hora ? ' · ' + h.hora : '')) };
      });
    });
    var horariosList = Object.keys(horarios).map(function (k) { return horarios[k]; });
    horariosList.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
    var casasList = Object.keys(casas).sort().map(function (k) { return casas[k]; });
    return { times: Object.keys(times).sort(), casas: casasList, horarios: horariosList };
  }
  function aplicaItemFiltro(items, filtro) {
    var termo = (filtro.jogador || '').trim().toLowerCase();
    return items.filter(function (b) {
      var info = itemScheduleInfo(b);
      if (termo) {
        var alvo = (info.jogadores.join(' ') + ' ' + b.evento + ' ' + (b.selecoes || []).map(function (s) { return s.descricao; }).join(' ')).toLowerCase();
        if (alvo.indexOf(termo) === -1) return false;
      }
      if (filtro.time && info.times.indexOf(filtro.time) === -1) return false;
      if (filtro.casa && normCasa(b.casa) !== normCasa(filtro.casa)) return false;
      if (filtro.horario) {
        var bate = info.horarios.some(function (h) { return (h.data + '|' + h.hora) === filtro.horario; });
        if (!bate) return false;
      }
      if (filtro.semana) {
        if (String(itemPrimarySemana(b)) !== filtro.semana) return false;
      }
      if (filtro.status) {
        if ((b.status || '') !== filtro.status) return false;
      }
      return true;
    });
  }

  // ---------------- toast ----------------

  function showToast(msg, ms) {
    ui.toast = msg;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast = null; render(); }, ms || 3600);
  }

  // ---------------- carga de dados ----------------

  var refreshTimer = null;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshAll, 250);
  }

  function refreshAll() {
    if (!state.session) return Promise.resolve();
    return Promise.all([
      sb.from('profiles').select('*'),
      sb.from('bilhetes').select('*').order('criado_em', { ascending: false }),
      sb.from('entradas').select('*').order('criado_em', { ascending: false })
    ]).then(function (results) {
      var profilesRes = results[0], bilhetesRes = results[1], entradasRes = results[2];
      if (profilesRes.error) console.error('profiles', profilesRes.error);
      if (bilhetesRes.error) console.error('bilhetes', bilhetesRes.error);
      if (entradasRes.error) console.error('entradas', entradasRes.error);

      var pmap = {};
      (profilesRes.data || []).forEach(function (p) { pmap[p.id] = p; });
      state.profiles = pmap;
      state.bilhetes = bilhetesRes.data || [];
      state.entradas = entradasRes.data || [];
      state.loaded = true;
      render();
    }).catch(function (err) {
      console.error('refreshAll falhou', err);
    });
  }

  var realtimeChannel = null;
  function subscribeRealtime() {
    if (realtimeChannel) return;
    realtimeChannel = sb.channel('bigode-nfl-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bilhetes' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleRefresh)
      .subscribe();
  }
  function unsubscribeRealtime() {
    if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
  }

  // ---------------- auth ----------------

  function handleAuthSubmit(email, password, nome) {
    ui.authError = '';
    ui.authInfo = '';
    ui.authBusy = true;
    render();
    var p = ui.authMode === 'signup'
      ? sb.auth.signUp({ email: email, password: password, options: { data: { nome: nome || email.split('@')[0] } } })
      : sb.auth.signInWithPassword({ email: email, password: password });

    p.then(function (res) {
      ui.authBusy = false;
      if (res.error) {
        ui.authError = traduzErroAuth(res.error.message);
        render();
        return;
      }
      if (ui.authMode === 'signup' && !res.data.session) {
        ui.authInfo = 'Conta criada! Verifique seu e-mail pra confirmar antes de entrar.';
        ui.authMode = 'login';
        render();
        return;
      }
      // sessão criada — onAuthStateChange cuida do resto
      render();
    }).catch(function (err) {
      ui.authBusy = false;
      ui.authError = 'Não deu pra falar com o servidor agora. Tente de novo.';
      render();
    });
  }

  function traduzErroAuth(msg) {
    if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha errados.';
    if (/User already registered/i.test(msg)) return 'Já existe uma conta com esse e-mail — tente entrar.';
    if (/Password should be/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
    return msg;
  }

  function handleLogout() {
    unsubscribeRealtime();
    pararAoVivo();
    sb.auth.signOut();
  }

  // ---------------- mutações: bilhetes ----------------

  function fileParaBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result || '';
        var idx = String(result).indexOf(',');
        resolve(idx >= 0 ? String(result).slice(idx + 1) : String(result));
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  function lerBilheteComIA() {
    var file = ui.novoBilheteArquivoImagem;
    if (!file) { showToast('Escolha a foto do print primeiro.'); return; }
    if (ui.novoBilheteLendo) return;
    ui.novoBilheteLendo = true;
    render();
    fileParaBase64(file).then(function (base64) {
      return sb.functions.invoke('parse-bilhete', {
        body: { imagem_base64: base64, media_type: file.type || 'image/jpeg' }
      });
    }).then(function (res) {
      ui.novoBilheteLendo = false;
      if (res.error) {
        showToast('Não deu pra ler o print: ' + res.error.message);
        render();
        return;
      }
      var dados = res.data;
      if (!dados || dados.erro) {
        showToast(dados && dados.erro ? dados.erro : 'Não consegui ler esse print. Preencha manualmente.');
        render();
        return;
      }
      ui.novoBilheteCampos = {
        casa: dados.casa || '',
        evento: dados.evento || '',
        codigo: dados.codigo || '',
        valor: (dados.valor === 0 || dados.valor) ? dados.valor : '',
        odd: (dados.odd === 0 || dados.odd) ? dados.odd : '',
        obs: dados.obs || ''
      };
      if (dados.selecoes && dados.selecoes.length) {
        ui.novoBilheteSelecoes = dados.selecoes.map(function (s) {
          return { descricao: s.descricao || '', jogo: s.jogo || '', data: normalizeYMD(s.data) || '', hora: s.hora || '' };
        });
      }
      showToast('Print lido! Confira os dados antes de postar.');
      render();
    }).catch(function () {
      ui.novoBilheteLendo = false;
      showToast('Não deu pra ler o print agora. Tente de novo ou preencha manualmente.');
      render();
    });
  }

  // ---------------- Ao vivo (placares) ----------------

  var aoVivoTimer = null;
  var AOVIVO_INTERVALO_MS = 45000;

  function fetchAoVivo(silencioso) {
    if (!silencioso) { ui.aoVivoCarregando = true; render(); }
    var hoje = todayYMD().replace(/-/g, '');
    sb.functions.invoke('live-scores', { body: { date: hoje } }).then(function (res) {
      ui.aoVivoCarregando = false;
      if (res.error) {
        ui.aoVivoErro = 'Não deu pra buscar os placares agora: ' + res.error.message;
        render();
        return;
      }
      var dados = res.data;
      if (!dados || dados.erro) {
        ui.aoVivoErro = (dados && dados.erro) ? dados.erro : 'Não deu pra ler os placares agora.';
        render();
        return;
      }
      ui.aoVivoErro = '';
      ui.aoVivoDados = dados;
      ui.aoVivoUltimaAtualizacao = new Date();
      render();
    }).catch(function () {
      ui.aoVivoCarregando = false;
      ui.aoVivoErro = 'Não deu pra buscar os placares agora. Confira se a função "live-scores" está publicada no Supabase.';
      render();
    });
  }

  function pararAoVivo() {
    clearInterval(aoVivoTimer);
    aoVivoTimer = null;
  }

  function iniciarAoVivo() {
    pararAoVivo();
    fetchAoVivo(false);
    aoVivoTimer = setInterval(function () { fetchAoVivo(true); }, AOVIVO_INTERVALO_MS);
  }

  // Acha, dentro do último resultado da ESPN, o jogo que bate com esse par
  // de times (ou só um time, se for o que a gente sabe).
  function espnEventFor(times) {
    if (!ui.aoVivoDados || !ui.aoVivoDados.events || !ui.aoVivoDados.events.length) return null;
    var wanted = (times || []).map(mascotOf).filter(Boolean);
    if (!wanted.length) return null;
    var events = ui.aoVivoDados.events;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var mCasa = mascotOf(ev.casa && ev.casa.mascote);
      var mFora = mascotOf(ev.fora && ev.fora.mascote);
      if (wanted.length >= 2) {
        if ((wanted.indexOf(mCasa) !== -1) && (wanted.indexOf(mFora) !== -1)) return ev;
      } else {
        if (mCasa === wanted[0] || mFora === wanted[0]) return ev;
      }
    }
    return null;
  }

  function uploadImagemBilhete(file) {
    var extMatch = /\.([a-z0-9]+)$/i.exec(file.name || '');
    var ext = (extMatch ? extMatch[1] : 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    var path = state.session.user.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    return sb.storage.from('bilhetes').upload(path, file, { cacheControl: '3600', upsert: false }).then(function (res) {
      if (res.error) throw res.error;
      var pub = sb.storage.from('bilhetes').getPublicUrl(path);
      return pub.data.publicUrl;
    });
  }

  function criarBilhete(data) {
    var payload = {
      criado_por: state.session.user.id,
      casa: data.casa.trim(),
      evento: data.evento.trim(),
      codigo: data.codigo.trim() || null,
      obs: data.obs.trim(),
      valor_referencia: Number(data.valor),
      odd_referencia: Number(data.odd),
      selecoes: data.selecoes,
      imagem_url: data.imagemUrl || null
    };
    sb.from('bilhetes').insert(payload).then(function (res) {
      ui.novoBilheteSalvando = false;
      if (res.error) { showToast('Não deu pra postar o bilhete: ' + res.error.message); render(); return; }
      ui.novoBilheteOpen = false;
      ui.novoBilheteSelecoes = [{ descricao: '', jogo: '', data: '', hora: '' }];
      ui.novoBilheteArquivoImagem = null;
      ui.novoBilheteCampos = null;
      showToast('Bilhete postado!');
      refreshAll();
    });
  }

  function excluirBilhete(id) {
    sb.from('bilhetes').delete().eq('id', id).then(function (res) {
      if (res.error) { showToast('Não deu pra excluir: ' + res.error.message); return; }
      ui.pendingDeleteBilhete = null;
      showToast('Bilhete excluído.');
      refreshAll();
    });
  }

  // ---------------- mutações: entradas (minha aposta em cima de um bilhete) ----------------

  function minhaEntradaPara(bilheteId) {
    var uid = state.session.user.id;
    return state.entradas.find(function (e) { return e.bilhete_id === bilheteId && e.user_id === uid; }) || null;
  }

  function marcarQuePeguei(bilhete) {
    var payload = {
      bilhete_id: bilhete.id,
      user_id: state.session.user.id,
      valor: Number(bilhete.valor_referencia) || 0,
      odd: Number(bilhete.odd_referencia) || 0,
      status: 'pendente'
    };
    sb.from('entradas').insert(payload).then(function (res) {
      if (res.error) { showToast('Não deu pra marcar: ' + res.error.message); return; }
      showToast('Marcado — foi pra "Minhas apostas".');
      refreshAll();
    });
  }

  function desmarcarEntrada(entradaId) {
    sb.from('entradas').delete().eq('id', entradaId).then(function (res) {
      if (res.error) { showToast('Não deu pra desmarcar: ' + res.error.message); return; }
      showToast('Desmarcado.');
      refreshAll();
    });
  }

  function salvarEdicaoEntrada(entradaId, valor, odd) {
    sb.from('entradas').update({ valor: Number(valor), odd: Number(odd) }).eq('id', entradaId).then(function (res) {
      if (res.error) { showToast('Não deu pra salvar: ' + res.error.message); return; }
      ui.editEntrada = null;
      showToast('Valor/retorno atualizados.');
      refreshAll();
    });
  }

  function marcarEntrada(entradaId, status) {
    sb.from('entradas').update({ status: status, resolvido_em: new Date().toISOString(), valor_cashout: null }).eq('id', entradaId).then(function (res) {
      if (res.error) { showToast('Não deu pra marcar: ' + res.error.message); return; }
      refreshAll();
    });
  }

  function cashoutEntrada(entradaId, valorCashout) {
    sb.from('entradas').update({ status: 'cashout', resolvido_em: new Date().toISOString(), valor_cashout: Number(valorCashout) }).eq('id', entradaId).then(function (res) {
      if (res.error) { showToast('Não deu pra fazer cashout: ' + res.error.message); return; }
      ui.cashoutEntrada = null;
      refreshAll();
    });
  }

  function reabrirEntrada(entradaId) {
    sb.from('entradas').update({ status: 'pendente', resolvido_em: null, valor_cashout: null }).eq('id', entradaId).then(function (res) {
      if (res.error) { showToast('Não deu pra reabrir: ' + res.error.message); return; }
      refreshAll();
    });
  }

  // ---------------- render: tela de login/cadastro ----------------

  function renderAuthScreen() {
    var isSignup = ui.authMode === 'signup';
    var out = '<div class="auth-shell">';
    out += '<div style="text-align:center"><div class="app-title">🎟️ Bigode NFL</div><p class="app-subtitle">Painel do grupo — cada um com sua conta e seu financeiro.</p></div>';
    out += '<div class="auth-card">';
    out += '<div class="auth-title">' + (isSignup ? 'Criar conta' : 'Entrar') + '</div>';
    if (ui.authError) out += '<div class="auth-error">' + escapeHtml(ui.authError) + '</div>';
    if (ui.authInfo) out += '<div class="auth-error" style="background:var(--win-tint);color:var(--win)">' + escapeHtml(ui.authInfo) + '</div>';
    out += '<form data-form="auth">';
    if (isSignup) {
      out += '<div class="auth-field"><label>Seu nome</label><input name="nome" type="text" placeholder="Como te chamam no grupo" required></div>';
    }
    out += '<div class="auth-field"><label>E-mail</label><input name="email" type="email" required autocomplete="email"></div>';
    out += '<div class="auth-field"><label>Senha</label><input name="password" type="password" required minlength="6" autocomplete="' + (isSignup ? 'new-password' : 'current-password') + '"></div>';
    out += '<button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:4px" ' + (ui.authBusy ? 'disabled' : '') + '>' + (ui.authBusy ? 'Aguarde…' : (isSignup ? 'Criar conta' : 'Entrar')) + '</button>';
    out += '</form>';
    out += '<div class="auth-toggle">';
    out += isSignup ? 'Já tem conta? ' : 'Ainda não tem conta? ';
    out += '<button type="button" data-action="auth-toggle">' + (isSignup ? 'Entrar' : 'Criar conta') + '</button>';
    out += '</div>';
    out += '</div>';
    out += '</div>';
    return out;
  }

  // ---------------- render: shell do app ----------------

  function meuNome() {
    var p = state.profiles[state.session.user.id];
    return p ? p.nome : (state.session.user.email || 'Você');
  }
  function nomeDe(userId) {
    var p = state.profiles[userId];
    return p ? p.nome : 'alguém';
  }

  function tabButton(key, label, count) {
    var active = ui.activeTab === key;
    return '<button type="button" class="tab-btn' + (active ? ' active' : '') + '" data-action="switch-tab" data-tab="' + key + '">'
      + escapeHtml(label) + (count != null ? ' <span class="tab-count">' + count + '</span>' : '') + '</button>';
  }

  function meusMapaEntradas() {
    var map = {};
    state.entradas.forEach(function (e) { map[e.bilhete_id] = e; });
    return map;
  }

  function renderApp() {
    var minhasEntradas = state.entradas;
    var pendCount = minhasEntradas.filter(function (e) { return e.status === 'pendente'; }).length;
    var resolvCount = minhasEntradas.filter(function (e) { return e.status !== 'pendente'; }).length;

    var out = '';
    if (ui.toast) out += '<div class="toast">' + escapeHtml(ui.toast) + '</div>';
    out += '<div class="app-shell">';
    out += '<header class="app-header">';
    out += '<div><h1 class="app-title">🎟️ Bigode NFL</h1><p class="app-subtitle">Painel do grupo — bilhetes compartilhados, cada um com sua própria aposta e seu financeiro.</p></div>';
    out += '<div class="header-pills">';
    out += '<span class="pill pill-accent">Você: ' + escapeHtml(meuNome()) + '</span>';
    out += '<button type="button" class="btn btn-ghost btn-sm" data-action="logout">Sair</button>';
    out += '</div>';
    out += '</header>';
    out += '<nav class="tabs">';
    out += tabButton('compartilhadas', 'Apostas Compartilhadas', state.bilhetes.length);
    out += tabButton('minhas', 'Minhas Apostas', minhasEntradas.length);
    out += tabButton('financeiro', 'Financeiro', null);
    out += tabButton('cronograma', 'Cronograma', null);
    out += tabButton('aovivo', '🔴 Ao Vivo', null);
    out += '</nav>';
    out += '<main class="panel">';
    if (ui.activeTab === 'minhas') out += renderMinhasTab();
    else if (ui.activeTab === 'financeiro') out += renderFinanceiroTab();
    else if (ui.activeTab === 'cronograma') out += renderCronogramaTab();
    else if (ui.activeTab === 'aovivo') out += renderAoVivoTab();
    else out += renderCompartilhadasTab();
    out += '</main>';
    out += '</div>';
    return out;
  }

  // ---------------- render: filtro genérico ----------------

  var FILTRO_CAMPOS = {
    jogador: function (opcoes, filtro, t) {
      return '<div class="field"><label>Jogador</label><input type="text" ' + t + ' data-filter="jogador" placeholder="Buscar jogador…" value="' + escapeHtml(filtro.jogador || '') + '"></div>';
    },
    time: function (opcoes, filtro, t) {
      return '<div class="field"><label>Time</label><select ' + t + ' data-filter="time"><option value="">Todos</option>'
        + opcoes.times.map(function (v) { return '<option value="' + escapeHtml(v) + '"' + (filtro.time === v ? ' selected' : '') + '>' + escapeHtml(v) + '</option>'; }).join('')
        + '</select></div>';
    },
    horario: function (opcoes, filtro, t) {
      return '<div class="field"><label>Horário</label><select ' + t + ' data-filter="horario"><option value="">Todos</option>'
        + opcoes.horarios.map(function (h) {
          var val = h.data + '|' + h.hora;
          return '<option value="' + escapeHtml(val) + '"' + (filtro.horario === val ? ' selected' : '') + '>' + escapeHtml(h.label) + '</option>';
        }).join('')
        + '</select></div>';
    },
    casa: function (opcoes, filtro, t) {
      return '<div class="field"><label>Casa</label><select ' + t + ' data-filter="casa"><option value="">Todas</option>'
        + opcoes.casas.map(function (c) { return '<option value="' + escapeHtml(c) + '"' + (filtro.casa === c ? ' selected' : '') + '>' + escapeHtml(c) + '</option>'; }).join('')
        + '</select></div>';
    },
    semana: function (opcoes, filtro, t) {
      var out = '<div class="field"><label>Semana</label><select ' + t + ' data-filter="semana"><option value="">Todas</option>';
      for (var w = 1; w <= 18; w++) out += '<option value="' + w + '"' + (filtro.semana === String(w) ? ' selected' : '') + '>Semana ' + w + '</option>';
      out += '<option value="pos"' + (filtro.semana === 'pos' ? ' selected' : '') + '>Pós-temporada</option>';
      out += '</select></div>';
      return out;
    },
    status: function (opcoes, filtro, t) {
      var opts = [['pendente', 'Pendente'], ['green', 'Green'], ['red', 'Red'], ['cashout', 'Cashout']];
      var out = '<div class="field"><label>Status</label><select ' + t + ' data-filter="status"><option value="">Todos</option>';
      opts.forEach(function (o) { out += '<option value="' + o[0] + '"' + (filtro.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
      out += '</select></div>';
      return out;
    }
  };

  function renderFiltroBar(opcoes, filtro, tabKey, campos) {
    campos = campos || ['jogador', 'time', 'horario', 'casa'];
    var algumAtivo = campos.some(function (c) { return !!filtro[c]; });
    var t = 'data-filtertab="' + tabKey + '"';
    var out = '<div class="filter-bar">';
    campos.forEach(function (c) { out += FILTRO_CAMPOS[c](opcoes, filtro, t); });
    if (algumAtivo) out += '<button type="button" class="btn btn-ghost btn-sm" data-action="limpar-filtros" data-filtertab="' + tabKey + '">Limpar filtros</button>';
    out += '</div>';
    return out;
  }

  // ---------------- render: Apostas Compartilhadas ----------------

  function renderCompartilhadasTab() {
    var out = '<div><h2 class="section-title">Apostas compartilhadas</h2><p class="section-sub">Poste o bilhete e marque com o check quando você também pegou a aposta — o valor e o retorno ficam livres pra editar se sua entrada foi diferente do print.</p></div>';

    out += ui.novoBilheteOpen ? renderNovoBilheteForm() : '<button type="button" class="btn btn-primary" data-action="novo-bilhete-abrir">+ Postar bilhete</button>';

    if (!state.bilhetes.length) {
      out += '<div class="empty-state">Nenhum bilhete postado ainda. Poste o primeiro acima.</div>';
      return out;
    }

    var minhas = meusMapaEntradas();
    var comStatus = state.bilhetes.map(function (b) {
      var e = minhas[b.id];
      var b2 = Object.assign({}, b);
      b2.status = e ? e.status : '';
      return b2;
    });
    var opcoes = itemFiltroOpcoes(comStatus);
    var filtro = ui.filtros.compartilhadas;
    out += renderFiltroBar(opcoes, filtro, 'compartilhadas', ['jogador', 'time', 'horario', 'casa', 'semana', 'status']);
    var filtrados = aplicaItemFiltro(comStatus, filtro);
    if (!filtrados.length) { out += '<div class="empty-state">Nenhum bilhete encontrado com esses filtros.</div>'; return out; }

    out += '<div class="bet-list">';
    filtrados.forEach(function (b) { out += renderBilheteCard(b, minhas[b.id]); });
    out += '</div>';
    return out;
  }

  function renderNovoBilheteForm() {
    var campos = ui.novoBilheteCampos || {};
    var out = '<form class="card new-bilhete-form" data-form="novo-bilhete">';
    out += '<div class="form-field">';
    out += '<label>Print do bilhete (opcional)</label>';
    out += '<input type="file" accept="image/*" data-action-file="imagem-input">';
    if (ui.novoBilheteArquivoImagem) out += '<div class="helper-text">Selecionado: ' + escapeHtml(ui.novoBilheteArquivoImagem.name) + '</div>';
    out += '<button type="button" class="btn btn-ghost btn-sm" data-action="ler-bilhete-ia" style="margin-top:6px;width:fit-content" ' + (!ui.novoBilheteArquivoImagem || ui.novoBilheteLendo ? 'disabled' : '') + '>' + (ui.novoBilheteLendo ? '🔍 Lendo…' : (ui.novoBilheteCampos ? '🔍 Ler de novo' : '🔍 Ler bilhete com IA')) + '</button>';
    out += '<div class="helper-text">' + (ui.novoBilheteLendo ? 'Lendo o print, só um instante…' : 'Assim que você escolhe a foto, a leitura começa sozinha e preenche os campos abaixo — depois é só conferir e ajustar o que precisar. Se preferir, pode preencher tudo na mão sem anexar foto nenhuma.') + '</div>';
    out += '</div>';
    out += '<div class="form-grid">';
    out += '<div class="form-field"><label>Casa</label><input name="casa" type="text" placeholder="Bet365, Superbet, Betano…" value="' + escapeHtml(campos.casa || '') + '" required></div>';
    out += '<div class="form-field"><label>Evento</label><input name="evento" type="text" placeholder="Ex.: SF 49ers x LA Rams" value="' + escapeHtml(campos.evento || '') + '" required></div>';
    out += '<div class="form-field"><label>Código/Ref. (opcional)</label><input name="codigo" type="text" value="' + escapeHtml(campos.codigo || '') + '"></div>';
    out += '<div class="form-field"><label>Valor apostado (print)</label><input name="valor" type="number" step="0.01" min="0" value="' + escapeHtml(campos.valor != null ? campos.valor : '') + '" required></div>';
    out += '<div class="form-field"><label>Odd total (print)</label><input name="odd" type="number" step="0.01" min="0" value="' + escapeHtml(campos.odd != null ? campos.odd : '') + '" required></div>';
    out += '</div>';
    out += '<div class="form-field"><label>Observação (opcional)</label><textarea name="obs" placeholder="Ex.: casa aplicou boost, etc.">' + escapeHtml(campos.obs || '') + '</textarea></div>';
    out += '<div class="selecoes-edit">';
    out += '<label style="font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.03em">Seleções do bilhete</label>';
    ui.novoBilheteSelecoes.forEach(function (row, i) {
      out += '<div class="selecao-row" data-selecao-row="' + i + '">';
      out += '<div class="form-field"><label>Descrição</label><input data-sel-field="descricao" data-sel-idx="' + i + '" type="text" placeholder="Jogador — condição (odd X,XX)" value="' + escapeHtml(row.descricao) + '" required></div>';
      out += '<div class="form-field"><label>Jogo</label><input data-sel-field="jogo" data-sel-idx="' + i + '" type="text" placeholder="Ex.: SF 49ers x LA Rams" value="' + escapeHtml(row.jogo) + '"></div>';
      out += '<div class="form-field"><label>Data</label><input data-sel-field="data" data-sel-idx="' + i + '" type="date" value="' + escapeHtml(row.data) + '"></div>';
      out += '<div class="form-field"><label>Hora</label><input data-sel-field="hora" data-sel-idx="' + i + '" type="time" value="' + escapeHtml(row.hora) + '"></div>';
      out += '<button type="button" class="btn btn-ghost btn-sm" data-action="remover-selecao" data-idx="' + i + '" ' + (ui.novoBilheteSelecoes.length <= 1 ? 'disabled' : '') + '>Remover</button>';
      out += '</div>';
    });
    out += '<button type="button" class="btn btn-ghost btn-sm" data-action="add-selecao" style="width:fit-content">+ Adicionar seleção</button>';
    out += '</div>';
    out += '<div class="bet-actions"><button type="submit" class="btn btn-primary" ' + (ui.novoBilheteSalvando ? 'disabled' : '') + '>' + (ui.novoBilheteSalvando ? 'Enviando…' : 'Postar bilhete') + '</button><button type="button" class="btn btn-ghost" data-action="novo-bilhete-cancelar" ' + (ui.novoBilheteSalvando ? 'disabled' : '') + '>Cancelar</button></div>';
    out += '</form>';
    return out;
  }

  function renderBilheteCard(b, minhaEntrada) {
    var out = '<div class="bet-card">';
    out += '<div class="bet-top-row"><span class="bet-meta">' + escapeHtml(b.casa) + (b.codigo ? ' · #' + escapeHtml(b.codigo) : '') + ' · postado por ' + escapeHtml(nomeDe(b.criado_por)) + '</span></div>';
    out += '<div class="bet-event">' + escapeHtml(b.evento) + '</div>';
    if (b.imagem_url) {
      out += '<a href="' + escapeHtml(b.imagem_url) + '" target="_blank" rel="noopener" class="bet-print-link"><img class="bet-print-img" src="' + escapeHtml(b.imagem_url) + '" alt="Print do bilhete" loading="lazy"></a>';
    }
    out += '<div class="bet-summary">'
      + '<div class="bet-num"><span>Valor no print</span><b>' + fmtBRL(b.valor_referencia) + '</b></div>'
      + '<div class="bet-num"><span>Odd</span><b>' + fmtOdd(b.odd_referencia) + '</b></div>'
      + '<div class="bet-num"><span>Retorno no print</span><b>' + fmtBRL((Number(b.valor_referencia) || 0) * (Number(b.odd_referencia) || 0)) + '</b></div>'
      + '</div>';
    if (b.selecoes && b.selecoes.length) {
      out += '<ul class="selecoes-list">' + b.selecoes.map(function (sel) {
        var metaParts = [];
        if (sel.jogo) metaParts.push(sel.jogo);
        var dh = [sel.data ? fmtDateShort(sel.data) : '', sel.hora || ''].filter(Boolean).join(' ');
        if (dh) metaParts.push(dh);
        return '<li class="selecao-item"><div class="selecao-desc">' + escapeHtml(sel.descricao) + '</div>' + (metaParts.length ? '<div class="selecao-meta">' + escapeHtml(metaParts.join(' · ')) + '</div>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    if (b.obs) out += '<div class="bet-meta">' + escapeHtml(b.obs) + '</div>';
    out += '<div class="bet-meta">Registrado em ' + fmtDateTime(b.criado_em) + '</div>';

    var editOpen = ui.editEntrada === (minhaEntrada && minhaEntrada.id);
    var cashoutOpenAqui = minhaEntrada && ui.cashoutEntrada === minhaEntrada.id;
    var minhaResolvida = minhaEntrada && minhaEntrada.status !== 'pendente';

    out += '<div class="bet-actions">';
    if (minhaEntrada) {
      out += '<span class="chip chip-status-' + minhaEntrada.status + '">' + statusLabel(minhaEntrada.status) + '</span>';
      out += '<span class="chip chip-mine">✓ Você pegou — ' + fmtBRL(minhaEntrada.valor) + ' · odd ' + fmtOdd(minhaEntrada.odd) + '</span>';
      if (!minhaResolvida) {
        out += '<button type="button" class="btn btn-win btn-sm" data-action="entrada-marcar" data-status="green" data-id="' + minhaEntrada.id + '">Green</button>';
        out += '<button type="button" class="btn btn-loss btn-sm" data-action="entrada-marcar" data-status="red" data-id="' + minhaEntrada.id + '">Red</button>';
        out += '<button type="button" class="btn btn-cashout btn-sm" data-action="entrada-cashout-abrir" data-id="' + minhaEntrada.id + '">Cashout</button>';
      } else {
        out += '<button type="button" class="btn btn-ghost btn-sm" data-action="entrada-reabrir" data-id="' + minhaEntrada.id + '">Reabrir</button>';
      }
      out += '<button type="button" class="btn btn-ghost btn-sm" data-action="editar-entrada-abrir" data-id="' + minhaEntrada.id + '">Editar valor/retorno</button>';
      out += '<button type="button" class="btn btn-ghost btn-sm" data-action="desmarcar-entrada" data-id="' + minhaEntrada.id + '">Desmarcar</button>';
    } else {
      out += '<button type="button" class="btn btn-check" data-action="marcar-peguei" data-id="' + b.id + '">☐ Marcar que peguei</button>';
    }
    if (b.criado_por === state.session.user.id) {
      if (ui.pendingDeleteBilhete === b.id) {
        out += '<button type="button" class="btn btn-danger btn-sm" data-action="excluir-bilhete-confirma" data-id="' + b.id + '">Confirmar exclusão</button>';
        out += '<button type="button" class="btn btn-ghost btn-sm" data-action="excluir-bilhete-cancela">Cancelar</button>';
      } else {
        out += '<button type="button" class="btn btn-ghost btn-sm" data-action="excluir-bilhete-pede" data-id="' + b.id + '">Excluir bilhete</button>';
      }
    }
    out += '</div>';

    if (editOpen) {
      out += '<form class="inline-form" data-form="editar-entrada" data-id="' + minhaEntrada.id + '">'
        + '<div class="field"><label>Seu valor (R$)</label><input name="valor" type="number" step="0.01" min="0" value="' + minhaEntrada.valor + '" required></div>'
        + '<div class="field"><label>Sua odd</label><input name="odd" type="number" step="0.01" min="0" value="' + minhaEntrada.odd + '" required></div>'
        + '<button type="submit" class="btn btn-primary btn-sm">Salvar</button>'
        + '<button type="button" class="btn btn-ghost btn-sm" data-action="editar-entrada-cancelar">Cancelar</button>'
        + '</form>';
    }
    if (cashoutOpenAqui) {
      out += '<form class="inline-form" data-form="entrada-cashout" data-id="' + minhaEntrada.id + '">'
        + '<div class="field"><label>Valor recebido (R$)</label><input name="valor_cashout" type="number" min="0" step="0.01" required autofocus></div>'
        + '<button type="submit" class="btn btn-cashout btn-sm">Confirmar</button>'
        + '<button type="button" class="btn btn-ghost btn-sm" data-action="entrada-cashout-cancelar">Cancelar</button>'
        + '</form>';
    }

    out += '</div>';
    return out;
  }

  // ---------------- render: Minhas Apostas ----------------

  function entradaComBilhete(e) {
    var b = state.bilhetes.find(function (x) { return x.id === e.bilhete_id; }) || {};
    return {
      id: e.id, valor: e.valor, odd: e.odd, status: e.status, valor_cashout: e.valor_cashout,
      resolvido_em: e.resolvido_em, criado_em: e.criado_em,
      evento: b.evento || '(bilhete removido)', casa: b.casa || '', codigo: b.codigo || null,
      selecoes: b.selecoes || [], imagem_url: b.imagem_url || null
    };
  }

  function renderMinhasTab() {
    var todas = state.entradas.map(entradaComBilhete);
    var out = '<div><h2 class="section-title">Minhas apostas</h2><p class="section-sub">Só as apostas que você marcou como "peguei" nos bilhetes compartilhados.</p></div>';
    if (!todas.length) { out += '<div class="empty-state">Você ainda não marcou nenhuma aposta. Vá na aba "Apostas Compartilhadas" e clique em "Marcar que peguei".</div>'; return out; }

    var opcoes = itemFiltroOpcoes(todas);
    var filtro = ui.filtros.minhas;
    out += renderFiltroBar(opcoes, filtro, 'minhas', ['jogador', 'time', 'horario', 'casa', 'semana', 'status']);
    var filtradas = aplicaItemFiltro(todas, filtro);
    if (!filtradas.length) { out += '<div class="empty-state">Nenhuma aposta encontrada com esses filtros.</div>'; return out; }

    var pend = filtradas.filter(function (e) { return e.status === 'pendente'; });
    var resolv = filtradas.filter(function (e) { return e.status !== 'pendente'; })
      .sort(function (a, b) { return new Date(b.resolvido_em || b.criado_em) - new Date(a.resolvido_em || a.criado_em); });

    out += '<div><h3 class="section-title" style="font-size:.9rem">Pendentes (' + pend.length + ')</h3></div>';
    out += pend.length ? '<div class="bet-list">' + pend.map(function (e) { return renderEntradaCard(e, false); }).join('') + '</div>' : '<div class="empty-state">Nenhuma pendente.</div>';

    out += '<div><h3 class="section-title" style="font-size:.9rem">Realizadas (' + resolv.length + ')</h3></div>';
    out += resolv.length ? '<div class="bet-list">' + resolv.map(function (e) { return renderEntradaCard(e, true); }).join('') + '</div>' : '<div class="empty-state">Nenhuma realizada ainda.</div>';

    return out;
  }

  function renderEntradaCard(e, resolved) {
    var stripe = e.status === 'green' ? 'var(--win)' : e.status === 'red' ? 'var(--loss)' : e.status === 'cashout' ? 'var(--cashout)' : 'var(--accent)';
    var statusChip = '<span class="chip chip-status-' + e.status + '">' + statusLabel(e.status) + '</span>';
    var semanaLbl = weekLabel(itemPrimarySemana(e));
    var cashoutOpen = ui.cashoutEntrada === e.id;

    var selecoesHtml = (e.selecoes && e.selecoes.length)
      ? '<ul class="selecoes-list">' + e.selecoes.map(function (sel) {
        var metaParts = [];
        if (sel.jogo) metaParts.push(sel.jogo);
        var dh = [sel.data ? fmtDateShort(sel.data) : '', sel.hora || ''].filter(Boolean).join(' ');
        if (dh) metaParts.push(dh);
        return '<li class="selecao-item"><div class="selecao-desc">' + escapeHtml(sel.descricao) + '</div>' + (metaParts.length ? '<div class="selecao-meta">' + escapeHtml(metaParts.join(' · ')) + '</div>' : '') + '</li>';
      }).join('') + '</ul>' : '';

    var profit = resolved ? lucro(e) : null;

    var summaryHtml = '<div class="bet-summary">'
      + '<div class="bet-num"><span>Valor apostado</span><b>' + fmtBRL(e.valor) + '</b></div>'
      + (e.status === 'cashout' ? '<div class="bet-num"><span>Valor do cashout</span><b>' + fmtBRL(e.valor_cashout) + '</b></div>' : '<div class="bet-num"><span>Retorno potencial</span><b>' + fmtBRL(retorno(e)) + '</b></div>')
      + '<div class="bet-num"><span>Odd</span><b>' + fmtOdd(e.odd) + '</b></div>'
      + (resolved ? '<div class="bet-num"><span>Resultado</span><b class="' + (profit >= 0 ? 'value-pos' : 'value-neg') + '">' + (profit >= 0 ? '+' : '') + fmtBRL(profit) + '</b></div>' : '')
      + '</div>';

    var actions = '';
    if (!resolved) {
      actions += '<button type="button" class="btn btn-win btn-sm" data-action="entrada-marcar" data-status="green" data-id="' + e.id + '">Green</button>';
      actions += '<button type="button" class="btn btn-loss btn-sm" data-action="entrada-marcar" data-status="red" data-id="' + e.id + '">Red</button>';
      actions += '<button type="button" class="btn btn-cashout btn-sm" data-action="entrada-cashout-abrir" data-id="' + e.id + '">Cashout</button>';
    } else {
      actions += '<button type="button" class="btn btn-ghost btn-sm" data-action="entrada-reabrir" data-id="' + e.id + '">Reabrir</button>';
    }
    actions += '<button type="button" class="btn btn-ghost btn-sm" data-action="desmarcar-entrada" data-id="' + e.id + '">Remover</button>';

    var cashoutFormHtml = cashoutOpen
      ? '<form class="inline-form" data-form="entrada-cashout" data-id="' + e.id + '">'
        + '<div class="field"><label>Valor recebido (R$)</label><input name="valor_cashout" type="number" min="0" step="0.01" required autofocus></div>'
        + '<button type="submit" class="btn btn-cashout btn-sm">Confirmar</button>'
        + '<button type="button" class="btn btn-ghost btn-sm" data-action="entrada-cashout-cancelar">Cancelar</button>'
        + '</form>' : '';

    var imgHtml = e.imagem_url ? '<a href="' + escapeHtml(e.imagem_url) + '" target="_blank" rel="noopener" class="bet-print-link"><img class="bet-print-img" src="' + escapeHtml(e.imagem_url) + '" alt="Print do bilhete" loading="lazy"></a>' : '';

    return '<div class="bet-card" style="--stripe:' + stripe + '">'
      + '<div class="bet-top-row">' + statusChip + '<span class="bet-meta">' + escapeHtml(e.casa) + (e.codigo ? ' · #' + escapeHtml(e.codigo) : '') + (semanaLbl ? ' · ' + escapeHtml(semanaLbl) : '') + '</span></div>'
      + '<div class="bet-event">' + escapeHtml(e.evento) + '</div>'
      + imgHtml + summaryHtml + selecoesHtml
      + '<div class="bet-meta">' + (resolved ? 'Resolvida em ' + fmtDateTime(e.resolvido_em) : 'Registrada em ' + fmtDateTime(e.criado_em)) + '</div>'
      + cashoutFormHtml
      + '<div class="bet-actions">' + actions + '</div>'
      + '</div>';
  }

  // ---------------- render: Cronograma ----------------

  function renderCronogramaTab() {
    var out = '<div><h2 class="section-title">Cronograma</h2><p class="section-sub">Data e hora de todas as seleções dos bilhetes compartilhados — pra saber por quem torcer e quando.</p></div>';

    var items = [];
    state.bilhetes.forEach(function (b) {
      (b.selecoes || []).forEach(function (sel) {
        var dataNorm = normalizeYMD(sel.data);
        if (!dataNorm) return;
        items.push({ data: dataNorm, hora: sel.hora || '', jogo: sel.jogo || b.evento, descricao: sel.descricao, casa: b.casa, jogador: extractJogador(sel.descricao), times: extractTimes(sel.jogo || b.evento) });
      });
    });
    if (!items.length) { out += '<div class="empty-state">Nenhum mercado com data marcada ainda.</div>'; return out; }

    var opcoes = itemFiltroOpcoes(state.bilhetes);
    var filtro = ui.filtros.cronograma;
    out += renderFiltroBar(opcoes, filtro, 'cronograma');

    var termo = (filtro.jogador || '').trim().toLowerCase();
    var filtrados = items.filter(function (it) {
      if (termo && ((it.jogador || '') + ' ' + it.descricao).toLowerCase().indexOf(termo) === -1) return false;
      if (filtro.time && it.times.indexOf(filtro.time) === -1) return false;
      if (filtro.casa && normCasa(it.casa) !== normCasa(filtro.casa)) return false;
      if (filtro.horario && (it.data + '|' + it.hora) !== filtro.horario) return false;
      return true;
    });
    if (!filtrados.length) { out += '<div class="empty-state">Nenhum mercado encontrado com esses filtros.</div>'; return out; }

    var groups = {};
    filtrados.forEach(function (it) { (groups[it.data] = groups[it.data] || []).push(it); });
    Object.keys(groups).sort().forEach(function (ymd) {
      var rows = groups[ymd].slice().sort(function (a, b) { return (a.hora || '').localeCompare(b.hora || ''); });
      out += '<div class="schedule-group"><div class="schedule-group-label">' + dayLabel(ymd) + '</div>';
      rows.forEach(function (it) {
        out += '<div class="schedule-row"><div class="schedule-time">' + (escapeHtml(it.hora) || '--:--') + '</div>'
          + '<div class="schedule-body"><div class="schedule-event">' + escapeHtml(it.jogo) + '</div><div class="schedule-sub">' + escapeHtml(it.descricao) + '</div></div>'
          + '<span class="pill schedule-casa">' + escapeHtml(it.casa) + '</span></div>';
      });
      out += '</div>';
    });
    return out;
  }

  // ---------------- render: Ao Vivo ----------------

  function statusAoVivoLabel(ev) {
    if (!ev) return null;
    var s = ev.status || {};
    if (s.estado === 'in') {
      var periodo = s.periodo ? (s.periodo + 'º quarto') : 'Ao vivo';
      return { classe: 'ao-vivo-status-in', texto: '🔴 ' + periodo + (s.relogio ? ' · ' + s.relogio : '') };
    }
    if (s.estado === 'post' || s.encerrado) {
      return { classe: 'ao-vivo-status-post', texto: 'Encerrado' + (s.detalhe ? ' · ' + s.detalhe : '') };
    }
    return { classe: 'ao-vivo-status-pre', texto: 'Ainda não começou' + (s.detalhe ? ' · ' + s.detalhe : '') };
  }

  function renderAoVivoTab() {
    var out = '<div><h2 class="section-title">Ao vivo</h2><p class="section-sub">Placar e andamento dos jogos de hoje que aparecem nos bilhetes do grupo. Atualiza sozinho a cada ' + Math.round(AOVIVO_INTERVALO_MS / 1000) + ' segundos.</p></div>';

    var atualizarBtn = '<button type="button" class="btn btn-ghost btn-sm" data-action="aovivo-atualizar" ' + (ui.aoVivoCarregando ? 'disabled' : '') + '>' + (ui.aoVivoCarregando ? 'Atualizando…' : '🔄 Atualizar agora') + '</button>';
    var statusLinha = ui.aoVivoUltimaAtualizacao ? ('<span class="helper-text">Última atualização: ' + fmtDateTime(ui.aoVivoUltimaAtualizacao.toISOString()) + '</span>') : '';
    out += '<div class="bet-actions">' + atualizarBtn + statusLinha + '</div>';

    if (ui.aoVivoErro) {
      out += '<div class="auth-error">' + escapeHtml(ui.aoVivoErro) + ' Confira se a função "live-scores" foi publicada no Supabase (passo opcional do README).</div>';
    }

    var hoje = todayYMD();
    var grupos = {};
    var ordem = [];
    state.bilhetes.forEach(function (b) {
      (b.selecoes || []).forEach(function (sel) {
        if (normalizeYMD(sel.data) !== hoje) return;
        var times = extractTimes(sel.jogo || b.evento);
        var key = times.length ? times.slice().sort().join('|').toLowerCase() : (sel.jogo || b.evento || '');
        if (!grupos[key]) { grupos[key] = { jogo: sel.jogo || b.evento, times: times, itens: [] }; ordem.push(key); }
        grupos[key].itens.push({ descricao: sel.descricao, casa: b.casa, hora: sel.hora || '' });
      });
    });

    if (!ordem.length) {
      out += '<div class="empty-state">Nenhum jogo de hoje entre os bilhetes postados ainda.</div>';
      return out;
    }

    out += '<div class="bet-list">';
    ordem.forEach(function (key) {
      var g = grupos[key];
      var ev = espnEventFor(g.times);
      var st = statusAoVivoLabel(ev);
      out += '<div class="card ao-vivo-jogo">';
      out += '<div class="ao-vivo-status ' + (st ? st.classe : '') + '">' + (st ? escapeHtml(st.texto) : (ui.aoVivoDados ? 'Sem dados ao vivo pra esse jogo ainda' : 'Carregando placar…')) + '</div>';
      if (ev) {
        out += '<div class="ao-vivo-placar">'
          + '<div class="ao-vivo-time"><span>' + escapeHtml(ev.fora.nome || ev.fora.mascote) + '</span><b>' + (ev.fora.placar != null ? ev.fora.placar : '–') + '</b></div>'
          + '<span class="ao-vivo-vs">x</span>'
          + '<div class="ao-vivo-time"><span>' + escapeHtml(ev.casa.nome || ev.casa.mascote) + '</span><b>' + (ev.casa.placar != null ? ev.casa.placar : '–') + '</b></div>'
          + '</div>';
      } else {
        out += '<div class="bet-event">' + escapeHtml(g.jogo) + '</div>';
      }
      out += '<div class="schedule-sub">Suas seleções nesse jogo:</div>';
      out += '<ul class="selecoes-list">' + g.itens.map(function (it) {
        return '<li class="selecao-item"><div class="selecao-desc">' + escapeHtml(it.descricao) + '</div><div class="selecao-meta">' + escapeHtml(it.casa) + (it.hora ? ' · ' + escapeHtml(it.hora) : '') + '</div></li>';
      }).join('') + '</ul>';
      out += '</div>';
    });
    out += '</div>';
    return out;
  }

  // ---------------- render: Financeiro ----------------

  function renderFinanceiroTab() {
    var filtro = ui.filtros.financeiro;
    var todas = state.entradas.map(entradaComBilhete);
    var opcoes = itemFiltroOpcoes(todas);
    var filtradas = aplicaItemFiltro(todas, filtro);
    var filtroAtivo = !!(filtro.semana || filtro.casa);

    var totalApostado = filtradas.reduce(function (s, e) { return s + (Number(e.valor) || 0); }, 0);
    var abertos = filtradas.filter(function (e) { return e.status === 'pendente'; });
    var totalAberto = abertos.reduce(function (s, e) { return s + (Number(e.valor) || 0); }, 0);
    var totalRetornoPotencial = abertos.reduce(function (s, e) { return s + retorno(e); }, 0);
    var resolvidas = filtradas.filter(function (e) { return e.status !== 'pendente'; });
    var saldo = resolvidas.reduce(function (s, e) { return s + lucro(e); }, 0);
    var greens = resolvidas.filter(function (e) { return e.status === 'green'; }).length;
    var reds = resolvidas.filter(function (e) { return e.status === 'red'; }).length;
    var cashouts = resolvidas.filter(function (e) { return e.status === 'cashout'; }).length;
    var taxa = resolvidas.length ? (greens / resolvidas.length) * 100 : null;

    var out = '<div><h2 class="section-title">Financeiro</h2><p class="section-sub">Só as SUAS apostas — filtre por semana da NFL ou por casa.</p></div>';
    out += renderFiltroBar(opcoes, filtro, 'financeiro', ['semana', 'casa']);

    out += '<div class="stat-grid">';
    out += statTile('Total apostado', fmtBRL(totalApostado), filtradas.length + ' aposta' + (filtradas.length === 1 ? '' : 's') + (filtroAtivo ? ' com esse filtro' : ' no total'));
    out += statTile('Saldo líquido', (saldo >= 0 ? '+' : '') + fmtBRL(saldo), resolvidas.length + ' resolvida' + (resolvidas.length === 1 ? '' : 's'), saldo >= 0 ? 'value-pos' : 'value-neg');
    out += statTile('Em aberto', fmtBRL(totalAberto), abertos.length + ' pendente' + (abertos.length === 1 ? '' : 's'));
    out += statTile('Retorno potencial', fmtBRL(totalRetornoPotencial), 'se todas as pendentes derem green');
    out += statTile('Taxa de acerto', taxa == null ? '—' : taxa.toFixed(0) + '%', greens + ' green · ' + reds + ' red · ' + cashouts + ' cashout');
    out += '</div>';

    out += '<div><h2 class="section-title">Desempenho por semana</h2><p class="section-sub">Resumo de todas as semanas' + (filtro.casa ? ' na ' + escapeHtml(filtro.casa) : '') + ', independente do filtro de semana acima.</p></div>';
    out += renderSemanaResumoTable(todas, filtro.casa);

    out += '<div><h2 class="section-title">Histórico de apostas resolvidas</h2><p class="section-sub">Todas as suas apostas já marcadas como Green, Red ou Cashout' + (filtroAtivo ? ', considerando os filtros acima' : '') + '.</p></div>';
    out += renderHistoryTable(resolvidas);

    return out;
  }

  function renderSemanaResumoTable(items, casaFiltro) {
    var base = casaFiltro ? items.filter(function (e) { return normCasa(e.casa) === normCasa(casaFiltro); }) : items;
    if (!base.length) return '<div class="empty-state">Você ainda não tem apostas registradas.</div>';

    var buckets = {};
    base.forEach(function (e) {
      var w = itemPrimarySemana(e);
      var key = w == null ? 'semSemana' : String(w);
      (buckets[key] = buckets[key] || { semana: w, itens: [] }).itens.push(e);
    });
    var keys = Object.keys(buckets).filter(function (k) { return k !== 'semSemana'; });
    keys.sort(function (a, b) { return (a === 'pos' ? 999 : Number(a)) - (b === 'pos' ? 999 : Number(b)); });
    if (buckets.semSemana) keys.push('semSemana');

    var rows = keys.map(function (key) {
      var grupo = buckets[key];
      var lbl = key === 'semSemana' ? 'Sem data definida' : weekLabel(grupo.semana);
      var itens = grupo.itens;
      var totalG = itens.reduce(function (s, e) { return s + (Number(e.valor) || 0); }, 0);
      var abertosG = itens.filter(function (e) { return e.status === 'pendente'; });
      var totalAbertoG = abertosG.reduce(function (s, e) { return s + (Number(e.valor) || 0); }, 0);
      var resolvidasG = itens.filter(function (e) { return e.status !== 'pendente'; });
      var saldoG = resolvidasG.reduce(function (s, e) { return s + lucro(e); }, 0);
      var greensG = resolvidasG.filter(function (e) { return e.status === 'green'; }).length;
      var taxaG = resolvidasG.length ? (greensG / resolvidasG.length) * 100 : null;
      return '<tr><td>' + escapeHtml(lbl) + '</td><td class="num">' + itens.length + '</td><td class="num">' + fmtBRL(totalG) + '</td>'
        + '<td class="num">' + (abertosG.length ? fmtBRL(totalAbertoG) : '—') + '</td>'
        + '<td class="num ' + (resolvidasG.length ? (saldoG >= 0 ? 'value-pos' : 'value-neg') : '') + '">' + (resolvidasG.length ? (saldoG >= 0 ? '+' : '') + fmtBRL(saldoG) : '—') + '</td>'
        + '<td class="num">' + (taxaG == null ? '—' : taxaG.toFixed(0) + '%') + '</td></tr>';
    }).join('');

    return '<div class="table-wrap"><table><thead><tr><th>Semana</th><th class="num">Apostas</th><th class="num">Apostado</th><th class="num">Em aberto</th><th class="num">Saldo</th><th class="num">Taxa</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function statTile(label, value, sub, valueClass) {
    return '<div class="stat-tile"><span class="stat-label">' + escapeHtml(label) + '</span><span class="stat-value' + (valueClass ? ' ' + valueClass : '') + '">' + value + '</span><span class="stat-sub">' + escapeHtml(sub) + '</span></div>';
  }

  function renderHistoryTable(resolvidas) {
    if (!resolvidas.length) return '<div class="empty-state">Nenhuma aposta sua resolvida ainda.</div>';
    var sorted = resolvidas.slice().sort(function (a, b) { return new Date(b.resolvido_em) - new Date(a.resolvido_em); });
    var rows = sorted.map(function (e) {
      var p = lucro(e);
      var sub = (e.selecoes || []).map(function (s) { return s.descricao; }).join(' · ');
      var semanaLbl = weekLabel(itemPrimarySemana(e));
      return '<tr><td>' + fmtDateTime(e.resolvido_em) + '</td><td>' + (semanaLbl ? escapeHtml(semanaLbl) : '—') + '</td>'
        + '<td>' + escapeHtml(e.evento) + (sub ? '<br><span class="helper-text">' + escapeHtml(sub) + '</span>' : '') + '</td>'
        + '<td>' + escapeHtml(e.casa) + '</td><td class="num">' + fmtBRL(e.valor) + '</td><td class="num">' + fmtOdd(e.odd) + '</td>'
        + '<td><span class="result-chip result-' + e.status + '">' + statusLabel(e.status) + '</span></td>'
        + '<td class="num ' + (p >= 0 ? 'value-pos' : 'value-neg') + '">' + (p >= 0 ? '+' : '') + fmtBRL(p) + '</td></tr>';
    }).join('');
    return '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Semana</th><th>Evento / Seleções</th><th>Casa</th><th class="num">Valor</th><th class="num">Odd</th><th>Resultado</th><th class="num">Lucro</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  // ---------------- render root ----------------

  function render() {
    if (!state.session) { appEl.innerHTML = renderAuthScreen(); return; }
    if (!state.loaded) { appEl.innerHTML = '<div class="boot-loading">Carregando seus dados…</div>'; return; }
    appEl.innerHTML = renderApp();
  }

  // ---------------- eventos ----------------

  appEl.addEventListener('submit', function (e) {
    var form = e.target;

    if (form.matches('form[data-form="auth"]')) {
      e.preventDefault();
      var fd = new FormData(form);
      handleAuthSubmit(fd.get('email'), fd.get('password'), fd.get('nome'));
      return;
    }

    if (form.matches('form[data-form="novo-bilhete"]')) {
      e.preventDefault();
      if (ui.novoBilheteSalvando) return;
      var fd2 = new FormData(form);
      var payloadBase = {
        casa: fd2.get('casa'), evento: fd2.get('evento'), codigo: fd2.get('codigo') || '',
        obs: fd2.get('obs') || '', valor: fd2.get('valor'), odd: fd2.get('odd'),
        selecoes: ui.novoBilheteSelecoes.filter(function (r) { return r.descricao.trim(); })
      };
      var arquivoImagem = ui.novoBilheteArquivoImagem;
      ui.novoBilheteSalvando = true;
      render();
      if (arquivoImagem && arquivoImagem.size > 0) {
        if (arquivoImagem.size > 8 * 1024 * 1024) {
          ui.novoBilheteSalvando = false;
          showToast('A imagem precisa ter até 8MB.');
          render();
          return;
        }
        uploadImagemBilhete(arquivoImagem).then(function (url) {
          payloadBase.imagemUrl = url;
          criarBilhete(payloadBase);
        }).catch(function (err) {
          ui.novoBilheteSalvando = false;
          showToast('Não deu pra enviar o print: ' + (err && err.message ? err.message : 'tente de novo'));
          render();
        });
      } else {
        criarBilhete(payloadBase);
      }
      return;
    }

    if (form.matches('form[data-form="editar-entrada"]')) {
      e.preventDefault();
      var fd3 = new FormData(form);
      salvarEdicaoEntrada(form.getAttribute('data-id'), fd3.get('valor'), fd3.get('odd'));
      return;
    }

    if (form.matches('form[data-form="entrada-cashout"]')) {
      e.preventDefault();
      var fd4 = new FormData(form);
      var v = fd4.get('valor_cashout');
      if (v === null || v === '' || isNaN(Number(v)) || Number(v) < 0) return;
      cashoutEntrada(form.getAttribute('data-id'), v);
      return;
    }
  });

  appEl.addEventListener('input', function (e) {
    var target = e.target;

    if (target.matches('[data-sel-field]')) {
      var idx = Number(target.getAttribute('data-sel-idx'));
      var field = target.getAttribute('data-sel-field');
      if (ui.novoBilheteSelecoes[idx]) ui.novoBilheteSelecoes[idx][field] = target.value;
      return; // não re-renderiza pra não perder foco durante digitação
    }

    if (target.matches('[data-filter="jogador"]')) {
      var tabKey = target.getAttribute('data-filtertab');
      if (!tabKey || !ui.filtros[tabKey]) return;
      var pos = target.selectionStart;
      ui.filtros[tabKey].jogador = target.value;
      render();
      var sel = '[data-filter="jogador"][data-filtertab="' + tabKey + '"]';
      var el = appEl.querySelector(sel);
      if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) {} }
    }
  });

  appEl.addEventListener('change', function (e) {
    var target = e.target;

    if (target.matches('input[type="file"][data-action-file="imagem-input"]')) {
      ui.novoBilheteArquivoImagem = (target.files && target.files[0]) ? target.files[0] : null;
      ui.novoBilheteCampos = null;
      render();
      if (ui.novoBilheteArquivoImagem) lerBilheteComIA();
      return;
    }

    var tabKey = target.getAttribute('data-filtertab');
    if (tabKey && ui.filtros[tabKey]) {
      if (target.matches('[data-filter="time"]')) { ui.filtros[tabKey].time = target.value; render(); return; }
      if (target.matches('[data-filter="horario"]')) { ui.filtros[tabKey].horario = target.value; render(); return; }
      if (target.matches('[data-filter="casa"]')) { ui.filtros[tabKey].casa = target.value; render(); return; }
      if (target.matches('[data-filter="semana"]')) { ui.filtros[tabKey].semana = target.value; render(); return; }
      if (target.matches('[data-filter="status"]')) { ui.filtros[tabKey].status = target.value; render(); return; }
    }
  });

  appEl.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    var id = target.getAttribute('data-id');

    if (action === 'auth-toggle') { ui.authMode = ui.authMode === 'login' ? 'signup' : 'login'; ui.authError = ''; ui.authInfo = ''; render(); }
    else if (action === 'logout') { handleLogout(); }
    else if (action === 'switch-tab') {
      ui.activeTab = target.getAttribute('data-tab'); ui.editEntrada = null; ui.cashoutEntrada = null; ui.pendingDeleteBilhete = null;
      if (ui.activeTab === 'aovivo') iniciarAoVivo(); else pararAoVivo();
      render();
    }
    else if (action === 'aovivo-atualizar') { fetchAoVivo(false); }
    else if (action === 'limpar-filtros') {
      var tk = target.getAttribute('data-filtertab');
      if (tk && ui.filtros[tk]) Object.keys(ui.filtros[tk]).forEach(function (k) { ui.filtros[tk][k] = ''; });
      render();
    }
    else if (action === 'novo-bilhete-abrir') { ui.novoBilheteOpen = true; render(); }
    else if (action === 'novo-bilhete-cancelar') { ui.novoBilheteOpen = false; ui.novoBilheteSelecoes = [{ descricao: '', jogo: '', data: '', hora: '' }]; ui.novoBilheteArquivoImagem = null; ui.novoBilheteCampos = null; render(); }
    else if (action === 'ler-bilhete-ia') { lerBilheteComIA(); }
    else if (action === 'add-selecao') { ui.novoBilheteSelecoes.push({ descricao: '', jogo: '', data: '', hora: '' }); render(); }
    else if (action === 'remover-selecao') {
      var idx = Number(target.getAttribute('data-idx'));
      if (ui.novoBilheteSelecoes.length > 1) ui.novoBilheteSelecoes.splice(idx, 1);
      render();
    }
    else if (action === 'marcar-peguei') { var b = state.bilhetes.find(function (x) { return x.id === id; }); if (b) marcarQuePeguei(b); }
    else if (action === 'desmarcar-entrada') { desmarcarEntrada(id); }
    else if (action === 'editar-entrada-abrir') { ui.editEntrada = id; render(); }
    else if (action === 'editar-entrada-cancelar') { ui.editEntrada = null; render(); }
    else if (action === 'excluir-bilhete-pede') { ui.pendingDeleteBilhete = id; render(); }
    else if (action === 'excluir-bilhete-cancela') { ui.pendingDeleteBilhete = null; render(); }
    else if (action === 'excluir-bilhete-confirma') { excluirBilhete(id); }
    else if (action === 'entrada-marcar') { marcarEntrada(id, target.getAttribute('data-status')); }
    else if (action === 'entrada-cashout-abrir') { ui.cashoutEntrada = id; render(); }
    else if (action === 'entrada-cashout-cancelar') { ui.cashoutEntrada = null; render(); }
    else if (action === 'entrada-reabrir') { reabrirEntrada(id); }
  });

  // ---------------- boot ----------------

  sb.auth.onAuthStateChange(function (event, session) {
    state.session = session;
    if (session) {
      state.loaded = false;
      render();
      subscribeRealtime();
      refreshAll();
    } else {
      unsubscribeRealtime();
      state.profiles = {}; state.bilhetes = []; state.entradas = []; state.loaded = false;
      render();
    }
  });

  sb.auth.getSession().then(function (res) {
    state.session = res.data.session;
    render();
    if (state.session) { subscribeRealtime(); refreshAll(); }
  });
})();
