/**
 * Minimal EXIF reader for JPEG files — extracts camera & lens data.
 * No external dependencies needed.
 */

export interface ExifData {
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focalLength?: string;
}

// EXIF tag IDs
const TAGS: Record<number, string> = {
  0x010F: 'Make',
  0x0110: 'Model',
  0x829A: 'ExposureTime',
  0x829D: 'FNumber',
  0x8827: 'ISOSpeedRatings',
  0x920A: 'FocalLength',
  0xA434: 'LensModel',
  0xA405: 'FocalLengthIn35mmFilm',
  0x8769: 'ExifIFDPointer',
};

function readUint16(view: DataView, offset: number, le: boolean): number {
  return le ? view.getUint16(offset, true) : view.getUint16(offset, false);
}

function readUint32(view: DataView, offset: number, le: boolean): number {
  return le ? view.getUint32(offset, true) : view.getUint32(offset, false);
}

function readTagValue(view: DataView, tiffStart: number, offset: number, le: boolean): string | number | null {
  const type = readUint16(view, offset + 2, le);
  const count = readUint32(view, offset + 4, le);
  const valueOffset = offset + 8;

  try {
    switch (type) {
      case 2: { // ASCII string
        const strOffset = count > 4 ? tiffStart + readUint32(view, valueOffset, le) : valueOffset;
        let str = '';
        for (let i = 0; i < count - 1; i++) {
          const c = view.getUint8(strOffset + i);
          if (c === 0) break;
          str += String.fromCharCode(c);
        }
        return str.trim();
      }
      case 3: // SHORT
        return readUint16(view, valueOffset, le);
      case 4: // LONG
        return readUint32(view, valueOffset, le);
      case 5: { // RATIONAL (two LONGs: numerator/denominator)
        const ratOffset = tiffStart + readUint32(view, valueOffset, le);
        const num = readUint32(view, ratOffset, le);
        const den = readUint32(view, ratOffset + 4, le);
        return den ? num / den : 0;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function parseIFD(view: DataView, tiffStart: number, ifdOffset: number, le: boolean): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  try {
    const entries = readUint16(view, ifdOffset, le);
    for (let i = 0; i < entries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      const tag = readUint16(view, entryOffset, le);
      const tagName = TAGS[tag];
      if (tagName) {
        const val = readTagValue(view, tiffStart, entryOffset, le);
        if (val !== null) result[tagName] = val;
      }
    }
  } catch { /* silently fail for corrupt data */ }
  return result;
}

function formatShutterSpeed(val: number): string {
  if (val >= 1) return `${val}s`;
  const denom = Math.round(1 / val);
  return `1/${denom}s`;
}

function formatAperture(val: number): string {
  return `f/${val % 1 === 0 ? val : val.toFixed(1)}`;
}

/**
 * Extract EXIF data from a File object. Only works with JPEG files.
 */
export async function readExifFromFile(file: File): Promise<ExifData> {
  const empty: ExifData = {};

  if (!file.type.startsWith('image/jpeg') && !file.name.toLowerCase().match(/\.jpe?g$/)) {
    return empty; // EXIF only in JPEG
  }

  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Check JPEG magic bytes
    if (view.getUint8(0) !== 0xFF || view.getUint8(1) !== 0xD8) return empty;

    // Find APP1 (EXIF) marker
    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) break; // APP1 found
      if ((marker & 0xFF00) !== 0xFF00) return empty; // Not a marker
      const segLen = view.getUint16(offset + 2);
      offset += 2 + segLen;
    }

    if (offset >= view.byteLength - 4) return empty;

    // APP1 header: 0xFFE1 + length + "Exif\0\0"
    const app1Start = offset + 4; // skip marker + length
    const exifHeader = String.fromCharCode(
      view.getUint8(app1Start), view.getUint8(app1Start + 1),
      view.getUint8(app1Start + 2), view.getUint8(app1Start + 3)
    );
    if (exifHeader !== 'Exif') return empty;

    const tiffStart = app1Start + 6; // after "Exif\0\0"
    const byteOrder = view.getUint16(tiffStart);
    const littleEndian = byteOrder === 0x4949; // "II" = little endian, "MM" = big endian

    // First IFD offset
    const ifd0Offset = tiffStart + readUint32(view, tiffStart + 4, littleEndian);

    // Parse IFD0 (camera make/model)
    const ifd0 = parseIFD(view, tiffStart, ifd0Offset, littleEndian);

    // Parse ExifIFD (exposure, ISO, lens, etc.)
    let exifIFD: Record<string, string | number> = {};
    if (ifd0.ExifIFDPointer) {
      const exifOffset = tiffStart + (ifd0.ExifIFDPointer as number);
      exifIFD = parseIFD(view, tiffStart, exifOffset, littleEndian);
    }

    const merged = { ...ifd0, ...exifIFD };

    // Build friendly output
    const result: ExifData = {};

    if (merged.Make && merged.Model) {
      const model = String(merged.Model);
      const make = String(merged.Make);
      // Avoid duplication: "Canon" + "Canon EOS R5" → "Canon EOS R5"
      result.cameraModel = model.startsWith(make) ? model : `${make} ${model}`;
    } else if (merged.Model) {
      result.cameraModel = String(merged.Model);
    }

    if (merged.LensModel) result.lens = String(merged.LensModel);

    if (typeof merged.FNumber === 'number') {
      result.aperture = formatAperture(merged.FNumber);
    }

    if (typeof merged.ExposureTime === 'number') {
      result.shutterSpeed = formatShutterSpeed(merged.ExposureTime);
    }

    if (merged.ISOSpeedRatings !== undefined) {
      result.iso = String(merged.ISOSpeedRatings);
    }

    if (typeof merged.FocalLength === 'number') {
      result.focalLength = `${Math.round(merged.FocalLength)}mm`;
    } else if (merged.FocalLengthIn35mmFilm !== undefined) {
      result.focalLength = `${merged.FocalLengthIn35mmFilm}mm`;
    }

    return result;
  } catch (err) {
    console.warn('EXIF reading failed:', err);
    return empty;
  }
}
