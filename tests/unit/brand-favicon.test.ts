import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.resolve('@nuxt/image'))('sharp')
describe('Favicon oficial AJKSolutionS', () => {
  it('publica el logo oficial completo en PNG de 64 px sin deformarlo', async () => {
    const source = await readFile('public/ajksolutions-official.png')
    const expected = await sharp(source)
      .flatten({ background: '#fff' })
      .resize(64, 64, {
        fit: 'contain',
        background: '#fff'
      })
      .ensureAlpha()
      .png()
      .toBuffer()
    expect((await readFile('public/favicon.png')).equals(expected)).toBe(true)
  })
  it('incluye cinco tamaños PNG válidos en el contenedor ICO', async () => {
    const ico = await readFile('public/favicon.ico')
    expect(ico.readUInt16LE(0)).toBe(0)
    expect(ico.readUInt16LE(2)).toBe(1)
    expect(ico.readUInt16LE(4)).toBe(5)
    for (const [index, size] of [16, 32, 48, 64, 256].entries()) {
      const at = 6 + index * 16
      expect(ico[at] || 256).toBe(size)
      expect(ico[at + 1] || 256).toBe(size)
      const length = ico.readUInt32LE(at + 8)
      const offset = ico.readUInt32LE(at + 12)
      const frame = ico.subarray(offset, offset + length)
      expect(frame.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(frame.readUInt32BE(16)).toBe(size)
      expect(frame.readUInt32BE(20)).toBe(size)
      if (size === 64) expect(frame.equals(await readFile('public/favicon.png'))).toBe(true)
    }
  })
})
