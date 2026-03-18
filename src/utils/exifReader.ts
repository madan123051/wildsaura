/**
 * Robust EXIF reader for JPEG files — extracts camera & lens data.
 * No external dependencies. Works with DSLR, mirrorless, and phone JPEGs.
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

// EXIF tag IDs we care about
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

function readU16(v: DataView, o: number, le: boolean): number { return v.getUint16(o, le); }
function readU32(v: DataView, o: number, le: boolean): number { return v.getUint32(o, le); }

function readTagValue(view: DataView, tiffStart: number, entry: number, le: boolean): string | number | null {
  const type = readU16(view, entry + 2, le);
  const count = readU32(view, entry + 4, le);
  const valOff = entry + 8;

  try {
    switch (type) {
      case 2: { // ASCII
        const bytes = count;
        const ptr = bytes > 4 ? tiffStart + readU32(view, valOff, le) : valOff;
        if (ptr < 0 || ptr + bytes > view.byteLength) return null;
        let s = '';
        for (let i = 0; i < bytes - 1; i++) {
          const c = view.getUint8(ptr + i);
          if (c === 0) break;
          s += String.fromCharCode(c);
        }
        return s.trim();
      }
      case 3: return readU16(view, valOff, le); // SHORT
      case 4: return readU32(view, valOff, le); // LONG
      case 5: { // RATIONAL
        const p = tiffStart + readU32(view, valOff, le);
        if (p < 0 || p + 8 > view.byteLength) return null;
        const num = readU32(view, p, le);
        const den = readU32(view, p + 4, le);
        return den ? num / den : 0;
      }
      case 9: return view.getInt32(valOff, le); // SLONG
      case 10: { // SRATIONAL
        const p2 = tiffStart + readU32(view, valOff, le);
        if (p2 < 0 || p2 + 8 > view.byteLength) return null;
        return view.getInt32(p2 + 4, le) ? view.getInt32(p2, le) / view.getInt32(p2 + 4, le) : 0;
      }
      default: return null;
    }
  } catch { return null; }
}

function parseIFD(view: DataView, tiffStart: number, ifdOff: number, le: boolean): Record<string, string | number> {
  const r: Record<string, string | number> = {};
  try {
    if (ifdOff < 0 || ifdOff + 2 > view.byteLength) return r;
    const n = readU16(view, ifdOff, le);
    if (n > 500) return r;
    for (let i = 0; i < n; i++) {
      const e = ifdOff + 2 + i * 12;
      if (e + 12 > view.byteLength) break;
      const tag = readU16(view, e, le);
      const name = TAGS[tag];
      if (name) {
        const val = readTagValue(view, tiffStart, e, le);
        if (val !== null) r[name] = val;
      }
    }
  } catch (err) { console.warn('📷 EXIF IFD parse error:', err); }
  return r;
}

function fmtShutter(v: number): string { return v >= 1 ? `${v}s` : `1/${Math.round(1 / v)}s`; }
function fmtAperture(v: number): string { return `f/${v % 1 === 0 ? v : v.toFixed(1)}`; }

/**
 * Extract EXIF data from a File object.
 * Works with JPEG photos from DSLR, mirrorless, and phone cameras.
 */
export async function readExifFromFile(file: File): Promise<ExifData> {
  const empty: ExifData = {};
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  console.log(`📷 EXIF: Reading "${file.name}" (${type}, ${(file.size / 1024).toFixed(0)}KB)`);

  const isJpeg = type === 'image/jpeg' || type === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
  if (!isJpeg) {
    console.log('📷 EXIF: Not JPEG — EXIF extraction only works with .jpg/.jpeg files');
    return empty;
  }

  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);

    if (view.byteLength < 10 || view.getUint8(0) !== 0xFF || view.getUint8(1) !== 0xD8) {
      console.log('📷 EXIF: Invalid JPEG (missing SOI marker FF D8)');
      return empty;
    }

    // Scan for APP1 (0xFFE1) marker
    let off = 2;
    let found = false;
    const limit = Math.min(view.byteLength - 4, 131072); // search first 128KB

    while (off < limit) {
      if (view.getUint8(off) !== 0xFF) { off++; continue; }
      const mt = view.getUint8(off + 1);
      if (mt === 0xFF) { off++; continue; }   // padding
      if (mt === 0xDA) break;                   // SOS — stop
      if (mt === 0xE1) { found = true; break; } // APP1!
      // Skip segment
      if (off + 3 < view.byteLength) {
        const sl = view.getUint16(off + 2);
        if (sl < 2) break;
        off += 2 + sl;
      } else break;
    }

    if (!found) {
      console.log('📷 EXIF: No APP1 marker found — photo has no EXIF data (common for screenshots, downloaded images)');
      return empty;
    }

    // Verify "Exif\0\0" header
    const d = off + 4;
    if (d + 10 > view.byteLength) return empty;
    const hdr = String.fromCharCode(view.getUint8(d), view.getUint8(d+1), view.getUint8(d+2), view.getUint8(d+3));
    if (hdr !== 'Exif') {
      console.log(`📷 EXIF: APP1 header is "${hdr}" not "Exif" — might be XMP data`);
      return empty;
    }

    const tiff = d + 6;
    if (tiff + 8 > view.byteLength) return empty;

    const le = view.getUint16(tiff) === 0x4949;
    if (readU16(view, tiff + 2, le) !== 42) {
      console.log('📷 EXIF: Invalid TIFF magic');
      return empty;
    }

    const ifd0Off = tiff + readU32(view, tiff + 4, le);
    const ifd0 = parseIFD(view, tiff, ifd0Off, le);

    let exifIFD: Record<string, string | number> = {};
    if (ifd0.ExifIFDPointer) {
      exifIFD = parseIFD(view, tiff, tiff + (ifd0.ExifIFDPointer as number), le);
    }

    const m = { ...ifd0, ...exifIFD };
    const result: ExifData = {};

    if (m.Make && m.Model) {
      const model = String(m.Model).trim();
      const make = String(m.Make).trim();
      result.cameraMake = make;
      result.cameraModel = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
    } else if (m.Model) {
      result.cameraModel = String(m.Model).trim();
    }

    if (m.LensModel) result.lens = String(m.LensModel).trim();
    if (typeof m.FNumber === 'number' && m.FNumber > 0) result.aperture = fmtAperture(m.FNumber);
    if (typeof m.ExposureTime === 'number' && m.ExposureTime > 0) result.shutterSpeed = fmtShutter(m.ExposureTime);
    if (m.ISOSpeedRatings !== undefined) result.iso = String(m.ISOSpeedRatings);
    if (typeof m.FocalLength === 'number' && m.FocalLength > 0) {
      result.focalLength = `${Math.round(m.FocalLength)}mm`;
    } else if (m.FocalLengthIn35mmFilm !== undefined) {
      result.focalLength = `${m.FocalLengthIn35mmFilm}mm`;
    }

    const fields = Object.keys(result).filter(k => k !== 'cameraMake').length;
    if (fields > 0) {
      console.log(`📷 EXIF: ✅ Extracted ${fields} fields:`, result);
    } else {
      console.log('📷 EXIF: ⚠️ JPEG has EXIF but no camera data found (may be stripped)');
    }

    return result;
  } catch (err) {
    console.warn('📷 EXIF: Failed:', err);
    return empty;
  }
}
