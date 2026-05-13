import { getDefaultTeamProject } from '../../config/projects.js';
import { vercelFetch } from '../../vercel/client.js';

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
      latest_deployments: (project.latestDeployments ?? [])
        .slice(0, 3)
        .map((deployment) => ({
          uid: deployment.uid,
          name: deployment.name,
          url: deployment.url ? `https://${deployment.url}` : null,
          state: deployment.state,
          target: deployment.target ?? null,
          created_at: deployment.createdAt
            ? new Date(deployment.createdAt).toISOString()
            : null
        }))
    }))
  };
}
