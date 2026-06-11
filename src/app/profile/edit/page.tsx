import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'
import { Avatar } from '@/components/ui/avatar'
import { getProfileEditBackAction, parseProfileEditForm, validateAvatarFile, type ProfileEditForm } from '@/lib/profile'

type FieldProps = {
  id: string
  label: string
  value: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  placeholder?: string
  onChange: (value: string) => void
}

function Field({ id, label, value, type = 'text', inputMode, placeholder, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-semibold text-[#6b7a72] mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-[#e5e0d4] rounded-[16px] px-4 py-3 text-[14px] text-[#0e1a16] bg-white placeholder-[#c4bfb5] focus:outline-none focus:border-[#1f8a5b] focus:ring-2 focus:ring-[#1f8a5b]/20 transition"
      />
    </div>
  )
}

export default function EditProfilePage() {
  const profile = useQuery(api.profiles.me)
  const updateMe = useMutation(api.profiles.updateMe)
  const generateAvatarUploadUrl = useMutation(api.profiles.generateAvatarUploadUrl)
  const updateAvatar = useMutation(api.profiles.updateAvatar)
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState<ProfileEditForm | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    if (!profile || form !== null) return
    setForm({
      name: profile.name,
      last_name: profile.last_name ?? '',
    })
  }, [form, profile])

  if (profile === undefined || profile === null || form === null) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
      </div>
    )
  }

  const fullName = [form.name, form.last_name].filter(Boolean).join(' ') || profile.email || 'Jugador'

  function setField<K extends keyof ProfileEditForm>(key: K, value: ProfileEditForm[K]) {
    setForm(current => (current ? { ...current, [key]: value } : current))
  }

  function handleBack() {
    const from = typeof location.state?.from === 'string' ? location.state.from : null
    const action = getProfileEditBackAction(from)
    if (action.type === 'back') {
      navigate(-1)
      return
    }
    navigate(action.to)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return

    const parsed = parseProfileEditForm(form)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateMe(parsed.value)
      navigate('/profile', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.')
      setSaving(false)
    }
  }

  async function handleAvatarFile(file: File | undefined) {
    if (!file) return

    const validated = validateAvatarFile(file)
    if (!validated.ok) {
      setError(validated.error)
      return
    }

    setUploadingAvatar(true)
    setError('')
    try {
      const uploadUrl = await generateAvatarUploadUrl({})
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('No se pudo subir la imagen.')

      const { storageId } = (await response.json()) as { storageId: Id<'_storage'> }
      await updateAvatar({ avatar_image: storageId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el avatar.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-8">
      <div
        className="sticky top-0 bg-[#f4f1e9]/85 backdrop-blur-md z-40 px-[14px] pb-3 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Volver al perfil"
            className="w-10 h-10 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center active:opacity-70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 18l-6-6 6-6"
                stroke="#0e1a16"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wide text-[#6b7a72]">Carnet</p>
            <h1 className="text-[24px] font-black tracking-tight text-[#0e1a16] leading-none">Editar perfil</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-[14px] pt-4 space-y-3">
        <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar name={fullName} src={profile.avatar_url} size={64} />
              <label
                htmlFor="profile-avatar"
                className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-[#1f8a5b] text-white border-[3px] border-white flex items-center justify-center shadow-[0_4px_12px_rgba(31,138,91,0.35)] active:scale-95 transition"
                aria-label="Cambiar imagen del avatar"
              >
                {uploadingAvatar ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 7h3l1.5-2h7L17 7h3v12H4V7z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </label>
              <input
                id="profile-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingAvatar}
                onChange={event => {
                  const file = event.currentTarget.files?.[0]
                  void handleAvatarFile(file)
                  event.currentTarget.value = ''
                }}
                className="sr-only"
              />
            </div>
            <div>
              <p className="text-[16px] font-black text-[#0e1a16]">{fullName}</p>
              <p className="text-[12px] text-[#6b7a72]">{profile.email}</p>
              <p className="text-[11px] text-[#6b7a72] mt-1">
                {uploadingAvatar ? 'Subiendo imagen...' : 'JPG, PNG o WebP hasta 5 MB'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4 space-y-4">
          <Field
            id="profile-name"
            label="Nombre"
            value={form.name}
            placeholder="Tu nombre o apodo"
            onChange={value => setField('name', value)}
          />
          <Field
            id="profile-last-name"
            label="Apellidos"
            value={form.last_name}
            placeholder="Opcional"
            onChange={value => setField('last_name', value)}
          />
        </div>

        {error && <p className="text-[13px] text-[#c6432d] bg-[#fadcd6] rounded-[12px] px-4 py-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] text-white transition active:scale-[0.98] disabled:opacity-60 btn-glow"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
