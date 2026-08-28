export const upstashTools = [
  {
    name: 'upstash.redis.get',
    description: 'Lee una key de Upstash Redis usando token read-only.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string' } },
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
  },
  {
    name: 'upstash.redis.set',
    description: 'Escribe una key en Upstash Redis usando token WRITE.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: {},
        write_token: { type: 'string', minLength: 1 }
      },
      required: ['key', 'value', 'write_token'],
      additionalProperties: false
    }
  }
];
