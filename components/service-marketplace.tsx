'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Clock3,
  Crosshair,
  Filter,
  Heart,
  Home,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Wrench,
  X,
} from 'lucide-react'

type ServiceRow = {
  Id: number
  ProviderId: number
  CategoryId: number
  Title: string
  Description: string
  Price: number
  Location: string | null
  Status: string
  ProviderName: string
  CategoryName: string
  AverageRating?: number
  ReviewCount?: number
}

const serviceIcons: Record<string, string> = {
  Plomería: '🔧',
  Electricidad: '⚡',
  Limpieza: '✨',
  Cerrajería: '🔐',
}

const serviceColors: Record<string, string> = {
  Plomería: 'bg-blue-100 text-blue-700',
  Electricidad: 'bg-amber-100 text-amber-700',
  Limpieza: 'bg-violet-100 text-violet-700',
  Cerrajería: 'bg-emerald-100 text-emerald-700',
}

export function ServiceMarketplace() {
  const [query, setQuery] = useState('')
  const [services, setServices] = useState<ServiceRow[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [activeServiceId, setActiveServiceId] = useState<number | null>(null)
  const [showRequest, setShowRequest] = useState(false)
  const [requested, setRequested] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mercadopago'>('cash')
  const [priceMode, setPriceMode] = useState<'fixed' | 'quote'>('fixed')
  const [showTracking, setShowTracking] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'denied'>('idle')
  const [clientLatitude, setClientLatitude] = useState<number | null>(null)
  const [clientLongitude, setClientLongitude] = useState<number | null>(null)
  const [requestId, setRequestId] = useState<number | null>(null)
  const [providerLocation, setProviderLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [loadingServices, setLoadingServices] = useState(true)
  const [serviceError, setServiceError] = useState('')
  const [showClientNotifications, setShowClientNotifications] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingMessage, setRatingMessage] = useState('')
  const [serviceDetails, setServiceDetails] = useState('')
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)

  async function askLocalAssistant() {
    const details = serviceDetails.trim()
    if (!details) {
      setAssistantAnswer('Cuéntame brevemente qué problema necesitas resolver.')
      return
    }

    setAssistantLoading(true)
    setAssistantAnswer('')
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details, services }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No pudimos consultar al asistente.')
      setAssistantAnswer(data.answer)
      if (data.category && categories.includes(data.category)) setSelectedCategory(data.category)
      if (data.search) setQuery(data.search)
    } catch (error) {
      setAssistantAnswer(error instanceof Error ? error.message : 'No pudimos consultar al asistente local.')
    } finally {
      setAssistantLoading(false)
    }
  }

  useEffect(() => {
    async function loadServices() {
      try {
        setLoadingServices(true)
        const response = await fetch('/api/services')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'No se pudieron cargar los servicios.')
        }

        const rows = Array.isArray(data.services) ? data.services : []
        setServices(rows)

        if (rows.length && !selectedCategory) {
          setSelectedCategory(rows[0].CategoryName || 'Plomería')
        }
      } catch (error) {
        console.error(error)
        setServiceError('No pudimos cargar los servicios disponibles.')
      } finally {
        setLoadingServices(false)
      }
    }

    loadServices()

    const refreshTimer = window.setInterval(loadServices, 10000)
    return () => window.clearInterval(refreshTimer)
  }, [])

  const categories = useMemo(() => {
    const unique = new Map<string, number>()
    services.forEach((service) => {
      if (!unique.has(service.CategoryName)) {
        unique.set(service.CategoryName, 1)
      }
    })
    return Array.from(unique.keys())
  }, [services])

  const filteredServices = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return services.filter((service) => {
      const haystack = `${service.Title} ${service.Description} ${service.ProviderName} ${service.CategoryName} ${service.Location ?? ''}`.toLowerCase()
      return !normalized || haystack.includes(normalized)
    })
  }, [query, services])

  useEffect(() => {
    if (!selectedCategory && categories.length) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  useEffect(() => {
    if (!activeServiceId && filteredServices.length) {
      setActiveServiceId(filteredServices[0].Id)
    }
  }, [filteredServices, activeServiceId])

  useEffect(() => {
    if (!requestId) {
      return
    }

    async function loadProviderLocation() {
      const response = await fetch(`/api/service-requests/${requestId}/location`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      const latitude = Number(data.location?.Latitude)
      const longitude = Number(data.location?.Longitude)

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        setProviderLocation({ latitude, longitude })
      }
    }

    loadProviderLocation()
    const locationTimer = window.setInterval(loadProviderLocation, 5000)
    return () => window.clearInterval(locationTimer)
  }, [requestId])

  const visibleServices = filteredServices.filter(
    (service) => !selectedCategory || service.CategoryName === selectedCategory,
  )

  const selectedService =
    services.find((service) => service.Id === activeServiceId) ?? visibleServices[0] ?? services[0] ?? null

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      return
    }
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        setClientLatitude(latitude)
        setClientLongitude(longitude)
        setLocationStatus('ready')
      },
      () => {
        setClientLatitude(null)
        setClientLongitude(null)
        setLocationStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function requestService() {
    if (paymentMethod === 'mercadopago') {
      await payWithMercadoPago()
      return
    }

    if (!selectedService) {
      setServiceError('Primero elige un servicio.')
      return
    }

    const payload = {
      serviceId: selectedService.Id,
      clientName: clientName.trim() || 'Cliente',
      clientPhone: clientPhone.trim(),
      address: clientAddress.trim(),
      message: `Solicitud para ${selectedService.Title}`,
      paymentMethod,
      latitude: clientLatitude,
      longitude: clientLongitude,
    }

    const response = await fetch('/api/service-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      setServiceError(data.error || 'No se pudo enviar la solicitud.')
      return
    }

    setRequestId(data.request?.Id ?? null)
    setRequested(true)
    setShowRequest(false)
    setClientName('')
    setClientPhone('')
    setClientAddress('')
    setPaymentMethod('cash')
    setClientLatitude(null)
    setClientLongitude(null)
    setLocationStatus('idle')
    setServiceError('')
  }

  async function payWithMercadoPago() {
    if (!selectedService) {
      setServiceError('Primero elige un servicio.')
      return
    }

    const payload = {
      serviceId: selectedService.Id,
      clientName: clientName.trim() || 'Cliente',
      clientPhone: clientPhone.trim(),
      address: clientAddress.trim(),
      message: `Solicitud para ${selectedService.Title}`,
      paymentMethod: 'mercadopago',
      latitude: clientLatitude,
      longitude: clientLongitude,
    }

    try {
      const response = await fetch('/api/payments/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setServiceError(data.error || 'No se pudo iniciar el pago.')
        return
      }

      if (data.init_point) {
        setRequestId(data.requestId ?? null)
        window.location.href = data.init_point
        return
      }

      setServiceError('No se pudo generar la URL de pago de Mercado Pago.')
    } catch (error) {
      console.error(error)
      setServiceError('Error al iniciar el pago con Mercado Pago.')
    }
  }

  async function submitRequest() {
    if (paymentMethod === 'mercadopago') {
      await payWithMercadoPago()
      return
    }

    await requestService()
  }

  async function submitRating() {
    if (!selectedService || !rating) {
      setRatingMessage('Selecciona una cantidad de estrellas.')
      return
    }

    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: selectedService.Id, rating, comment: ratingComment }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      setRatingMessage(data.error || 'No se pudo guardar la calificación.')
      return
    }

    setRatingMessage('Gracias por calificar este servicio.')
    setRatingComment('')
    setRating(0)
    setShowRating(false)
  }

  function handleClientButtonClick(event: React.MouseEvent<HTMLElement>) {
    const button = (event.target as HTMLElement).closest('button')
    const label = button?.getAttribute('aria-label') || button?.textContent?.trim() || ''

    if (!button) return
    if (label.includes('Notificaciones')) {
      setShowClientNotifications((visible) => !visible)
    } else if (label.includes('Mis solicitudes')) {
      if (requestId) setShowTracking(true)
      else setServiceError('Todavía no tienes una solicitud activa.')
    } else if (label.includes('Convertirme en prestador')) {
      window.location.href = '/register'
    } else if (label.includes('Ver todos')) {
      setSelectedCategory('')
      setQuery('')
    } else if (button?.className.includes('rounded-lg border')) {
      setSelectedCategory('')
    } else if (label === 'Buscar') {
      setServiceError(visibleServices.length ? `${visibleServices.length} servicios encontrados.` : 'No encontramos servicios con esa búsqueda.')
    }
  }

  return (
    <>
      {showTracking && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-5"><div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#ec6a38]">Mapa en vivo</p><h2 className="text-xl font-bold text-[#172b4d]">Seguimiento del prestador</h2></div><button type="button" onClick={() => setShowTracking(false)} className="rounded-full p-2 text-slate-400" aria-label="Cerrar mapa"><X size={18} /></button></div>{providerLocation ? <iframe title="Ubicación en vivo del prestador" className="mt-4 h-80 w-full rounded-2xl border-0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${providerLocation.longitude - 0.02}%2C${providerLocation.latitude - 0.02}%2C${providerLocation.longitude + 0.02}%2C${providerLocation.latitude + 0.02}&layer=mapnik&marker=${providerLocation.latitude}%2C${providerLocation.longitude}`} /> : <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">El prestador todavía no compartió su ubicación.</div>}<p className="mt-3 text-xs text-slate-500">La ubicación se actualiza automáticamente cada cinco segundos.</p></div></div>}
    <main onClick={handleClientButtonClick} className="min-h-screen bg-[#f7f8fa] text-slate-900">
      {requested && <button type="button" onClick={() => setShowRating(true)} className="fixed bottom-5 left-5 z-40 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-amber-950 shadow-xl">Calificar servicio</button>}
      {showRating && selectedService && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-5"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#ec6a38]">Tu experiencia</p><h2 className="mt-1 text-xl font-bold text-[#172b4d]">Califica {selectedService.Title}</h2></div><button type="button" onClick={() => setShowRating(false)} className="text-slate-400" aria-label="Cerrar">×</button></div><div className="mt-5 flex justify-center gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} estrellas`} className={`text-3xl ${value <= rating ? 'text-amber-400' : 'text-slate-300'}`}>★</button>)}</div><textarea value={ratingComment} onChange={(event) => setRatingComment(event.target.value)} placeholder="Cuéntanos cómo fue (opcional)" className="mt-5 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" />{ratingMessage && <p className="mt-3 text-sm text-slate-600">{ratingMessage}</p>}<button type="button" onClick={submitRating} className="mt-4 w-full rounded-xl bg-[#163d75] px-4 py-3 text-sm font-bold text-white">Guardar calificación</button></div></div>}
      {showRequest && <div className="fixed bottom-5 left-5 z-[60] w-[min(360px,calc(100vw-40px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"><label className="block text-xs font-bold text-slate-700">Dirección del servicio</label><input required value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} placeholder="Calle, número, ciudad" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><p className="mt-3 text-sm font-bold text-[#172b4d]">Forma de pago</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPaymentMethod('cash')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${paymentMethod === 'cash' ? 'border-[#285896] bg-[#eaf1fb] text-[#163d75]' : 'border-slate-200 text-slate-600'}`}>Efectivo</button><button type="button" onClick={() => setPaymentMethod('mercadopago')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${paymentMethod === 'mercadopago' ? 'border-[#285896] bg-[#eaf1fb] text-[#163d75]' : 'border-slate-200 text-slate-600'}`}>Mercado Pago</button></div></div>}
      {showClientNotifications && <div className="fixed right-5 top-20 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"><p className="font-bold text-[#172b4d]">Notificaciones</p><p className="mt-2 text-sm text-slate-500">{requested ? 'Tu solicitud está registrada y disponible para seguimiento.' : 'No tienes notificaciones nuevas.'}</p></div>}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
  <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 lg:px-8">
    
    <div className="flex items-center gap-3">
      <div>
        <p className="text-[19px] font-bold tracking-tight text-[#163d75]" aria-label="Servicios Ya">
          Servicios Ya
        </p>
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:block">
          servicios a tu alcance
        </p>
      </div>
    </div>

    <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
      <a className="text-[#163d75]" href="#inicio">Inicio</a>
      <a href="#servicios">Servicios</a>
    </nav>

    <div aria-hidden="true" className="w-2" />

  </div>

</header>


      <section id="inicio" className="mx-auto max-w-[1320px] px-5 pb-10 pt-9 lg:px-8 lg:pt-12">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#eaf1fb] px-3 py-1.5 text-xs font-bold text-[#285896]"><Sparkles size={13} /> SERVICIOS CERCA DE TI</div><h1 className="max-w-2xl text-3xl font-bold tracking-[-0.035em] text-[#172b4d] sm:text-4xl">Encuentra ayuda confiable,<br className="hidden sm:block" /> justo cuando la necesitas.</h1><p className="mt-3 text-[15px] text-slate-500">Profesionales verificados para resolver lo que necesitas, sin complicaciones.</p></div><div className="hidden items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex"><ShieldCheck size={20} /><div><p className="font-bold">Tu seguridad es primero</p><p className="text-xs text-emerald-700">Prestadores verificados por nuestra comunidad</p></div></div></div>

        <div className="relative mb-8 flex max-w-3xl items-center rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_5px_22px_rgba(27,55,90,0.07)]"><Search className="ml-3 text-slate-400" size={21} /><input aria-label="Buscar servicio o profesional" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="¿Qué servicio necesitas?" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-400" /><div className="hidden h-8 w-px bg-slate-200 sm:block" /><button onClick={useMyLocation} className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 sm:flex"><MapPin size={16} className="text-[#ec6a38]" /> {locationStatus === 'loading' ? 'Localizando...' : locationStatus === 'ready' ? 'Ubicación lista' : 'Mi ubicación'}</button><button className="rounded-xl bg-[#163d75] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#102f5c] sm:px-6">Buscar</button></div>

        <section className="mb-8 max-w-3xl rounded-2xl border border-[#dce9f8] bg-[#eef5fc] p-4 sm:p-5" aria-labelledby="assistant-title">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#163d75] text-white"><Sparkles size={18} /></div>
            <div className="min-w-0 flex-1">
              <h2 id="assistant-title" className="font-bold text-[#172b4d]">Describe tu problema y te orientamos</h2>
              <p className="mt-1 text-xs text-slate-600">El asistente local analiza tu descripción y te ayuda a encontrar el servicio adecuado.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input value={serviceDetails} onChange={(event) => setServiceDetails(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) askLocalAssistant() }} placeholder="Ej.: Tengo una fuga debajo del fregadero" aria-label="Describe tu problema" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#285896] focus:ring-2 focus:ring-[#dce9f8]" />
                <button type="button" onClick={askLocalAssistant} disabled={assistantLoading} className="rounded-xl bg-[#ec6a38] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#d95d2f] disabled:cursor-wait disabled:opacity-60">{assistantLoading ? 'Analizando...' : 'Orientarme'}</button>
              </div>
              {assistantAnswer && <p className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-sm leading-6 text-slate-700">{assistantAnswer}</p>}
            </div>
          </div>
        </section>

        <div id="servicios" className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#172b4d]">¿Qué necesitas hoy?</h2>
            <button className="flex items-center gap-1 text-sm font-semibold text-[#285896]">Ver todos <ArrowRight size={15} /></button>
          </div>
          {serviceError && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{serviceError}</div>}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {categories.map((category) => {
              const categoryServices = services.filter((service) => service.CategoryName === category)
              const icon = serviceIcons[category] ?? '🛠️'
              const color = serviceColors[category] ?? 'bg-slate-100 text-slate-700'
              return (
                <button key={category} onClick={() => setSelectedCategory(category)} className={`group rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selectedCategory === category ? 'border-[#285896] ring-2 ring-[#dce9f8]' : 'border-slate-200'}`}>
                  <div className={`mb-3 flex size-11 items-center justify-center rounded-xl text-xl ${color}`}>{icon}</div>
                  <div className="flex items-center justify-between"><div><p className="font-bold text-slate-800">{category}</p><p className="mt-0.5 text-xs text-slate-500">{categoryServices[0]?.Title ?? 'Servicio disponible'}</p></div><span className="text-xs font-semibold text-slate-400">{categoryServices.length}</span></div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <section>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#172b4d]">Prestadores cerca de ti</h2><p className="mt-1 text-xs text-slate-500">{selectedCategory || 'Todos'} · {loadingServices ? 'Cargando...' : `${visibleServices.length} servicios disponibles`}</p></div><button className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500"><SlidersHorizontal size={17} /></button></div>
            {loadingServices ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Cargando servicios...</div> : <div className="space-y-3">{visibleServices.map((service) => <article key={service.Id} onClick={() => setActiveServiceId(service.Id)} className={`cursor-pointer rounded-2xl border bg-white p-4 transition hover:shadow-md ${activeServiceId === service.Id ? 'border-[#285896] ring-2 ring-[#dce9f8]' : 'border-slate-200'}`}><div className="flex gap-3"><div className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${serviceColors[service.CategoryName] ?? 'bg-slate-600'}`}>{(service.ProviderName || 'P').slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><div className="flex items-center gap-1.5"><h3 className="truncate font-bold text-slate-800">{service.ProviderName}</h3><ShieldCheck size={15} className="shrink-0 text-[#285896]" /></div><p className="text-xs text-slate-500">{service.Title}</p></div><button aria-label="Guardar prestador" className="text-slate-300 hover:text-rose-500"><Heart size={17} /></button></div><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"><span className="flex items-center gap-1 font-bold text-amber-500"><Star size={14} fill="currentColor" /> 4.8 <span className="font-normal text-slate-400">(24)</span></span><span className="flex items-center gap-1 text-slate-500"><MapPin size={13} /> {service.Location || 'Ubicación por confirmar'}</span><span className="font-semibold text-slate-700">Desde ${Number(service.Price).toFixed(0)}</span></div></div></div>{activeServiceId === service.Id && <button onClick={(event) => { event.stopPropagation(); setShowRequest(true) }} className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#163d75] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102f5c]">Solicitar servicio</button>}</article>)}</div>}
          </section>

          <section className="relative min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-[#d9e5ed] shadow-sm"><div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(25deg, transparent 48%, #b7c9d5 49%, #b7c9d5 51%, transparent 52%), linear-gradient(115deg, transparent 46%, #b8cad4 47%, #b8cad4 50%, transparent 51%), linear-gradient(5deg, transparent 65%, #b8cad4 66%, #b8cad4 67%, transparent 68%)', backgroundSize: '180px 150px, 220px 180px, 260px 220px' }} /><div className="absolute inset-0 bg-[#bde0dd]/25" /><div className="absolute left-[36%] top-[35%] flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#ec6a38] text-white shadow-lg"><MapPin size={18} fill="currentColor" /></div><div className="absolute left-[68%] top-[53%] flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#285896] text-white shadow-lg"><MapPin size={18} fill="currentColor" /></div><div className="absolute left-[23%] top-[68%] flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#285896] text-white shadow-lg"><MapPin size={18} fill="currentColor" /></div><div className="absolute right-4 top-4 rounded-xl bg-white/95 px-3 py-2 shadow-md"><p className="text-xs font-bold text-slate-700">{visibleServices.length} prestadores disponibles</p><p className="text-[10px] text-slate-500">en tu zona</p></div><button onClick={useMyLocation} className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-md"><Crosshair size={15} className="text-[#285896]" /> {locationStatus === 'loading' ? 'Localizando...' : locationStatus === 'ready' ? 'Ubicación actualizada' : 'Usar mi ubicación'}</button></section>
        </div>
      </section>

      {requested && <div className="fixed bottom-5 right-5 z-40 flex max-w-sm items-start gap-3 rounded-2xl bg-[#163d75] p-4 text-white shadow-2xl"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#163d75]"><Check size={18} /></div><div><p className="font-bold">Solicitud enviada</p><p className="mt-0.5 text-xs text-blue-100">Te avisaremos cuando el prestador responda.</p><button onClick={() => setShowTracking(true)} className="mt-2 text-xs font-bold text-white underline underline-offset-2">Ver seguimiento</button></div><button onClick={() => setRequested(false)} className="ml-2 text-blue-200"><X size={16} /></button></div>}
      {showTracking && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-5 backdrop-blur-[2px]"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#ec6a38]">Seguimiento en vivo</p><h2 className="mt-1 text-xl font-bold text-[#172b4d]">Tu solicitud está en curso</h2><p className="mt-1 text-sm text-slate-500">Te avisaremos cuando un prestador confirme.</p></div><button onClick={() => setShowTracking(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar seguimiento"><X size={18} /></button></div><div className="relative mb-5 h-44 overflow-hidden rounded-2xl bg-[#d9e5ed]" style={{ backgroundImage: 'linear-gradient(25deg, transparent 48%, #b7c9d5 49%, #b7c9d5 51%, transparent 52%), linear-gradient(115deg, transparent 46%, #b8cad4 47%, #b8cad4 50%, transparent 51%)', backgroundSize: '180px 150px, 220px 180px' }}><div className="absolute left-[28%] top-[55%] flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#ec6a38] text-white shadow-lg"><MapPin size={16} fill="currentColor" /></div><div className="absolute right-[25%] top-[32%] flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#285896] text-white shadow-lg"><MapPin size={16} fill="currentColor" /></div><div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">Ubicación protegida hasta la aceptación</div></div><div className="space-y-3"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={16} /></div><div><p className="text-sm font-bold text-slate-800">Solicitud enviada</p><p className="text-xs text-slate-500">Tu petición fue recibida correctamente.</p></div></div><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-sky-100 text-sky-600"><Clock3 size={16} /></div><div><p className="text-sm font-bold text-slate-800">Buscando prestador</p><p className="text-xs text-slate-500">Se está notificando a los profesionales del área.</p></div></div><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-600"><MapPin size={16} /></div><div><p className="text-sm font-bold text-slate-800">Confirmación</p><p className="text-xs text-slate-500">Cuando acepten, recibirás la ubicación y el detalle del servicio.</p></div></div></div></div></div>}

      {showRequest && selectedService && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-5 backdrop-blur-[2px]"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#ec6a38]">Nueva solicitud</p><h2 className="mt-1 text-xl font-bold text-[#172b4d]">¿Necesitas {selectedService.Title.toLowerCase()}?</h2></div><button onClick={() => setShowRequest(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button></div><div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">{(selectedService.ProviderName || 'P').slice(0, 2).toUpperCase()}</div><div><p className="font-bold">{selectedService.ProviderName}</p><p className="text-xs text-slate-500">{selectedService.CategoryName} · {selectedService.Location || 'Ubicación por confirmar'}</p></div><span className="ml-auto font-bold text-slate-700">${Number(selectedService.Price).toFixed(0)}</span></div></div><div className="mt-4 space-y-3"><div><label className="block text-xs font-bold text-slate-700">Nombre</label><input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Tu nombre" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#285896] focus:ring-2 focus:ring-[#dce9f8]" /></div><div><label className="block text-xs font-bold text-slate-700">Teléfono</label><input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="Tu teléfono" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#285896] focus:ring-2 focus:ring-[#dce9f8]" /></div><div><label className="block text-xs font-bold text-slate-700">Email</label><input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="tu@email.com" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#285896] focus:ring-2 focus:ring-[#dce9f8]" /></div></div><label className="mt-4 block text-xs font-bold text-slate-700">¿Qué necesitas resolver?</label><textarea value={serviceDetails} onChange={(event) => setServiceDetails(event.target.value)} placeholder="Describe brevemente el trabajo..." rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#285896] focus:ring-2 focus:ring-[#dce9f8]" /><div className="mt-4 rounded-xl border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Presupuesto inicial</span><span className="text-sm font-bold text-[#163d75]">{priceMode === 'fixed' ? `$${Number(selectedService.Price).toFixed(0)}` : 'A confirmar'}</span></div><div className="grid grid-cols-2 gap-2"><button onClick={() => setPriceMode('fixed')} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${priceMode === 'fixed' ? 'border-[#285896] bg-[#eaf1fb] text-[#285896]' : 'border-slate-200 text-slate-500'}`}>Precio fijo</button><button onClick={() => setPriceMode('quote')} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${priceMode === 'quote' ? 'border-[#285896] bg-[#eaf1fb] text-[#285896]' : 'border-slate-200 text-slate-500'}`}>Solicitar cotización</button></div></div>{serviceError && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{serviceError}</div>}<div className="mt-5 flex gap-2"><button onClick={() => setShowRequest(false)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button onClick={requestService} className="flex-1 rounded-xl bg-[#163d75] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102f5c]">Enviar solicitud</button></div><div className="mt-3"><button onClick={payWithMercadoPago} className="w-full rounded-xl bg-[#00b1ea] px-4 py-3 text-sm font-bold text-white hover:bg-[#009ad6]">Pagar con Mercado Pago</button></div></div></div>}

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><p>© 2025 ServiciosYa! Servicios simples, personas confiables.</p><div className="flex gap-5"><a href="#privacidad" className="hover:text-[#163d75]">Privacidad</a><a href="#terminos" className="hover:text-[#163d75]">Términos</a><a href="#ayuda" className="hover:text-[#163d75]">Centro de ayuda</a></div></div></footer>
    </main>
    </>
  )
}

export function ProviderDashboardPreview({ onBack }: { onBack: () => void }) {
  const [available, setAvailable] = useState(true)
  const [acceptedRequest, setAcceptedRequest] = useState<string | null>(null)
  const [detailsRequest, setDetailsRequest] = useState<string | null>(null)
  const [showServiceEditor, setShowServiceEditor] = useState(false)
  const [servicePrice, setServicePrice] = useState('180')
  const [serviceDescription, setServiceDescription] = useState('Reparaciones de fugas, instalaciones y mantenimiento de plomería residencial.')
  const [serviceSaved, setServiceSaved] = useState(false)
  const requests = [
    { name: 'María González', service: 'Reparación de fuga', distance: '1.8 km', time: 'Hace 2 min', price: '$180', initials: 'MG', color: 'bg-rose-500' },
    { name: 'Julián Pérez', service: 'Instalación de llave', distance: '2.4 km', time: 'Hace 8 min', price: 'A cotizar', initials: 'JP', color: 'bg-amber-500' },
  ]

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 lg:px-8"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#163d75] text-white"><Wrench size={20} /></div><div><p className="text-[19px] font-bold tracking-tight text-[#163d75]">ServiciosYa<span className="text-[#ec6a38]">!</span></p><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">panel del prestador</p></div></div><div className="flex items-center gap-3"><button aria-label="Notificaciones" className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"><Bell size={19} /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#ec6a38]" /></button><button onClick={onBack} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Volver al inicio</button><div className="flex size-9 items-center justify-center rounded-full bg-[#e8eff8] text-xs font-bold text-[#163d75]">CM</div></div></div></header>
      <section className="mx-auto max-w-[1320px] px-5 pb-12 pt-9 lg:px-8"><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ec6a38]">Buenos días, Carlos</p><h1 className="text-3xl font-bold tracking-[-0.035em] text-[#172b4d]">Tu actividad de hoy</h1><p className="mt-2 text-sm text-slate-500">Gestiona solicitudes, disponibilidad y tus servicios en un solo lugar.</p></div><button onClick={() => setShowServiceEditor(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[#163d75] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#102f5c]"><Sparkles size={16} /> Editar mi servicio</button></div><div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Solicitudes nuevas</p><p className="mt-2 text-2xl font-bold text-[#163d75]">5</p><p className="mt-1 text-xs font-semibold text-emerald-600">+2 desde ayer</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Servicios completados</p><p className="mt-2 text-2xl font-bold text-[#163d75]">28</p><p className="mt-1 text-xs text-slate-400">Este mes</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Calificación</p><p className="mt-2 flex items-center gap-1 text-2xl font-bold text-[#163d75]">4.9 <Star size={17} className="text-amber-400" fill="currentColor" /></p><p className="mt-1 text-xs text-slate-400">128 reseñas</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Ingresos del mes</p><p className="mt-2 text-2xl font-bold text-[#163d75]">$4,680</p><p className="mt-1 text-xs font-semibold text-emerald-600">+12.5%</p></div></div><div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#172b4d]">Solicitudes cercanas</h2><p className="mt-1 text-xs text-slate-500">Clientes que buscan tus servicios</p></div><button className="rounded-lg border border-slate-200 p-2 text-slate-500"><Filter size={16} /></button></div><div className="space-y-3">{requests.map((request) => <article key={request.name} className="rounded-xl border border-slate-200 p-4 transition hover:border-[#b9cde7] hover:shadow-sm"><div className="flex gap-3"><div className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${request.color}`}>{request.initials}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-slate-800">{request.service}</h3><p className="mt-0.5 text-xs text-slate-500">{request.name} · {request.time}</p></div><span className="rounded-full bg-[#eaf1fb] px-2.5 py-1 text-xs font-bold text-[#285896]">{request.price}</span></div><div className="mt-3 flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin size={13} /> {request.distance}</span><span className="flex items-center gap-1"><Clock3 size={13} /> Disponible ahora</span></div></div></div><div className="mt-4 flex gap-2"><button onClick={() => setDetailsRequest(request.name)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Ver detalles</button><button onClick={() => setAcceptedRequest(request.name)} className="flex-1 rounded-lg bg-[#163d75] px-3 py-2 text-xs font-bold text-white hover:bg-[#102f5c]">{acceptedRequest === request.name ? 'Solicitud aceptada' : 'Aceptar solicitud'}</button></div></article>)}</div></section><div className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#172b4d]">Tu disponibilidad</h2><p className="mt-1 text-xs text-slate-500">Controla cuándo recibir solicitudes</p></div><div className="flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={21} /></div></div><button onClick={() => setAvailable(!available)} className={`mt-5 flex w-full items-center justify-between rounded-xl p-3 text-left transition ${available ? 'bg-emerald-50' : 'bg-slate-100'}`} aria-pressed={available}><div><p className={`text-sm font-bold ${available ? 'text-emerald-800' : 'text-slate-700'}`}>{available ? 'Estás disponible' : 'No disponible'}</p><p className={`mt-0.5 text-xs ${available ? 'text-emerald-700' : 'text-slate-500'}`}>{available ? 'Recibiendo solicitudes cercanas' : 'Pausaste las solicitudes'}</p></div><div className={`h-6 w-11 rounded-full p-1 transition ${available ? 'bg-emerald-500' : 'bg-slate-400'}`}><div className={`size-4 rounded-full bg-white shadow-sm transition ${available ? 'ml-5' : 'ml-0'}`} /></div></button></section><section className="relative min-h-[210px] overflow-hidden rounded-2xl border border-slate-200 bg-[#d9e5ed] p-5"><div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(25deg, transparent 48%, #b7c9d5 49%, #b7c9d5 51%, transparent 52%), linear-gradient(115deg, transparent 46%, #b8cad4 47%, #b8cad4 50%, transparent 51%)', backgroundSize: '180px 150px, 220px 180px' }} /><div className="relative"><h2 className="text-lg font-bold text-[#172b4d]">Tu zona de trabajo</h2><p className="mt-1 max-w-[220px] text-xs text-slate-600">Los clientes podrán encontrarte dentro de un radio de 5 km.</p><button className="mt-5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#285896] shadow-sm">Editar zona</button></div><div className="absolute bottom-4 right-4 flex size-12 items-center justify-center rounded-full bg-white text-[#163d75] shadow-md"><MapPin size={22} fill="currentColor" /></div></section></div></div></section>{showServiceEditor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-5 backdrop-blur-[2px]"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#ec6a38]">Perfil público</p><h2 className="mt-1 text-xl font-bold text-[#172b4d]">Editar mi servicio</h2><p className="mt-1 text-sm text-slate-500">Estos datos los verán los clientes de tu zona.</p></div><button onClick={() => setShowServiceEditor(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar editor"><X size={18} /></button></div><div className="space-y-4"><div><label htmlFor="service-category" className="text-xs font-bold text-slate-700">Servicio principal</label><select id="service-category" defaultValue="Plomería" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#285896] focus:ring-2 focus:ring-[#dce9f8]"><option>Plomería</option><option>Electricidad</option><option>Limpieza</option><option>Cerrajería</option></select></div><div><label htmlFor="service-description" className="text-xs font-bold text-slate-700">Descripción</label><textarea id="service-description" value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#285896] focus:ring-2 focus:ring-[#dce9f8]" /></div><div><label htmlFor="service-price" className="text-xs font-bold text-slate-700">Precio inicial</label><div className="mt-2 flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-[#285896] focus-within:ring-2 focus-within:ring-[#dce9f8]"><span className="text-sm font-bold text-slate-400">$</span><input id="service-price" inputMode="numeric" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} className="w-full border-0 bg-transparent px-2 py-2.5 text-sm outline-none" /></div></div></div><div className="mt-5 flex gap-2"><button onClick={() => setShowServiceEditor(false)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button onClick={() => { setServiceSaved(true); setShowServiceEditor(false) }} className="flex-1 rounded-xl bg-[#163d75] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102f5c]">Guardar cambios</button></div></div></div>}{serviceSaved && <div className="fixed bottom-5 right-5 z-40 flex max-w-sm items-start gap-3 rounded-2xl bg-[#163d75] p-4 text-white shadow-2xl"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#163d75]"><Check size={18} /></div><div><p className="font-bold">Servicio actualizado</p><p className="mt-0.5 text-xs text-blue-100">Tus cambios ya están visibles para los clientes.</p></div><button onClick={() => setServiceSaved(false)} className="ml-2 text-blue-200" aria-label="Cerrar aviso"><X size={16} /></button></div>}{(acceptedRequest || detailsRequest) && <div className="fixed bottom-5 right-5 z-40 flex max-w-sm items-start gap-3 rounded-2xl bg-[#163d75] p-4 text-white shadow-2xl"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#163d75]"><Check size={18} /></div><div><p className="font-bold">{acceptedRequest ? 'Solicitud aceptada' : 'Detalle de solicitud'}</p><p className="mt-0.5 text-xs text-blue-100">{acceptedRequest ? `Le avisamos a ${acceptedRequest} y compartimos tu ubicación.` : `${detailsRequest} está a ${requests.find((request) => request.name === detailsRequest)?.distance}.`}</p></div><button onClick={() => { setAcceptedRequest(null); setDetailsRequest(null) }} className="ml-2 text-blue-200" aria-label="Cerrar"><X size={16} /></button></div>}</main>)
}

export const unusedIcons = { Menu, Filter, Clock3, Home, MessageCircle }

function _keepTypeReferences() { return unusedIcons }
void _keepTypeReferences

export default ServiceMarketplace
