import { getRedisKey } from './redis.js';

export async function handleUpstashTool(name, args) {
  if (name === 'upstash.redis.get') {
    return getRedisKey(args.key);
  }

  return null;
}
