const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve(__dirname, 'shot_compartilhadas.png'), fullPage: true });

  // abrir form de novo bilhete
  await page.click('[data-action="novo-bilhete-abrir"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.resolve(__dirname, 'shot_novo_bilhete_form.png'), fullPage: true });
  await page.click('[data-action="novo-bilhete-cancelar"]');
  await page.waitForTimeout(150);

  // marcar que peguei no bilhete b2 (ainda não marcado)
  const marcarBtn = await page.$('[data-action="marcar-peguei"]');
  if (marcarBtn) { await marcarBtn.click(); await page.waitForTimeout(200); }
  await page.screenshot({ path: path.resolve(__dirname, 'shot_apos_marcar.png'), fullPage: true });

  // aba Minhas Apostas
  await page.click('[data-action="switch-tab"][data-tab="minhas"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.resolve(__dirname, 'shot_minhas.png'), fullPage: true });

  // aba Financeiro
  await page.click('[data-action="switch-tab"][data-tab="financeiro"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.resolve(__dirname, 'shot_financeiro.png'), fullPage: true });

  // aba Cronograma
  await page.click('[data-action="switch-tab"][data-tab="cronograma"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.resolve(__dirname, 'shot_cronograma.png'), fullPage: true });

  console.log('errors:', errors);
  await browser.close();
  process.exit(0);
})();
