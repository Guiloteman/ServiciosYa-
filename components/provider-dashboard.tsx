'use client'

import { useEffect, useRef, useState } from 'react'

type DashboardStats = {
  activeServices: number
  requestsCount: number
  averageRating: number
  monthlyRevenue: number
}

type RequestItem = {
  Id: number
  ClientName: string
  ClientPhone?: string
  ClientEmail?: string
  Address?: string
  Message: string
  PaymentMethod?: 'cash' | 'mercadopago'
  Status: string
  ServiceTitle: string
  ServicePrice?: number
}

type ServiceItem = {
  Id: number
  Title: string
  Description: string
  Price: number
  Location?: string
  Status: string
  CategoryId: number
  CategoryName: string
}

export default function ProviderDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    activeServices: 0,
    requestsCount: 0,
    averageRating: 0,
    monthlyRevenue: 0,
  })
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [provider, setProvider] = useState<{ name: string; email: string } | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null)
  const [serviceForm, setServiceForm] = useState({ categoryId: '1', title: '', description: '', price: '', location: '' })
  const [showNotifications, setShowNotifications] = useState(false)
  const locationWatch = useRef<number | null>(null)

  useEffect(() => () => {
    if (locationWatch.current !== null) {
      navigator.geolocation?.clearWatch(locationWatch.current)
    }
  }, [])

  useEffect(() => {
    function handleNotificationClick(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (target.closest('button[aria-label="Notificaciones"]')) {
        setShowNotifications((visible) => !visible)
      }
    }

    document.addEventListener('click', handleNotificationClick)
    return () => document.removeEventListener('click', handleNotificationClick)
  }, [])

  async function loadDashboard() {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/provider/dashboard', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar el panel.')
      }

      setProvider({
        name: data.provider?.name ?? 'Prestador',
        email: data.provider?.email ?? '',
      })

      setStats({
        activeServices: Number(data.stats?.activeServices ?? 0),
        requestsCount: Number(data.stats?.requestsCount ?? 0),
        averageRating: Number(data.stats?.averageRating ?? 0),
        monthlyRevenue: Number(data.stats?.monthlyRevenue ?? 0),
      })

      const requestResponse = await fetch('/api/provider/requests', { cache: 'no-store' })
      const requestData = await requestResponse.json()

      if (!requestResponse.ok) {
        throw new Error(requestData.error || 'No se pudieron cargar las solicitudes.')
      }

      setRequests(Array.isArray(requestData.requests) ? requestData.requests : [])

      const serviceResponse = await fetch('/api/provider/services', { cache: 'no-store' })
      const serviceData = await serviceResponse.json()

      if (!serviceResponse.ok) {
        throw new Error(serviceData.error || 'No se pudieron cargar tus servicios.')
      }

      setServices(Array.isArray(serviceData.services) ? serviceData.services : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  function resetServiceForm() {
    setEditingServiceId(null)
    setServiceForm({ categoryId: '1', title: '', description: '', price: '', location: '' })
  }

  function editService(service: ServiceItem) {
    setEditingServiceId(service.Id)
    setServiceForm({ categoryId: String(service.CategoryId), title: service.Title, description: service.Description, price: String(service.Price), location: service.Location || '' })
  }

  async function saveService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const response = await fetch('/api/provider/services', {
      method: editingServiceId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...serviceForm, serviceId: editingServiceId }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      setError(data.error || 'No se pudo guardar el servicio.')
      return
    }

    resetServiceForm()
    await loadDashboard()
  }

  async function removeService(serviceId: number) {
    const response = await fetch('/api/provider/services', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      setError(data.error || 'No se pudo quitar el servicio.')
      return
    }

    await loadDashboard()
  }

  async function shareLocation(requestId: number) {
    if (!navigator.geolocation) {
      setError('Este dispositivo no permite compartir ubicación.')
      return
    }

    if (locationWatch.current !== null) {
      navigator.geolocation.clearWatch(locationWatch.current)
    }

    locationWatch.current = navigator.geolocation.watchPosition(async (position) => {
      const response = await fetch(`/api/service-requests/${requestId}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error || 'No se pudo compartir la ubicación.')
      }
    }, () => setError('No se pudo obtener la ubicación del prestador.'), { enableHighAccuracy: true, maximumAge: 5000 })
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function updateRequestStatus(requestId: number, status: 'accepted' | 'rejected' | 'completed') {
    try {
      setUpdatingId(requestId)
      const response = await fetch('/api/provider/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo actualizar la solicitud.')
      }

      await loadDashboard()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la solicitud.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <main className="relative min-h-screen bg-slate-100 p-8">
      {showNotifications && <div className="fixed right-8 top-20 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"><p className="font-bold text-[#172b4d]">Notificaciones</p><p className="mt-2 text-sm text-slate-500">{requests.length ? `Tienes ${requests.length} solicitud(es) para revisar.` : 'No tienes solicitudes nuevas.'}</p></div>}
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#172b4d]">Panel del prestador</h1>
            <p className="mt-2 text-slate-600">Bienvenido, {provider?.name ?? 'Prestador'}</p>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">
              Cerrar sesión
            </button>
          </form>
        </div>

        {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Servicios activos</p><p className="mt-2 text-2xl font-bold">{stats.activeServices}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Solicitudes</p><p className="mt-2 text-2xl font-bold">{stats.requestsCount}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Calificación</p><p className="mt-2 text-2xl font-bold">{stats.averageRating.toFixed(1)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Ingresos</p><p className="mt-2 text-2xl font-bold">${stats.monthlyRevenue.toFixed(2)}</p></div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><h2 className="text-xl font-bold text-[#172b4d]">Mis servicios</h2><p className="mt-1 text-sm text-slate-500">Publica, modifica o retira lo que ofreces.</p></div>
            {editingServiceId ? <button type="button" onClick={resetServiceForm} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">Cancelar edición</button> : null}
          </div>
          <form onSubmit={saveService} className="mt-4 grid gap-3 md:grid-cols-2">
            <input required value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} placeholder="Título del servicio" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
            <input required type="number" min="0" step="0.01" value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} placeholder="Precio" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
            <select required value={serviceForm.categoryId} onChange={(event) => setServiceForm({ ...serviceForm, categoryId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="1">Plomería</option><option value="2">Electricidad</option><option value="3">Limpieza</option><option value="4">Cerrajería</option></select>
            <input value={serviceForm.location} onChange={(event) => setServiceForm({ ...serviceForm, location: event.target.value })} placeholder="Zona o localidad" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
            <textarea required value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} placeholder="Describe el servicio" className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm md:col-span-2" />
            <button type="submit" className="rounded-xl bg-[#163d75] px-4 py-2.5 text-sm font-bold text-white md:col-span-2">{editingServiceId ? 'Guardar cambios' : 'Publicar servicio'}</button>
          </form>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{services.length === 0 ? <p className="text-sm text-slate-500">Todavía no publicaste servicios.</p> : services.map((service) => <div key={service.Id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-800">{service.Title}</p><p className="mt-1 text-xs text-slate-500">{service.CategoryName} · ${Number(service.Price).toFixed(2)} · {service.Status}</p></div><div className="flex gap-2"><button type="button" onClick={() => editService(service)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">Editar</button><button type="button" onClick={() => removeService(service.Id)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Quitar</button></div></div><p className="mt-2 text-sm text-slate-600">{service.Description}</p></div>)}</div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-bold text-[#172b4d]">Solicitudes recientes</h2>
            {isLoading ? <p className="mt-4 text-sm text-slate-500">Cargando solicitudes...</p> : requests.length === 0 ? <p className="mt-4 text-sm text-slate-500">Todavía no tienes solicitudes.</p> : <div className="mt-4 space-y-3">{requests.map((request) => <div key={request.Id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-bold text-slate-800">{request.ClientName}</p><p className="text-xs text-slate-500">{request.ServiceTitle}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{request.Status}</span></div><p className="mt-2 text-sm text-slate-600">{request.Message}</p><p className="mt-2 text-xs text-slate-500">{request.Address || 'Sin dirección'} · {request.ClientPhone || 'Sin teléfono'}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={updatingId === request.Id} onClick={() => updateRequestStatus(request.Id, 'accepted')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{updatingId === request.Id ? 'Procesando...' : 'Aceptar'}</button><button type="button" disabled={updatingId === request.Id} onClick={() => updateRequestStatus(request.Id, 'rejected')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Rechazar</button><button type="button" disabled={updatingId === request.Id} onClick={() => updateRequestStatus(request.Id, 'completed')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Completar</button><button type="button" onClick={() => shareLocation(request.Id)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">Compartir ubicación</button></div></div>)}</div>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-bold text-[#172b4d]">Datos del prestador</h2>
            <div className="mt-4 space-y-3 text-sm"><div className="rounded-xl bg-white p-3"><span className="text-slate-500">Nombre:</span> <strong>{provider?.name ?? 'Prestador'}</strong></div><div className="rounded-xl bg-white p-3"><span className="text-slate-500">Email:</span> <strong>{provider?.email || 'Sin email'}</strong></div><div className="rounded-xl bg-white p-3"><span className="text-slate-500">Rol:</span> <strong>provider</strong></div></div>
          </section>
        </div>
      </div>
    </main>
  )
}