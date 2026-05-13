import {
  listProjects,
  getLatestDeployment,
  listEnvVars,
  setEnvVar,
  updateEnvVar,
  getErrorDeployments,
  inspectDeployment,
  redeployDeployment
} from './index.js';

export async function handleVercelTool(name, args) {
  if (name === 'vercel.projects.list') return listProjects();

  if (name === 'vercel.deploy.latest') {
    if (!args.project_key) throw new Error('missing_project_key');
    return getLatestDeployment(args.project_key);
  }

  if (name === 'vercel.env.list') {
    if (!args.project_key) throw new Error('missing_project_key');
    return listEnvVars(args.project_key);
  }

  if (name === 'vercel.env.set') return setEnvVar(args);
  if (name === 'vercel.env.update') return updateEnvVar(args);

  if (name === 'vercel.deploy.redeploy') {
    return redeployDeployment(args);
  }

  if (name === 'vercel.deploy.errors' || name === 'vercel.logs.errors') {
    if (!args.project_key) throw new Error('missing_project_key');
    return getErrorDeployments(args.project_key, args.limit);
  }

  if (name === 'vercel.deploy.inspect') {
    if (!args.deployment_uid) throw new Error('missing_deployment_uid');
    if (!args.project_key) throw new Error('missing_project_key');

    return inspectDeployment(args.deployment_uid, args.project_key);
  }

  return null;
}
