import { getProject, getDefaultTeamProject } from '../config/projects.js';
import { vercelFetch } from '../vercel/client.js';

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
  const project = projectKey ? getProject(projectKey) : getDefaultTeamProject();

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
