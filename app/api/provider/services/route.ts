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
      .query('SELECT TOP 1 Id, Name FROM dbo.Users WHERE Email = @email')

    const providerId = provider.recordset?.[0]?.Id

    if (!providerId) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const result = await pool
      .request()
      .input('providerId', providerId)
      .query(`
        SELECT
          s.Id,
          s.Title,
          s.Description,
          s.Price,
          s.Location,
          s.Status,
          s.CreatedAt,
          c.Name AS CategoryName
        FROM dbo.Services s
        INNER JOIN dbo.Categories c ON c.Id = s.CategoryId
        WHERE s.ProviderId = @providerId
        ORDER BY s.CreatedAt DESC
      `)

    return NextResponse.json({ services: result.recordset ?? [] })
  } catch (error) {
    console.error('Provider services error:', error)
    return NextResponse.json({ error: 'No se pudieron cargar los servicios del prestador.' }, { status: 500 })
  }
}

async function getProviderId() {
  const session = await getSession()

  if (!session || session.role !== 'provider') {
    return null
  }

  const pool = await getSqlPool()
  const result = await pool.request().input('email', session.email).query('SELECT TOP 1 Id FROM dbo.Users WHERE Email = @email')

  return result.recordset?.[0]?.Id ?? null
}

export async function POST(request: Request) {
  try {
    const providerId = await getProviderId()

    if (!providerId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const body = await request.json()
    const categoryId = Number(body?.categoryId ?? 0)
    const title = String(body?.title ?? '').trim()
    const description = String(body?.description ?? '').trim()
    const price = Number(body?.price ?? 0)
    const location = String(body?.location ?? '').trim()

    if (!categoryId || !title || !description || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Completa título, descripción, categoría y precio válido.' }, { status: 400 })
    }

    const pool = await getSqlPool()
    const result = await pool
      .request()
      .input('providerId', providerId)
      .input('categoryId', categoryId)
      .input('title', title)
      .input('description', description)
      .input('price', price)
      .input('location', location || null)
      .query(`
        INSERT INTO dbo.Services (ProviderId, CategoryId, Title, Description, Price, Location, Status)
        OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.Price, INSERTED.Location, INSERTED.Status
        VALUES (@providerId, @categoryId, @title, @description, @price, @location, 'active')
      `)

    return NextResponse.json({ ok: true, service: result.recordset?.[0] }, { status: 201 })
  } catch (error) {
    console.error('Create provider service error:', error)
    return NextResponse.json({ error: 'No se pudo crear el servicio.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const providerId = await getProviderId()

    if (!providerId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const body = await request.json()
    const serviceId = Number(body?.serviceId ?? 0)
    const categoryId = Number(body?.categoryId ?? 0)
    const title = String(body?.title ?? '').trim()
    const description = String(body?.description ?? '').trim()
    const price = Number(body?.price ?? 0)
    const location = String(body?.location ?? '').trim()
    const status = ['active', 'paused', 'cancelled'].includes(body?.status) ? body.status : 'active'

    if (!serviceId || !categoryId || !title || !description || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Completa todos los datos del servicio.' }, { status: 400 })
    }

    const pool = await getSqlPool()
    const result = await pool
      .request()
      .input('serviceId', serviceId)
      .input('providerId', providerId)
      .input('categoryId', categoryId)
      .input('title', title)
      .input('description', description)
      .input('price', price)
      .input('location', location || null)
      .input('status', status)
      .query(`
        UPDATE dbo.Services
        SET CategoryId = @categoryId, Title = @title, Description = @description,
            Price = @price, Location = @location, Status = @status, UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @serviceId AND ProviderId = @providerId
      `)

    if (!result.rowsAffected?.[0]) {
      return NextResponse.json({ error: 'Servicio no encontrado.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Update provider service error:', error)
    return NextResponse.json({ error: 'No se pudo actualizar el servicio.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const providerId = await getProviderId()

    if (!providerId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const body = await request.json()
    const serviceId = Number(body?.serviceId ?? 0)

    if (!serviceId) {
      return NextResponse.json({ error: 'Falta el servicio.' }, { status: 400 })
    }

    const pool = await getSqlPool()
    const result = await pool
      .request()
      .input('serviceId', serviceId)
      .input('providerId', providerId)
      .query(`
        UPDATE dbo.Services
        SET Status = 'cancelled', UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @serviceId AND ProviderId = @providerId
      `)

    if (!result.rowsAffected?.[0]) {
      return NextResponse.json({ error: 'Servicio no encontrado.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete provider service error:', error)
    return NextResponse.json({ error: 'No se pudo quitar el servicio.' }, { status: 500 })
  }
}
