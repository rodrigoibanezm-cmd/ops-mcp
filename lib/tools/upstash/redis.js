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

export async function scanRedisKeys({ cursor = '0', match = '*', count = 20 } = {}) {
  const safeCount = Math.min(Math.max(Number(count) || 20, 1), 100);
  const command = [
    'scan',
    encodeURIComponent(cursor),
    'match',
    encodeURIComponent(match),
    'count',
    safeCount
  ].join('/');

  const data = await upstashFetch(command);
  const result = data?.result ?? ['0', []];
  const keys = Array.isArray(result[1]) ? result[1] : [];

  return {
    ok: true,
    cursor: result[0] ?? '0',
    keys,
    count: keys.length
  };
}
