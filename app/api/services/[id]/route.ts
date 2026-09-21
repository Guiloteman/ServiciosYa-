import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ensureDatabaseSchema, getSqlPool } from '@/lib/sql'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await ensureDatabaseSchema()
    const pool = await getSqlPool()

    const result = await pool
      .request()
      .input('id', Number(id))
      .query(`
        SELECT s.Id, s.ProviderId, s.CategoryId, s.Title, s.Description, s.Price, s.Location, s.Status,
               u.Name AS ProviderName,
               c.Name AS CategoryName,
               rating.AverageRating,
               rating.ReviewCount
        FROM dbo.Services s
        INNER JOIN dbo.Users u ON u.Id = s.ProviderId
        INNER JOIN dbo.Categories c ON c.Id = s.CategoryId
             OUTER APPLY (
               SELECT CAST(ISNULL(AVG(CAST(r.Rating AS DECIMAL(3,2))), 0) AS DECIMAL(3,2)) AS AverageRating,
                 COUNT(r.Id) AS ReviewCount
               FROM dbo.Reviews r
               WHERE r.ServiceId = s.Id
             ) rating
        WHERE s.Id = @id
      `)

    const service = result.recordset?.[0]

    if (!service) {
      return NextResponse.json({ error: 'Servicio no encontrado.' }, { status: 404 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Get service error:', error)
    return NextResponse.json({ error: 'No se pudo obtener el servicio.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session || session.role !== 'provider') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const body = await request.json()
    const title = String(body?.title ?? '').trim()
    const description = String(body?.description ?? '').trim()
    const price = Number(body?.price ?? 0)
    const location = String(body?.location ?? '').trim()
    const status = String(body?.status ?? '').trim()

    if (!title && !description && !Number.isFinite(price) && !location && !status) {
      return NextResponse.json({ error: 'No hay datos para actualizar.' }, { status: 400 })
    }

    await ensureDatabaseSchema()
    const pool = await getSqlPool()

    const currentUser = await pool
      .request()
      .input('email', session.email)
      .query('SELECT TOP 1 Id FROM dbo.Users WHERE Email = @email')

    const userId = currentUser.recordset?.[0]?.Id

    const existing = await pool
      .request()
      .input('id', Number(id))
      .input('providerId', userId)
      .query('SELECT TOP 1 Id FROM dbo.Services WHERE Id = @id AND ProviderId = @providerId')

    if (!existing.recordset?.[0]) {
      return NextResponse.json({ error: 'Servicio no encontrado o no pertenece al prestador.' }, { status: 404 })
    }

    const requestBuilder = pool.request().input('id', Number(id))

    if (title) requestBuilder.input('title', title)
    if (description) requestBuilder.input('description', description)
    if (Number.isFinite(price) && price > 0) requestBuilder.input('price', price)
    if (location || location === '') requestBuilder.input('location', location || null)
    if (status) requestBuilder.input('status', status)

    const updateFields: string[] = []
    if (title) updateFields.push('Title = @title')
    if (description) updateFields.push('Description = @description')
    if (Number.isFinite(price) && price > 0) updateFields.push('Price = @price')
    if (location || location === '') updateFields.push('Location = @location')
    if (status) updateFields.push('Status = @status')

    if (!updateFields.length) {
      return NextResponse.json({ error: 'No se encontró ningún campo para actualizar.' }, { status: 400 })
    }

    await requestBuilder.query(`
      UPDATE dbo.Services
      SET ${updateFields.join(', ')}, UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id
    `)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Update service error:', error)
    return NextResponse.json({ error: 'No se pudo actualizar el servicio.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    const { id } = await params

    if (!session || session.role !== 'provider') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    await ensureDatabaseSchema()
    const pool = await getSqlPool()

    const currentUser = await pool
      .request()
      .input('email', session.email)
      .query('SELECT TOP 1 Id FROM dbo.Users WHERE Email = @email')

    const userId = currentUser.recordset?.[0]?.Id

    const result = await pool
      .request()
      .input('id', Number(id))
      .input('providerId', userId)
      .query('DELETE FROM dbo.Services WHERE Id = @id AND ProviderId = @providerId')

    if (!result.rowsAffected?.[0]) {
      return NextResponse.json({ error: 'Servicio no encontrado o no pertenece al prestador.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete service error:', error)
    return NextResponse.json({ error: 'No se pudo eliminar el servicio.' }, { status: 500 })
  }
}
