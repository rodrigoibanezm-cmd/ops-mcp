import { okResponse } from './response.js';
import { requireWriteToken } from './auth.js';

import { vercelTools } from '../tools/vercel/registry.js';
import { upstashTools } from '../tools/upstash/registry.js';
import { neonTools } from '../tools/neon/registry.js';

import { handleVercelTool } from '../tools/vercel/handlers.js';
import { handleUpstashTool } from '../tools/upstash/handlers.js';
import { handleNeonTool } from '../tools/neon/handlers.js';

export const tools = [
  {
    name: 'health.check',
    description: 'Verifica que el MCP esté vivo.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  ...vercelTools,
  ...upstashTools,
  ...neonTools
];

export async function callTool(name, args = {}) {
  requireWriteToken(name, args.write_token);

  if (name === 'health.check') {
    return okResponse({
      ok: true,
      service: 'ops-mcp',
      transport: 'http',
      status: 'alive'
    });
  }

  const vercelResult = await handleVercelTool(name, args);
  if (vercelResult) return okResponse(vercelResult);

  const upstashResult = await handleUpstashTool(name, args);
  if (upstashResult) return okResponse(upstashResult);

  const neonResult = await handleNeonTool(name, args);
  if (neonResult) return okResponse(neonResult);

  throw new Error(`unknown_tool:${name}`);
}
