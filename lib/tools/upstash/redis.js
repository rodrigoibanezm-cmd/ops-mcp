import { upstashFetch } from '../../upstash/client.js';

export async function getRedisKey(key) {
  if (!key) throw new Error('missing_key');

  const data = await upstashFetch(`get/${encodeURIComponent(key)}`);
  const value = data?.result ?? null;

  return {
    ok: true,
    key,
    found: value !== null,
    value
  };
}
