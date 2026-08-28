const WRITE_TOOLS = new Set([
  'vercel.env.set',
  'vercel.env.update',
  'upstash.redis.set',
  'neon.sql.execute'
]);

export function requireWriteToken(toolName, writeToken) {
  if (!WRITE_TOOLS.has(toolName)) return;

  const expected = process.env.OPS_WRITE_TOKEN;
  if (!expected) throw new Error('missing_OPS_WRITE_TOKEN');

  if (!writeToken || writeToken !== expected) {
    throw new Error('invalid_write_token');
  }
}
