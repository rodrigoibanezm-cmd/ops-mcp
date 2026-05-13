const WRITE_TOOLS = ['vercel.env.set', 'vercel.env.update'];

export function requireWriteToken(toolName, writeToken) {
  if (!WRITE_TOOLS.includes(toolName)) return;

  if (!process.env.OPS_WRITE_TOKEN) {
    throw new Error('missing_OPS_WRITE_TOKEN');
  }

  if (!writeToken || writeToken !== process.env.OPS_WRITE_TOKEN) {
    throw new Error('invalid_write_token');
  }
}
