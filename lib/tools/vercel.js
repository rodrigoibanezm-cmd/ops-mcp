import { getProject, getDefaultTeamProject } from '../config/projects.js';
import { vercelFetch } from '../vercel/client.js';

const VALID_ENV_TARGETS = ['production', 'preview', 'development'];
const VALID_ENV_TYPES = ['encrypted'];

export async function listProjects() {
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

export async function getLatestDeployment(projectKey) {
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

export async function triggerDeploy(projectKey) {
  const project = getProject(projectKey);

  const deployment = await vercelFetch('/v13/deployments', project, {
    method: 'POST',
    body: {
      name: project.vercel_project_name ?? projectKey,
      project: project.vercel_project_id,
      target: 'production'
    }
  });

  return {
    ok: true,
    project_key: projectKey,
    deployment: {
      uid: deployment.uid,
      name: deployment.name,
      url: deployment.url ? `https://${deployment.url}` : null,
      state: deployment.readyState ?? deployment.state ?? null,
      target: deployment.target ?? null,
      created_at: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : null
    }
  };
}

export async function listEnvVars(projectKey) {
  const project = getProject(projectKey);

  const data = await vercelFetch(
    `/v9/projects/${encodeURIComponent(project.vercel_project_id)}/env`,
    project
  );

  const envs = data?.envs ?? [];

  return {
    ok: true,
    project_key: projectKey,
    count: envs.length,
    envs: envs.map((env) => ({
      id: env.id,
      key: env.key,
      target: env.target,
      type: env.type,
      configuration_id: env.configurationId ?? null,
      created_at: env.createdAt ? new Date(env.createdAt).toISOString() : null,
      updated_at: env.updatedAt ? new Date(env.updatedAt).toISOString() : null
    }))
  };
}

export async function setEnvVar({
  project_key,
  key,
  value,
  target,
  type = 'encrypted'
}) {
  if (!project_key) {
    throw new Error('missing_project_key');
  }

  if (!key) {
    throw new Error('missing_key');
  }

  if (value === undefined || value === null) {
    throw new Error('missing_value');
  }

  if (!Array.isArray(target) || target.length === 0) {
    throw new Error('invalid_target');
  }

  const invalidTargets = target.filter((item) => !VALID_ENV_TARGETS.includes(item));

  if (invalidTargets.length > 0) {
    throw new Error(`invalid_targets:${invalidTargets.join(',')}`);
  }

  if (!VALID_ENV_TYPES.includes(type)) {
    throw new Error(`invalid_type:${type}`);
  }

  const project = getProject(project_key);

  await vercelFetch(
    `/v10/projects/${encodeURIComponent(project.vercel_project_id)}/env`,
    project,
    {
      method: 'POST',
      body: {
        key,
        value: String(value),
        target,
        type
      }
    }
  );

  return {
    ok: true,
    project_key,
    key,
    target,
    type,
    created: true,
    requires_redeploy: true
  };
}

export async function getErrorDeployments(projectKey, limit = 10) {
  const project = getProject(projectKey);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

  const data = await vercelFetch(
    `/v6/deployments?projectId=${encodeURIComponent(project.vercel_project_id)}&limit=${safeLimit}`,
    project
  );

  const deployments = data?.deployments ?? [];
  const errors = deployments.filter((deployment) => ['ERROR', 'CANCELED'].includes(deployment.state));

  return {
    ok: true,
    project_key: projectKey,
    checked: deployments.length,
    count: errors.length,
    errors: errors.map((deployment) => ({
      uid: deployment.uid,
      name: deployment.name,
      url: deployment.url ? `https://${deployment.url}` : null,
      state: deployment.state,
      target: deployment.target ?? null,
      created_at: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : null
    }))
  };
}

export async function inspectDeployment(deploymentUid, projectKey) {
  if (!projectKey) {
    throw new Error('missing_project_key');
  }

  const project = getProject(projectKey);

  const deployment = await vercelFetch(
    `/v13/deployments/${encodeURIComponent(deploymentUid)}`,
    project
  );

  return {
    ok: true,
    deployment: {
      uid: deployment.uid,
      name: deployment.name,
      url: deployment.url ? `https://${deployment.url}` : null,
      state: deployment.readyState ?? deployment.state ?? null,
      target: deployment.target ?? null,
      created_at: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : null,
      building_at: deployment.buildingAt ? new Date(deployment.buildingAt).toISOString() : null,
      ready_at: deployment.ready ? new Date(deployment.ready).toISOString() : null,
      error_code: deployment.errorCode ?? null,
      error_message: deployment.errorMessage ?? null,
      meta: deployment.meta ?? {},
      creator: deployment.creator
        ? {
            uid: deployment.creator.uid,
            username: deployment.creator.username,
            email: deployment.creator.email
          }
        : null
    }
  };
}
