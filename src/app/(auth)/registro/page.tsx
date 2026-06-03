'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LogoPin() {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="w-16 h-16 rounded-full bg-[#1f8a5b] flex items-center justify-center mb-4 shadow-md">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="13" r="5" fill="white" />
          <path d="M16 18 L16 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-2xl font-black tracking-tight text-[#0e1a16]">
        bogey<span className="text-[#1f8a5b]">club</span>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center px-4">
      <div className="w-full max-w-[430px]">
        <LogoPin />

        <div className="bg-white rounded-[20px] shadow-sm border border-[#e5e0d4] px-8 py-8">
          <h1 className="text-xl font-bold text-[#0e1a16] mb-6 text-center">
            Crea tu cuenta
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#4a5568] mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Tu nombre"
                className="w-full border border-[#e5e0d4] rounded-[14px] px-4 py-3 text-[#0e1a16] bg-white placeholder-[#a0aec0] focus:outline-none focus:border-[#1f8a5b] focus:ring-2 focus:ring-[#1f8a5b]/20 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4a5568] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full border border-[#e5e0d4] rounded-[14px] px-4 py-3 text-[#0e1a16] bg-white placeholder-[#a0aec0] focus:outline-none focus:border-[#1f8a5b] focus:ring-2 focus:ring-[#1f8a5b]/20 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4a5568] mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-[#e5e0d4] rounded-[14px] px-4 py-3 text-[#0e1a16] bg-white placeholder-[#a0aec0] focus:outline-none focus:border-[#1f8a5b] focus:ring-2 focus:ring-[#1f8a5b]/20 transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1f8a5b] text-white font-semibold py-3.5 rounded-[14px] mt-2 hover:bg-[#186f4a] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6b7280] mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#1f8a5b] font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
