import { getRedisKey, scanRedisKeys } from './read.js';
import { setRedisKey } from './write.js';

export async function handleUpstashTool(name, args) {
  if (name === 'upstash.redis.get') {
    return getRedisKey(args.key);
  }

  if (name === 'upstash.redis.scan') {
    return scanRedisKeys(args);
  }

  if (name === 'upstash.redis.set') {
    return setRedisKey(args.key, args.value);
  }

  return null;
}
