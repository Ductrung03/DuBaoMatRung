const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const app = express();

// Webhook secret (để trống nếu không dùng, hoặc set trong GitHub)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

app.use(express.json());

// Verify GitHub webhook signature (chỉ khi có secret)
function verifySignature(payload, signature) {
  if (!WEBHOOK_SECRET) return true; // Skip verification nếu không có secret
  
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);

  console.log('🔔 Webhook received from GitHub');

  // Verify signature (nếu có secret)
  if (WEBHOOK_SECRET && signature && !verifySignature(payload, signature)) {
    console.log('❌ Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  // Chỉ update khi push vào main branch
  if (req.body.ref === 'refs/heads/main') {
    console.log('🚀 Push to main detected, starting auto-update...');
    
    // Sửa path để dynamic
    const projectDir = path.dirname(__filename);
    const updateScript = path.join(projectDir, 'update.bat');
    
    console.log(`📍 Running update script: ${updateScript}`);
    
    // Chạy script update
    exec(`"${updateScript}"`, { cwd: projectDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Update failed: ${error}`);
        return res.status(500).send('Update failed');
      }
      
      console.log(`✅ Update completed:\n${stdout}`);
      if (stderr) console.error(`Warnings: ${stderr}`);
      
      res.status(200).send('Update completed successfully');
    });
  } else {
    console.log(`ℹ️ Push to ${req.body.ref} - not updating`);
    res.status(200).send('Push received but not to main branch');
  }
});

app.get('/status', (req, res) => {
  exec('pm2 jlist', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to get status' });
    }
    
    try {
      const processes = JSON.parse(stdout);
      res.json({
        status: 'running',
        processes: processes.map(p => ({
          name: p.name,
          status: p.pm2_env.status,
          uptime: p.pm2_env.pm_uptime,
          restarts: p.pm2_env.restart_time,
          memory: p.pm2_env.memory
        }))
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse PM2 output' });
    }
  });
});

const PORT = 9000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎣 Webhook server running on port ${PORT}`);
  console.log(`📡 Webhook URL: http://103.56.161.239:${PORT}/webhook`);
  console.log(`📊 Status URL: http://103.56.161.239:${PORT}/status`);
});