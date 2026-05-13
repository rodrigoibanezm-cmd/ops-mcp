import { getProject } from '../../config/projects.js';
import { vercelFetch } from '../../vercel/client.js';

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
      created_at: deployment.createdAt
        ? new Date(deployment.createdAt).toISOString()
        : null
    }
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
  const errors = deployments.filter((deployment) =>
    ['ERROR', 'CANCELED'].includes(deployment.state)
  );

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
      created_at: deployment.createdAt
        ? new Date(deployment.createdAt).toISOString()
        : null
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
      created_at: deployment.createdAt
        ? new Date(deployment.createdAt).toISOString()
        : null,
      building_at: deployment.buildingAt
        ? new Date(deployment.buildingAt).toISOString()
        : null,
      ready_at: deployment.ready
        ? new Date(deployment.ready).toISOString()
        : null,
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
