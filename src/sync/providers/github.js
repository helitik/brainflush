import {
  SYNC_FILE_NAME,
  SYNC_GIST_DESCRIPTION,
  GITHUB_TOKEN_KEY,
  GITHUB_GIST_ID_KEY,
  GITHUB_USER_KEY,
} from '../syncConstants'

function getToken() {
  return localStorage.getItem(GITHUB_TOKEN_KEY)
}

function getGistId() {
  return localStorage.getItem(GITHUB_GIST_ID_KEY)
}

async function api(path, options = {}) {
  const token = getToken()
  if (!token) throw new Error('notConnected')
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem(GITHUB_TOKEN_KEY)
    throw new Error('tokenExpired')
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  return res.json()
}

async function findExistingGist() {
  const gists = await api('/gists?per_page=100')
  return gists.find((g) => g.description === SYNC_GIST_DESCRIPTION) || null
}

export const github = {
  name: 'github',

  isConnected() {
    return !!getToken()
  },

  startAuth() {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
    if (!clientId) throw new Error('Missing VITE_GITHUB_CLIENT_ID')
    const state = crypto.randomUUID()
    sessionStorage.setItem('github-oauth-state', state)
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'gist',
      state,
      redirect_uri: `${window.location.origin}/auth/github/callback`,
    })
    window.location.href = `https://github.com/login/oauth/authorize?${params}`
  },

  async handleCallback(searchParams) {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const savedState = sessionStorage.getItem('github-oauth-state')
    sessionStorage.removeItem('github-oauth-state')

    if (!code || !state || state !== savedState) {
      throw new Error('Invalid OAuth callback')
    }

    const res = await fetch('/api/auth/github-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    if (!res.ok) throw new Error('Token exchange failed')
    const { access_token } = await res.json()
    localStorage.setItem(GITHUB_TOKEN_KEY, access_token)

    // Fetch user info
    try {
      const user = await api('/user')
      localStorage.setItem(GITHUB_USER_KEY, JSON.stringify({
        name: user.name || user.login,
        login: user.login,
        avatar: user.avatar_url,
      }))
    } catch {
      // Non-critical — continue without user info
    }

    // Try to find existing gist
    const existing = await findExistingGist()
    if (existing) {
      localStorage.setItem(GITHUB_GIST_ID_KEY, existing.id)
    }
  },

  async push(envelope) {
    let gistId = getGistId()
    const body = {
      description: SYNC_GIST_DESCRIPTION,
      files: {
        [SYNC_FILE_NAME]: { content: JSON.stringify(envelope) },
      },
    }

    if (gistId) {
      await api(`/gists/${gistId}`, { method: 'PATCH', body: JSON.stringify(body) })
    } else {
      body.public = false
      const gist = await api('/gists', { method: 'POST', body: JSON.stringify(body) })
      localStorage.setItem(GITHUB_GIST_ID_KEY, gist.id)
    }
  },

  async pull() {
    let gistId = getGistId()
    if (!gistId) {
      const existing = await findExistingGist()
      if (!existing) return null
      gistId = existing.id
      localStorage.setItem(GITHUB_GIST_ID_KEY, gistId)
    }
    try {
      const gist = await api(`/gists/${gistId}`)
      const file = gist.files[SYNC_FILE_NAME]
      if (!file) return null
      return JSON.parse(file.content)
    } catch (e) {
      if (e.message.includes('404')) return null
      throw e
    }
  },

  async getRemoteUpdatedAt() {
    const envelope = await this.pull()
    return envelope?.updatedAt ?? null
  },

  getUserInfo() {
    try {
      return JSON.parse(localStorage.getItem(GITHUB_USER_KEY))
    } catch {
      return null
    }
  },

  disconnect() {
    localStorage.removeItem(GITHUB_TOKEN_KEY)
    localStorage.removeItem(GITHUB_GIST_ID_KEY)
    localStorage.removeItem(GITHUB_USER_KEY)
  },
}
