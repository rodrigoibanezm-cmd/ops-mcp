export function getProjectsConfig() {
  if (!process.env.OPS_PROJECTS_JSON) {
    throw new Error('missing_OPS_PROJECTS_JSON');
  }

  try {
    return JSON.parse(process.env.OPS_PROJECTS_JSON);
  } catch {
    throw new Error('invalid_OPS_PROJECTS_JSON');
  }
}

export function getProject(projectKey) {
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

export function getDefaultTeamProject() {
  const projects = getProjectsConfig();
  return Object.values(projects)[0] ?? {};
}
