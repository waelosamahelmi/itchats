import { createServer } from 'http';
import { exec } from 'child_process';
import crypto from 'crypto';

const PORT = process.env.WEBHOOK_PORT || 3456;
const SECRET = process.env.WEBHOOK_SECRET || 'fqaXIrSn9U3lP0BKepWOJ4t1Q5cmgFjy';

const server = createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404);
    return res.end('Not found');
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    // Verify signature
    const sig = req.headers['x-hub-signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      console.log('❌ Invalid signature');
      res.writeHead(403);
      return res.end('Invalid signature');
    }

    // Check if it's a push to main
    try {
      const payload = JSON.parse(body);
      const ref = payload.ref || '';
      if (ref !== 'refs/heads/main') {
        console.log(`ℹ Skipping — pushed to ${ref}`);
        res.writeHead(200);
        return res.end('Skipped (not main)');
      }
    } catch {
      res.writeHead(400);
      return res.end('Bad JSON');
    }

    console.log('🚀 Deploy triggered by push to main');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Deploy started\n');

    // Run deploy script
    const deploy = exec('/opt/itchats/deploy.sh', { cwd: '/opt/itchats' });
    deploy.stdout.on('data', (d) => process.stdout.write('[deploy] ' + d));
    deploy.stderr.on('data', (d) => process.stderr.write('[deploy] ' + d));
    deploy.on('close', (code) => {
      console.log(`Deploy finished with code ${code}`);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔗 Webhook listener on port ${PORT}`);
});
