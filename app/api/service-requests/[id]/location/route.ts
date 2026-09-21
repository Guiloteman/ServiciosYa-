import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSqlPool } from '@/lib/sql'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = await getSqlPool()
    const result = await pool
      .request()
      .input('requestId', Number(id))
      .query(`
        SELECT TOP 1 sr.Id, sr.Status, sr.Latitude, sr.Longitude, s.Title AS ServiceTitle
        FROM dbo.ServiceRequests sr
        INNER JOIN dbo.Services s ON s.Id = sr.ServiceId
        WHERE sr.Id = @requestId
      `)

    if (!result.recordset?.[0]) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 })
    }

    return NextResponse.json({ location: result.recordset[0] })
  } catch (error) {
    console.error('Get request location error:', error)
    return NextResponse.json({ error: 'No se pudo obtener la ubicación.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'provider') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const latitude = Number(body?.latitude)
    const longitude = Number(body?.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: 'Ubicación inválida.' }, { status: 400 })
    }

    const pool = await getSqlPool()
    const result = await pool
      .request()
      .input('requestId', Number(id))
      .input('providerEmail', session.email)
      .input('latitude', latitude)
      .input('longitude', longitude)
      .query(`
        UPDATE sr
        SET Latitude = @latitude, Longitude = @longitude, UpdatedAt = SYSUTCDATETIME()
        FROM dbo.ServiceRequests sr
        INNER JOIN dbo.Services s ON s.Id = sr.ServiceId
        INNER JOIN dbo.Users u ON u.Id = s.ProviderId
        WHERE sr.Id = @requestId AND u.Email = @providerEmail
      `)

    if (!result.rowsAffected?.[0]) {
      return NextResponse.json({ error: 'Solicitud no encontrada o no pertenece al prestador.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, latitude, longitude })
  } catch (error) {
    console.error('Update request location error:', error)
    return NextResponse.json({ error: 'No se pudo actualizar la ubicación.' }, { status: 500 })
  }
}
