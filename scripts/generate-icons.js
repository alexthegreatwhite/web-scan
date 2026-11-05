import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  const width = size;
  const height = size;

  // Raw image data with filter byte 0 for each row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Draw a rounded rectangle / square with red background and "PS" white center
      const inCenter = (x >= width * 0.25 && x <= width * 0.75 && y >= width * 0.25 && y <= width * 0.75);

      if (inCenter) {
        rawData[pxOffset] = fgR;
        rawData[pxOffset + 1] = fgG;
        rawData[pxOffset + 2] = fgB;
        rawData[pxOffset + 3] = 255;
      } else {
        rawData[pxOffset] = bgR;
        rawData[pxOffset + 1] = bgG;
        rawData[pxOffset + 2] = bgB;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  // Compress with Deflate
  const compressedData = zlib.deflateSync(rawData);

  // Helper to build a PNG chunk
  function buildChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    const toCrc = Buffer.concat([typeBuf, data]);
    const crc = calcCRC(toCrc);
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Simple CRC32
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  function calcCRC(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // PNG Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = buildChunk('IHDR', ihdr);
  const idatChunk = buildChunk('IDAT', compressedData);
  const iendChunk = buildChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate 192x192 & 512x512 PNGs (Red #dc2626 bg, White fg)
const icon192 = createPNG(192, 220, 38, 38, 255, 255, 255);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);

const icon512 = createPNG(512, 220, 38, 38, 255, 255, 255);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);

console.log('PNG icons created successfully in public/icons/ : icon-192.png, icon-512.png');
