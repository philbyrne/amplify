// Run with: node generate-icons.js
// Requires: npm install canvas
// Or open generate-icons.html in Chrome and click "Download All"
// This script generates the PNG icons needed for the extension.

const { createCanvas } = require('canvas')
const fs = require('fs')

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0d1117'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.2)
  ctx.fill()

  // Lightning bolt path (scaled)
  const s = size / 128
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(72 * s, 8 * s)
  ctx.lineTo(32 * s, 68 * s)
  ctx.lineTo(60 * s, 68 * s)
  ctx.lineTo(40 * s, 120 * s)
  ctx.lineTo(96 * s, 52 * s)
  ctx.lineTo(68 * s, 52 * s)
  ctx.closePath()
  ctx.fill()

  return canvas.toBuffer('image/png')
}

for (const size of [16, 48, 128]) {
  fs.writeFileSync(`icons/icon${size}.png`, drawIcon(size))
  console.log(`icons/icon${size}.png written`)
}
console.log('Done.')
