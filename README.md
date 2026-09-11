# Bigode NFL — versão multiusuário (GitHub + Supabase)

Este é o painel novo: hospedado no GitHub Pages, com conta (e-mail + senha)
para cada amigo, atualização instantânea entre todo mundo (via Supabase
Realtime) e financeiro 100% individual.

Como funciona agora:

- **Apostas Compartilhadas** — qualquer pessoa loga e posta o bilhete (print).
  Todo mundo vê. Quem também pegou aquela aposta clica em **"Marcar que
  peguei"** — isso cria uma entrada só dele, com valor e odd editáveis (caso
  a entrada dele tenha sido diferente do print).
- **Minhas Apostas** — só as apostas que a pessoa logada marcou como "peguei",
  com os botões Green/Red/Cashout.
- **Financeiro** — saldo, total apostado, taxa de acerto etc., calculados só
  com as apostas da pessoa logada (privado — ninguém vê o financeiro de
  ninguém, só o próprio).
- **Cronograma** — agenda de todos os jogos/seleções dos bilhetes postados
  (informação pública do grupo, não é dinheiro de ninguém).

Cada pessoa só enxerga o próprio financeiro e as próprias entradas — isso é
garantido no banco (Row Level Security), não só escondido na tela.

---

## 0. O que você vai precisar

- Uma conta no [Supabase](https://supabase.com) (gratuita)
- Uma conta no [GitHub](https://github.com) (gratuita)
- 15–20 minutos

---

## 1. Criar o projeto no Supabase

1. Entre em [supabase.com](https://supabase.com) → **New project**.
2. Dê um nome (ex.: `bigode-nfl`), crie uma senha de banco (guarde ela, mas
   você não vai precisar dela no dia a dia) e escolha uma região próxima
   (ex.: South America - São Paulo).
3. Espere o projeto terminar de criar (~1–2 min).

### 1.1. Rodar o schema (tabelas + permissões)

1. No menu lateral, abra **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` (está nesta pasta), copie **tudo** e
   cole no editor.
3. Clique em **Run**. Deve terminar sem erro.

Isso cria três tabelas:

- `bilhetes` — o print/bilhete que alguém posta (visível para todo mundo
  logado).
- `entradas` — a aposta individual de cada pessoa em cima de um bilhete
  (só a própria pessoa vê e edita a sua).
- `profiles` — o nome de cada usuário, pra aparecer "postado por Fulano".

E já habilita **Realtime** nas três (é isso que faz a tela atualizar sozinha
pra todo mundo, na hora).

### 1.2. Conferir o login por e-mail

1. Vá em **Authentication → Providers** e confira que **Email** está
   habilitado (já vem assim por padrão).
2. (Opcional, só pra testar rápido com os amigos sem precisar confirmar
   e-mail): em **Authentication → Settings**, desative **"Confirm email"**.
   Pra uso "de verdade" é melhor deixar ativado.
3. Vá em **Authentication → URL Configuration** e, depois que você tiver o
   link do GitHub Pages (passo 3), volte aqui e coloque esse link em **Site
   URL** (e em **Redirect URLs**). Isso evita que o e-mail de confirmação
   mande a pessoa pro lugar errado.

### 1.3. Pegar a URL e a chave do projeto

1. Vá em **Project Settings → API**.
2. Copie **Project URL** e a chave **anon public**.
3. Abra o arquivo `site/config.js` (nesta pasta) e cole os dois valores:

```js
window.SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJ...'; // a chave "anon public"
```

Esses dois valores são **públicos por design** — tudo bem eles ficarem
visíveis no código do site, porque quem protege os dados de verdade são as
regras (RLS) que você já rodou no passo 1.1.

---

## 2. Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (pode ser público ou privado —
   privado também funciona com GitHub Pages se sua conta tiver esse plano;
   se não tiver, use público).
2. Suba o **conteúdo da pasta `site/`** (os arquivos `index.html`,
   `style.css`, `app.js` e `config.js` — já com a URL e a chave preenchidas)
   direto na raiz do repositório (ou dentro de uma pasta `docs/`, se
   preferir).
3. No repositório, vá em **Settings → Pages**.
4. Em **Source**, escolha **Deploy from a branch**, branch `main`, pasta
   `/ (root)` (ou `/docs`, se foi por aí que você subiu os arquivos).
5. Espere 1–2 minutos. O GitHub mostra o link do site (algo como
   `https://seu-usuario.github.io/bigode-nfl/`).
6. Volte no Supabase (**Authentication → URL Configuration**, passo 1.2) e
   cole esse link em **Site URL** / **Redirect URLs**.

Pronto — esse link é o que você manda pros seus amigos. Cada atualização de
alguém (postar bilhete, marcar "peguei", marcar Green/Red) aparece na hora
pra todo mundo que estiver com a página aberta, sem precisar dar F5.

---

## 3. Migrar as 25 apostas que já existiam

O arquivo `supabase/seed_migration.sql` já tem as 25 apostas do painel
antigo prontas pra importar, como se fossem suas (porque foi você quem
apostou todas até agora).

1. **Primeiro**, crie sua conta no site novo (aba "Criar conta" — nome,
   e-mail, senha). Se pediu confirmação por e-mail, confirme antes de
   continuar.
2. No Supabase, vá em **Authentication → Users**, ache o seu e-mail e copie
   o **UID** (é um UUID tipo `a1b2c3d4-...`).
3. Abra `supabase/seed_migration.sql`, ache a linha:
   ```sql
   v_dono uuid := '00000000-0000-0000-0000-000000000000'::uuid;
   ```
   e troque só o UUID de dentro das aspas pelo seu.
4. Cole o arquivo inteiro no **SQL Editor** do Supabase e rode.
5. Confira: `select count(*) from public.bilhetes;` deve mostrar pelo menos
   25, e o mesmo pra `public.entradas`.

Atualize a página do site — as 25 apostas antigas devem aparecer em
"Apostas Compartilhadas" e em "Minhas Apostas" (já marcadas como suas, com o
status/valor/odd que cada uma já tinha).

---

## 4. Convidar a galera

Manda o link do GitHub Pages pro grupo. Cada amigo:

1. Abre o link → "Criar conta" → nome, e-mail, senha.
2. A partir daí, cada um posta os próprios bilhetes e marca "peguei" nos
   bilhetes dos outros quando também entrou na aposta — cada um só vê o
   próprio financeiro.

---

## 5. Testando antes de publicar (opcional)

Se quiser ver a tela sem mexer no Supabase ainda, tem uma versão de teste
com dados fake em `test/index.html` — é só abrir esse arquivo direto no
navegador (não precisa de servidor nem de internet). Ela não fala com o
Supabase de verdade, só simula pra você ver o layout. Não é pra subir pro
GitHub, é só uma ferramenta de conferência.

---

## Do que cada arquivo cuida

```
site/
  index.html       → estrutura da página (carrega o supabase-js pelo CDN)
  style.css         → todo o visual (tema claro/escuro automático)
  config.js          → onde você cola a URL e a chave do seu Supabase
  app.js              → toda a lógica: login, abas, tempo real, ações

supabase/
  schema.sql          → cria as tabelas e as regras de permissão (RLS)
  seed_migration.sql  → importa as 25 apostas antigas pra sua conta nova

test/
  index.html + mock-supabase.js → prévia local com dados fake, só pra você
                                   conferir o layout antes de configurar tudo
```

## Se algo der errado

- **Tela fica em "Carregando seus dados…" pra sempre**: confira se
  `site/config.js` tem a URL e a chave certas, e se rodou o `schema.sql`.
  Abra o console do navegador (F12) pra ver o erro exato.
- **Cadastro funciona mas não consegue logar**: provavelmente falta
  confirmar o e-mail (veja passo 1.2) — confira sua caixa de entrada (e
  spam).
- **Link de confirmação de e-mail leva pra um endereço errado**: volte em
  Authentication → URL Configuration e confira o Site URL (passo 2, item 6).
- **Alguém não vê o financeiro de outra pessoa e acha estranho**: é assim
  mesmo, de propósito — o financeiro é privado de cada um.
