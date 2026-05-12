const tools = [
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
        project_key: {
          type: 'string',
          description: 'Clave lógica del proyecto, por ejemplo: helice'
        }
      },
      required: ['project_key'],
      additionalProperties: false
    }
  }
];

function jsonRpc(id, result) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    result
  };
}

function jsonRpcError(id, code, message) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message }
  };
}

function getProjectsConfig() {
  if (!process.env.OPS_PROJECTS_JSON) {
    throw new Error('missing_OPS_PROJECTS_JSON');
  }

  try {
    return JSON.parse(process.env.OPS_PROJECTS_JSON);
  } catch {
    throw new Error('invalid_OPS_PROJECTS_JSON');
  }
}

function getProject(projectKey) {
  const projects = getProjectsConfig();
  const project = projects[projectKey];

  if (!project) {
    throw new Error(`unknown_project_key:${projectKey}`);
  }

  if (!project.vercel_project_id) {
    throw new Error(`missing_vercel_project_id:${projectKey}`);
  }

  return project;
}

function getDefaultTeamProject() {
  const projects = getProjectsConfig();
  const firstProject = Object.values(projects)[0];
  return firstProject ?? {};
}

async function vercelFetch(path, project = {}) {
  if (!process.env.VERCEL_TOKEN) {
    throw new Error('missing_VERCEL_TOKEN');
  }

  const url = new URL(`https://api.vercel.com${path}`);

  if (project.vercel_team_id) {
    url.searchParams.set('teamId', project.vercel_team_id);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`vercel_api_error:${response.status}:${data?.error?.message ?? 'unknown'}`);
  }

  return data;
}

async function listProjects() {
  const data = await vercelFetch('/v9/projects?limit=100', getDefaultTeamProject());
  const projects = data?.projects ?? [];

  return {
    ok: true,
    count: projects.length,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      framework: project.framework ?? null,
      latest_deployments: (project.latestDeployments ?? []).slice(0, 3).map((deployment) => ({
        uid: deployment.uid,
        name: deployment.name,
        url: deployment.url ? `https://${deployment.url}` : null,
        state: deployment.state,
        target: deployment.target ?? null,
        created_at: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : null
      }))
    }))
  };
}

async function getLatestDeployment(projectKey) {
  const project = getProject(projectKey);
  const data = await vercelFetch(
    `/v6/deployments?projectId=${encodeURIComponent(project.vercel_project_id)}&limit=1`,
    project
  );

  const deployment = data?.deployments?.[0];

  if (!deployment) {
    return {
      ok: false,
      project_key: projectKey,
      reason: 'no_deployments_found'
    };
  }

  return {
    ok: true,
    project_key: projectKey,
    deployment: {
      uid: deployment.uid,
      name: deployment.name,
      url: deployment.url ? `https://${deployment.url}` : null,
      state: deployment.state,
      target: deployment.target ?? null,
      created_at: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : null
    }
  };
}

async function callTool(name, args = {}) {
  if (name === 'health.check') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ok: true,
              service: 'ops-mcp',
              transport: 'http',
              status: 'alive'
            },
            null,
            2
          )
        }
      ]
    };
  }

  if (name === 'vercel.projects.list') {
    const result = await listProjects();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  if (name === 'vercel.deploy.latest') {
    if (!args.project_key) {
      throw new Error('missing_project_key');
    }

    const result = await getLatestDeployment(args.project_key);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  throw new Error(`unknown_tool:${name}`);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'ops-mcp',
      transport: 'http',
      status: 'alive',
      endpoint: '/api/mcp',
      tools: tools.map((tool) => tool.name)
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const { id, method, params } = req.body ?? {};

  try {
    if (method === 'initialize') {
      return res.status(200).json(
        jsonRpc(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'ops-mcp',
            version: '1.0.0'
          }
        })
      );
    }

    if (method === 'tools/list') {
      return res.status(200).json(jsonRpc(id, { tools }));
    }

    if (method === 'tools/call') {
      const result = await callTool(params?.name, params?.arguments ?? {});
      return res.status(200).json(jsonRpc(id, result));
    }

    return res.status(200).json(jsonRpcError(id, -32601, `method_not_found:${method}`));
  } catch (error) {
    return res.status(200).json(jsonRpcError(id, -32000, error.message));
  }
}
