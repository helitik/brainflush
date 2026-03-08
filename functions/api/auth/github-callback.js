function isAllowedOrigin(origin, request, env) {
  if (!origin) return true // same-origin requests may not send Origin
  // Same-origin check: Origin host matches the Host header
  const host = request.headers.get('Host')
  if (host) {
    const originHost = new URL(origin).host
    if (originHost === host) return true
  }
  // Explicit whitelist from env
  if (env.ALLOWED_ORIGINS) {
    const allowed = env.ALLOWED_ORIGINS.split(',')
    if (allowed.includes(origin)) return true
  }
  return false
}

function corsHeaders(origin) {
  return {
    'Content-Type': 'application/json',
    ...(origin && {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    }),
  }
}

export async function onRequestOptions(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')
  if (!isAllowedOrigin(origin, request, env)) {
    return new Response(null, { status: 403 })
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

export async function onRequestPost(context) {
  const { request, env } = context

  const origin = request.headers.get('Origin')
  if (!isAllowedOrigin(origin, request, env)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const headers = corsHeaders(origin)

  const { code } = await request.json()
  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing code' }), {
      status: 400,
      headers,
    })
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  const data = await res.json()

  if (data.error) {
    return new Response(JSON.stringify({ error: data.error_description || data.error }), {
      status: 400,
      headers,
    })
  }

  return new Response(JSON.stringify({ access_token: data.access_token }), {
    status: 200,
    headers,
  })
}
