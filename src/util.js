import url from 'url';

export const clear = () => process.stdout.write('\x1b[2J\x1b[H');
export const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);

// show milliseconds directly
export const fmtMs = (ms) => ms === 0 ? '∞' : `${ms}ms`;

export function stripProxyHeaders(headers) {
  const h = { ...headers };
  delete h['proxy-connection'];
  delete h['proxy-authorization'];
  delete h['connection'];
  delete h['upgrade'];
  return h;
}

export function asTargetUrl(req) {
  const parsed = url.parse(req.url);
  return parsed.protocol ? req.url : `http://${req.headers.host}${req.url}`;
}

// STALL helper: hold connection and maybe drop after state.stallMs
export function applyStallAndMaybeDrop(target, state) {
  if (state.stallMs > 0) {
    const timer = setTimeout(() => {
      try { target.destroy(); } catch {}
    }, state.stallMs);
    if ('once' in target) target.once('close', () => clearTimeout(timer));
  } else {
    if ('setTimeout' in target) target.setTimeout(state.socketIdleMs, () => {
      try { target.destroy(); } catch {}
    });
  }
}
