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

  const { code, code_verifier, redirect_uri } = await request.json()
  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing code' }), {
      status: 400,
      headers,
    })
  }

  // Validate redirect_uri — must match the request's own origin
  if (!redirect_uri) {
    return new Response(JSON.stringify({ error: 'Missing redirect_uri' }), {
      status: 400,
      headers,
    })
  }
  try {
    const redirectUrl = new URL(redirect_uri)
    if (redirectUrl.pathname !== '/auth/google/callback') {
      throw new Error('bad path')
    }
    // redirect_uri origin must match request origin
    if (origin && redirectUrl.origin !== origin) {
      throw new Error('origin mismatch')
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid redirect_uri' }), {
      status: 400,
      headers,
    })
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      code_verifier,
      grant_type: 'authorization_code',
      redirect_uri,
    }),
  })

  const data = await res.json()

  if (data.error) {
    return new Response(JSON.stringify({ error: data.error_description || data.error }), {
      status: 400,
      headers,
    })
  }

  return new Response(JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  }), {
    status: 200,
    headers,
  })
}
