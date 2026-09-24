const localtunnel = require('localtunnel');
const http = require('http');

const PORT = 8080;
let currentTunnel = null;
let pingInterval = null;

async function startTunnel() {
  try {
    if (pingInterval) clearInterval(pingInterval);

    console.log('[TUNNEL] Connecting localtunnel to port ' + PORT + '...');
    const tunnel = await localtunnel({
      port: PORT
    });

    currentTunnel = tunnel;
    console.log('\n======================================================');
    console.log(`[ROCK N ROLLS TUNNEL ONLINE]`);
    console.log(`Customer URL: ${tunnel.url}`);
    console.log(`Admin Portal: ${tunnel.url}/admin`);
    console.log(`======================================================\n`);

    // Keepalive ping every 20 seconds to prevent tunnel disconnects
    pingInterval = setInterval(() => {
      const req = http.get('http://localhost:' + PORT, (res) => {
        // keepalive ok
      });
      req.on('error', () => {});
    }, 20000);

    tunnel.on('close', () => {
      console.log('[TUNNEL] Tunnel closed. Reconnecting in 3s...');
      if (pingInterval) clearInterval(pingInterval);
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('[TUNNEL] Tunnel error:', err.message);
      tunnel.close();
    });

  } catch (err) {
    console.error('[TUNNEL] Failed to create tunnel:', err.message);
    setTimeout(startTunnel, 4000);
  }
}

// Clean exit on SIGINT/SIGTERM
process.on('SIGINT', () => {
  if (currentTunnel) currentTunnel.close();
  process.exit(0);
});

startTunnel();
