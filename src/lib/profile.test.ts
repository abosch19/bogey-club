import { describe, expect, it } from 'bun:test'
import { getProfileEditBackAction, parseProfileEditForm, validateAvatarFile } from './profile'

describe('parseProfileEditForm', () => {
  it('trims profile identity fields', () => {
    expect(
      parseProfileEditForm({
        name: '  Alex ',
        last_name: ' Bosch ',
      }),
    ).toEqual({
      ok: true,
      value: {
        name: 'Alex',
        last_name: 'Bosch',
      },
    })
  })

  it('allows an empty last name', () => {
    expect(
      parseProfileEditForm({
        name: 'Alex',
        last_name: '',
      }),
    ).toEqual({
      ok: true,
      value: {
        name: 'Alex',
        last_name: undefined,
      },
    })
  })

  it('rejects missing names', () => {
    expect(
      parseProfileEditForm({
        name: ' ',
        last_name: '',
      }),
    ).toEqual({ ok: false, error: 'Introduce tu nombre.' })
  })
})

describe('getProfileEditBackAction', () => {
  it('goes back when profile edit was opened from the profile page', () => {
    expect(getProfileEditBackAction('/profile')).toEqual({ type: 'back' })
  })

  it('falls back to the profile page when profile edit was opened directly', () => {
    expect(getProfileEditBackAction(null)).toEqual({ type: 'route', to: '/profile' })
  })
})

describe('validateAvatarFile', () => {
  it('accepts common image files below the size limit', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: 1_000_000 })).toEqual({ ok: true })
    expect(validateAvatarFile({ type: 'image/png', size: 2_500_000 })).toEqual({ ok: true })
  })

  it('rejects non-images and files larger than 5 MB', () => {
    expect(validateAvatarFile({ type: 'application/pdf', size: 10_000 })).toEqual({
      ok: false,
      error: 'Elige una imagen JPG, PNG o WebP.',
    })
    expect(validateAvatarFile({ type: 'image/png', size: 5_000_001 })).toEqual({
      ok: false,
      error: 'La imagen debe pesar 5 MB o menos.',
    })
  })
})
