import { NextResponse } from 'next/server'
import { setSession } from '@/lib/auth'
import { ensureDatabaseSchema, getSqlPool, hashPassword } from '@/lib/sql'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    await ensureDatabaseSchema()
    const pool = await getSqlPool()
    const result = await pool
      .request()
      .input('email', email)
      .query(`
        SELECT TOP 1 Id, Name, Email, PasswordHash, PasswordSalt, Role
        FROM dbo.Users
        WHERE Email = @email
      `)

    const user = result.recordset?.[0]

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 })
    }

    const providedHash = hashPassword(password, user.PasswordSalt)

    if (providedHash !== user.PasswordHash) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 })
    }

    await setSession({
      email: user.Email,
      name: user.Name,
      role: user.Role === 'provider' ? 'provider' : 'client',
    })

    return NextResponse.json({ ok: true, user: { email: user.Email, name: user.Name, role: user.Role } })
  } catch (error) {
    console.error('Login DB error:', error)
    return NextResponse.json({ error: 'No se pudo iniciar sesión con la base de datos.' }, { status: 500 })
  }
}
