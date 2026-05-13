function getBaseUrl() {
  const baseUrl = process.env.KV_REST_API_URL;
  if (!baseUrl) throw new Error('missing_KV_REST_API_URL');
  return baseUrl;
}

async function upstashFetch(command, token, missingTokenError) {
  const baseUrl = getBaseUrl();

  if (!token) throw new Error(missingTokenError);

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

export function upstashReadFetch(command) {
  return upstashFetch(
    command,
    process.env.KV_REST_API_READ_ONLY_TOKEN,
    'missing_KV_REST_API_READ_ONLY_TOKEN'
  );
}

export function upstashWriteFetch(command) {
  return upstashFetch(
    command,
    process.env.KV_REST_API_TOKEN,
    'missing_KV_REST_API_TOKEN'
  );
}
