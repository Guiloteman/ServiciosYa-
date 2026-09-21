'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail || !password.trim()) {
      setError('Ingresa tu email y contraseña.')
      return
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, password }),
    })

    const data = await response.json().catch(() => ({ error: 'No pudimos iniciar sesión.' }))

    if (!response.ok) {
      setError(data.error || 'No pudimos iniciar sesión.')
      return
    }

    const role = data.user?.role === 'provider' ? 'provider' : 'client'
    router.push(role === 'provider' ? '/proveedor' : '/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f1f6ff,_#edf2f7_35%,_#e8edf5_100%)] p-6">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        
        {/* Encabezado azul centrado */}
        <div className="bg-[#163d75] px-8 pb-10 pt-8 text-white flex flex-col items-center text-center">
          <img 
            src="/logo-serviciosya.png" 
            alt="ServiciosYa Logo" 
            className="mb-4 h-12 w-auto object-contain"
          />
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-blue-100">Accede a tu cuenta para continuar</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <button
              type="submit"
              className="w-full rounded-xl bg-[#163d75] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#102f5c]"
            >
              Entrar
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-3 text-sm text-slate-500">
            <span>¿No tienes cuenta?</span>
            <Link href="/register" className="font-semibold text-[#285896] transition hover:text-[#163d75]">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
