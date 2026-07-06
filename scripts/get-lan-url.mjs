#!/usr/bin/env node
/** Print http://<LAN-IP>:5173 for phone access during npm run demo */
import { execSync } from 'node:child_process';

const port = process.env.DEMO_PORT || '5173';

function getLanIp() {
  if (process.platform === 'darwin') {
    for (const iface of ['en0', 'en1']) {
      try {
        const ip = execSync(`ipconfig getifaddr ${iface}`, { encoding: 'utf8' }).trim();
        if (ip) return ip;
      } catch {
        /* try next */
      }
    }
  }
  if (process.platform === 'linux') {
    try {
      const ip = execSync("hostname -I | awk '{print $1}'", { encoding: 'utf8' }).trim();
      if (ip) return ip;
    } catch {
      /* fall through */
    }
  }
  return '127.0.0.1';
}

const ip = getLanIp();
const url = `http://${ip}:${port}`;
console.log(url);