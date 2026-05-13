import { getProject } from '../../config/projects.js';
import { vercelFetch } from '../../vercel/client.js';

export async function redeployDeployment({ project_key, deployment_uid }) {
  if (!project_key) throw new Error('missing_project_key');
  if (!deployment_uid) throw new Error('missing_deployment_uid');

  const project = getProject(project_key);

  const deployment = await vercelFetch(
    `/v13/deployments/${encodeURIComponent(deployment_uid)}/redeploy`,
    project,
    { method: 'POST' }
  );

  return {
    ok: true,
    project_key,
    source_deployment_uid: deployment_uid,
    deployment: {
      uid: deployment.uid ?? null,
      url: deployment.url ? `https://${deployment.url}` : null,
      state: deployment.readyState ?? deployment.state ?? null,
      target: deployment.target ?? null,
      created_at: deployment.createdAt
        ? new Date(deployment.createdAt).toISOString()
        : null
    }
  };
}
