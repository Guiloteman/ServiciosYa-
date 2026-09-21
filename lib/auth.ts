import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'serviciosya_session'

export type SessionUser = {
  email: string
  name: string
  role: 'client' | 'provider'
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)?.value

  if (!session) {
    return null
  }

  try {
    const parsed = JSON.parse(session) as Partial<SessionUser>

    if (parsed.email && parsed.name) {
      return {
        email: parsed.email,
        name: parsed.name,
        role: parsed.role === 'provider' ? 'provider' : 'client',
      }
    }
  } catch {
    return null
  }

  return null
}

export async function setSession(user: SessionUser) {
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
