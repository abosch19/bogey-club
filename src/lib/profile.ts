export type ProfileEditForm = {
  name: string
  last_name: string
}

export type ProfileEditValue = {
  name: string
  last_name?: string
}

export type ProfileEditResult = { ok: true; value: ProfileEditValue } | { ok: false; error: string }
export type ProfileEditBackAction = { type: 'back' } | { type: 'route'; to: '/profile' }
export type AvatarFileLike = { type: string; size: number }
export type AvatarFileValidation = { ok: true } | { ok: false; error: string }
export type ProfileIdentity = { name: string; last_name?: string }

const MAX_AVATAR_BYTES = 5_000_000
const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function parseProfileEditForm(form: ProfileEditForm): ProfileEditResult {
  const name = form.name.trim()
  const lastName = form.last_name.trim()

  if (!name) return { ok: false, error: 'Introduce tu nombre.' }

  return {
    ok: true,
    value: {
      name,
      last_name: lastName || undefined,
    },
  }
}

export function getProfileEditBackAction(fromPath: string | null | undefined): ProfileEditBackAction {
  return fromPath === '/profile' ? { type: 'back' } : { type: 'route', to: '/profile' }
}

export function validateAvatarFile(file: AvatarFileLike): AvatarFileValidation {
  if (!AVATAR_MIME_TYPES.has(file.type)) return { ok: false, error: 'Elige una imagen JPG, PNG o WebP.' }
  if (file.size > MAX_AVATAR_BYTES) return { ok: false, error: 'La imagen debe pesar 5 MB o menos.' }
  return { ok: true }
}

export function profileToEditForm(profile: ProfileIdentity): ProfileEditForm {
  return {
    name: profile.name,
    last_name: profile.last_name ?? '',
  }
}
