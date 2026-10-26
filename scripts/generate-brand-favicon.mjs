import { createRequire } from 'node:module'
import { readFile, writeFile, copyFile, mkdir, access } from 'node:fs/promises'

const sharp = createRequire(import.meta.resolve('@nuxt/image'))('sharp')
const source = await readFile('public/ajksolutions-official.png')
const sizes = [16, 32, 48, 64, 256]
const frames = await Promise.all(
  sizes.map((size) =>
    sharp(source)
      .flatten({ background: '#fff' })
      .resize(size, size, {
        fit: 'contain',
        background: '#fff'
      })
      .ensureAlpha()
      .png()
      .toBuffer()
  )
)
const header = Buffer.alloc(6 + sizes.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = header.length
for (const [index, size] of sizes.entries()) {
  const at = 6 + index * 16
  header[at] = size === 256 ? 0 : size
  header[at + 1] = size === 256 ? 0 : size
  header.writeUInt16LE(1, at + 4)
  header.writeUInt16LE(32, at + 6)
  header.writeUInt32LE(frames[index].length, at + 8)
  header.writeUInt32LE(offset, at + 12)
  offset += frames[index].length
}
const ico = Buffer.concat([header, ...frames])
const png = frames[sizes.indexOf(64)]
if (process.argv.includes('--check')) {
  if (
    !(await readFile('public/favicon.ico')).equals(ico) ||
    !(await readFile('public/favicon.png')).equals(png)
  )
    throw new Error('Favicons do not match the official logo; regenerate them')
  console.log('PASS: ICO and PNG match the official logo')
} else {
  await mkdir('logs/hero-fit', { recursive: true })
  try {
    await access('logs/hero-fit/previous-favicon.ico')
  } catch {
    await copyFile('public/favicon.ico', 'logs/hero-fit/previous-favicon.ico')
  }
  await writeFile('public/favicon.ico', ico)
  await writeFile('public/favicon.png', png)
  console.log(
    JSON.stringify({ source: 'ajksolutions-official.png', sizes, icoBytes: ico.length, pngBytes: png.length })
  )
}
