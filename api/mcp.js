export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'ops-mcp',
      transport: 'http',
      status: 'alive'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  return res.status(200).json({
    jsonrpc: '2.0',
    id: req.body?.id ?? null,
    result: {
      ok: true,
      message: 'MCP HTTP endpoint placeholder. Next step: implement MCP protocol/tools.'
    }
  });
}
