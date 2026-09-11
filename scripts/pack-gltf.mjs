import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

function align4(value) {
  return (value + 3) & ~3
}

function appendAligned(chunks, buffer) {
  const currentSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const padding = align4(currentSize) - currentSize
  if (padding > 0) chunks.push(Buffer.alloc(padding))
  const offset = currentSize + padding
  chunks.push(buffer)
  return offset
}

function resolveAsset(baseDir, uri) {
  return path.resolve(baseDir, decodeURIComponent(uri))
}

function packGltf(inputPath, outputPath) {
  const baseDir = path.dirname(inputPath)
  const gltf = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const binaryChunks = []
  const bufferBaseOffsets = []

  for (const buffer of gltf.buffers ?? []) {
    if (!buffer.uri || buffer.uri.startsWith('data:')) {
      throw new Error('Only glTF files with external binary buffers are supported by this helper.')
    }

    const source = fs.readFileSync(resolveAsset(baseDir, buffer.uri))
    const offset = appendAligned(binaryChunks, source)
    bufferBaseOffsets.push(offset)
  }

  for (const view of gltf.bufferViews ?? []) {
    const sourceBufferIndex = view.buffer ?? 0
    view.byteOffset = (view.byteOffset ?? 0) + bufferBaseOffsets[sourceBufferIndex]
    view.buffer = 0
  }

  for (const image of gltf.images ?? []) {
    if (!image.uri || image.uri.startsWith('data:')) continue

    const imagePath = resolveAsset(baseDir, image.uri)
    const imageBuffer = fs.readFileSync(imagePath)
    const offset = appendAligned(binaryChunks, imageBuffer)
    const extension = path.extname(imagePath).toLowerCase()
    const viewIndex = gltf.bufferViews?.length ?? 0

    gltf.bufferViews ??= []
    gltf.bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: imageBuffer.length,
    })

    delete image.uri
    image.bufferView = viewIndex
    image.mimeType = MIME_BY_EXT[extension] ?? 'application/octet-stream'
  }

  const binary = Buffer.concat(binaryChunks)
  gltf.buffers = [{ byteLength: binary.length }]

  const jsonRaw = Buffer.from(JSON.stringify(gltf), 'utf8')
  const jsonLength = align4(jsonRaw.length)
  const jsonChunk = Buffer.alloc(jsonLength, 0x20)
  jsonRaw.copy(jsonChunk)

  const binaryLength = align4(binary.length)
  const binaryChunk = Buffer.alloc(binaryLength)
  binary.copy(binaryChunk)

  const totalLength = 12 + 8 + jsonChunk.length + 8 + binaryChunk.length
  const output = Buffer.alloc(totalLength)

  output.write('glTF', 0, 4, 'ascii')
  output.writeUInt32LE(2, 4)
  output.writeUInt32LE(totalLength, 8)

  let cursor = 12
  output.writeUInt32LE(jsonChunk.length, cursor)
  output.write('JSON', cursor + 4, 4, 'ascii')
  jsonChunk.copy(output, cursor + 8)
  cursor += 8 + jsonChunk.length

  output.writeUInt32LE(binaryChunk.length, cursor)
  output.write('BIN\0', cursor + 4, 4, 'binary')
  binaryChunk.copy(output, cursor + 8)

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
  console.log(`Packed ${path.relative(process.cwd(), inputPath)} -> ${path.relative(process.cwd(), outputPath)} (${(output.length / 1024 / 1024).toFixed(2)} MB)`)
}

const [, , inputArg, outputArg] = process.argv
if (!inputArg || !outputArg) {
  console.error('Usage: node scripts/pack-gltf.mjs <scene.gltf> <output.glb>')
  process.exit(1)
}

packGltf(path.resolve(inputArg), path.resolve(outputArg))
