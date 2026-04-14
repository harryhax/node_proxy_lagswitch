import readline from 'readline';
import { state } from './state.js';
import { clear, pad, fmtMs } from './util.js';
import { activeIncoming, activeOutgoing, totalIncoming, totalOutgoing } from './connTracker.js';

/** Draw the full-screen TUI dashboard with current state, metrics, and hotkey legend. */
function menu() {
  const header = ' Forward Proxy (CLI Control) ';
  const st = state.blockTraffic ? 'BLOCKED' : 'OPEN';
  const color = state.blockTraffic ? '\x1b[41m\x1b[37m' : '\x1b[42m\x1b[30m';
  const reset = '\x1b[0m';
  clear();
  console.log(`┌${'─'.repeat(110)}┐`);
  console.log(`│${pad(header, 110)}│`);
  console.log(`├${'─'.repeat(110)}┤`);
  console.log(
    `│ Port: ${pad(String(process.env.PORT || 8080), 6)}  PID: ${pad(String(process.pid), 7)}  Mode: ${pad(state.blockMode, 8)}  Scope: ${pad(state.blockScope, 4)}  Stall: ${pad(fmtMs(state.stallMs), 8)}  ` +
    `State: ${color} ${pad(st, 6)} ${reset}  Last: ${pad(state.lastEvent, 20)} │`
  );
  console.log(`├${'─'.repeat(110)}┤`);
  console.log(
    `│ Connections  Incoming: active=${pad(String(activeIncoming.size), 4)} total=${pad(String(totalIncoming), 6)}  ` +
    `Outgoing: active=${pad(String(activeOutgoing.size), 4)} total=${pad(String(totalOutgoing), 6)} │`
  );
  console.log(`├${'─'.repeat(110)}┤`);
  console.log(`│ Controls:  T) Toggle  O) Open  B) Block  M) Mode(STALL/STATUS)  C) Cycle Scope  N) NEW  A) ALL                        │`);
  console.log(`│            +) Stall +100ms  -) Stall -100ms  0) Stall ∞     S) Status  Q) Quit                                        │`);
  console.log(`├${'─'.repeat(110)}┤`);
  console.log(`│ Notes: HTTP shows full URL; HTTPS shows CONNECT host:port only.                                                        │`);
  console.log(`│        STALL holds new traffic; after Stall duration, we drop it (∞ = hang until client times out).                    │`);
  console.log(`│ Admin: GET ${state.adminPrefix}status | toggle | open | block | mode | scope | stall | metrics | drop                         │`);
  console.log(`└${'─'.repeat(110)}┘`);
}

/** Trigger an immediate menu redraw. */
export function renderMenu() { menu(); }

/**
 * Bind keyboard hotkeys to state mutations.
 * Re-renders the menu on every state change event.
 */
export function wireKeyboard() {
  // Redraw whenever state changes (from any source: keyboard, admin API, etc.)
  state.on('change', () => menu());

  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    if (typeof process.stdin.setRawMode === 'function') process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  /** Map a single keypress sequence to the corresponding state action. */
  const handle = (seq) => {
    if (seq === '\u0003') { process.emit('SIGINT'); return; } // Ctrl+C
    const k = (seq || '').toLowerCase();
    switch (k) {
      case 't': state.toggleBlocked(); break;
      case 'o': state.setBlocked(false); break;
      case 'b': state.setBlocked(true); break;
      case 'm': state.setMode(state.blockMode === 'STALL' ? 'STATUS' : 'STALL'); break;
      case 'c': state.setScope(state.blockScope === 'NEW' ? 'ALL' : 'NEW'); break;
      case 'n': state.setScope('NEW'); break;
      case 'a': state.setScope('ALL'); break;
      case '+': state.setStallMs(state.stallMs + 100); break;
      case '-': state.setStallMs(Math.max(0, state.stallMs - 100)); break;
      case '0': state.setStallMs(0); break;
      case 's':
        console.log(
          `\n[${new Date().toLocaleTimeString()}] STATUS state=${state.blockTraffic ? 'BLOCKED' : 'OPEN'} mode=${state.blockMode} scope=${state.blockScope} stall=${fmtMs(state.stallMs)}`
        );
        break;
      case 'q': process.emit('SIGINT'); break;
      default: break;
    }
  };

  // Primary handler when raw mode is available (TTY)
  process.stdin.on('keypress', (_, key) => {
    if (!key) return;
    if (key.ctrl && key.name === 'c') { process.emit('SIGINT'); return; }
    if (key.sequence) handle(key.sequence);
  });

  // Fallback: handle each character in raw data chunks (non-TTY)
  process.stdin.on('data', (chunk) => {
    for (const ch of chunk) handle(ch);
  });
}
