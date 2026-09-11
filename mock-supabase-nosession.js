// Variante do mock sem sessão — pra testar a tela de login/cadastro.
(function () {
  var mockClient = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: null } }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signInWithPassword: function () { return Promise.resolve({ data: { session: null }, error: { message: 'Invalid login credentials' } }); },
      signUp: function () { return Promise.resolve({ data: { session: null }, error: null }); },
      signOut: function () { return Promise.resolve({ error: null }); }
    },
    from: function () { return { select: function () { return this; }, order: function () { return this; }, then: function (r) { return Promise.resolve({ data: [], error: null }).then(r); } }; },
    channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
    removeChannel: function () {}
  };
  window.supabase = { createClient: function () { return mockClient; } };
})();
