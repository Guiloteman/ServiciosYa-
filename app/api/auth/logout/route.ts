import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

export async function POST(request: Request) {
  await clearSession()

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const host = forwardedHost ?? request.headers.get('host')
  const protocol = forwardedProto?.split(',')[0].trim() ?? new URL(request.url).protocol.replace(':', '')
  const origin = host ? `${protocol}://${host}` : new URL(request.url).origin

  return NextResponse.redirect(new URL('/login', origin), 303)
}
