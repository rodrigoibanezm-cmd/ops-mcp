import { getRedisKey, scanRedisKeys } from './redis.js';

export async function handleUpstashTool(name, args) {
  if (name === 'upstash.redis.get') {
    return getRedisKey(args.key);
  }

  if (name === 'upstash.redis.scan') {
    return scanRedisKeys(args);
  }

  return null;
}
