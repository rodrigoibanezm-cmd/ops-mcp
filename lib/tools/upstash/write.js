import { upstashWriteFetch } from '../../upstash/client.js';

export async function setRedisKey(key, value) {
  if (!key) throw new Error('missing_key');

  if (value === undefined) {
    throw new Error('missing_value');
  }

  await upstashWriteFetch(
    `set/${encodeURIComponent(key)}/${encodeURIComponent(String(value))}`
  );

  return {
    ok: true,
    key,
    updated: true
  };
}
