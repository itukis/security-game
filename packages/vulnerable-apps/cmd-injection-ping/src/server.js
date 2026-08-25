const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

// VULNERABLE PING ENDPOINT
// host フィールドをシェルコマンド文字列に直接埋め込んでいるため、
// ; や && などのメタ文字で任意のコマンドを追加実行できてしまう。
app.post('/ping', (req, res) => {
  const { host } = req.body;
  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
    res.json({ output: stdout || stderr });
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`cmd-injection-ping listening on ${PORT}`));
