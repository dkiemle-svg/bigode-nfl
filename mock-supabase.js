// Mock leve do supabase-js só pra testar a UI localmente sem um projeto real.
(function () {
  var db = {
    profiles: [
      { id: 'u1', nome: 'Daniel' },
      { id: 'u2', nome: 'Pedro' }
    ],
    bilhetes: [
      {
        id: 'b1', criado_por: 'u1', criado_em: '2026-09-10T18:24:52.000Z',
        casa: 'Superbet', evento: 'Supermúltipla — 50+ jardas por recepção', codigo: '898L-7S9K1R',
        obs: 'Superbet aplicou boost na supermúltipla (odds base 37,53).',
        valor_referencia: 100, odd_referencia: 41.19,
        selecoes: [
          { descricao: 'Mike Evans — 50+ jardas por recepção (odd 1,92)', jogo: 'SF 49ers x LA Rams', data: '2026-09-10', hora: '21:35' },
          { descricao: 'Dalton Kincaid — 50+ jardas por recepção (odd 2,60)', jogo: 'HOU Texans x BUF Bills', data: '2026-09-13', hora: '14:00' }
        ]
      },
      {
        id: 'b2', criado_por: 'u2', criado_em: '2026-09-10T16:05:20.000Z',
        casa: 'Betano', evento: 'SF 49ers x LA Rams', codigo: null, obs: '',
        valor_referencia: 100, odd_referencia: 10.25,
        selecoes: [
          { descricao: 'Mike Evans — mais de 18,5 jardas na recepção mais longa', jogo: 'SF 49ers x LA Rams', data: '2026-09-10', hora: '21:35' }
        ]
      }
    ],
    entradas: [
      { id: 'e1', bilhete_id: 'b1', user_id: 'u1', valor: 100, odd: 41.19, status: 'pendente', valor_cashout: null, resolvido_em: null, criado_em: '2026-09-10T18:24:52.000Z' },
      { id: 'e2', bilhete_id: 'e2ref', user_id: 'u1', valor: 50, odd: 4.25, status: 'green', valor_cashout: null, resolvido_em: '2026-09-10T02:48:47.703Z', criado_em: '2026-09-09T21:20:00.000Z' }
    ]
  };
  // segunda entrada referencia um bilhete extra pra popular o histórico
  db.bilhetes.push({
    id: 'e2ref', criado_por: 'u1', criado_em: '2026-09-09T21:20:00.000Z',
    casa: 'Bet365', evento: 'NE Patriots x SEA Seahawks', codigo: null, obs: '',
    valor_referencia: 200, odd_referencia: 4.25,
    selecoes: [{ descricao: 'Jaxon Smith-Njigba — marcar touchdown a qualquer momento', jogo: 'NE Patriots x SEA Seahawks', data: '2026-09-09', hora: '21:20' }]
  });

  var CURRENT_USER = { id: 'u1', email: 'daniel@teste.com' };
  var authListeners = [];

  function uid() { return 'id-' + Math.random().toString(36).slice(2, 10); }

  function matchesFilters(row, filters) {
    return filters.every(function (f) { return row[f[0]] === f[1]; });
  }

  function makeBuilder(table) {
    var op = 'select', filters = [], payload = null;
    var builder = {
      select: function () { op = 'select'; return builder; },
      insert: function (p) { op = 'insert'; payload = p; return builder; },
      update: function (p) { op = 'update'; payload = p; return builder; },
      delete: function () { op = 'delete'; return builder; },
      eq: function (col, val) { filters.push([col, val]); return builder; },
      order: function () { return builder; },
      then: function (resolve, reject) {
        var result = { data: null, error: null };
        try {
          if (op === 'select') {
            var rows = db[table].filter(function (r) { return matchesFilters(r, filters); });
            if (table === 'entradas') rows = rows.filter(function (r) { return r.user_id === CURRENT_USER.id; });
            result.data = rows;
          } else if (op === 'insert') {
            var row = Object.assign({ id: uid(), criado_em: new Date().toISOString() }, payload);
            db[table].push(row);
            result.data = [row];
          } else if (op === 'update') {
            db[table].forEach(function (r) { if (matchesFilters(r, filters)) Object.assign(r, payload); });
          } else if (op === 'delete') {
            db[table] = db[table].filter(function (r) { return !matchesFilters(r, filters); });
          }
        } catch (err) { result.error = err; }
        return Promise.resolve(result).then(resolve, reject);
      }
    };
    return builder;
  }

  var mockClient = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: { user: CURRENT_USER } } }); },
      onAuthStateChange: function (cb) { authListeners.push(cb); return { data: { subscription: { unsubscribe: function () {} } } }; },
      signInWithPassword: function () { return Promise.resolve({ data: { session: { user: CURRENT_USER } }, error: null }); },
      signUp: function () { return Promise.resolve({ data: { session: { user: CURRENT_USER } }, error: null }); },
      signOut: function () { authListeners.forEach(function (cb) { cb('SIGNED_OUT', null); }); return Promise.resolve({ error: null }); }
    },
    from: function (table) { return makeBuilder(table); },
    channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
    removeChannel: function () {}
  };

  window.supabase = { createClient: function () { return mockClient; } };
})();
