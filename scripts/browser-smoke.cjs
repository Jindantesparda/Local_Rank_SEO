/**
 * Browser smoke test.
 *
 * Unit tests render components with `renderToString`, which does NOT run
 * effects. That makes an entire class of bug invisible to them — including the
 * one that made the Competitors page go completely blank:
 *
 *   a useEffect ran on every tier, but two of the component's branches returned
 *   before a `const` it called was initialised, so the effect hit a temporal
 *   dead zone error and React unmounted the whole app.
 *
 * This drives real Chrome over the DevTools protocol, seeds a session, clicks a
 * tab, and reports what actually rendered plus any uncaught exceptions. It exits
 * non-zero if the page blanked or anything threw.
 *
 *   node scripts/browser-smoke.cjs
 *   APP=http://localhost:3000 SV_TOKEN=<token> node scripts/browser-smoke.cjs
 *
 * Without SV_TOKEN you only exercise the signed-out landing page. Requires a
 * running server, and Chrome (override the path with CHROME_PATH).
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const WebSocket = require('ws');

const APP = process.env.APP || 'http://localhost:3000';
const TOKEN = process.env.SV_TOKEN || '';
const TAB_ID = process.env.SV_TAB || 'nav-tab-competitors';
const DEBUG_PORT = Number(process.env.SV_DEBUG_PORT || 9345);

const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome');

const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-chrome-'));

const get = (url) =>
  new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(b));
      })
      .on('error', reject);
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROBE = [
  'JSON.stringify((function () {',
  "  var main = document.querySelector('main') || document.getElementById('root');",
  '  return {',
  '    hasMain: !!main,',
  "    region: document.querySelector('main') ? 'main' : '#root',",
  '    mainHtmlLength: main ? main.innerHTML.length : -1,',
  '    mainTextLength: main ? main.innerText.trim().length : -1,',
  "    mainText: main ? main.innerText.replace(/\\s+/g, ' ').slice(0, 420) : '',",
  "    buttons: main ? Array.prototype.map.call(main.querySelectorAll('button'), function (b) { return b.id || b.innerText.trim().slice(0, 26); }).slice(0, 14) : [],",
  "    images: main ? main.querySelectorAll('img').length : -1,",
  "    tables: main ? main.querySelectorAll('table').length : -1,",
  "    inputs: main ? main.querySelectorAll('input').length : -1",
  '  };',
  '})())',
].join('\n');

(async () => {
  let chrome;
  let crashed = false;

  try {
    chrome = spawn(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=' + userDir,
        '--remote-debugging-port=' + DEBUG_PORT,
        'about:blank',
      ],
      { stdio: 'ignore' }
    );

    let ready = false;
    for (let i = 0; i < 60; i += 1) {
      try {
        await get('http://127.0.0.1:' + DEBUG_PORT + '/json/version');
        ready = true;
        break;
      } catch {
        await sleep(250);
      }
    }
    if (!ready) {
      console.log('Could not start Chrome. Set CHROME_PATH to your browser binary.');
      process.exitCode = 1;
      return;
    }

    const tabs = JSON.parse(await get('http://127.0.0.1:' + DEBUG_PORT + '/json/list'));
    const pageTab = tabs.find((t) => t.type === 'page');
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((r) => ws.on('open', r));

    const errors = [];
    let id = 0;
    const pending = new Map();

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        errors.push(
          'UNCAUGHT: ' +
            String(d.exception && d.exception.description ? d.exception.description : d.text)
              .split('\n')
              .slice(0, 6)
              .join(' || ')
        );
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        errors.push(
          'console.error: ' +
            msg.params.args
              .map((a) => a.value || a.description || '')
              .join(' ')
              .slice(0, 300)
        );
      }
    });

    const call = (method, params) =>
      new Promise((resolve) => {
        id += 1;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });

    /*
      Optional mobile emulation. Set SV_WIDTH (e.g. 390) to render at a phone
      viewport with touch enabled, which is how layout problems actually show up
      — a desktop-width window will happily hide an overflow.
    */
    const VIEWPORT_WIDTH = Number(process.env.SV_WIDTH || 0);
    const VIEWPORT_HEIGHT = Number(process.env.SV_HEIGHT || 844);
    if (VIEWPORT_WIDTH > 0) {
      await call('Emulation.setDeviceMetricsOverride', {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        deviceScaleFactor: Number(process.env.SV_DPR || 2),
        mobile: true,
      });
      await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      console.log('--- viewport: ' + VIEWPORT_WIDTH + 'x' + VIEWPORT_HEIGHT + ' (mobile) ---');
    }

    const evaluate = async (expression) => {
      const r = await call('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.result && r.result.exceptionDetails) {
        return 'EVAL ERROR: ' + r.result.exceptionDetails.text;
      }
      return r.result && r.result.result ? r.result.result.value : undefined;
    };

    await call('Runtime.enable');
    await call('Page.enable');

    await call('Page.navigate', { url: APP });
    await sleep(3500);

    if (TOKEN) {
      await evaluate(
        "localStorage.setItem('searchvailable_token', " + JSON.stringify(TOKEN) + '); true'
      );
      await call('Page.navigate', { url: APP });
      await sleep(6000);
    }

    // SV_TAB accepts a comma-separated list so a flow can be driven, e.g.
    // "nav-tab-competitors,btn-check-rankings".
    const targets = TAB_ID.split(',').map((s) => s.trim()).filter(Boolean);
    for (const target of targets) {
      const clicked = await evaluate(
        '(function () { var b = document.getElementById(' +
          JSON.stringify(target) +
          "); if (!b) return 'not found'; b.click(); return 'clicked'; })()"
      );
      console.log('--- click ' + target + ': ' + clicked + ' ---');
      await sleep(3000);
    }

    const state = await evaluate(PROBE);
    try {
      const s = JSON.parse(state);
      console.log('  region:', s.region + ' ->', s.hasMain);
      console.log('  main HTML length:', s.mainHtmlLength, '| main text length:', s.mainTextLength);
      console.log('  images:', s.images, '| tables:', s.tables, '| inputs:', s.inputs);
      console.log('  buttons:', JSON.stringify(s.buttons));
      console.log('  MAIN TEXT:', JSON.stringify(s.mainText));
      if (!s.hasMain || s.mainHtmlLength <= 0) crashed = true;
    } catch {
      console.log('  probe returned:', state);
      crashed = true;
    }

    // Optional targeted assertion: set SV_PROBE to any JS expression. The
    // result is printed and a boolean false fails the run, so a specific piece
    // of UI can be checked without reading the whole page.
    const probeExpr = process.env.SV_PROBE;
    if (probeExpr) {
      const probeResult = await evaluate(probeExpr);
      console.log('');
      console.log('--- SV_PROBE ---');
      console.log('  ' + probeResult);
      if (probeResult === false || probeResult === 'false') crashed = true;
    }

    console.log('');
    console.log('--- console errors / uncaught exceptions ---');
    if (!errors.length) {
      console.log('  (none)');
    } else {
      errors.slice(0, 10).forEach((e) => console.log('  ' + e));
      crashed = true;
    }

    ws.close();
  } finally {
    if (chrome) chrome.kill();
    try {
      fs.rmSync(userDir, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      /* chrome may still hold a handle */
    }
  }

  if (crashed) {
    console.log('');
    console.log('  RESULT: FAILED (the page blanked or something threw)');
    process.exitCode = 1;
  } else {
    console.log('');
    console.log('  RESULT: passed');
  }
})();
