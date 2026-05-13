export async function vercelFetch(path, project = {}, options = {}) {
  if (!process.env.VERCEL_TOKEN) {
    throw new Error('missing_VERCEL_TOKEN');
  }

  const url = new URL(`https://api.vercel.com${path}`);

  if (project.vercel_team_id) {
    url.searchParams.set('teamId', project.vercel_team_id);
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`vercel_api_error:${response.status}:${data?.error?.message ?? 'unknown'}`);
  }

  return data;
}
