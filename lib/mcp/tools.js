import {
  listProjects,
  getLatestDeployment,
  listEnvVars,
  setEnvVar,
  getErrorDeployments,
  inspectDeployment
} from '../tools/vercel/index.js';

export const tools = [
  {
    name: 'health.check',
    description: 'Verifica que el MCP esté vivo.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
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
      properties: {
        project_key: { type: 'string' }
      },
      required: ['project_key'],
      additionalProperties: false
    }
  },
  {
    name: 'vercel.env.list',
    description: 'Lista variables de entorno de un proyecto Vercel sin revelar valores secretos.',
    inputSchema: {
      type: 'object',
      properties: {
        project_key: { type: 'string' }
      },
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
        target: {
          type: 'array',
          items: { type: 'string' }
        },
        type: { type: 'string' }
      },
      required: ['project_key', 'key', 'value', 'target'],
      additionalProperties: false
    }
  },
  {
    name: 'vercel.deploy.errors',
    description: 'Devuelve deploys recientes con estado ERROR o CANCELED para un proyecto.',
    inputSchema: {
      type: 'object',
      properties: {
        project_key: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['project_key'],
      additionalProperties: false
    }
  },
  {
    name: 'vercel.deploy.inspect',
    description: 'Inspecciona un deployment específico de Vercel por uid.',
    inputSchema: {
      type: 'object',
      properties: {
        deployment_uid: { type: 'string' },
        project_key: { type: 'string' }
      },
      required: ['deployment_uid', 'project_key'],
      additionalProperties: false
    }
  }
];

export async function callTool(name, args = {}) {
  if (name === 'health.check') {
    return okResponse({
      ok: true,
      service: 'ops-mcp',
      transport: 'http',
      status: 'alive'
    });
  }

  if (name === 'vercel.projects.list') {
    return okResponse(await listProjects());
  }

  if (name === 'vercel.deploy.latest') {
    if (!args.project_key) throw new Error('missing_project_key');
    return okResponse(await getLatestDeployment(args.project_key));
  }

  if (name === 'vercel.env.list') {
    if (!args.project_key) throw new Error('missing_project_key');
    return okResponse(await listEnvVars(args.project_key));
  }

  if (name === 'vercel.env.set') {
    return okResponse(await setEnvVar(args));
  }

  if (name === 'vercel.deploy.errors' || name === 'vercel.logs.errors') {
    if (!args.project_key) throw new Error('missing_project_key');
    return okResponse(await getErrorDeployments(args.project_key, args.limit));
  }

  if (name === 'vercel.deploy.inspect') {
    if (!args.deployment_uid) throw new Error('missing_deployment_uid');
    if (!args.project_key) throw new Error('missing_project_key');

    return okResponse(await inspectDeployment(args.deployment_uid, args.project_key));
  }

  throw new Error(`unknown_tool:${name}`);
}

function okResponse(payload) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}
