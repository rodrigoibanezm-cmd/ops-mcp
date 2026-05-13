import { getProject } from '../../config/projects.js';
import { vercelFetch } from '../../vercel/client.js';

const VALID_ENV_TARGETS = ['production', 'preview', 'development'];
const VALID_ENV_TYPES = ['encrypted'];

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

export async function setEnvVar({ project_key, key, value, target, type = 'encrypted' }) {
  if (!project_key) throw new Error('missing_project_key');
  if (!key) throw new Error('missing_key');
  if (value === undefined || value === null) throw new Error('missing_value');

  validateEnvTargets(target);
  validateEnvType(type);

  const project = getProject(project_key);

  await vercelFetch(`/v10/projects/${encodeURIComponent(project.vercel_project_id)}/env`, project, {
    method: 'POST',
    body: { key, value: String(value), target, type }
  });

  return { ok: true, project_key, key, target, type, created: true, requires_redeploy: true };
}

export async function updateEnvVar({ project_key, env_id, value, target, type = 'encrypted' }) {
  if (!project_key) throw new Error('missing_project_key');
  if (!env_id) throw new Error('missing_env_id');
  if (value === undefined || value === null) throw new Error('missing_value');

  validateEnvType(type);
  if (target !== undefined) validateEnvTargets(target);

  const project = getProject(project_key);
  const body = { value: String(value), type };
  if (target !== undefined) body.target = target;

  await vercelFetch(
    `/v9/projects/${encodeURIComponent(project.vercel_project_id)}/env/${encodeURIComponent(env_id)}`,
    project,
    { method: 'PATCH', body }
  );

  return {
    ok: true,
    project_key,
    env_id,
    target: target ?? null,
    type,
    updated: true,
    requires_redeploy: true
  };
}

function validateEnvTargets(target) {
  if (!Array.isArray(target) || target.length === 0) throw new Error('invalid_target');

  const invalidTargets = target.filter((item) => !VALID_ENV_TARGETS.includes(item));
  if (invalidTargets.length > 0) throw new Error(`invalid_targets:${invalidTargets.join(',')}`);
}

function validateEnvType(type) {
  if (!VALID_ENV_TYPES.includes(type)) throw new Error(`invalid_type:${type}`);
}
