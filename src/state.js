import EventEmitter from 'events';
import { dropAllConnections } from './connTracker.js';

class State extends EventEmitter {
  constructor() {
    super();
    this.blockTraffic = false;                  // OPEN=false / BLOCKED=true
    this.blockMode = (process.env.BLOCK_MODE || 'STALL').toUpperCase();   // STALL|STATUS
    this.blockScope = (process.env.BLOCK_SCOPE || 'NEW').toUpperCase();   // NEW|ALL
    this.stallMs = Math.max(0, parseInt(process.env.STALL_MS || '0', 10)); // 0=∞
    this.socketIdleMs = parseInt(process.env.SOCKET_IDLE_MS || '120000', 10);
    this.verbose = process.env.VERBOSE === '1';
    this.adminPrefix = process.env.ADMIN_PREFIX || '/_/';
    this.lastEvent = 'started';
  }

  setBlocked(b) {
    const prev = this.blockTraffic;
    this.blockTraffic = !!b;
    if (!prev && this.blockTraffic && this.blockScope === 'ALL') {
      this.lastEvent = 'drop all (scope=ALL)';
      dropAllConnections('toggle-to-blocked(scope=ALL)');
    } else {
      this.lastEvent = `traffic ${this.blockTraffic ? 'BLOCKED' : 'OPEN'}`;
    }
    this.emit('change');
  }

  toggleBlocked() { this.setBlocked(!this.blockTraffic); }

  setMode(v) {
    const up = String(v).toUpperCase();
    if (up === 'STALL' || up === 'STATUS') {
      this.blockMode = up;
      this.lastEvent = `mode=${this.blockMode}`;
      this.emit('change');
      return true;
    }
    return false;
  }

  setScope(v) {
    const up = String(v).toUpperCase();
    if (up === 'NEW' || up === 'ALL') {
      this.blockScope = up;
      this.lastEvent = `scope=${this.blockScope}`;
      this.emit('change');
      return true;
    }
    return false;
  }

  setStallMs(ms) {
    const val = Math.max(0, Number(ms));
    if (!Number.isFinite(val)) return false;
    this.stallMs = val;
    this.lastEvent = `stallMs=${this.stallMs}`;
    this.emit('change');
    return true;
  }
}

export const state = new State();
