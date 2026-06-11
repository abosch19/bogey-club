import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(import.meta.dir, 'HoleSheet.tsx'), 'utf8')

describe('HoleSheet avatars', () => {
  it('keeps round player avatar URLs and passes them to Avatar components', () => {
    expect(source).toContain('avatar_url: rp.avatar_url ?? null')

    const avatarTags = source.match(/<Avatar[\s\S]*?\/>/g) ?? []
    expect(avatarTags.length).toBeGreaterThan(0)
    expect(avatarTags.every(tag => tag.includes('src='))).toBe(true)
  })
})
