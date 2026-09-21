import { NextResponse } from 'next/server'
import { ensureDatabaseSchema, getSqlPool, createPasswordHash } from '@/lib/sql'
import { sendAccountConfirmationEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const role = 'provider'

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Faltan datos para crear el usuario.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    await ensureDatabaseSchema()
    const pool = await getSqlPool()

    const existing = await pool
      .request()
      .input('email', email)
      .query('SELECT TOP 1 Id FROM dbo.Users WHERE Email = @email')

    if (existing.recordset?.length) {
      return NextResponse.json({ error: 'Ese email ya está registrado.' }, { status: 409 })
    }

    const passwordData = createPasswordHash(password)

    await pool
      .request()
      .input('name', name)
      .input('email', email)
      .input('passwordHash', passwordData.hash)
      .input('passwordSalt', passwordData.salt)
      .input('role', role)
      .query(`
        INSERT INTO dbo.Users (Name, Email, PasswordHash, PasswordSalt, Role)
        VALUES (@name, @email, @passwordHash, @passwordSalt, @role)
      `)

    try {
      await sendAccountConfirmationEmail({ name, email })
    } catch (mailError) {
      console.error('Account confirmation email failed:', mailError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Register DB error:', error)
    return NextResponse.json({ error: 'No se pudo registrar el usuario en la base de datos.' }, { status: 500 })
  }
}
