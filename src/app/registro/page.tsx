import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthActions } from '@convex-dev/auth/react'

function LogoPin() {
  return (
    <div className="flex flex-col items-center mb-10">
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none" className="mb-3">
        <circle cx="32" cy="32" r="30" fill="#9bc9a3"/>
        <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/>
        <circle cx="24" cy="50" r="2.6" fill="#0e1a16"/>
      </svg>
      <div className="text-[22px] font-black tracking-tight text-[#0e1a16]">
        Bogey<span className="text-[#1f8a5b]">-Club</span>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn } = useAuthActions()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres.'); return }
    setLoading(true)
    setError('')

    try {
      await signIn('password', { email, password, name, flow: 'signUp' })
      window.location.href = '/onboarding'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center px-[14px]">
      <div className="w-full max-w-[400px]">
        <LogoPin />

        <div className="bg-white rounded-[22px] border border-[#e5e0d4] px-6 py-7">
          <h1 className="text-[20px] font-bold text-[#0e1a16] mb-6 text-center">
            Crea tu cuenta
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#6b7a72] mb-1.5 uppercase tracking-wide">
                Nombre
              </label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                required placeholder="Tu nombre o apodo"
                className="w-full border border-[#e5e0d4] rounded-[14px] px-4 py-3 text-[14px] text-[#0e1a16] bg-white placeholder-[#c4bfb5] focus:outline-none focus:border-[#1f8a5b] focus:ring-2 focus:ring-[#1f8a5b]/20 transition"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#6b7a72] mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="tu@email.com"
                className="w-full border border-[#e5e0d4] rounded-[14px] px-4 py-3 text-[14px] text-[#0e1a16] bg-white placeholder-[#c4bfb5] focus:outline-none focus:border-[#1f8a5b] focus:ring-2 focus:ring-[#1f8a5b]/20 transition"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#6b7a72] mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="Mínimo 6 caracteres"
                className="w-full border border-[#e5e0d4] rounded-[14px] px-4 py-3 text-[14px] text-[#0e1a16] bg-white placeholder-[#c4bfb5] focus:outline-none focus:border-[#1f8a5b] focus:ring-2 focus:ring-[#1f8a5b]/20 transition"
              />
            </div>

            {error && (
              <p className="text-[13px] text-[#c6432d] bg-[#fadcd6] border border-[#f0bab0] rounded-[10px] px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-[14px] font-semibold text-[15px] text-white mt-2 transition active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: '#1f8a5b' }}
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-[#6b7a72] mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#1f8a5b] font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
