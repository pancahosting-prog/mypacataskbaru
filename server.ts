import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // ImageKit / External File Proxy Route to bypass ISP domain blocking
  app.get('/api/proxy-file', async (req, res) => {
    try {
      const fileUrl = req.query.url as string;
      if (!fileUrl || (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://'))) {
        return res.status(400).send('Invalid file URL');
      }

      const response = await fetch(fileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch file from remote source (${response.status})`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error('Proxy file error:', error);
      res.status(500).send('Error proxying file: ' + error.message);
    }
  });

  // Mount Vite dev server middleware in development mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
