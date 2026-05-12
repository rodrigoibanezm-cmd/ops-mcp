const tools = [
  {
    name: 'health.check',
    description: 'Verifica que el MCP esté vivo.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'vercel.deploy.latest',
    description: 'Devuelve placeholder del último deploy de Vercel para un project_key.',
    inputSchema: {
      type: 'object',
      properties: {
        project_key: {
          type: 'string',
          description: 'Clave lógica del proyecto, por ejemplo: helice'
        }
      },
      required: ['project_key'],
      additionalProperties: false
    }
  }
];

function jsonRpc(id, result) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    result
  };
}

function jsonRpcError(id, code, message) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message }
  };
}

async function callTool(name, args = {}) {
  if (name === 'health.check') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ok: true,
              service: 'ops-mcp',
              transport: 'http',
              status: 'alive'
            },
            null,
            2
          )
        }
      ]
    };
  }

  if (name === 'vercel.deploy.latest') {
    if (!args.project_key) {
      throw new Error('missing_project_key');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ok: true,
              project_key: args.project_key,
              status: 'placeholder',
              next: 'connect_vercel_api'
            },
            null,
            2
          )
        }
      ]
    };
  }

  throw new Error(`unknown_tool:${name}`);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'ops-mcp',
      transport: 'http',
      status: 'alive',
      endpoint: '/api/mcp',
      tools: tools.map((tool) => tool.name)
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const { id, method, params } = req.body ?? {};

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
      const result = await callTool(params?.name, params?.arguments ?? {});
      return res.status(200).json(jsonRpc(id, result));
    }

    return res.status(200).json(jsonRpcError(id, -32601, `method_not_found:${method}`));
  } catch (error) {
    return res.status(200).json(jsonRpcError(id, -32000, error.message));
  }
}
