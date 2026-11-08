// Headless smoke test of index.html at 360/390 px with Chrome-Android, FacebookApp and Samsung
// user agents: cookie banner, menu, carousels, house filter + card taps, lot selector, gallery +
// lightbox (taps, swipes, fast taps), both forms (kontakt.php is answered by the test, nothing is
// sent), popup, GA4 events in dataLayer, js_error reporting, console errors.
// Runs inside the Lighthouse image (node + chromium + puppeteer-core), against a local server:
//   podman run --rm --network=host --userns=keep-id:uid=997 -e SMOKE_URL=http://127.0.0.1:8780/ \
//     -v "$PWD/tools:/w:Z" -v /tmp/shots:/out:Z --entrypoint node docker.io/femtopixel/google-lighthouse \
//     /w/smoke.mjs /out [--popup-wait]
// --popup-wait adds the ~35 s popup trigger scenario (25 s + 50% scroll + idle).
import puppeteer from '/usr/lib/node_modules/lighthouse/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const OUT = process.argv[2] || '/home/chrome/reports';
const POPUP_WAIT = process.argv.includes('--popup-wait');
const URL = process.env.SMOKE_URL || 'http://127.0.0.1:8780/';
const UAS = {
  chrome:  'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  fbapp:   'Mozilla/5.0 (Linux; Android 13; SM-A135F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.45.109;]',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
};
async function section(ctx, name, fn) { try { await fn(); } catch (e) { check(ctx, 'section ' + name + ' crashed', false, String(e && e.message || e).slice(0, 200)); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
let fails = 0;
function check(ctx, name, ok, info) {
  results.push(`${ok ? 'PASS' : 'FAIL'} [${ctx}] ${name}${info !== undefined ? ' :: ' + JSON.stringify(info) : ''}`);
  if (!ok) fails++;
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function newPage(width, ua) {
  const bctx = await browser.createBrowserContext();
  const page = await bctx.newPage();
  await page.setUserAgent(UAS[ua]);
  await page.setViewport({ width, height: width === 360 ? 740 : 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text() + ' @ ' + ((m.location() || {}).url || '')); });
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().endsWith('/kontakt.php') && req.method() === 'POST') {
      return req.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    // no real Meta / Clarity traffic from tests
    if (/connect\.facebook\.net|facebook\.com\/tr/.test(req.url())) return req.abort();
    req.continue();
  });
  await page.evaluateOnNewDocument(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  return { page, errors };
}

const events = page => page.evaluate(() => (window.dataLayer || []).filter(a => a && a[0] === 'event').map(a => [a[1], a[2] || {}]));
const overflowLocked = page => page.evaluate(() => document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden');
const isVisible = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }, sel);

async function swipe(page, sel, dx) {
  const box = await (await page.$(sel)).boundingBox();
  const y = box.y + box.height / 2, x0 = box.x + box.width / 2 - dx / 2;
  await page.touchscreen.touchStart(x0, y);
  for (let i = 1; i <= 5; i++) await page.touchscreen.touchMove(x0 + dx * i / 5, y + i);
  await page.touchscreen.touchEnd();
}

async function scrollIntoViewInstant(page, sel) {
  await page.evaluate(s => { const el = document.querySelector(s); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'instant' }); }, sel);
  await sleep(700);
}

async function run(width, ua, consent) {
  const ctx = `${width}/${ua}/${consent}`;
  const { page, errors } = await newPage(width, ua);
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await sleep(1800);
  await page.screenshot({ path: `${OUT}/first-${width}-${ua}.png` });

  // no horizontal scroll
  const hs = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(ctx, 'no horizontal page scroll', hs <= 0, hs);

  // consistency of first-screen copy
  // (expected values come from the cards, the single source of truth)
  const { heroTxt, nAvail, nAll, low } = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#aptGrid .ko-card'));
    const avail = cards.filter(c => c.dataset.status === 'avail');
    return {
      heroTxt: (document.querySelector('.hero') || document.body).innerText,
      nAvail: avail.length, nAll: cards.length,
      low: Math.min(...avail.map(c => +c.dataset.price))
    };
  });
  const lowTxt = String(low).replace(/(\d{3})$/, '\\s?$1');
  check(ctx, `hero mentions ${low} + ${nAvail} z ${nAll}`,
    new RegExp(lowTxt).test(heroTxt) && heroTxt.includes(`${nAvail} z ${nAll}`), heroTxt.slice(0, 200));

  // cookie banner
  const bannerShown = await isVisible(page, '#koPrefs');
  check(ctx, 'cookie banner visible', bannerShown);
  if (bannerShown) {
    // banner must not cover the hamburger
    const cover = await page.evaluate(() => {
      const b = document.getElementById('koPrefs').getBoundingClientRect();
      const h = document.getElementById('hamburger').getBoundingClientRect();
      return !(h.bottom <= b.top || h.top >= b.bottom);
    });
    check(ctx, 'banner does not cover menu button', !cover);
    const ctaCovered = await page.evaluate(() => {
      const b = document.getElementById('koPrefs').getBoundingClientRect();
      const c = document.querySelector('.hero-cta').getBoundingClientRect();
      return c.bottom > b.top;
    });
    check(ctx, 'banner does not cover hero CTA', !ctaCovered);
    const fpHidden = await page.evaluate(() => getComputedStyle(document.querySelector('.float-phone')).visibility === 'hidden');
    check(ctx, 'float phone hidden while hero CTA visible', fpHidden);
    await page.tap(consent === 'accept' ? '.ko-prefs-yes' : '.ko-prefs-no');
    await sleep(700);
    check(ctx, 'banner hidden after choice', !(await isVisible(page, '#koPrefs')));
  }

  await section(ctx, 'menu', async () => {
  // mobile menu
  const hb = await page.$('#hamburger');
  const hbBox = await hb.boundingBox();
  check(ctx, 'menu button >= 44x44', hbBox.width >= 44 && hbBox.height >= 44, [hbBox.width, hbBox.height]);
  await page.tap('#hamburger');
  await sleep(450);
  check(ctx, 'menu opens', await page.evaluate(() => document.getElementById('nav-links').classList.contains('open')));
  const exp = await page.evaluate(() => document.getElementById('hamburger').getAttribute('aria-expanded'));
  check(ctx, 'aria-expanded true', exp === 'true', exp);
  await page.keyboard.press('Escape');
  await sleep(450);
  check(ctx, 'menu closes on Esc', await page.evaluate(() => !document.getElementById('nav-links').classList.contains('open')));
  await page.tap('#hamburger'); await sleep(450);
  await page.tap('#nav-links a[href="#oferta"]');
  await sleep(900);
  check(ctx, 'menu closes after link tap', await page.evaluate(() => !document.getElementById('nav-links').classList.contains('open')));
  const ofTop = await page.evaluate(() => Math.round(document.getElementById('oferta').getBoundingClientRect().top));
  check(ctx, 'menu link scrolled to #oferta', Math.abs(ofTop) < 140, ofTop);
  await page.evaluate(() => window.scrollBy({ top: -80, behavior: 'instant' })); await sleep(500);
  await page.tap('#hamburger'); await sleep(450);
  await page.touchscreen.tap(width / 2, (width === 360 ? 740 : 844) - 20);
  await sleep(450);
  check(ctx, 'menu closes on outside tap', await page.evaluate(() => !document.getElementById('nav-links').classList.contains('open')));
  for (const target of ['#lokalizacja', '#wizualizacje', '#kontakt']) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await sleep(400);
    await page.tap('#hamburger'); await sleep(450);
    await page.tap(`#nav-links a[href="${target}"]`);
    await sleep(1800);
    const top = await page.evaluate(t => Math.round(document.querySelector(t).getBoundingClientRect().top), target);
    check(ctx, 'menu jump lands on ' + target, Math.abs(top) < 140, top);
  }
  const mev = (await events(page)).map(e => e[0] + (e[1].link_target ? ':' + e[1].link_target : ''));
  check(ctx, 'GA4 menu_open x3 + menu_click #oferta', mev.filter(e => e === 'menu_open').length === 6 && mev.includes('menu_click:#oferta'), mev.filter(e => /^menu/.test(e)));
  check(ctx, 'scroll unlocked after menu', !(await overflowLocked(page)));
  const fpShown = await page.evaluate(() => getComputedStyle(document.querySelector('.float-phone')).visibility === 'visible');
  check(ctx, 'float phone visible below the hero', fpShown);

  });
  await section(ctx, 'carousel', async () => {
  // apartment carousel
  await scrollIntoViewInstant(page, '#aptGrid');
  const sl0 = await page.evaluate(() => document.getElementById('aptGrid').scrollLeft);
  await page.evaluate(() => document.querySelector('#aptGrid + .m-nav .m-arrow:last-child').click());
  await sleep(800);
  const sl1 = await page.evaluate(() => document.getElementById('aptGrid').scrollLeft);
  check(ctx, 'apartment carousel next arrow scrolls', sl1 > sl0, [sl0, sl1]);
  await page.evaluate(() => document.querySelectorAll('#aptGrid + .m-nav .m-dots button')[3].click());
  await sleep(800);
  const activeDot = await page.evaluate(() => Array.from(document.querySelectorAll('#aptGrid + .m-nav .m-dots button')).findIndex(b => b.classList.contains('active')));
  check(ctx, 'apartment carousel dot jumps', activeDot === 3, activeDot);
  const pagesBefore = (await page.browserContext().pages()).length;
  await page.evaluate(() => document.querySelector('#aptGrid .ko-card:not(.ko-sold) .ko-media').click());
  await sleep(800);
  const pagesAfter = await page.browserContext().pages();
  check(ctx, 'card image tap opens data sheet', pagesAfter.length === pagesBefore + 1 && /karty\/.+\.pdf$/.test(pagesAfter[pagesAfter.length - 1].url()), pagesAfter.map(p => p.url()).slice(-1));
  if (pagesAfter.length > pagesBefore) await pagesAfter[pagesAfter.length - 1].close();
  await page.evaluate(() => document.querySelector('#aptGrid .ko-card.ko-sold .ko-media').click());
  await sleep(500);
  check(ctx, 'sold card image does nothing', (await page.browserContext().pages()).length === pagesBefore);
  // filter pills
  await page.evaluate(() => document.querySelector('.ko-pill[data-filter="avail"]').click());
  await sleep(300);
  const shown = await page.evaluate(() => Array.from(document.querySelectorAll('#aptGrid .ko-card')).filter(c => !c.hidden).length);
  check(ctx, `filter avail shows ${nAvail}`, shown === nAvail, shown);
  await page.evaluate(() => document.querySelector('.ko-pill[data-filter="all"]').click());

  });
  await section(ctx, 'lot', async () => {
  // lot selector -> half modal
  await scrollIntoViewInstant(page, '.lot-map-wrap');
  await page.evaluate(() => document.querySelector('.lot-spot[data-building="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await sleep(400);
  check(ctx, 'half modal opens', await isVisible(page, '#halfModal'));
  await page.evaluate(() => document.getElementById('halfLeft').click());
  await sleep(600);
  const opened = await page.evaluate(() => window.__opened.slice());
  check(ctx, 'half pick opens PDF', opened[0] === 'karty/1-1A-New.pdf', opened);
  check(ctx, 'half modal closed + scroll unlocked', !(await isVisible(page, '#halfModal')) && !(await overflowLocked(page)));
  await page.evaluate(() => document.querySelector('.lot-spot[data-building="2"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await sleep(400);
  await page.keyboard.press('Escape');
  await sleep(600);
  check(ctx, 'half modal Esc closes', !(await isVisible(page, '#halfModal')) && !(await overflowLocked(page)));

  });
  await section(ctx, 'gallery', async () => {
  // gallery
  await scrollIntoViewInstant(page, '#gallery-main');
  const y0 = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 6; i++) { await page.tap('.gallery-arrow-next'); await sleep(60); }
  await sleep(700);
  const g1 = await page.evaluate(() => ({ src: document.getElementById('gallery-main-img').getAttribute('src'), counter: document.getElementById('gallery-counter').textContent, fading: document.getElementById('gallery-main-img').classList.contains('fading') }));
  check(ctx, 'gallery rapid taps settle', g1.counter.trim() === '1 / 6' && !g1.fading, g1);
  const y1 = await page.evaluate(() => window.scrollY);
  check(ctx, 'gallery nav does not jump page', Math.abs(y1 - y0) < 5, [y0, y1]);
  await page.evaluate(() => document.querySelectorAll('.gallery-tab')[1].click());
  await page.evaluate(() => document.querySelectorAll('.gallery-tab')[2].click());
  await page.evaluate(() => document.querySelectorAll('.gallery-tab')[1].click());
  await sleep(700);
  const g2 = await page.evaluate(() => ({ src: document.getElementById('gallery-main-img').getAttribute('src'), counter: document.getElementById('gallery-counter').textContent }));
  check(ctx, 'gallery tab switch race', g2.src === 'zdjecia/interior_6.webp' && g2.counter.trim() === '1 / 9', g2);
  await swipe(page, '#gallery-main', -160);
  await sleep(800);
  const g3 = await page.evaluate(() => ({ counter: document.getElementById('gallery-counter').textContent, lb: document.getElementById('lightbox').classList.contains('open') }));
  check(ctx, 'gallery swipe navigates without opening lightbox', g3.counter.trim() === '2 / 9' && !g3.lb, g3);
  await page.tap('#gallery-main');
  await sleep(500);
  check(ctx, 'gallery tap opens lightbox', await page.evaluate(() => document.getElementById('lightbox').classList.contains('open')));
  const lbSrc0 = await page.evaluate(() => document.getElementById('lightbox-img').getAttribute('src'));
  check(ctx, 'lightbox shows current gallery image', /interior_1-scaled/.test(lbSrc0), lbSrc0);
  await swipe(page, '#lightbox', -160);
  await sleep(600);
  const lb1 = await page.evaluate(() => ({ src: document.getElementById('lightbox-img').getAttribute('src'), open: document.getElementById('lightbox').classList.contains('open') }));
  check(ctx, 'lightbox swipe next, stays open', /interior_2-scaled/.test(lb1.src) && lb1.open, lb1);
  for (let i = 0; i < 5; i++) { await page.evaluate(() => document.querySelector('.lightbox-next').click()); await sleep(40); }
  await sleep(700);
  const lb2 = await page.evaluate(() => ({ src: document.getElementById('lightbox-img').getAttribute('src'), op: getComputedStyle(document.getElementById('lightbox-img')).opacity }));
  check(ctx, 'lightbox rapid next settles visible', /interior_5\.webp/.test(lb2.src) && +lb2.op > 0.9, lb2);
  await page.keyboard.press('Escape');
  await sleep(500);
  check(ctx, 'lightbox Esc closes + unlock', !(await page.evaluate(() => document.getElementById('lightbox').classList.contains('open'))) && !(await overflowLocked(page)));
  // static gallery lightbox (osada)
  await scrollIntoViewInstant(page, '.osada-gallery');
  await page.evaluate(() => document.querySelectorAll('.osada-gallery img')[2].click());
  await sleep(500);
  const lb3 = await page.evaluate(() => document.getElementById('lightbox-img').getAttribute('src'));
  check(ctx, 'osada image opens in lightbox', /kaszubska_osada_6/.test(lb3), lb3);
  await page.evaluate(() => document.querySelector('.lightbox-next').click());
  await sleep(600);
  const lb4 = await page.evaluate(() => document.getElementById('lightbox-img').getAttribute('src'));
  check(ctx, 'osada lightbox next stays in set', /ostoja_galeria_7/.test(lb4), lb4);
  await page.evaluate(() => document.querySelector('.lightbox-close').click());
  await sleep(500);
  check(ctx, 'lightbox close button', !(await overflowLocked(page)) && !(await page.evaluate(() => document.getElementById('lightbox').classList.contains('open'))));

  });
  await section(ctx, 'forms', async () => {
  // contact form (request intercepted)
  await scrollIntoViewInstant(page, '#contactForm');
  await page.type('#name', 'Test Testowy');
  await page.type('#email', 'test@example.com');
  await page.evaluate(() => document.querySelector('#contactForm input[type=checkbox][required]').click());
  await page.evaluate(() => document.querySelector('#contactForm button[type=submit]').click());
  await sleep(1200);
  const cf = await page.evaluate(() => document.querySelector('#contactForm button[type=submit]').className);
  check(ctx, 'contact form success state', /success/.test(cf), cf);

  // popup (direct open) + callback form
  await page.evaluate(() => window.openOfferPopup && window.openOfferPopup('test'));
  await sleep(700);
  check(ctx, 'popup visible', await isVisible(page, '#offerPopup'));
  await page.screenshot({ path: `${OUT}/popup-${width}-${ua}.png` });
  if (await isVisible(page, '.offer-popup-sheet-form')) {
    check(ctx, 'sheet: form hidden until "Zostaw numer"', !(await isVisible(page, '#cb-name')));
    check(ctx, 'sheet: page not scroll-locked', !(await overflowLocked(page)));
    await page.tap('.offer-popup-sheet-form'); await sleep(300);
  }
  await page.type('#cb-name', 'Test');
  await page.type('#cb-phone', '500000000');
  await page.evaluate(() => document.getElementById('cb-rodo').click());
  await page.evaluate(() => document.getElementById('btnCallback').click());
  await sleep(1000);
  const cbc = await page.evaluate(() => document.getElementById('btnCallback').className);
  check(ctx, 'callback form success state', /success/.test(cbc), cbc);
  await sleep(3200);
  check(ctx, 'popup auto-closes + unlock', !(await isVisible(page, '#offerPopup')) && !(await overflowLocked(page)), await page.evaluate(() => { const o = document.getElementById('offerPopup'); return [o.className, o.style.display, getComputedStyle(o).opacity, document.getElementById('btnCallback').className]; }));

  });
  const ev = (await events(page)).map(e => e[0]);
  check(ctx, 'GA4 generate_lead x2', ev.filter(e => e === 'generate_lead').length === 2, ev);
  const jsErr = (await events(page)).filter(e => e[0] === 'js_error');
  check(ctx, 'no js_error events', jsErr.length === 0, jsErr);
  const own = errors.filter(e => !/googletagmanager|clarity|facebook|google-analytics|doubleclick|ERR_FAILED|net::ERR/.test(e));
  check(ctx, 'no console/page errors (own)', own.length === 0, own);
  if (ua === 'fbapp') {
    await page.evaluate(() => { const sc = document.createElement('script'); sc.textContent = "for (let i = 0; i < 5; i++) setTimeout(() => { throw new Error('boom' + i + ' https://x.pl/a?b=1 jan@x.pl 1234567'); }); setTimeout(() => { throw new Error('boom0 https://x.pl/a?b=1 jan@x.pl 1234567'); });"; document.body.appendChild(sc); });
    await sleep(300);
    const je = (await events(page)).filter(e => e[0] === 'js_error').map(e => e[1]);
    check(ctx, 'js_error: max 3, sanitized, browser family', je.length === 3 && je.every(p => !/x\.pl|jan@|1234567/.test(p.error_message) && p.browser_family === 'FacebookApp'), je);
  }
  if (errors.length !== own.length) results.push(`INFO [${ctx}] third-party console errors: ${JSON.stringify(errors.filter(e => !own.includes(e)).slice(0, 3))}`);
  await page.browserContext().close();
}

async function popupTrigger(width) {
  const ctx = `${width}/popup-trigger`;
  const { page, errors } = await newPage(width, 'chrome');
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await sleep(1200);
  await page.tap('.ko-prefs-no'); await sleep(500);
  // stay at top 27 s: must not appear
  await sleep(26000);
  check(ctx, 'no popup at top after 26 s', !(await isVisible(page, '#offerPopup')));
  await page.evaluate(() => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * 0.55, behavior: 'instant' }));
  await sleep(600);
  check(ctx, 'no popup immediately after scroll (idle guard)', !(await isVisible(page, '#offerPopup')));
  await sleep(2000);
  check(ctx, 'popup after 50% scroll + idle', await isVisible(page, '#offerPopup'));
  const locked = await overflowLocked(page);
  check(ctx, 'mobile popup does not lock scroll', !locked);
  await page.screenshot({ path: `${OUT}/popup-sheet-${width}.png` });
  const shownEv = (await events(page)).filter(e => e[0] === 'popup_shown');
  check(ctx, 'popup_shown with scroll %', shownEv.length === 1 && shownEv[0][1].scroll_percent >= 50, shownEv);
  await page.evaluate(() => document.getElementById('offerPopupClose').click());
  await sleep(800);
  check(ctx, 'popup closes', !(await isVisible(page, '#offerPopup')));
  const dis = (await events(page)).filter(e => e[0] === 'popup_dismiss');
  check(ctx, 'popup_dismiss event', dis.length === 1, dis);
  check(ctx, 'no errors', errors.filter(e => !/googletagmanager|clarity|facebook|net::ERR/.test(e)).length === 0, errors);
  await page.browserContext().close();
}

try {
  for (const [w, ua, c] of [[390, 'chrome', 'reject'], [360, 'fbapp', 'accept'], [390, 'samsung', 'reject'], [360, 'chrome', 'accept']]) {
    try { await run(w, ua, c); } catch (e) { check(`${w}/${ua}`, 'run crashed', false, String(e && e.stack || e).slice(0, 400)); }
  }
  if (POPUP_WAIT) { try { await popupTrigger(390); } catch (e) { check('popup', 'crashed', false, String(e).slice(0, 300)); } }
} finally {
  await browser.close();
}
console.log(results.join('\n'));
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
