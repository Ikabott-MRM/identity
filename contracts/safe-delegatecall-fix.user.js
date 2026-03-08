// ==UserScript==
// @name         Safe DELEGATECALL Fix for ClaimHelper
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Forces operation=1 (DELEGATECALL) for ClaimHelper tx on Rootstock Safe
// @match        https://safe.rootstock.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const CLAIM_HELPER = '657b5b93e07add7b0da58043b68f5ddc57af467f';
  const EXEC_TX_SELECTOR = '6a761202';
  const TAG = '[DelegateCall Fix]';

  function isClaimHelperSignRequest(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const to = (parsed?.message?.to || '').toLowerCase();
      return to.includes(CLAIM_HELPER);
    } catch (_) {
      return false;
    }
  }

  function patchTypedData(raw) {
    try {
      let data =
        typeof raw === 'string'
          ? JSON.parse(raw)
          : JSON.parse(JSON.stringify(raw));
      if ((data?.message?.to || '').toLowerCase().includes(CLAIM_HELPER)) {
        if (String(data.message.operation) === '0') {
          data.message.operation = '1';
          console.log(TAG, 'PATCHED signTypedData operation 0 -> 1');
          return typeof raw === 'string' ? JSON.stringify(data) : data;
        }
      }
    } catch (e) {
      console.error(TAG, 'patchTypedData error:', e);
    }
    return raw;
  }

  function patchExecTxCalldata(hex) {
    const d = hex.toLowerCase();
    if (!d.startsWith('0x' + EXEC_TX_SELECTOR)) return hex;
    if (!d.includes(CLAIM_HELPER)) return hex;
    const opStart = 2 + 8 + 64 * 3;
    const currentOp = d.substring(opStart, opStart + 64);
    if (currentOp === '0'.repeat(64)) {
      const patched =
        d.substring(0, opStart) +
        '0'.repeat(63) +
        '1' +
        d.substring(opStart + 64);
      console.log(TAG, 'PATCHED calldata operation 0 -> 1');
      return '0x' + patched.substring(2);
    }
    return hex;
  }

  function wrapRequest(originalFn, ctx) {
    return async function (args) {
      if (!args || !args.method) return originalFn.call(ctx, args);
      const m = args.method;

      if (
        m === 'eth_signTypedData_v4' ||
        m === 'eth_signTypedData_v3' ||
        m === 'eth_signTypedData'
      ) {
        if (
          args.params &&
          args.params[1] &&
          isClaimHelperSignRequest(args.params[1])
        ) {
          console.log(TAG, 'Intercepted', m);
          args = {
            ...args,
            params: [args.params[0], patchTypedData(args.params[1])],
          };
        }
      }

      if (m === 'eth_sendTransaction' && args.params && args.params[0]) {
        const tx = { ...args.params[0] };
        const data = tx.data || tx.input || '';
        if (data.toLowerCase().includes(CLAIM_HELPER)) {
          tx.data = patchExecTxCalldata(data);
          args = { ...args, params: [tx] };
        }
      }

      return originalFn.call(ctx, args);
    };
  }

  // Strategy 1: Wrap request on existing ethereum object
  function patchProvider(provider) {
    if (!provider || provider.__claimHelperPatched) return;
    const orig = provider.request.bind(provider);
    provider.request = wrapRequest(orig, provider);
    if (provider.sendAsync) {
      const origAsync = provider.sendAsync.bind(provider);
      provider.sendAsync = function (payload, cb) {
        if (payload && payload.method) {
          const m = payload.method;
          if (
            m.includes('signTypedData') &&
            payload.params &&
            payload.params[1] &&
            isClaimHelperSignRequest(payload.params[1])
          ) {
            console.log(TAG, 'Intercepted sendAsync', m);
            payload.params[1] = patchTypedData(payload.params[1]);
          }
        }
        return origAsync(payload, cb);
      };
    }
    if (provider.send && typeof provider.send === 'function') {
      const origSend = provider.send.bind(provider);
      provider.send = function (...a) {
        if (
          a[0] &&
          typeof a[0] === 'object' &&
          a[0].method &&
          a[0].method.includes('signTypedData')
        ) {
          if (
            a[0].params &&
            a[0].params[1] &&
            isClaimHelperSignRequest(a[0].params[1])
          ) {
            console.log(TAG, 'Intercepted send', a[0].method);
            a[0].params[1] = patchTypedData(a[0].params[1]);
          }
        }
        return origSend(...a);
      };
    }
    provider.__claimHelperPatched = true;
    console.log(
      TAG,
      'Provider patched:',
      provider.constructor?.name || 'unknown',
    );
  }

  // Strategy 2: Intercept property definition via defineProperty trap
  function installPropertyTrap() {
    const origDefProp = Object.defineProperty;
    Object.defineProperty = function (obj, prop, desc) {
      const result = origDefProp.call(Object, obj, prop, desc);
      if (prop === 'ethereum' && obj === window) {
        console.log(
          TAG,
          'Detected window.ethereum being set via defineProperty',
        );
        setTimeout(() => patchProvider(window.ethereum), 0);
      }
      return result;
    };
  }

  // Strategy 3: Poll for ethereum
  function pollForEthereum() {
    if (window.ethereum) {
      patchProvider(window.ethereum);
      if (window.ethereum.providers) {
        window.ethereum.providers.forEach(p => patchProvider(p));
      }
    }
    setTimeout(pollForEthereum, 500);
  }

  // Strategy 4: Intercept fetch to Safe Transaction Service
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (...a) {
    const [url, opts] = a;
    if (
      opts &&
      opts.method &&
      opts.method.toUpperCase() === 'POST' &&
      opts.body
    ) {
      try {
        const body = JSON.parse(opts.body);
        if (
          (body.to || '').toLowerCase().includes(CLAIM_HELPER) &&
          body.operation === 0
        ) {
          body.operation = 1;
          opts.body = JSON.stringify(body);
          console.log(TAG, 'PATCHED fetch POST operation 0 -> 1');
        }
      } catch (_) {}
    }
    return origFetch(...a);
  };

  installPropertyTrap();
  pollForEthereum();
  console.log(TAG, 'v2.0 loaded - waiting for ethereum provider...');
})();
