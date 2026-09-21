'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName || !trimmedEmail || !password.trim()) {
      setError('Completa todos los campos.')
      return
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: 'provider',
      }),
    })

    const data = await response.json().catch(() => ({ error: 'No se pudo registrar el usuario.' }))

    if (!response.ok) {
      setError(data.error || 'No se pudo registrar el usuario.')
      return
    }

    setSuccess('Usuario creado correctamente.')
    setName('')
    setEmail('')
    setPassword('')

    setTimeout(() => {
      router.push('/login')
    }, 800)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f1f6ff,_#edf2f7_35%,_#e8edf5_100%)] p-6">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        
        {/* Encabezado azul centrado con el logo */}
        <div className="bg-[#163d75] px-8 pb-10 pt-8 text-white flex flex-col items-center text-center">
          <img 
            src="/logo-serviciosya.png" 
            alt="ServiciosYa Logo" 
            className="mb-4 h-12 w-auto object-contain"
          />
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Crear cuenta</h1>
          <p className="mt-2 text-sm text-blue-100">Regístrate para publicar y gestionar tus servicios</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-[#285896] focus:bg-white focus:ring-2 focus:ring-[#dce9f8]"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-[#285896] focus:bg-white focus:ring-2 focus:ring-[#dce9f8]"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-[#285896] focus:bg-white focus:ring-2 focus:ring-[#dce9f8]"
                placeholder="••••••"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-[#163d75] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#102f5c]"
            >
              Registrarme
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-3 text-sm text-slate-500">
            <span>¿Ya tienes cuenta?</span>
            <Link href="/login" className="font-semibold text-[#285896] transition hover:text-[#163d75]">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
