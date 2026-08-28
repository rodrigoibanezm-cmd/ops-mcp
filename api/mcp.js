import { jsonRpc, jsonRpcError } from '../lib/mcp/jsonRpc.js';
import { authContext } from '../lib/mcp/auth.js';
import { tools, callTool } from '../lib/mcp/tools.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'ops-mcp',
      transport: 'http',
      status: 'alive',
      endpoint: '/api/mcp'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');

    return res.status(405).json({
      ok: false,
      error: 'method_not_allowed'
    });
  }

  const { id, method, params } = req.body ?? {};
  const context = authContext(req);

  try {
    if (method === 'initialize') {
      return res.status(200).json(
        jsonRpc(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'ops-mcp',
            version: '1.0.0'
          }
        })
      );
    }

    if (method === 'tools/list') {
      return res.status(200).json(jsonRpc(id, { tools }));
    }

    if (method === 'tools/call') {
      return res.status(200).json(
        jsonRpc(id, await callTool(params?.name, params?.arguments ?? {}, context))
      );
    }

    return res.status(200).json(
      jsonRpcError(id, -32601, `method_not_found:${method}`)
    );
  } catch (error) {
    return res.status(200).json(
      jsonRpcError(id, -32000, error.message)
    );
  }
}
