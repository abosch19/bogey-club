import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuthActions } from '@convex-dev/auth/react'

function LogoPin() {
  return (
    <div className="flex flex-col items-center mb-10">
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none" className="mb-3">
        <circle cx="32" cy="32" r="30" fill="#9bc9a3" />
        <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16" />
        <circle cx="24" cy="50" r="2.6" fill="#0e1a16" />
      </svg>
      <div className="text-[22px] font-black tracking-tight text-ink">
        Bogey <span className="text-accent">Club</span>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  const [form, setForm] = useState({ name: '', last_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuthActions()
  const navigate = useNavigate()

  const { name, last_name, email, password } = form

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    setError('')

    try {
      await signIn('password', { email, password, name, last_name, flow: 'signUp' })
      navigate('/onboarding', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (/invalid password/i.test(msg)) {
        setError('La contraseña debe tener al menos 8 caracteres.')
      } else if (/already|exists|in use/i.test(msg)) {
        setError('Ya existe una cuenta con ese email. Inicia sesión.')
      } else {
        setError('No se pudo crear la cuenta. Inténtalo de nuevo.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-[14px]">
      <div className="w-full max-w-[400px]">
        <LogoPin />

        <div className="bg-white rounded-card border border-rule px-6 py-7">
          <h1 className="text-[20px] font-bold text-ink mb-6 text-center">Crea tu cuenta</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="register-name"
                className="block text-[12px] font-semibold text-mute mb-1.5 uppercase tracking-wide"
              >
                Nombre
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="Tu nombre o apodo"
                className="w-full border border-rule rounded-btn px-4 py-3 text-[14px] text-ink bg-white placeholder-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div>
              <label
                htmlFor="register-last-name"
                className="block text-[12px] font-semibold text-mute mb-1.5 uppercase tracking-wide"
              >
                Apellidos
              </label>
              <input
                id="register-last-name"
                type="text"
                value={last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                placeholder="Tus apellidos (opcional)"
                className="w-full border border-rule rounded-btn px-4 py-3 text-[14px] text-ink bg-white placeholder-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-[12px] font-semibold text-mute mb-1.5 uppercase tracking-wide"
              >
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                placeholder="tu@email.com"
                className="w-full border border-rule rounded-btn px-4 py-3 text-[14px] text-ink bg-white placeholder-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-[12px] font-semibold text-mute mb-1.5 uppercase tracking-wide"
              >
                Contraseña
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-rule rounded-btn px-4 py-3 text-[14px] text-ink bg-white placeholder-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
              <p className="text-[11px] text-mute mt-1.5">Al menos 8 caracteres.</p>
            </div>

            {error && (
              <p className="text-[13px] text-red bg-red-light border border-[#f0bab0] rounded-[10px] px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-btn font-semibold text-[15px] text-white mt-2 transition active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: '#1f8a5b' }}
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-mute mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
