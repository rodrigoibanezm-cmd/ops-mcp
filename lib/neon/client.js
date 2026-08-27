import pg from 'pg';

const API_BASE = 'https://console.neon.tech/api/v2';

function apiKey() {
  if (!process.env.NEON_API_KEY) throw new Error('missing_NEON_API_KEY');
  return process.env.NEON_API_KEY;
}

export function projectId() {
  if (!process.env.NEON_PROJECT_ID) throw new Error('missing_NEON_PROJECT_ID');
  return process.env.NEON_PROJECT_ID;
}

export async function neonApi(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey()}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`neon_api_${response.status}:${JSON.stringify(data)}`);
  return data;
}

export async function branches() {
  return (await neonApi(`/projects/${projectId()}/branches`)).branches || [];
}

export async function resolveBranch(name = 'main') {
  const branch = (await branches()).find((item) => item.name === name || item.id === name);
  if (!branch) throw new Error(`neon_branch_not_found:${name}`);
  return branch;
}

async function connectionUri(branchName = 'main') {
  const branch = await resolveBranch(branchName);
  const qs = new URLSearchParams({
    branch_id: branch.id,
    database_name: process.env.NEON_DATABASE || 'neondb',
    role_name: process.env.NEON_ROLE || 'neondb_owner',
    pooled: 'true'
  });
  const data = await neonApi(`/projects/${projectId()}/connection_uri?${qs}`);
  if (!data.uri) throw new Error('neon_connection_uri_missing');
  return { uri: data.uri, branch };
}

export async function runSql(text, branchName = 'main') {
  const { uri, branch } = await connectionUri(branchName);
  const client = new pg.Client({ connectionString: uri, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(text);
    return { branch: { id: branch.id, name: branch.name }, command: result.command, rowCount: result.rowCount, rows: result.rows };
  } finally {
    await client.end();
  }
}
