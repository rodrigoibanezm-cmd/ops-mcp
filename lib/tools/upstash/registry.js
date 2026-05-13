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
  },
  {
    name: 'upstash.redis.scan',
    description: 'Lista keys de Upstash Redis por patrón sin devolver valores.',
    inputSchema: {
      type: 'object',
      properties: {
        cursor: { type: 'string' },
        match: { type: 'string' },
        count: { type: 'number' }
      },
      additionalProperties: false
    }
  }
];
