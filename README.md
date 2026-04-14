# proxy-cli (modular)

A Node.js "lag switch" proxy. Route traffic through it, then toggle blocking via hotkeys or REST API. Stall connections for a set duration or indefinitely, return 503s, or mass-drop active sockets. Control scope (new vs all), adjust stall timing live, and monitor connection metrics—all from an interactive CLI.

## Features
- CLI menu & hotkeys
- Block **Mode**: STALL (hold) / STATUS (503)
- Block **Scope**: NEW (only new conns) / ALL (new + drop existing)
- Adjustable **stall** duration in **milliseconds**
- HTTPS `CONNECT` tunneling
- Metrics & admin API

## Run
```bash
PORT=8080 BLOCK_MODE=STALL BLOCK_SCOPE=NEW STALL_MS=1000 VERBOSE=1 npm start
```

## Hotkeys
- **T** Toggle  **O** Open  **B** Block
- **M** Mode (STALL/STATUS)
- **C** Cycle scope, **N** NEW, **A** ALL
- **+** Stall **+100ms**, **-** Stall **-100ms**, **0** Stall ∞
- **S** Status line, **Q** Quit

## Admin
```
GET /_/status
GET /_/toggle | /_/open | /_/block
GET /_/mode?value=STALL|STATUS
GET /_/scope?value=NEW|ALL
GET /_/stall          -> { ms, pretty }
GET /_/stall?ms=3000  -> set
GET /_/metrics
GET /_/drop           -> immediate mass drop
```

## Author

**Harry Scanlan** · [HarryHax](https://harryhax.com) · [me@harryhax.com](mailto:me@harryhax.com)

## License

[MIT](LICENSE)
