-- ============================================================================
-- Bigode NFL — migração das apostas já existentes no painel antigo (25 apostas)
-- 
-- COMO USAR:
-- 1. Cadastre-se primeiro no site novo (crie sua conta com e-mail + senha).
-- 2. No painel do Supabase, vá em Authentication → Users, ache seu e-mail e
--    copie o UUID da coluna "UID".
-- 3. Troque, logo abaixo, o valor 00000000-0000-0000-0000-000000000000 pelo
--    seu UUID (só precisa trocar em UM lugar, na linha "v_dono uuid := ...").
-- 4. Cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- ============================================================================

do $$
declare
  -- <<< TROQUE o UUID abaixo pelo seu (Authentication → Users → coluna UID) >>>
  v_dono uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_bilhete_id uuid;
begin
  if v_dono = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Troque v_dono pelo seu UUID de usuário antes de rodar esta migração (veja o topo do arquivo).';
  end if;

  v_bilhete_id := '267f3e7f-9531-48a6-b667-d96c8ecf3ee1'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-10T18:24:52.000Z'::timestamptz, 'Superbet', 'Supermúltipla — 50+ jardas por recepção', '898L-7S9K1R', 'Superbet aplicou boost na supermúltipla (odds base 37,53); ganho potencial exibido no bilhete: R$ 4.119,38.', 100, 41.19, '[{"descricao": "Mike Evans — 50+ jardas por recepção (odd 1,92)", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Dalton Kincaid — 50+ jardas por recepção (odd 2,60)", "jogo": "HOU Texans x BUF Bills", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Chris Godwin — 50+ jardas por recepção (odd 2,35)", "jogo": "CIN Bengals x TB Buccaneers", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "KC Concepcion — 50+ jardas por recepção (odd 3,20)", "jogo": "JAX Jaguars x CLE Browns", "data": "2026-09-13", "hora": "14:00"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 41.19, 'pendente', NULL, NULL, '2026-09-10T18:24:52.000Z'::timestamptz);

  v_bilhete_id := 'e998e8b5-e3f6-4731-89ff-77bfc4584f82'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-10T18:24:52.000Z'::timestamptz, 'Superbet', 'SF 49ers x LA Rams', '899P-EYSMWG', '', 50, 50.96, '[{"descricao": "Puka Nacua — menos de 91,5 jardas de recepção", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Blake Corum — mais de 10,5 corridas", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Christian McCaffrey — 75+ jardas de corrida", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Tyler Higbee — menos de 16,5 jardas de recepção", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Terrance Ferguson — mais de 23,5 jardas de recepção", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Matthew Stafford — menos de 23,5 passes completos", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 50, 50.96, 'pendente', NULL, NULL, '2026-09-10T18:24:52.000Z'::timestamptz);

  v_bilhete_id := 'f7efa223-c346-41e5-9ae8-cf35e966aabb'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-10T16:05:20.000Z'::timestamptz, 'Betano', 'SF 49ers x LA Rams', NULL, '', 100, 10.25, '[{"descricao": "Mike Evans — mais de 18,5 jardas na recepção mais longa", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Deebo Samuel — mais de 16,5 jardas na recepção mais longa", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Terrance Ferguson — menos de 15,5 jardas na recepção mais longa", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Jordan Whittington — mais de 3,5 jardas na recepção mais longa", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 10.25, 'pendente', NULL, NULL, '2026-09-10T16:05:20.000Z'::timestamptz);

  v_bilhete_id := '2ee87895-1027-4b48-a3c2-ccca8f111a5a'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-10T16:05:20.000Z'::timestamptz, 'Bet365', 'SF 49ers x LA Rams', 'SS7307205371I', '', 32.52, 101, '[{"descricao": "Mike Evans — recepção mais longa de 30 ou mais jardas", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Christian McCaffrey — 3 ou mais recepções", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "George Kittle — 3 ou mais recepções", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Puka Nacua — recepção mais longa de 30 ou mais jardas", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Kyren Williams — mais de 12,5 jardas de corrida na partida", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Qualquer time marcar 3 vezes sem resposta — não", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Ambos os times marcarem 1+ touchdown em cada tempo — sim", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 32.52, 101, 'pendente', NULL, NULL, '2026-09-10T16:05:20.000Z'::timestamptz);

  v_bilhete_id := 'c0622a2a-3cd3-4a88-b501-ac29cf50d47a'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-10T15:42:00.000Z'::timestamptz, 'Bet365', 'SF 49ers x LA Rams', 'DS6010274671W', '', 100, 8.5, '[{"descricao": "Deebo Samuel — marcar touchdown a qualquer momento", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Deebo Samuel — 50+ jardas de recepção", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 8.5, 'pendente', NULL, NULL, '2026-09-10T15:42:00.000Z'::timestamptz);

  v_bilhete_id := '826229b1-8164-45d5-8bc7-c0f310e50f17'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'NE Patriots x SEA Seahawks', NULL, '', 64.4, 28, '[{"descricao": "Drake Maye — 30+ jardas de corrida", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Hunter Henry — mais de 33,5 jardas de recepção", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Rashid Shaheed — mais de 17,5 na recepção mais longa", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Jaxon Smith-Njigba — mais de 24,5 na recepção mais longa", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "A.J. Brown — mais de 23,5 na recepção mais longa", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 64.4, 28, 'red', NULL, '2026-09-10T02:52:32.199Z'::timestamptz, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := 'ba4e5af3-d273-4ea5-96e3-8c629bf644f3'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'Múltipla de 5 — marcador de touchdown', NULL, '', 50, 182.99, '[{"descricao": "Hunter Henry — marcar touchdown a qualquer momento (odd 4,20)", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Davante Adams — marcar touchdown a qualquer momento (odd 2,30)", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Drake London — marcar touchdown a qualquer momento (odd 3,25)", "jogo": "ATL Falcons x PIT Steelers", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Chase Brown — marcar touchdown a qualquer momento (odd 1,71)", "jogo": "TB Buccaneers x CIN Bengals", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Christian Watson — marcar touchdown a qualquer momento (odd 3,40)", "jogo": "GB Packers x MIN Vikings", "data": "2026-09-13", "hora": "17:25"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 50, 182.99, 'red', NULL, '2026-09-10T02:52:28.741Z'::timestamptz, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '8b946dd5-535b-44b8-bf78-4c76654372c5'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'Tripla — mais de 100 jardas de recepção', NULL, '', 100, 58, '[{"descricao": "Brock Bowers — mais de 100 jardas de recepção (odd 5,50)", "jogo": "MIA Dolphins x LV Raiders", "data": "2026-09-13", "hora": "17:25"}, {"descricao": "Devonta Smith — mais de 100 jardas de recepção (odd 4,75)", "jogo": "WAS Commanders x PHI Eagles", "data": "2026-09-13", "hora": "17:25"}, {"descricao": "Ja''Marr Chase — mais de 100 jardas de recepção (odd 2,22)", "jogo": "TB Buccaneers x CIN Bengals", "data": "2026-09-13", "hora": "14:00"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 58, 'pendente', NULL, NULL, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := 'feb7eb30-7c63-48e8-a7e8-e4938ff91109'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'NE Patriots x SEA Seahawks', NULL, '', 100, 22, '[{"descricao": "Jaxon Smith-Njigba — marcar touchdown no 1º Tempo", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Jaxon Smith-Njigba — marcar touchdown no 2º Tempo", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 22, 'red', NULL, '2026-09-10T02:52:37.255Z'::timestamptz, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '550e17f6-335e-4350-92c1-fd492c4ac395'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'SF 49ers x LA Rams', NULL, '', 70, 56, '[{"descricao": "Brock Purdy — 25+ passes completos", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Mike Evans — 5+ recepções", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Mike Evans — marcar 2 ou mais touchdowns", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 70, 56, 'pendente', NULL, NULL, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := 'c68b1eda-bbec-49e8-992e-cc77696402f0'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'Múltipla de 5 — recepção mais longa', NULL, '', 50, 127.5, '[{"descricao": "Rashid Shaheed — mais de 30 jardas na recepção mais longa (odd 3,80)", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Jameson Williams — mais de 30 jardas na recepção mais longa (odd 2,55)", "jogo": "NO Saints x DET Lions", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Ja''Marr Chase — mais de 30 jardas na recepção mais longa (odd 2,15)", "jogo": "TB Buccaneers x CIN Bengals", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "George Pickens — mais de 30 jardas na recepção mais longa (odd 2,55)", "jogo": "DAL Cowboys x NY Giants", "data": "2026-09-13", "hora": "21:20"}, {"descricao": "Christian Watson — mais de 30 jardas na recepção mais longa (odd 2,40)", "jogo": "GB Packers x MIN Vikings", "data": "2026-09-13", "hora": "17:25"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 50, 127.5, 'red', NULL, '2026-09-10T03:01:13.301Z'::timestamptz, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '33a68ecd-8fa5-4391-ad52-eeeb808a134d'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'Tripla — mais de 100 jardas de recepção', NULL, '', 47.48, 102.02, '[{"descricao": "Mike Evans — mais de 100 jardas de recepção (odd 7,25)", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "A.J. Brown — mais de 100 jardas de recepção (odd 4,20)", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Amon-Ra St.Brown — mais de 100 jardas de recepção (odd 3,35)", "jogo": "NO Saints x DET Lions", "data": "2026-09-13", "hora": "14:00"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 47.48, 102.02, 'red', NULL, '2026-09-10T02:52:46.933Z'::timestamptz, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '79ed30b0-42f5-448b-bcdf-3f74b8d682d7'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'Múltipla de 6 — touchdown no 1º Tempo', NULL, '', 30, 1491.5, '[{"descricao": "Jaxon Smith-Njigba — marcar touchdown no 1º Tempo (odd 4,10)", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Puka Nacua — marcar touchdown no 1º Tempo (odd 4,50)", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Jonathan Taylor — marcar touchdown no 1º Tempo (odd 3,05)", "jogo": "BAL Ravens x IND Colts", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Bijan Robinson — marcar touchdown no 1º Tempo (odd 3,10)", "jogo": "ATL Falcons x PIT Steelers", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Jahmyr Gibbs — marcar touchdown no 1º Tempo (odd 2,25)", "jogo": "NO Saints x DET Lions", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Ja''Marr Chase — marcar touchdown no 1º Tempo (odd 3,80)", "jogo": "TB Buccaneers x CIN Bengals", "data": "2026-09-13", "hora": "14:00"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 30, 1491.5, 'red', NULL, '2026-09-10T02:52:49.553Z'::timestamptz, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '2101d9e2-5410-4a3b-9f40-3f27f945d7d9'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Superbet', 'Supermúltipla — marcador de touchdown', '899C-E1G17H', '', 40, 257.04, '[{"descricao": "Bucky Irving — marcar touchdown a qualquer momento (odd 2,40)", "jogo": "CIN Bengals x TB Buccaneers", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Colston Loveland — marcar touchdown a qualquer momento (odd 2,85)", "jogo": "CAR Panthers x CHI Bears", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Garrett Wilson — marcar touchdown a qualquer momento (odd 3,30)", "jogo": "TEN Titans x NY Jets", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Juwan Johnson — marcar touchdown a qualquer momento (odd 3,90)", "jogo": "DET Lions x NO Saints", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Christopher Rodriguez Jr. — marcar touchdown a qualquer momento (odd 2,92)", "jogo": "JAX Jaguars x CLE Browns", "data": "2026-09-13", "hora": "14:00"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 40, 257.04, 'pendente', NULL, NULL, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := 'babd6200-93c0-4907-a33a-41576a1471ed'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Superbet', 'Supermúltipla — 50+ jardas por recepção', '898U-7S9CW9', '', 100, 55.38, '[{"descricao": "Rashid Shaheed — 50+ jardas por recepção (odd 3,45)", "jogo": "SEA Seahawks x NE Patriots", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Mike Evans — 50+ jardas por recepção (odd 1,90)", "jogo": "LA Rams x SF 49ers", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Dalton Kincaid — 50+ jardas por recepção (odd 2,60)", "jogo": "HOU Texans x BUF Bills", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "KC Concepcion — 50+ jardas por recepção (odd 3,25)", "jogo": "JAX Jaguars x CLE Browns", "data": "2026-09-13", "hora": "14:00"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 55.38, 'red', NULL, '2026-09-10T03:01:19.915Z'::timestamptz, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '15f0339f-a753-442a-af9a-fec572e43ecd'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Superbet', 'Supermúltipla — 50+/100+ jardas', '899J-ER9UNT', '', 100, 45.38, '[{"descricao": "Tre Tucker — 50+ jardas por recepção (odd 2,47)", "jogo": "LV Raiders x MIA Dolphins", "data": "2026-09-13", "hora": "17:25"}, {"descricao": "Quentin Johnston — 50+ jardas por recepção (odd 2,10)", "jogo": "LA Chargers x ARI Cardinals", "data": "2026-09-13", "hora": "17:25"}, {"descricao": "Matthew Golden — 50+ jardas por recepção (odd 2,50)", "jogo": "MIN Vikings x GB Packers", "data": "2026-09-13", "hora": "17:25"}, {"descricao": "Saquon Barkley — 100+ jardas corridas (odd 3,50)", "jogo": "PHI Eagles x WAS Commanders", "data": "2026-09-13", "hora": "17:25"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 45.38, 'pendente', NULL, NULL, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '3dbeb36c-f804-4f75-be88-6554ccca8a87'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Superbet', 'Supermúltipla — 100+ jardas', '898M-7SSBOZ', '', 60, 128.28, '[{"descricao": "Jameson Williams — 100+ jardas de recepção (odd 5,15)", "jogo": "DET Lions x NO Saints", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Garrett Wilson — 100+ jardas de recepção (odd 4,70)", "jogo": "TEN Titans x NY Jets", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Omarion Hampton — 100+ jardas corridas (odd 5,30)", "jogo": "LA Chargers x ARI Cardinals", "data": "2026-09-13", "hora": "17:25"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 60, 128.28, 'pendente', NULL, NULL, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '31c1905d-9403-4013-94ba-be126d70571b'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Superbet', 'Supermúltipla — total de jardas da campanha mais longa', '898B-7142VL', '', 100, 59.84, '[{"descricao": "Mais de 79,5 jardas (odd 1,70)", "jogo": "SEA Seahawks x NE Patriots", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Mais de 78,5 jardas (odd 1,83)", "jogo": "TEN Titans x NY Jets", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Mais de 79,5 jardas (odd 1,71)", "jogo": "HOU Texans x BUF Bills", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Mais de 79,5 jardas (odd 1,85)", "jogo": "PIT Steelers x ATL Falcons", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Mais de 79,5 jardas (odd 1,85)", "jogo": "JAX Jaguars x CLE Browns", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Mais de 79,5 jardas (odd 1,90)", "jogo": "LV Raiders x MIA Dolphins", "data": "2026-09-13", "hora": "17:25"}, {"descricao": "Mais de 79,5 jardas (odd 1,73)", "jogo": "MIN Vikings x GB Packers", "data": "2026-09-13", "hora": "17:25"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 59.84, 'red', NULL, '2026-09-10T03:25:52.190Z'::timestamptz, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := 'b6e298a8-2042-47d1-91a3-8c68d0cb9c69'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-08T17:40:31.293163Z'::timestamptz, 'Bet365', 'Múltipla de 7 — jardas de recepção', NULL, '', 35.54, 1464.33, '[{"descricao": "Colston Loveland — 80+ jardas de recepção (odd 4,75)", "jogo": "CHI Bears x CAR Panthers", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Dalton Kincaid — 50+ jardas de recepção (odd 3,10)", "jogo": "BUF Bills x HOU Texans", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Jerry Jeudy — 50+ jardas de recepção (odd 3,30)", "jogo": "CLE Browns x JAX Jaguars", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Kyle Pitts — 50+ jardas de recepção (odd 2,50)", "jogo": "ATL Falcons x PIT Steelers", "data": "2026-09-13", "hora": "14:00"}, {"descricao": "Ladd McConkey — 60+ jardas de recepção (odd 2,05)", "jogo": "ARI Cardinals x LA Chargers", "data": "2026-09-13", "hora": "17:25"}, {"descricao": "Tucker Kraft — 50+ jardas de recepção (odd 2,45)", "jogo": "GB Packers x MIN Vikings", "data": "2026-09-13", "hora": "17:25"}, {"descricao": "Stefon Diggs — 50+ jardas de recepção (odd 2,40)", "jogo": "WAS Commanders x PHI Eagles", "data": "2026-09-13", "hora": "17:25"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 35.54, 1464.33, 'pendente', NULL, NULL, '2026-09-08T17:40:31.293163Z'::timestamptz);

  v_bilhete_id := '3c4b06f1-24d5-40e9-a8fc-cb3a6912166d'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-09T17:06:31.312Z'::timestamptz, 'Superbet', 'NE Patriots x SEA Seahawks', NULL, '', 100, 41, '[{"descricao": "Drake Maye — mais de 1,5 touchdowns de passe", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Sam Darnold — mais de 1,5 touchdowns de passe", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Hunter Henry — mais de 3,5 recepções", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "A.J. Brown — mais de 64,5 jardas de recepção", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Jaxon Smith-Njigba — mais de 83,5 jardas de recepção", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "George Holani — mais de 19,5 jardas de corrida", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 41, 'red', NULL, '2026-09-10T02:53:16.766Z'::timestamptz, '2026-09-09T17:06:31.312Z'::timestamptz);

  v_bilhete_id := '17db4c8e-7a04-49f3-a58a-4bfe1515addf'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-09T17:06:31.312Z'::timestamptz, 'Superbet', 'NE Patriots x SEA Seahawks', NULL, '', 100, 13.5, '[{"descricao": "Drake Maye — 225+ jardas de passe", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Rashid Shaheed — 30+ jardas de recepção", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Rhamondre Stevenson — 20+ jardas de recepção", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Rashid Shaheed — menos de 1,5 tentativas de corrida", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Ambos os times marcarem 1+ touchdown em cada tempo — sim", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 13.5, 'red', NULL, '2026-09-10T03:01:33.947Z'::timestamptz, '2026-09-09T17:06:31.312Z'::timestamptz);

  v_bilhete_id := '8b50fa6f-1b98-4cdc-be1e-c7fcc329025c'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-09T18:57:30.675Z'::timestamptz, 'Superbet', 'NE Patriots x SEA Seahawks', '890K-QNONVQ', '', 100, 38.05, '[{"descricao": "Rashid Shaheed — marcar touchdown a qualquer momento", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}, {"descricao": "Rashid Shaheed — 100+ jardas de recepção", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 38.05, 'red', NULL, '2026-09-10T03:01:36.703Z'::timestamptz, '2026-09-09T18:57:30.675Z'::timestamptz);

  v_bilhete_id := '24974ac4-0fff-4a29-a3b2-f2102d4933e7'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-09T21:20:00.000Z'::timestamptz, 'Bet365', 'NE Patriots x SEA Seahawks', NULL, '', 200, 4.25, '[{"descricao": "Jaxon Smith-Njigba — marcar touchdown a qualquer momento", "jogo": "NE Patriots x SEA Seahawks", "data": "2026-09-09", "hora": "21:20"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 200, 4.25, 'green', NULL, '2026-09-10T02:48:47.703Z'::timestamptz, '2026-09-09T21:20:00.000Z'::timestamptz);

  v_bilhete_id := '30432a3e-39af-4b74-bcd0-6afb3ccda8dc'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-10T14:27:08.098Z'::timestamptz, 'Bet365', 'SF 49ers x LA Rams', NULL, '', 100, 15, '[{"descricao": "Christian McCaffrey — mais de 4,5 recepções", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Kyren Williams — mais de 54,5 jardas de corrida", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Matthew Stafford — mais de 1,5 touchdowns de passe", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Davante Adams — marcar touchdown a qualquer momento", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Puka Nacua — mais de 89,5 jardas de recepção", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 15, 'pendente', NULL, NULL, '2026-09-10T14:27:08.098Z'::timestamptz);

  v_bilhete_id := 'afd5c5ea-e14f-4727-a77d-2d3b430ce395'::uuid;
  insert into public.bilhetes (id, criado_por, criado_em, casa, evento, codigo, obs, valor_referencia, odd_referencia, selecoes)
  values (v_bilhete_id, v_dono, '2026-09-10T14:27:08.098Z'::timestamptz, 'Bet365', 'SF 49ers x LA Rams', NULL, '', 100, 25, '[{"descricao": "Brock Purdy — mais de 1,5 touchdowns de passe", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Matthew Stafford — mais de 1,5 touchdowns de passe", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Mike Evans — mais de 48,5 jardas de recepção", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Davante Adams — mais de 51,5 jardas de recepção", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Brock Purdy — mais de 15,5 jardas de corrida", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}, {"descricao": "Kyren Williams — mais de 54,5 jardas de corrida", "jogo": "SF 49ers x LA Rams", "data": "2026-09-10", "hora": "21:35"}]'::jsonb);
  insert into public.entradas (bilhete_id, user_id, valor, odd, status, valor_cashout, resolvido_em, criado_em)
  values (v_bilhete_id, v_dono, 100, 25, 'pendente', NULL, NULL, '2026-09-10T14:27:08.098Z'::timestamptz);

end $$;

-- Depois de rodar, confira: select count(*) from public.bilhetes; select count(*) from public.entradas;