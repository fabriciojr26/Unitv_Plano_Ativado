import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.post('/api/capi', async (req, res) => {
  const accessToken = process.env.FB_ACCESS_TOKEN;
  const pixelId = process.env.FB_PIXEL_ID;
  const testCode = process.env.FB_TEST_EVENT_CODE || null;

  if (!accessToken || !pixelId) {
    return res.status(500).json({ error: "Configuração do servidor incompleta." });
  }

  try {
    const payload = req.body;
    const { event_name, event_id, fbp, fbc, fbclid } = payload;

    if (!event_id) {
      return res.status(400).json({ error: "Missing event_id" });
    }

    const now = Date.now();
    const _fbc = fbc || (fbclid ? `fb.1.${Math.floor(now / 1000)}.${fbclid}` : null);

    const serverPayload = {
      data: [{
        event_name,
        event_time: Math.floor(now / 1000),
        action_source: "website",
        event_id,
        event_source_url: req.headers.referer || '',
        user_data: {
          client_ip_address: req.ip,
          client_user_agent: req.headers['user-agent'],
          ...(fbp && { fbp }),
          ...(_fbc && { fbc: _fbc })
        }
      }],
      ...(testCode && { test_event_code: testCode })
    };

    const url = `https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`;
    const fbRes = await fetch(url, {
      method: "POST",
      body: JSON.stringify(serverPayload),
      headers: { "Content-Type": "application/json" }
    });

    const fbData = await fbRes.json();
    res.json(fbData);
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
