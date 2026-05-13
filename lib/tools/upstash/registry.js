export const upstashTools = [
  {
    name: 'upstash.redis.get',
    description: 'Lee una key de Upstash Redis usando token read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' }
      },
      required: ['key'],
      additionalProperties: false
    }
  }
];
