/**
 * Entry point – parse the PORT env var, boot the server,
 * then render the interactive CLI and bind hotkeys.
 */
import { startServer } from './server.js';
import { renderMenu, wireKeyboard } from './cli.js';
import { state } from './state.js';

const port = parseInt(process.env.PORT || '8080', 10);

startServer(port, () => {
  renderMenu();
  wireKeyboard();
  console.log(`Forward proxy on http://localhost:${port}`);
  console.log(`(T/O/B/M/C/N/A/+/−/0/S/Q; admin at ${state.adminPrefix}*)`);
});
