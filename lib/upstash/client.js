export async function upstashFetch(command) {
  const baseUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_READ_ONLY_TOKEN;

  if (!baseUrl) throw new Error('missing_KV_REST_API_URL');
  if (!token) throw new Error('missing_KV_REST_API_READ_ONLY_TOKEN');

  const response = await fetch(`${baseUrl}/${command}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`upstash_api_error:${response.status}:${data?.error ?? 'unknown'}`);
  }

  return data;
}
