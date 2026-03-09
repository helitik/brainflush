import { generateCodeVerifier, generateCodeChallenge } from '../pkce'
import {
  SYNC_FILE_NAME,
  GOOGLE_TOKENS_KEY,
  GOOGLE_FILE_ID_KEY,
  GOOGLE_USER_KEY,
} from '../syncConstants'

function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(GOOGLE_TOKENS_KEY))
  } catch {
    return null
  }
}

function saveTokens(tokens) {
  localStorage.setItem(GOOGLE_TOKENS_KEY, JSON.stringify(tokens))
}

function getFileId() {
  return localStorage.getItem(GOOGLE_FILE_ID_KEY)
}

async function getAccessToken() {
  const tokens = getTokens()
  if (!tokens) throw new Error('notConnected')

  if (Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token
  }

  // Refresh
  if (!tokens.refresh_token) throw new Error('tokenExpired')
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  let res
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }),
    })
  } catch {
    // Network error — preserve tokens for retry
    throw new Error('networkError')
  }
  if (!res.ok) {
    // Only clear tokens on definitive auth failure (revoked/invalid)
    if (res.status === 400 || res.status === 401) {
      localStorage.removeItem(GOOGLE_TOKENS_KEY)
    }
    throw new Error('tokenExpired')
  }
  const data = await res.json()
  const updated = {
    access_token: data.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  saveTokens(updated)
  return updated.access_token
}

async function driveApi(path, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem(GOOGLE_TOKENS_KEY)
    throw new Error('tokenExpired')
  }
  if (!res.ok) throw new Error(`Google Drive API ${res.status}: ${res.statusText}`)
  return res
}

async function findFile() {
  const fileId = getFileId()
  if (fileId) return fileId

  const res = await driveApi(
    `/files?spaces=appDataFolder&q=name='${SYNC_FILE_NAME}'&fields=files(id)&pageSize=1`
  )
  const data = await res.json()
  if (data.files?.length > 0) {
    localStorage.setItem(GOOGLE_FILE_ID_KEY, data.files[0].id)
    return data.files[0].id
  }
  return null
}

export const google = {
  name: 'google',

  isConnected() {
    return !!getTokens()
  },

  async ensureAuth() {
    const tokens = getTokens()
    if (!tokens) throw new Error('notConnected')
    if (Date.now() < tokens.expires_at - 60_000) return
    await getAccessToken()
  },

  startAuth() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) throw new Error('Missing VITE_GOOGLE_CLIENT_ID')

    const verifier = generateCodeVerifier()
    localStorage.setItem('google-pkce-verifier', verifier)

    generateCodeChallenge(verifier).then((challenge) => {
      const state = crypto.randomUUID()
      localStorage.setItem('google-oauth-state', state)

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/drive.appdata',
        access_type: 'offline',
        prompt: 'consent',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      })
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    })
  },

  async handleCallback(searchParams) {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const savedState = localStorage.getItem('google-oauth-state')
    const verifier = localStorage.getItem('google-pkce-verifier')
    localStorage.removeItem('google-oauth-state')
    localStorage.removeItem('google-pkce-verifier')

    if (!code || !state || state !== savedState || !verifier) {
      throw new Error('Invalid OAuth callback')
    }

    const res = await fetch('/api/auth/google-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: verifier,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Token exchange failed: ${err.error || res.status}`)
    }
    const data = await res.json()
    saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    })

    // Fetch user info
    try {
      const res = await driveApi('/about?fields=user')
      const { user } = await res.json()
      localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify({
        name: user.displayName,
        email: user.emailAddress,
        avatar: user.photoLink,
      }))
    } catch {
      // Non-critical — continue without user info
    }

    // Try to find existing file
    await findFile()
  },

  async push(envelope) {
    const token = await getAccessToken()
    let fileId = await findFile()
    const content = JSON.stringify(envelope)

    if (fileId) {
      // Update existing file
      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: content,
        }
      )
      if (!res.ok) throw new Error(`Google Drive upload ${res.status}`)
    } else {
      // Create new file in appData
      const metadata = {
        name: SYNC_FILE_NAME,
        parents: ['appDataFolder'],
      }
      const form = new FormData()
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      )
      form.append('file', new Blob([content], { type: 'application/json' }))

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      )
      if (!res.ok) throw new Error(`Google Drive create ${res.status}`)
      const data = await res.json()
      localStorage.setItem(GOOGLE_FILE_ID_KEY, data.id)
    }
  },

  async pull() {
    const fileId = await findFile()
    if (!fileId) return null

    try {
      const res = await driveApi(`/files/${fileId}?alt=media`)
      return await res.json()
    } catch (e) {
      if (e.message.includes('404')) {
        localStorage.removeItem(GOOGLE_FILE_ID_KEY)
        return null
      }
      throw e
    }
  },

  async getRemoteUpdatedAt() {
    const envelope = await this.pull()
    return envelope?.updatedAt ?? null
  },

  getUserInfo() {
    try {
      return JSON.parse(localStorage.getItem(GOOGLE_USER_KEY))
    } catch {
      return null
    }
  },

  disconnect() {
    localStorage.removeItem(GOOGLE_TOKENS_KEY)
    localStorage.removeItem(GOOGLE_FILE_ID_KEY)
    localStorage.removeItem(GOOGLE_USER_KEY)
  },
}
