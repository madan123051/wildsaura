import React, { useState, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Image, Plus, Pencil, Trash2, LogOut, Eye, EyeOff, CheckSquare, Check,
  MapPin, Heart, BarChart3, TrendingUp, X, Save, Search, BookOpen,
  Upload, Sparkles, Film, Camera, FileImage, Loader2, Info,
  Settings, Cpu, MessageCircle, Globe, Mail
} from 'lucide-react';
import { Photo, Story, Video, GalleryPhoto, GalleryCategory } from '../types';
import { analyzePhoto, getAnimalInfo } from '../utils/aiService';
import { uploadPhotoToStorage, uploadThumbnailToStorage, addPhotoToFirestore, updatePhotoInFirestore } from '../services/photoService';
import { getAISettings } from '../services/aiSettingsService';
import { AISettingsPanel } from './AISettings';
import { getSiteSettings, saveSiteSettings, uploadHeroImage, uploadDefaultThumbnail, uploadCategoryImage, SiteSettings } from '../services/siteSettingsService';
import { applyWatermark, bakeWatermarkOnFile } from '../utils/watermark';
import { uploadVideoToStorage, uploadVideoThumbnailToStorage } from '../services/videoService';
import { compressImageForAI, compressForUpload, generateThumbnail } from '../utils/imageCompressor';
import { readExifFromFile } from '../utils/exifReader';
import { subscribeToContactMessages, deleteContactMessage, ContactMessage } from '../services/contactService';
import { addGalleryPhotoToFirestore, deleteGalleryPhoto, subscribeToGalleryPhotos, uploadGalleryBlobToStorage, updateGalleryPhotoTitle } from '../services/galleryService';



type AdminView = 'dashboard' | 'photos' | 'add' | 'gallery' | 'stories' | 'add-story' | 'videos' | 'add-video' | 'comments' | 'messages' | 'ai-settings' | 'site-settings';

interface AdminDashboardProps {
  logoUrl?: string;
  photos: Photo[];
  onAddPhoto: (photo: Photo) => void;
  onUpdatePhoto: (photo: Photo) => void;
  onDeletePhoto: (id: number) => void;
  onLogout: () => void;
  onViewSite: () => void;
  stories: Story[];
  onAddStory: (story: Story) => void;
  onDeleteStory: (id: number) => void;
  onUpdateStory: (story: Story) => void;
  videos: Video[];
  onAddVideo: (video: Video) => void;
  onDeleteVideo: (id: number) => void;
  onUpdateVideo: (video: Video) => void;
  allComments?: any[];
  onDeleteComment?: (commentId: string) => void;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.15)',
  borderRadius: '8px', color: 'var(--wa-light)', fontSize: '0.85rem',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'rgba(235,230,220,0.5)',
  marginBottom: '0.35rem', letterSpacing: '0.05em',
};

// ── AI Auto-Fill Logic ─────────────────────────────────────────────────────────
const WILDLIFE_KEYWORDS = ['tiger', 'lion', 'elephant', 'bird', 'eagle', 'deer', 'monkey', 'rhino', 'leopard', 'bear', 'fox', 'wolf', 'snake', 'crocodile', 'whale', 'dolphin', 'owl', 'parrot', 'peacock', 'butterfly', 'macaque', 'gorilla', 'panda', 'zebra', 'giraffe'];
const LANDSCAPE_KEYWORDS = ['mountain', 'lake', 'ocean', 'river', 'sunset', 'sunrise', 'valley', 'forest', 'desert', 'beach', 'waterfall', 'cliff', 'hill', 'coast', 'island', 'sky', 'cloud', 'sea', 'rock', 'field'];
const STREET_KEYWORDS = ['city', 'street', 'building', 'urban', 'neon', 'night', 'road', 'bridge', 'market', 'alley', 'tokyo', 'new york', 'london', 'rain', 'car', 'bus', 'train'];
const PORTRAIT_KEYWORDS = ['portrait', 'person', 'face', 'model', 'woman', 'man', 'child', 'people', 'smile', 'fashion'];
const NATURE_KEYWORDS = ['nature', 'flower', 'tree', 'plant', 'garden', 'leaf', 'rain', 'waterfall', 'pond', 'butterfly', 'insect', 'mushroom', 'moss', 'fern', 'bloom', 'petal', 'green', 'spring', 'autumn', 'macro'];



function detectCategory(filename: string): Photo['category'] {
  const lower = filename.toLowerCase();
  if (WILDLIFE_KEYWORDS.some(k => lower.includes(k))) return 'wildlife';
  if (LANDSCAPE_KEYWORDS.some(k => lower.includes(k))) return 'landscape';
  if (STREET_KEYWORDS.some(k => lower.includes(k))) return 'street';
  if (NATURE_KEYWORDS.some(k => lower.includes(k))) return 'nature';
  if (PORTRAIT_KEYWORDS.some(k => lower.includes(k))) return 'other';
  return 'wildlife'; // default
}



// ── File Upload Drop Zone ──────────────────────────────────────────────────────
interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  previewUrl: string | null;
  uploading: boolean;
  accept?: string;
  label?: string;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelected, previewUrl, uploading, accept = 'image/*,video/*', label = 'Upload Photo or Video' }) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  return (
    <div>
      <label style={labelStyle}>{label} *</label>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${dragOver ? 'var(--wa-gold)' : 'rgba(201,168,76,0.2)'}`,
          borderRadius: '12px',
          padding: previewUrl ? '0' : '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(201,168,76,0.05)' : 'rgba(0,0,0,0.2)',
          transition: 'all 0.3s',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', zIndex: 2, borderRadius: '10px',
          }}>
            <Loader2 size={32} style={{ color: 'var(--wa-gold)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--wa-gold)', marginLeft: '0.75rem', fontSize: '0.85rem' }}>Uploading...</span>
          </div>
        )}
        {previewUrl ? (
          <div style={{ position: 'relative' }}>
            {previewUrl.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={previewUrl} style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
            ) : (
              <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
            )}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.75rem',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}>
              <Upload size={14} style={{ color: 'var(--wa-gold)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--wa-gold)' }}>Click or drag to replace</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={28} style={{ color: 'var(--wa-gold)' }} />
            </div>
            <div>
              <p style={{ color: 'var(--wa-light)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Drag & drop or click to upload
              </p>
              <p style={{ color: 'rgba(235,230,220,0.4)', fontSize: '0.75rem' }}>
                JPG, PNG, WebP, MP4, MOV supported
              </p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </div>
    </div>
  );
};

// ── Stats Cards ──────────────────────────────────────────────────────────────
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)',
    borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: color === 'blue' ? 'rgba(59,130,246,0.15)' :
        color === 'red' ? 'rgba(239,68,68,0.15)' :
        color === 'green' ? 'rgba(34,197,94,0.15)' : 'rgba(201,168,76,0.15)',
      color: color === 'blue' ? '#60a5fa' :
        color === 'red' ? '#f87171' :
        color === 'green' ? '#4ade80' : 'var(--wa-gold)',
    }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--wa-light)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)', marginTop: '0.25rem' }}>{label}</p>
    </div>
  </div>
);

// ── Photo Form with Upload + AI ─────────────────────────────────────────────
interface PhotoFormProps {
  initial?: Photo;
  onSave: (data: Photo) => void;
  onCancel: () => void;
  nextId: number;
}

const PhotoForm: React.FC<PhotoFormProps> = ({ initial, onSave, onCancel, nextId }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState<Photo['category']>(initial?.category || 'wildlife');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [caption, setCaption] = useState(initial?.caption || '');
  const [cameraModel, setCameraModel] = useState(initial?.cameraModel || '');
  const [lens, setLens] = useState(initial?.lens || '');
  const [aperture, setAperture] = useState(initial?.aperture || '');
  const [shutterSpeed, setShutterSpeed] = useState(initial?.shutterSpeed || '');
  const [iso, setIso] = useState(initial?.iso || '');
  const [focalLength, setFocalLength] = useState(initial?.focalLength || '');
  const [uploading, setUploading] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(initial?.imageUrl || null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [tagsInput, setTagsInput] = useState(initial?.tags?.join(', ') || '');
  const [animalName, setAnimalName] = useState(initial?.animalName || '');
  const [photographer, setPhotographer] = useState(initial?.photographer || '');
  const [latitudeStr, setLatitudeStr] = useState<string>(initial?.latitude !== undefined ? String(initial.latitude) : '');
  const [longitudeStr, setLongitudeStr] = useState<string>(initial?.longitude !== undefined ? String(initial.longitude) : '');
  const [wikiSummary, setWikiSummary] = useState(initial?.wikiSummary || '');
  const [aiStatus, setAiStatus] = useState('');
  const [exifStatus, setExifStatus] = useState('');
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [compressionStats, setCompressionStats] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelected = useCallback(async (file: File) => {
    setUploading(true);
    setUploadedFileName(file.name);
    setExifStatus('');
    setOriginalFileSize(file.size);
    setCompressionStats('');

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'photo');

    // Extract EXIF data from JPEG photos (auto-fill camera fields)
    if (!isVideo) {
      try {
        setExifStatus('📷 Reading EXIF data...');
        const exif = await readExifFromFile(file);
        const fields = [exif.cameraModel, exif.lens, exif.aperture, exif.shutterSpeed, exif.iso, exif.focalLength].filter(Boolean);
        if (fields.length > 0) {
          if (exif.cameraModel) setCameraModel(exif.cameraModel);
          if (exif.lens) setLens(exif.lens);
          if (exif.aperture) setAperture(exif.aperture);
          if (exif.shutterSpeed) setShutterSpeed(exif.shutterSpeed);
          if (exif.iso) setIso(exif.iso);
          if (exif.focalLength) setFocalLength(exif.focalLength);
          setExifStatus(`✅ EXIF: ${exif.cameraModel || 'Camera'} — ${fields.length} fields auto-filled`);
        } else {
          setExifStatus('⚠️ No EXIF data found (only JPEG from cameras have EXIF)');
        }
        console.log('📷 EXIF data extracted:', exif);
      } catch (err) {
        setExifStatus('❌ EXIF read failed');
        console.warn('EXIF extraction failed:', err);
      }
    }

    // Read as data URL for preview
    const reader = new FileReader();
    reader.onload = async () => {
      let dataUrl = reader.result as string;

      // Smart compression: WebP, adaptive quality, targets 1-2MB max
      // Also generates a small thumbnail for fast gallery loading
      if (!isVideo) {
        try {
          const webpFile = await compressForUpload(file);
          setCompressedFile(webpFile);

          // Generate thumbnail for gallery (600px, ~150KB WebP)
          try {
            const thumbFile = await generateThumbnail(webpFile);
            setThumbnailFile(thumbFile);
          } catch (thumbErr) {
            console.warn('Thumbnail generation failed:', thumbErr);
            setThumbnailFile(null);
          }

          // Show compression stats
          const origMB = (file.size / 1024 / 1024).toFixed(2);
          const compMB = (webpFile.size / 1024 / 1024).toFixed(2);
          const savedPct = Math.round((1 - webpFile.size / file.size) * 100);
          setCompressionStats(`📸 ${origMB}MB → ${compMB}MB WebP (${savedPct}% saved)`);

          // Convert compressed WebP to data URL for preview & watermark
          dataUrl = await new Promise<string>((res, rej) => {
            const r2 = new FileReader();
            r2.onload = () => res(r2.result as string);
            r2.onerror = rej;
            r2.readAsDataURL(webpFile);
          });
        } catch (compErr) {
          console.warn('Client-side compression failed, using original:', compErr);
          setCompressedFile(null);
          setThumbnailFile(null);
          setCompressionStats('');
        }
      }

      setPreviewDataUrl(dataUrl);
      // Apply watermark
      try {
        const watermarked = await applyWatermark(dataUrl);
        setImageUrl(watermarked);
      } catch {
        setImageUrl(dataUrl);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAiFill = useCallback(async () => {
    setAiGenerating(true);
    setAiStatus('🔍 Analyzing with AI...');
    try {
      if (previewDataUrl && previewDataUrl.startsWith('data:')) {
        // Compress image before AI analysis (max 1024x1024)
        let imageForAI = previewDataUrl;
        try {
          imageForAI = await compressImageForAI(previewDataUrl, 1024, 0.8);
          setAiStatus('📸 Image compressed, analyzing with AI...');
        } catch (err) {
          console.warn('Compression failed, using original:', err);
        }
        // Use AI Vision for real analysis
        const result = await analyzePhoto(imageForAI);
        
        if (result.success) {
          // AI worked! Fill fields
          const analysis = result.data;
          if (analysis.title) setTitle(analysis.title);
          if (analysis.caption) setCaption(analysis.caption);
          setCategory(analysis.category);
          if (analysis.location) setLocation(analysis.location);
          if (analysis.tags?.length) {
            setTags(analysis.tags);
            setTagsInput(analysis.tags.join(', '));
          }
          if (analysis.animalName) setAnimalName(analysis.animalName);

          // Get Wikipedia info for animal
          if (analysis.animalName) {
            setAiStatus(`📚 Looking up ${analysis.animalName} on Wikipedia...`);
            const wikiInfo = await getAnimalInfo(analysis.animalName);
            setWikiSummary(wikiInfo);
          }
          setAiStatus('✅ AI analysis complete!');
        } else {
          // AI failed — show error, only detect category from filename
          setAiStatus(result.error || '⚠️ AI unavailable — please fill fields manually');
          const detectedCat = uploadedFileName ? detectCategory(uploadedFileName) : category;
          setCategory(detectedCat);
          if (result.data?.tags?.length) {
            setTags(result.data.tags);
            setTagsInput(result.data.tags.join(', '));
          }
        }
      } else {
        // No image data — only detect category from filename
        const detectedCat = uploadedFileName ? detectCategory(uploadedFileName) : category;
        setCategory(detectedCat);
        setAiStatus('⚠️ No image data — category detected from filename. Please fill other fields manually.');
      }

      // Camera data now comes from real EXIF extraction (on upload)
      // If no EXIF found, fields stay empty — user can fill manually
    } catch (err) {
      console.warn('AI analysis failed:', err instanceof Error ? err.message : 'unknown');
      setAiStatus('⚠️ AI analysis failed — please fill fields manually.');
      const detectedCat = uploadedFileName ? detectCategory(uploadedFileName) : category;
      setCategory(detectedCat);
    }
    setTimeout(() => setAiStatus(''), 8000);
    setAiGenerating(false);
  }, [previewDataUrl, uploadedFileName, category, title, caption, location, cameraModel, lens, aperture, shutterSpeed, iso, focalLength]);

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;
    setSaving(true);
    const finalTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : tags;
    
    // Parse lat/lng safely - strip any non-numeric chars except dot and minus
    const cleanLat = latitudeStr.replace(/[^0-9.\-]/g, '').trim();
    const cleanLng = longitudeStr.replace(/[^0-9.\-]/g, '').trim();
    const parsedLat = cleanLat ? parseFloat(cleanLat) : NaN;
    const parsedLng = cleanLng ? parseFloat(cleanLng) : NaN;
    const hasValidLat = !isNaN(parsedLat) && isFinite(parsedLat);
    const hasValidLng = !isNaN(parsedLng) && isFinite(parsedLng);
    
    let finalImageUrl = imageUrl;
    let thumbnailUrl = '';
    let firestoreId: string | undefined;
    
    try {
      // Upload to Firebase Storage if it's a data URL
      if (imageUrl.startsWith('data:')) {
        try {
          setUploadProgress(0);
          // Always use File/Blob for resumable upload (never uploadString — it hangs on large files)
          let fileToUpload: File | Blob = compressedFile ??
            await fetch(imageUrl).then(r => r.blob()); // Convert data URL → Blob as fallback
          
          // Bake ©WILDSAURA watermark into image BEFORE uploading
          // This ensures even direct Firebase Storage URL access shows the watermark
          try {
            console.log('🔒 Baking watermark into image before upload...');
            fileToUpload = await bakeWatermarkOnFile(fileToUpload);
          } catch (wmErr) {
            console.warn('🔒 Watermark bake failed, uploading without:', wmErr);
          }
          
          const uploadName = (fileToUpload instanceof File && fileToUpload.name.endsWith('.webp'))
            ? (uploadedFileName || 'photo').replace(/\.[^.]+$/, '') + '.webp'
            : (uploadedFileName || 'photo.jpg');
          console.log(`📤 Uploading ${compressedFile ? 'compressed WebP + watermark' : 'original + watermark'}: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
          finalImageUrl = await uploadPhotoToStorage(fileToUpload, uploadName, (p) => setUploadProgress(p));
        } catch (err: any) {
          console.error('Firebase Storage upload failed:', err);
          alert(`❌ Upload failed: ${err?.message || 'Unknown error'}. Please try again.`);
          setSaving(false);
          setUploadProgress(0);
          return;
        }
      }
      
      // Upload thumbnail alongside main photo (non-blocking — if it fails, no problem)
      if (thumbnailFile) {
        try {
          const thumbName = (uploadedFileName || 'photo').replace(/\.[^.]+$/, '') + '_thumb.webp';
          thumbnailUrl = await uploadThumbnailToStorage(thumbnailFile, thumbName);
          setUploadProgress(95);
        } catch (thumbErr) {
          console.warn('Thumbnail upload failed (non-critical):', thumbErr);
        }
      }

      // Build Firestore data object (never include undefined values)
      const photoData: Record<string, any> = {
        title, caption: caption || '', category, imageUrl: finalImageUrl,
        thumbnailUrl: thumbnailUrl || '',
        location: location || '', tags: finalTags, animalName: animalName || '',
        cameraModel: cameraModel || '', lens: lens || '', aperture: aperture || '',
        shutterSpeed: shutterSpeed || '', iso: iso || '', focalLength: focalLength || '',
        likeCount: initial?.likeCount || 0,
        type: mediaType === 'video' ? 'video' : 'photo',
        photographer: photographer || '',
        published: initial ? (initial.published !== false) : true,
        source: 'wildsaura',  // Tag photos from this app (shared DB with marketplace)
      };
      // Store compression metadata for storage tracking
      if (originalFileSize > 0) photoData.originalSize = originalFileSize;
      if (compressedFile) photoData.compressedSize = compressedFile.size;
      // Only add lat/lng if they are valid finite numbers
      if (hasValidLat) photoData.latitude = parsedLat;
      if (hasValidLng) photoData.longitude = parsedLng;
      
      // Save metadata to Firestore
      try {
        if (initial?.firestoreId) {
          await updatePhotoInFirestore(initial.firestoreId, photoData);
          firestoreId = initial.firestoreId;
        } else {
          const docId = await addPhotoToFirestore(photoData as any);
          firestoreId = docId;
        }
      } catch (err: any) {
        console.error('Firestore save failed:', err);
        alert(`❌ Firestore save failed: ${err?.message || 'Unknown error'}. Image was uploaded but metadata save failed.`);
      }
    } catch (err: any) {
      console.error('Firebase operations failed:', err);
      alert(`❌ Save failed: ${err?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
    
    // Build the photo object for the parent (no undefined values)
    const savedPhoto: any = {
      id: initial?.id || nextId,
      firestoreId,
      title, category, imageUrl: finalImageUrl, thumbnailUrl: thumbnailUrl || '', location, caption,
      type: mediaType === 'video' ? 'video' : 'photo',
      cameraModel, lens, aperture, shutterSpeed, iso, focalLength,
      tags: finalTags, animalName: animalName || '', wikiSummary: wikiSummary || '',
      photographer: photographer || '',
      originalSize: originalFileSize || undefined,
      compressedSize: compressedFile?.size || undefined,
      likeCount: initial?.likeCount || 0, liked: initial?.liked || false,
      published: initial?.published !== false,
    };
    if (hasValidLat) savedPhoto.latitude = parsedLat;
    if (hasValidLng) savedPhoto.longitude = parsedLng;
    
    onSave(savedPhoto);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Upload Zone */}
      <div style={{ marginBottom: '1.5rem' }}>
        <UploadZone
          onFileSelected={handleFileSelected}
          previewUrl={previewDataUrl}
          uploading={uploading}
        />
      </div>

      {/* Compression Stats */}
      {compressionStats && (
        <div style={{
          padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '8px', fontSize: '0.78rem', color: '#4ade80',
          textAlign: 'center', fontWeight: 500,
        }}>
          {compressionStats}
          {thumbnailFile && (
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(34,197,94,0.6)', marginTop: '0.2rem' }}>
              🖼️ Gallery thumbnail: {(thumbnailFile.size / 1024).toFixed(0)}KB WebP
            </span>
          )}
        </div>
      )}

      {/* OR use URL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
        <span style={{ fontSize: '0.7rem', color: 'rgba(235,230,220,0.3)', letterSpacing: '0.1em' }}>OR PASTE URL</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          value={imageUrl.startsWith('./') || imageUrl.startsWith('data:') ? '' : imageUrl}
          onChange={(e) => {
            setImageUrl(e.target.value);
            setPreviewDataUrl(e.target.value || null);
          }}
          placeholder="https://example.com/photo.jpg"
          style={inputStyle}
        />
      </div>

      {/* AI Auto-Fill Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={handleAiFill}
          disabled={aiGenerating}
          style={{
            width: '100%', padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '10px', cursor: aiGenerating ? 'wait' : 'pointer',
            color: 'var(--wa-gold)', fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'all 0.3s',
          }}
          onMouseOver={(e) => { if (!aiGenerating) e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))'; }}
        >
          {aiGenerating ? (
            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {aiStatus || 'AI is analyzing...'}</>
          ) : (
            <><Sparkles size={18} /> 🤖 AI Auto-Fill + Wikipedia</>
          )}
        </button>
        {aiStatus && !aiGenerating && (
          <p style={{ fontSize: '0.75rem', color: 'var(--wa-gold)', textAlign: 'center', marginTop: '0.5rem' }}>{aiStatus}</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Photo title" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Category *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as Photo['category'])} style={inputStyle}>
            <option value="wildlife">Wildlife</option>
            <option value="landscape">Landscape</option>
            <option value="street">Street</option>
            <option value="nature">Nature</option>
            <option value="other">Portrait / Other</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Chitwan, Nepal" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>📸 Photographer Name</label>
          <input value={photographer} onChange={(e) => setPhotographer(e.target.value)} placeholder="e.g. Madan Shrestha" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>📍 Latitude</label>
              <input type="text" inputMode="decimal" value={latitudeStr} onChange={(e) => setLatitudeStr(e.target.value.replace(/[^0-9.\-]/g, ''))} placeholder="e.g. 27.7172" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>📍 Longitude</label>
              <input type="text" inputMode="decimal" value={longitudeStr} onChange={(e) => setLongitudeStr(e.target.value.replace(/[^0-9.\-]/g, ''))} placeholder="e.g. 85.3240" style={inputStyle} />
            </div>
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Caption</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Photo description..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* AI-detected Tags */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Tags (comma separated)</label>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. tiger, wildlife, jungle, golden hour" style={inputStyle} />
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {tags.map((t, i) => (
                <span key={i} style={{
                  padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem',
                  background: 'rgba(201,168,76,0.15)', color: 'var(--wa-gold)',
                  border: '1px solid rgba(201,168,76,0.2)',
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Animal Identification */}
        <div>
          <label style={labelStyle}>Animal / Species Name</label>
          <input value={animalName} onChange={(e) => setAnimalName(e.target.value)} placeholder="e.g. Bengal Tiger" style={inputStyle} />
        </div>

        {/* Wikipedia Summary */}
        {wikiSummary && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Info size={12} /> Wikipedia Info
            </label>
            <div style={{
              padding: '0.75rem', borderRadius: '8px',
              background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
              fontSize: '0.8rem', color: 'rgba(235,230,220,0.7)', lineHeight: 1.5,
            }}>
              {wikiSummary}
            </div>
          </div>
        )}

        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <span className="font-cinzel" style={{ fontSize: '0.7rem', color: 'var(--wa-gold)', letterSpacing: '0.1em' }}>📷 Camera & EXIF Data (auto-filled from photo)</span>
          {exifStatus && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: exifStatus.startsWith('✅') ? '#4ade80' : exifStatus.startsWith('⚠') ? '#fbbf24' : '#f87171' }}>{exifStatus}</span>}
        </div>
        <div><label style={labelStyle}>Camera Model</label><input value={cameraModel} onChange={(e) => setCameraModel(e.target.value)} placeholder="Auto-detected from JPEG" style={inputStyle} /></div>
        <div><label style={labelStyle}>Lens</label><input value={lens} onChange={(e) => setLens(e.target.value)} placeholder="RF 100-500mm" style={inputStyle} /></div>
        <div><label style={labelStyle}>Aperture</label><input value={aperture} onChange={(e) => setAperture(e.target.value)} placeholder="f/5.6" style={inputStyle} /></div>
        <div><label style={labelStyle}>Shutter Speed</label><input value={shutterSpeed} onChange={(e) => setShutterSpeed(e.target.value)} placeholder="1/1000s" style={inputStyle} /></div>
        <div><label style={labelStyle}>ISO</label><input value={iso} onChange={(e) => setIso(e.target.value)} placeholder="800" style={inputStyle} /></div>
        <div><label style={labelStyle}>Focal Length</label><input value={focalLength} onChange={(e) => setFocalLength(e.target.value)} placeholder="400mm" style={inputStyle} /></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
          color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.8rem',
        }}>Cancel</button>
        <button type="submit" className="btn-gold" disabled={saving} style={{
          padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem',
          opacity: saving ? 0.5 : 1, pointerEvents: saving ? 'none' : 'auto',
        }}><Save size={16} /> {saving ? (uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Saving...') : initial ? 'Update Photo' : 'Add Photo'}</button>
      </div>
    </form>
  );
};

// ── Story Form with Upload ─────────────────────────────────────────────────
interface StoryFormProps {
  initial?: Story;
  onSave: (data: Story) => void;
  onCancel: () => void;
  nextId: number;
}

const StoryForm: React.FC<StoryFormProps> = ({ initial, onSave, onCancel, nextId }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '');
  const [content, setContent] = useState(initial?.content || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl || '');
  const [tagsStr, setTagsStr] = useState(initial?.tags.join(', ') || '');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.coverImageUrl || null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [photographer, setPhotographer] = useState(initial?.photographer || '');

  const autoSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initial) setSlug(autoSlug(val));
  };

  const handleCoverUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      // Compress cover image to prevent localStorage overflow (max ~200KB)
      const bitmap = await createImageBitmap(file);
      const MAX_DIM = 800;
      let w = bitmap.width, h = bitmap.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const compressedUrl = canvas.toDataURL('image/jpeg', 0.6);
      setPreviewUrl(compressedUrl);
      // Apply watermark
      let finalUrl = compressedUrl;
      try {
        finalUrl = await applyWatermark(compressedUrl);
      } catch {}
      setCoverImageUrl(finalUrl);

      // Also try uploading to Firebase Storage for persistence
      try {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../firebase');
        const storageRef = ref(storage, `story-covers/${Date.now()}_${file.name}`);
        const response = await fetch(finalUrl);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const firebaseUrl = await getDownloadURL(storageRef);
        setCoverImageUrl(firebaseUrl);
      } catch {
        console.log('Firebase upload failed, using compressed data URL');
      }
    } catch {
      // Fallback to basic data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewUrl(dataUrl);
        setCoverImageUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    setUploading(false);
  }, []);

  const handleAiFill = useCallback(async () => {
    if (!title && !previewUrl && !coverImageUrl) { alert('Please add a title or cover image first'); return; }
    setAiGenerating(true);
    setAiStatus('🔍 Starting AI analysis...');
    try {
      const settings = await getAISettings();
      const photoProvider = settings.photoAnalysisProvider;
      const photoKey = photoProvider === 'gemini' ? settings.geminiKey : 
                       photoProvider === 'chatgpt' ? settings.chatgptKey : settings.geminiKey;
      const storyProvider = settings.storyProvider;
      const storyKey = storyProvider === 'gemini' ? settings.geminiKey :
                       storyProvider === 'deepseek' ? settings.deepseekKey :
                       storyProvider === 'chatgpt' ? settings.chatgptKey : settings.geminiKey;

      // Step 1: Analyze cover image with AI Vision (use previewUrl data URL, not firebase URL)
      let animalName = '';
      let imageAnalysis = '';
      let detectedLocation = '';
      const imageForAI = previewUrl || coverImageUrl;
      if (imageForAI && photoKey) {
        setAiStatus('📸 Analyzing photo with AI Vision...');
        try {
          const analyzeRes = await fetch('/api/analyze', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: imageForAI, provider: photoProvider, apiKey: photoKey }),
          });
          if (analyzeRes.ok) {
            const analysis = await analyzeRes.json();
            if (analysis.success && analysis.data) {
              animalName = analysis.data.animalName || analysis.data.title || '';
              detectedLocation = analysis.data.location || '';
              imageAnalysis = `Animal: ${animalName}, Tags: ${(analysis.data.tags || []).join(', ')}, Location: ${detectedLocation}`;
              // Auto-fill tags if empty
              if (!tagsStr && analysis.data.tags?.length) {
                setTagsStr(analysis.data.tags.join(', '));
              }
              // Auto-fill title if empty
              if (!title && animalName) {
                const storyTitle = `The ${animalName} — A Wildlife Story`;
                setTitle(storyTitle);
                setSlug(autoSlug(storyTitle));
              }
              setAiStatus(`🐾 Detected: ${animalName || 'Unknown subject'}`);
            }
          }
        } catch (err) {
          console.warn('Image analysis failed:', err);
          setAiStatus('⚠️ Photo analysis failed, trying with title...');
        }
      }

      // Step 2: Fetch Wikipedia info
      let wikiInfo = '';
      const searchAnimal = animalName || title;
      if (searchAnimal) {
        setAiStatus(`📚 Looking up "${searchAnimal}" on Wikipedia...`);
        try {
          const wikiRes = await fetch(`/api/wikipedia?animal=${encodeURIComponent(searchAnimal)}`);
          if (wikiRes.ok) {
            const wiki = await wikiRes.json();
            wikiInfo = wiki.summary || wiki.extract || '';
          }
        } catch {}
      }

      // Step 3: Generate story with AI + Wikipedia
      if (!storyKey) {
        alert('No API key configured for story generation. Please set up API keys in AI Settings.');
        setAiGenerating(false);
        setAiStatus('');
        return;
      }

      setAiStatus('✍️ AI is writing the story...');
      const storyRes = await fetch('/api/generate-story', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoTitle: title || animalName || 'Wildlife Photo',
          animalName: animalName,
          location: detectedLocation || imageAnalysis,
          caption: wikiInfo ? `Wikipedia: ${wikiInfo.substring(0, 500)}` : '',
          wikiInfo: wikiInfo,
          provider: storyProvider,
          apiKey: storyKey,
        }),
      });

      if (storyRes.ok) {
        const story = await storyRes.json();
        if (story.title) { setTitle(story.title); setSlug(autoSlug(story.title)); }
        if (story.excerpt) setExcerpt(story.excerpt);
        if (story.content) setContent(story.content);
        if (story.tags?.length) setTagsStr(story.tags.join(', '));
        if (animalName && !photographer) setPhotographer(animalName + ' Photography');
        setAiStatus('✅ Story generated! Review and edit as needed.');
      } else {
        const errData = await storyRes.json().catch(() => ({}));
        setAiStatus(`❌ AI generation failed: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('AI fill error:', err);
      setAiStatus('❌ AI generation failed. Check API keys in AI Settings.');
    }
    setTimeout(() => setAiStatus(''), 10000);
    setAiGenerating(false);
  }, [title, previewUrl, coverImageUrl, tagsStr, slug, photographer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id || nextId,
      firestoreId: initial?.firestoreId,
      title, slug: slug || autoSlug(title), excerpt, content, coverImageUrl,
      photographer,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: initial?.createdAt || new Date().toISOString().split('T')[0],
      viewCount: initial?.viewCount || 0,
      likeCount: initial?.likeCount || 0,
      liked: initial?.liked || false,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Cover Upload */}
      <div style={{ marginBottom: '1.5rem' }}>
        <UploadZone
          onFileSelected={handleCoverUpload}
          previewUrl={previewUrl}
          uploading={uploading}
          accept="image/*"
          label="Cover Image"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
        <span style={{ fontSize: '0.7rem', color: 'rgba(235,230,220,0.3)', letterSpacing: '0.1em' }}>OR PASTE URL</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          value={coverImageUrl.startsWith('./') || coverImageUrl.startsWith('data:') ? '' : coverImageUrl}
          onChange={(e) => { setCoverImageUrl(e.target.value); setPreviewUrl(e.target.value || null); }}
          placeholder="https://example.com/cover.jpg"
          style={inputStyle}
        />
      </div>

      {/* AI Auto-Fill */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={handleAiFill}
          disabled={aiGenerating}
          style={{
            width: '100%', padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '10px', cursor: aiGenerating ? 'wait' : 'pointer',
            color: 'var(--wa-gold)', fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'all 0.3s',
          }}
        >
          {aiGenerating ? (
            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> AI is writing...</>
          ) : (
            <><Sparkles size={18} /> ✨ Upload Photo → AI Recognizes → Auto-Write Story</>
          )}
        </button>
        {aiStatus && (
          <div style={{
            marginTop: '0.5rem', padding: '0.5rem 0.75rem',
            background: aiStatus.includes('✅') ? 'rgba(76,201,76,0.1)' : aiStatus.includes('❌') ? 'rgba(201,76,76,0.1)' : 'rgba(201,168,76,0.1)',
            border: `1px solid ${aiStatus.includes('✅') ? 'rgba(76,201,76,0.3)' : aiStatus.includes('❌') ? 'rgba(201,76,76,0.3)' : 'rgba(201,168,76,0.2)'}`,
            borderRadius: '8px', fontSize: '0.8rem', color: 'var(--wa-light)', textAlign: 'center',
          }}>
            {aiStatus}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Title *</label>
          <input value={title} onChange={(e) => handleTitleChange(e.target.value)} required placeholder="Story title" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>📸 Photographer Name</label>
          <input value={photographer} onChange={(e) => setPhotographer(e.target.value)} placeholder="e.g. Madan Shrestha" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated-slug" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tags (comma separated)</label>
          <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="wildlife, adventure, nepal" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Excerpt *</label>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required placeholder="Brief summary..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Content *</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} required placeholder="Full story content... Use double newlines for paragraphs." rows={8} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
          color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.8rem',
        }}>Cancel</button>
        <button type="submit" className="btn-gold" style={{
          padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem',
        }}><Save size={16} /> {initial ? 'Update Story' : 'Add Story'}</button>
      </div>
    </form>
  );
};

// ── Video Form with Upload ─────────────────────────────────────────────────
interface VideoFormProps {
  initial?: Video;
  onSave: (data: Video) => void;
  onCancel: () => void;
  nextId: number;
}

const VideoForm: React.FC<VideoFormProps> = ({ initial, onSave, onCancel, nextId }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [duration, setDuration] = useState(initial?.duration || '');
  const [tagsStr, setTagsStr] = useState(initial?.tags?.join(', ') || '');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(initial?.videoUrl || null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(initial?.thumbnailUrl || null);
  const [photographer, setPhotographer] = useState(initial?.photographer || '');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoSaving, setVideoSaving] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(initial?.aspectRatio || '');
  const [videoWidth, setVideoWidth] = useState(initial?.videoWidth || 0);
  const [videoHeight, setVideoHeight] = useState(initial?.videoHeight || 0);
  const [detectedRatio, setDetectedRatio] = useState('');

  const handleVideoUpload = useCallback(async (file: File) => {
    setUploadingVideo(true);
    setVideoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
    setVideoUrl(previewUrl);
    console.log(`🎬 Video selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // 🎬 Auto-detect video dimensions & aspect ratio
    try {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = previewUrl;
      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          const w = videoEl.videoWidth;
          const h = videoEl.videoHeight;
          setVideoWidth(w);
          setVideoHeight(h);

          // Auto-detect duration
          if (videoEl.duration && isFinite(videoEl.duration)) {
            const mins = Math.floor(videoEl.duration / 60);
            const secs = Math.floor(videoEl.duration % 60);
            setDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
          }

          // Detect closest standard aspect ratio
          if (w > 0 && h > 0) {
            const ratio = w / h;
            let detected = 'custom';
            if (Math.abs(ratio - 16/9) < 0.15) detected = '16:9';
            else if (Math.abs(ratio - 9/16) < 0.15) detected = '9:16';
            else if (Math.abs(ratio - 1) < 0.1) detected = '1:1';
            else if (Math.abs(ratio - 4/5) < 0.1) detected = '4:5';
            else if (Math.abs(ratio - 4/3) < 0.1) detected = '4:3';
            else if (Math.abs(ratio - 3/4) < 0.1) detected = '3:4';
            setDetectedRatio(detected);
            if (!aspectRatio) setAspectRatio(detected);
            console.log(`📐 Video: ${w}x${h} → ${detected} (ratio: ${ratio.toFixed(3)})`);
          }
          resolve();
        };
        videoEl.onerror = () => resolve();
      });
    } catch (err) {
      console.warn('Video dimension detection failed:', err);
    }
    setUploadingVideo(false);
  }, [aspectRatio]);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    setUploadingThumb(true);
    try {
      // Compress thumbnail to WebP (max 800px, 80% quality — ~100-200KB)
      const bitmap = await createImageBitmap(file);
      const MAX_DIM = 800;
      let w = bitmap.width, h = bitmap.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0, w, h);

      // Generate WebP blob (better quality-to-size than JPEG)
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('WebP blob failed')),
          'image/webp',
          0.80
        );
      });
      const webpFile = new File([webpBlob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
      setThumbFile(webpFile);

      const previewUrl = URL.createObjectURL(webpFile);
      setThumbPreview(previewUrl);
      setThumbnailUrl(previewUrl); // Temporary — replaced with Firebase URL on save
      console.log(`🖼️ Video thumbnail compressed: ${(webpFile.size / 1024).toFixed(0)}KB WebP`);
    } catch {
      // Fallback: use original file
      setThumbFile(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbPreview(previewUrl);
      setThumbnailUrl(previewUrl);
    }
    setUploadingThumb(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl && !videoFile) return;
    setVideoSaving(true);
    setVideoUploadProgress(0);

    let finalVideoUrl = videoUrl;
    let finalThumbUrl = thumbnailUrl;

    try {
      // Upload video file to Firebase Storage (resumable upload with progress)
      if (videoFile) {
        try {
          finalVideoUrl = await uploadVideoToStorage(
            videoFile,
            videoFile.name,
            (p) => setVideoUploadProgress(Math.round(p * 0.8)) // 0-80% for video
          );
        } catch (err: any) {
          console.error('Video upload failed:', err);
          alert(`❌ Video upload failed: ${err?.message || 'Unknown error'}. Please try again.`);
          setVideoSaving(false);
          setVideoUploadProgress(0);
          return;
        }
      }

      // Upload thumbnail to Firebase Storage
      if (thumbFile) {
        try {
          setVideoUploadProgress(85);
          finalThumbUrl = await uploadVideoThumbnailToStorage(
            thumbFile,
            thumbFile.name
          );
          setVideoUploadProgress(95);
        } catch (err) {
          console.warn('Thumbnail upload failed:', err);
          // Non-critical — continue without thumbnail
        }
      }

      setVideoUploadProgress(100);
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(`❌ Upload failed: ${err?.message || 'Unknown error'}`);
      setVideoSaving(false);
      setVideoUploadProgress(0);
      return;
    }

    setVideoSaving(false);
    setVideoUploadProgress(0);

    onSave({
      id: initial?.id || nextId,
      firestoreId: initial?.firestoreId,
      title,
      description,
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbUrl,
      location,
      duration,
      photographer,
      aspectRatio: aspectRatio || detectedRatio || undefined,
      videoWidth: videoWidth || undefined,
      videoHeight: videoHeight || undefined,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: initial?.createdAt || new Date().toISOString().split('T')[0],
      viewCount: initial?.viewCount || 0,
      likeCount: initial?.likeCount || 0,
      liked: initial?.liked || false,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Video Upload */}
      <div style={{ marginBottom: '1.5rem' }}>
        <UploadZone
          onFileSelected={handleVideoUpload}
          previewUrl={videoPreview}
          uploading={uploadingVideo}
          accept="video/*"
          label="Video File"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
        <span style={{ fontSize: '0.7rem', color: 'rgba(235,230,220,0.3)', letterSpacing: '0.1em' }}>OR PASTE VIDEO URL</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          value={videoUrl.startsWith('data:') ? '' : videoUrl}
          onChange={(e) => { setVideoUrl(e.target.value); setVideoPreview(e.target.value || null); }}
          placeholder="https://example.com/video.mp4"
          style={inputStyle}
        />
      </div>

      {/* Thumbnail Upload */}
      <div style={{ marginBottom: '1.5rem' }}>
        <UploadZone
          onFileSelected={handleThumbnailUpload}
          previewUrl={thumbPreview}
          uploading={uploadingThumb}
          accept="image/*"
          label="Thumbnail Image"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
        <span style={{ fontSize: '0.7rem', color: 'rgba(235,230,220,0.3)', letterSpacing: '0.1em' }}>OR PASTE THUMBNAIL URL</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          value={thumbnailUrl.startsWith('data:') ? '' : thumbnailUrl}
          onChange={(e) => { setThumbnailUrl(e.target.value); setThumbPreview(e.target.value || null); }}
          placeholder="https://example.com/thumbnail.jpg"
          style={inputStyle}
        />
      </div>

      {/* 📐 Video Dimensions & Aspect Ratio Info */}
      {(videoWidth > 0 || detectedRatio) && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          {videoWidth > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 500 }}>
              📐 {videoWidth} × {videoHeight}px
            </span>
          )}
          {detectedRatio && (
            <span style={{
              padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
              background: detectedRatio === '16:9' ? 'rgba(34,197,94,0.15)' :
                          detectedRatio === '9:16' ? 'rgba(168,85,247,0.15)' :
                          detectedRatio === '1:1' ? 'rgba(251,191,36,0.15)' : 'rgba(201,168,76,0.15)',
              color: detectedRatio === '16:9' ? '#4ade80' :
                     detectedRatio === '9:16' ? '#c084fc' :
                     detectedRatio === '1:1' ? '#fbbf24' : 'var(--wa-gold)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {detectedRatio === '16:9' ? '🖥️ Landscape' :
               detectedRatio === '9:16' ? '📱 Portrait (Reels)' :
               detectedRatio === '1:1' ? '⬜ Square' :
               detectedRatio === '4:5' ? '📸 Instagram' :
               detectedRatio === '4:3' ? '📺 Classic' :
               detectedRatio === '3:4' ? '📱 Portrait' :
               '📐 Custom'} ({detectedRatio})
            </span>
          )}
        </div>
      )}

      {/* 🎬 Aspect Ratio Selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>📐 Aspect Ratio (auto-detected, or choose manually)</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
          {[
            { value: '16:9', label: '🖥️ 16:9', desc: 'Landscape' },
            { value: '9:16', label: '📱 9:16', desc: 'Portrait/Reels' },
            { value: '1:1', label: '⬜ 1:1', desc: 'Square' },
            { value: '4:5', label: '📸 4:5', desc: 'Instagram' },
            { value: '4:3', label: '📺 4:3', desc: 'Classic' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAspectRatio(opt.value)}
              style={{
                padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600,
                background: aspectRatio === opt.value ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.04)',
                border: aspectRatio === opt.value ? '2px solid var(--wa-gold)' : '1px solid rgba(255,255,255,0.1)',
                color: aspectRatio === opt.value ? 'var(--wa-gold)' : 'rgba(235,230,220,0.5)',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
              <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 400, opacity: 0.7, marginTop: '0.15rem' }}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
        {detectedRatio && aspectRatio !== detectedRatio && (
          <p style={{ fontSize: '0.7rem', color: '#fbbf24', marginTop: '0.4rem' }}>
            ⚠️ Auto-detected was {detectedRatio} — you selected {aspectRatio}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Video title" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Video description..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Chitwan, Nepal" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>📸 Photographer Name</label>
          <input value={photographer} onChange={(e) => setPhotographer(e.target.value)} placeholder="e.g. Madan Shrestha" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Duration</label>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2:34" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Tags (comma separated)</label>
          <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="wildlife, adventure, nepal" style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
          color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.8rem',
        }}>Cancel</button>
        <button type="submit" className="btn-gold" disabled={videoSaving} style={{
          padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem',
          opacity: videoSaving ? 0.5 : 1, pointerEvents: videoSaving ? 'none' : 'auto',
        }}><Save size={16} /> {videoSaving ? (videoUploadProgress > 0 && videoUploadProgress < 100 ? `Uploading ${videoUploadProgress}%` : 'Saving...') : initial ? 'Update Video' : 'Add Video'}</button>
      </div>
    </form>
  );
};

// ── Site Settings Form ────────────────────────────────────────────────────
const SiteSettingsForm = () => {
  const [heroImages, setHeroImages] = React.useState<string[]>(['', '', '', '']);
  const [defaultThumbnail, setDefaultThumbnail] = React.useState('');
  const [categoryImages, setCategoryImages] = React.useState<{ wildlife?: string; landscape?: string; nature?: string; portraits?: string }>({});
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [uploadingSlot, setUploadingSlot] = React.useState<number | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getSiteSettings().then(settings => {
      if (settings.heroImages && settings.heroImages.length > 0) {
        const padded = [...settings.heroImages];
        while (padded.length < 4) padded.push('');
        setHeroImages(padded.slice(0, 4));
      }
      if (settings.defaultThumbnail) setDefaultThumbnail(settings.defaultThumbnail);
      if (settings.categoryImages) setCategoryImages(settings.categoryImages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleHeroImageUpload = async (index: number, file: File) => {
    setUploadingSlot(index);
    setUploadError(null);
    try {
      const url = await uploadHeroImage(file, index);
      setHeroImages(prev => {
        const updated = [...prev];
        updated[index] = url;
        return updated;
      });
    } catch (err: any) {
      const msg = err?.code === 'storage/unauthorized'
        ? '❌ Permission denied — Firebase Storage rules need to be updated. Deploy storage.rules and try again.'
        : `❌ Upload failed: ${err?.message || String(err)}`;
      setUploadError(msg);
      console.error('Hero image upload failed:', err);
    }
    setUploadingSlot(null);
  };

  const handleThumbnailUpload = async (file: File) => {
    setUploadingSlot(99);
    setUploadError(null);
    try {
      const url = await uploadDefaultThumbnail(file);
      setDefaultThumbnail(url);
    } catch (err: any) {
      const msg = err?.code === 'storage/unauthorized'
        ? '❌ Permission denied — Firebase Storage rules need to be updated. Deploy storage.rules and try again.'
        : `❌ Upload failed: ${err?.message || String(err)}`;
      setUploadError(msg);
      console.error('Thumbnail upload failed:', err);
    }
    setUploadingSlot(null);
  };

  const handleCategoryImageUpload = async (key: string, file: File) => {
    setUploadingSlot(200);
    setUploadError(null);
    try {
      const url = await uploadCategoryImage(key, file);
      setCategoryImages(prev => ({ ...prev, [key]: url }));
    } catch (err: any) {
      const msg = err?.code === 'storage/unauthorized'
        ? '❌ Permission denied — Firebase Storage rules need to be updated. Deploy storage.rules and try again.'
        : `❌ Upload failed: ${err?.message || String(err)}`;
      setUploadError(msg);
      console.error('Category image upload failed:', err);
    }
    setUploadingSlot(null);
  };

  const handleRemoveHero = (index: number) => {
    setHeroImages(prev => {
      const updated = [...prev];
      updated[index] = '';
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSiteSettings({
        heroImages: heroImages.filter(url => url.length > 0),
        defaultThumbnail: defaultThumbnail || '',
        categoryImages,
      });
      alert('✅ Site settings saved successfully!');
    } catch (err: any) {
      console.error('Save settings failed:', err);
      alert(`❌ Failed to save settings: ${err?.message || String(err)}`);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(235,230,220,0.5)' }}>Loading settings...</div>;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--wa-gold)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Globe size={22} /> Site Settings
      </h2>

      {/* Upload Error Banner */}
      {uploadError && (
        <div style={{
          padding: '0.85rem 1rem', marginBottom: '1.25rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: '10px', fontSize: '0.82rem', color: '#fca5a5',
          display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
        }}>
          <span style={{ flexShrink: 0, marginTop: '0.05rem' }}>⚠️</span>
          <span>{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}
          >✕</button>
        </div>
      )}

      {/* Hero Images Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--wa-light)', marginBottom: '0.75rem', fontWeight: 600 }}>
          🖼️ Hero Slider Images (up to 4)
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)', marginBottom: '1rem' }}>
          Upload images for the homepage hero section. These will auto-rotate every 5 seconds.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {heroImages.map((url, idx) => (
            <div key={idx} style={{
              border: '2px dashed rgba(201,168,76,0.2)',
              borderRadius: '12px',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.3)',
              position: 'relative',
              aspectRatio: '16/9',
            }}>
              {url ? (
                <>
                  <img src={url} alt={`Hero ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => handleRemoveHero(idx)}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '50%',
                      width: 28, height: 28, cursor: 'pointer', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700,
                    }}
                  >✕</button>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    padding: '0.5rem', fontSize: '0.7rem', color: 'var(--wa-gold)',
                    textAlign: 'center',
                  }}>
                    Slide {idx + 1}
                  </div>
                </>
              ) : (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: '100%', cursor: 'pointer',
                  color: 'rgba(235,230,220,0.3)', fontSize: '0.75rem',
                  minHeight: '120px',
                }}>
                  {uploadingSlot === idx ? (
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <>
                      <Upload size={24} style={{ marginBottom: '0.3rem' }} />
                      <span>Slide {idx + 1}</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Click to upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleHeroImageUpload(idx, file);
                    }}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Category Images Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--wa-light)', marginBottom: '0.75rem', fontWeight: 600 }}>
          🏷️ Category Images
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)', marginBottom: '1rem' }}>
          Upload custom images for each category displayed on the homepage.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {([
            { key: 'wildlife', label: 'Wildlife' },
            { key: 'landscape', label: 'Landscapes' },
            { key: 'nature', label: 'Nature' },
            { key: 'portraits', label: 'Portraits' },
          ] as { key: string; label: string }[]).map((cat) => (
            <div key={cat.key} style={{
              border: '2px dashed rgba(201,168,76,0.2)',
              borderRadius: '12px',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.3)',
              position: 'relative',
              aspectRatio: '4/3',
            }}>
              {(categoryImages as any)[cat.key] ? (
                <>
                  <img src={(categoryImages as any)[cat.key]} alt={cat.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => setCategoryImages(prev => {
                      const updated = { ...prev };
                      delete (updated as any)[cat.key];
                      return updated;
                    })}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '50%',
                      width: 28, height: 28, cursor: 'pointer', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700,
                    }}
                  >✕</button>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    padding: '0.5rem', fontSize: '0.7rem', color: 'var(--wa-gold)',
                    textAlign: 'center',
                  }}>
                    {cat.label}
                  </div>
                </>
              ) : (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: '100%', cursor: 'pointer',
                  color: 'rgba(235,230,220,0.3)', fontSize: '0.75rem',
                  minHeight: '120px',
                }}>
                  <Upload size={24} style={{ marginBottom: '0.3rem' }} />
                  <span>{cat.label}</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Click to upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCategoryImageUpload(cat.key, file);
                    }}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Default Thumbnail Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--wa-light)', marginBottom: '0.75rem', fontWeight: 600 }}>
          📸 Default Thumbnail
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)', marginBottom: '1rem' }}>
          Default thumbnail used when no custom thumbnail is set for a post.
        </p>
        <div style={{
          border: '2px dashed rgba(201,168,76,0.2)',
          borderRadius: '12px', overflow: 'hidden',
          background: 'rgba(0,0,0,0.3)', position: 'relative',
          width: '200px', aspectRatio: '1',
        }}>
          {defaultThumbnail ? (
            <>
              <img src={defaultThumbnail} alt="Default Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => setDefaultThumbnail('')}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700,
                }}
              >✕</button>
            </>
          ) : (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: '100%', cursor: 'pointer',
              color: 'rgba(235,230,220,0.3)', fontSize: '0.75rem',
              minHeight: '120px',
            }}>
              {uploadingSlot === 99 ? (
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <FileImage size={24} style={{ marginBottom: '0.3rem' }} />
                  <span>Upload Thumbnail</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleThumbnailUpload(file);
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '0.75rem 2rem',
          background: saving ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #c9a84c, #b8943f)',
          border: 'none', borderRadius: '10px',
          color: saving ? 'rgba(255,255,255,0.5)' : '#000',
          fontWeight: 700, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          transition: 'all 0.3s',
        }}
      >
        {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Settings</>}
      </button>
    </div>
  );
};
