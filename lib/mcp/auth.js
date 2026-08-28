const WRITE_TOOLS = new Set([
  'vercel.env.set',
  'vercel.env.update',
  'upstash.redis.set',
  'neon.sql.execute'
]);

function bearerToken(authorization) {
  if (typeof authorization !== 'string') return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function authContext(req) {
  return {
    writeToken: bearerToken(req?.headers?.authorization)
      || req?.headers?.['x-ops-write-token']
      || null
  };
}

export function requireWriteAccess(toolName, context = {}, legacyWriteToken = null) {
  if (!WRITE_TOOLS.has(toolName)) return;

  const expected = process.env.OPS_WRITE_TOKEN;
  if (!expected) throw new Error('missing_OPS_WRITE_TOKEN');

  const presented = context.writeToken || legacyWriteToken;
  if (!presented || presented !== expected) {
    throw new Error('write_not_authorized');
  }
}
