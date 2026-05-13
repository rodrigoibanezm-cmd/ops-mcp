export const vercelTools = [
  {
    name: 'vercel.projects.list',
    description: 'Lista proyectos accesibles en Vercel para armar OPS_PROJECTS_JSON sin adivinar IDs.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'vercel.deploy.latest',
    description: 'Devuelve el último deploy de Vercel para un project_key.',
    inputSchema: {
      type: 'object',
      properties: { project_key: { type: 'string' } },
      required: ['project_key'],
      additionalProperties: false
    }
  },
  {
    name: 'vercel.env.list',
    description: 'Lista variables de entorno de un proyecto Vercel sin revelar valores secretos.',
    inputSchema: {
      type: 'object',
      properties: { project_key: { type: 'string' } },
      required: ['project_key'],
      additionalProperties: false
    }
  },
  {
    name: 'vercel.env.set',
    description: 'Crea una variable de entorno nueva en Vercel sin devolver el valor secreto.',
    inputSchema: {
      type: 'object',
      properties: {
        project_key: { type: 'string' },
        key: { type: 'string' },
        value: { type: 'string' },
        target: { type: 'array', items: { type: 'string' } },
        type: { type: 'string' },
        write_token: { type: 'string' }
      },
      required: ['project_key', 'key', 'value', 'target', 'write_token'],
      additionalProperties: false
    }
  },
  {
    name: 'vercel.env.update',
    description: 'Actualiza una variable existente en Vercel usando env_id.',
    inputSchema: {
      type: 'object',
      properties: {
        project_key: { type: 'string' },
        env_id: { type: 'string' },
        value: { type: 'string' },
        target: { type: 'array', items: { type: 'string' } },
        type: { type: 'string' },
        write_token: { type: 'string' }
      },
      required: ['project_key', 'env_id', 'value', 'write_token'],
      additionalProperties: false
    }
  },
  {
    name: 'vercel.deploy.errors',
    description: 'Devuelve deploys recientes con estado ERROR o CANCELED para un proyecto.',
    inputSchema: {
      type: 'object',
      properties: { project_key: { type: 'string' }, limit: { type: 'number' } },
      required: ['project_key'],
      additionalProperties: false
    }
  },
  {
    name: 'vercel.deploy.inspect',
    description: 'Inspecciona un deployment específico de Vercel por uid.',
    inputSchema: {
      type: 'object',
      properties: { deployment_uid: { type: 'string' }, project_key: { type: 'string' } },
      required: ['deployment_uid', 'project_key'],
      additionalProperties: false
    }
  }
];
