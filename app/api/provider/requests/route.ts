import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSqlPool } from '@/lib/sql'

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'provider') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const pool = await getSqlPool()

    const provider = await pool
      .request()
      .input('email', session.email)
      .query('SELECT TOP 1 Id FROM dbo.Users WHERE Email = @email')

    const providerId = provider.recordset?.[0]?.Id

    if (!providerId) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const result = await pool
      .request()
      .input('providerId', providerId)
      .query(`
        SELECT
          sr.Id,
          sr.ServiceId,
          sr.ClientName,
          sr.ClientPhone,
          sr.ClientEmail,
          sr.Address,
          sr.Message,
          sr.PaymentMethod,
          sr.Status,
          sr.CreatedAt,
          s.Title AS ServiceTitle,
          s.Description AS ServiceDescription,
          s.Price AS ServicePrice
        FROM dbo.ServiceRequests sr
        INNER JOIN dbo.Services s ON s.Id = sr.ServiceId
        WHERE s.ProviderId = @providerId
        ORDER BY sr.CreatedAt DESC
      `)

    return NextResponse.json({ requests: result.recordset ?? [] })
  } catch (error) {
    console.error('Provider requests error:', error)
    return NextResponse.json({ error: 'No se pudieron cargar las solicitudes.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'provider') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const body = await request.json()
    const requestId = Number(body?.requestId ?? 0)
    const status = String(body?.status ?? '').trim()

    if (!requestId || !['accepted', 'rejected', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Datos inválidos para actualizar la solicitud.' }, { status: 400 })
    }

    const pool = await getSqlPool()

    const provider = await pool
      .request()
      .input('email', session.email)
      .query('SELECT TOP 1 Id FROM dbo.Users WHERE Email = @email')

    const providerId = provider.recordset?.[0]?.Id

    if (!providerId) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const result = await pool
      .request()
      .input('requestId', requestId)
      .input('providerId', providerId)
      .input('status', status)
      .query(`
        UPDATE sr
        SET sr.Status = @status,
            sr.UpdatedAt = SYSUTCDATETIME()
        FROM dbo.ServiceRequests sr
        INNER JOIN dbo.Services s ON s.Id = sr.ServiceId
        WHERE sr.Id = @requestId AND s.ProviderId = @providerId
      `)

    if (!result.rowsAffected?.[0]) {
      return NextResponse.json({ error: 'Solicitud no encontrada o no pertenece al prestador.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, status })
  } catch (error) {
    console.error('Update provider request error:', error)
    return NextResponse.json({ error: 'No se pudo actualizar la solicitud.' }, { status: 500 })
  }
}
