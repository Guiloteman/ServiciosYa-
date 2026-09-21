import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ensureDatabaseSchema, getSqlPool } from '@/lib/sql'

export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')?.trim()
    const pool = await getSqlPool()

    const query = pool.request()
    let sql = `
      SELECT
        s.Id,
        s.ProviderId,
        s.CategoryId,
        s.Title,
        s.Description,
        s.Price,
        s.Location,
        s.Status,
        s.CreatedAt,
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
      WHERE s.Status = 'active'
    `

    if (category) {
      query.input('category', category)
      sql += ' AND c.Name = @category '
    }

    sql += ' ORDER BY s.CreatedAt DESC '

    const result = await query.query(sql)

    return NextResponse.json({ services: result.recordset ?? [] })
  } catch (error) {
    console.error('List services error:', error)
    return NextResponse.json({ error: 'No se pudieron cargar los servicios.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'provider') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const body = await request.json()
    const title = String(body?.title ?? '').trim()
    const description = String(body?.description ?? '').trim()
    const price = Number(body?.price ?? 0)
    const location = String(body?.location ?? '').trim()
    const categoryId = Number(body?.categoryId ?? 0)
    const categoryName = String(body?.categoryName ?? '').trim()

    if (!title || !description || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Faltan datos del servicio.' }, { status: 400 })
    }

    await ensureDatabaseSchema()
    const pool = await getSqlPool()

    const userResult = await pool
      .request()
      .input('email', session.email)
      .query('SELECT TOP 1 Id, Role FROM dbo.Users WHERE Email = @email')

    const user = userResult.recordset?.[0]

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    let finalCategoryId = categoryId

    if (!finalCategoryId && categoryName) {
      const categoryResult = await pool
        .request()
        .input('categoryName', categoryName)
        .query('SELECT TOP 1 Id FROM dbo.Categories WHERE Name = @categoryName')

      finalCategoryId = Number(categoryResult.recordset?.[0]?.Id ?? 0)
    }

    if (!finalCategoryId) {
      const fallbackCategory = await pool
        .request()
        .query('SELECT TOP 1 Id FROM dbo.Categories ORDER BY Id ASC')

      finalCategoryId = Number(fallbackCategory.recordset?.[0]?.Id ?? 0)
    }

    if (!finalCategoryId) {
      return NextResponse.json({ error: 'No existe una categoría válida.' }, { status: 400 })
    }

    const insertResult = await pool
      .request()
      .input('providerId', user.Id)
      .input('categoryId', finalCategoryId)
      .input('title', title)
      .input('description', description)
      .input('price', price)
      .input('location', location || null)
      .query(`
        INSERT INTO dbo.Services (ProviderId, CategoryId, Title, Description, Price, Location, Status)
        OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.Price, INSERTED.Location, INSERTED.Status
        VALUES (@providerId, @categoryId, @title, @description, @price, @location, 'active')
      `)

    const created = insertResult.recordset?.[0]

    return NextResponse.json({ ok: true, service: created })
  } catch (error) {
    console.error('Create service error:', error)
    return NextResponse.json({ error: 'No se pudo crear el servicio.' }, { status: 500 })
  }
}
