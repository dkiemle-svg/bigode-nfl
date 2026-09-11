const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];

  // tela de login (desktop)
  const page1 = await browser.newPage({ viewport: { width: 900, height: 800 } });
  page1.on('pageerror', err => errors.push('login: ' + err));
  await page1.goto('file://' + path.resolve(__dirname, 'index-login.html'));
  await page1.waitForTimeout(300);
  await page1.screenshot({ path: path.resolve(__dirname, 'shot_login.png') });
  await page1.click('[data-action="auth-toggle"]');
  await page1.waitForTimeout(150);
  await page1.screenshot({ path: path.resolve(__dirname, 'shot_signup.png') });
  await page1.close();

  // form de editar entrada + mobile width
  const page2 = await browser.newPage({ viewport: { width: 400, height: 900 } });
  page2.on('pageerror', err => errors.push('mobile: ' + err));
  await page2.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page2.waitForTimeout(300);
  await page2.click('[data-action="editar-entrada-abrir"]');
  await page2.waitForTimeout(150);
  await page2.screenshot({ path: path.resolve(__dirname, 'shot_mobile_edit.png'), fullPage: true });
  await page2.close();

  console.log('errors:', errors);
  await browser.close();
  process.exit(0);
})();
