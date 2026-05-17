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
            <option value="birds">Birds</option>
            <option value="macro">Macro</option>
            <option value="domestic">Domestic Animals</option>
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
  const [inlineUploading, setInlineUploading] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

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

  const handleInlineImageUpload = useCallback(async (file: File) => {
    setInlineUploading(true);
    try {
      // Compress image before upload (max 1200px, WebP ~200KB)
      let uploadFile: File | Blob = file;
      try {
        const bitmap = await createImageBitmap(file);
        const MAX_DIM = 1200;
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
        // Try WebP first, fallback to JPEG
        let blob = await new Promise<Blob | null>(res => { try { canvas.toBlob(b => res(b), 'image/webp', 0.80); } catch { res(null); } });
        if (!blob) blob = await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.85));
        if (blob) {
          const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
          uploadFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + ext, { type: blob.type });
          console.log(`📸 Story image compressed: ${(file.size/1024).toFixed(0)}KB → ${(blob.size/1024).toFixed(0)}KB`);
        }
      } catch (compErr) {
        console.warn('Compression failed, using original:', compErr);
      }

      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../firebase');
      
      // Try upload with retry
      let url = '';
      let lastErr: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const storageRef = ref(storage, `story-inline/${Date.now()}_${(uploadFile instanceof File ? uploadFile.name : file.name)}`);
          await uploadBytes(storageRef, uploadFile);
          url = await getDownloadURL(storageRef);
          break;
        } catch (err: any) {
          lastErr = err;
          console.warn(`Story image upload attempt ${attempt + 1} failed:`, err?.code || err?.message);
          if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      if (!url) {
        // Show specific error
        const code = lastErr?.code || '';
        if (code === 'storage/unauthorized') {
          alert('❌ Image upload failed: Firebase Storage rules don\'t allow story-inline/ path. Please add storage rules for this path.');
        } else if (code === 'storage/quota-exceeded') {
          alert('❌ Storage quota exceeded. Please upgrade Firebase plan.');
        } else {
          alert(`❌ Image upload failed: ${lastErr?.message || 'Unknown error'}. Please try again.`);
        }
        setInlineUploading(false);
        return;
      }

      const marker = `[IMAGE:${url}]`;
      // Insert at cursor position in textarea
      const ta = contentTextareaRef.current;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newContent = content.substring(0, start) + '\n\n' + marker + '\n\n' + content.substring(end);
        setContent(newContent);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + marker.length + 4;
          ta.focus();
        }, 0);
      } else {
        setContent(prev => prev + '\n\n' + marker + '\n\n');
      }
    } catch (err: any) {
      console.error('Inline image upload failed:', err);
      alert(`❌ Image upload failed: ${err?.message || 'Unknown error'}. Check Firebase Storage rules for story-inline/ path.`);
    }
    setInlineUploading(false);
  }, [content]);

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <label style={labelStyle}>Content *</label>
            <button
              type="button"
              onClick={() => inlineImageInputRef.current?.click()}
              disabled={inlineUploading}
              title="Insert image at cursor position"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.7rem', borderRadius: '7px',
                background: inlineUploading ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.15)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'var(--wa-gold)', cursor: inlineUploading ? 'wait' : 'pointer',
                fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s',
              }}
            >
              {inlineUploading
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
                : <><FileImage size={13} /> 📷 Insert Image</>
              }
            </button>
            <input
              ref={inlineImageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleInlineImageUpload(file);
                e.target.value = '';
              }}
            />
          </div>
          <textarea
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder={"Full story content...\n\nUse double newlines for paragraphs.\nClick '📷 Insert Image' to add photos inside the story."}
            rows={12}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
          <div style={{ fontSize: '0.68rem', color: 'rgba(235,230,220,0.35)', marginTop: '0.3rem' }}>
            💡 Tip: Place cursor in text where you want an image, then click "Insert Image"
          </div>
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
  const [categoryImages, setCategoryImages] = React.useState<{ wildlife?: string; birds?: string; macro?: string; domestic?: string; landscape?: string; nature?: string; portraits?: string }>({});
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [uploadingSlot, setUploadingSlot] = React.useState<number | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  // Auto-covers: first gallery photo per category (used as fallback when no manual override)
  const [autoCovers, setAutoCovers] = React.useState<Record<string, string>>({});

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

    // Subscribe to gallery photos to auto-generate category covers
    const unsub = subscribeToGalleryPhotos((photos) => {
      const covers: Record<string, string> = {};
      // Map gallery category keys to site-settings category keys
      const catMap: Record<string, string> = {
        wildlife: 'wildlife',
        birds: 'landscape', // birds → show as landscape fallback
        landscapes: 'landscape',
        nature: 'nature',
        portraits: 'portraits',
      };
      photos.forEach(p => {
        const key = catMap[p.category];
        if (key && !covers[key] && p.imageUrl) covers[key] = p.imageUrl;
      });
      setAutoCovers(covers);
    });
    return () => unsub();
  }, []);

  const formatUploadError = (err: any): string => {
    const code: string = err?.code || '';
    const msg: string = err?.message || 'Unknown error';
    if (code === 'storage/unauthorized') return '❌ Permission denied — Firebase Storage rules not deployed. Run: firebase deploy --only storage';
    if (code === 'storage/quota-exceeded') return '❌ Storage quota exceeded. Upgrade Firebase plan.';
    if (code === 'storage/unauthenticated') return '❌ Not authenticated — please log out and log back in.';
    if (code === 'storage/canceled') return '❌ Upload was cancelled.';
    if (msg.includes('timed out')) return '❌ Upload timed out — check your internet connection.';
    return `❌ Upload failed: ${code || msg}`;
  };

  const handleHeroImageUpload = async (index: number, file: File) => {
    setUploadError(null);
    setUploadingSlot(index);
    try {
      const url = await uploadHeroImage(file, index);
      setHeroImages(prev => {
        const updated = [...prev];
        updated[index] = url;
        return updated;
      });
    } catch (err) {
      console.error('Hero image upload failed:', err);
      setUploadError(formatUploadError(err));
    }
    setUploadingSlot(null);
  };

  const handleThumbnailUpload = async (file: File) => {
    setUploadError(null);
    setUploadingSlot(99);
    try {
      const url = await uploadDefaultThumbnail(file);
      setDefaultThumbnail(url);
    } catch (err) {
      console.error('Thumbnail upload failed:', err);
      setUploadError(formatUploadError(err));
    }
    setUploadingSlot(null);
  };

  const handleCategoryImageUpload = async (key: string, file: File) => {
    setUploadError(null);
    setUploadingSlot(200);
    try {
      const url = await uploadCategoryImage(key, file);
      setCategoryImages(prev => ({ ...prev, [key]: url }));
    } catch (err) {
      console.error('Category image upload failed:', err);
      setUploadError(formatUploadError(err));
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
      alert(`❌ Failed to save settings: ${err?.message || 'Unknown error'}`);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(235,230,220,0.5)' }}>Loading settings...</div>;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--wa-gold)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Globe size={22} /> Site Settings
      </h2>

      {/* Upload error banner */}
      {uploadError && (
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
          color: '#fca5a5', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem',
        }}>
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>✕</button>
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
        <h3 style={{ fontSize: '1rem', color: 'var(--wa-light)', marginBottom: '0.4rem', fontWeight: 600 }}>
          🏷️ Category Images
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)', marginBottom: '1rem' }}>
          Auto-filled from your gallery photos. Upload a custom image to override.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {([
            { key: 'wildlife', label: 'Wildlife' },
            { key: 'birds', label: 'Birds' },
            { key: 'macro', label: 'Macro' },
            { key: 'domestic', label: 'Domestic Animals' },
            { key: 'landscape', label: 'Landscapes' },
            { key: 'nature', label: 'Nature' },
            { key: 'portraits', label: 'Portraits' },
          ] as { key: string; label: string }[]).map((cat) => {
            const manualImg = (categoryImages as any)[cat.key];
            const autoImg = autoCovers[cat.key];
            const displayImg = manualImg || autoImg;
            return (
              <div key={cat.key} style={{
                border: manualImg ? '2px solid rgba(201,168,76,0.5)' : '2px dashed rgba(201,168,76,0.15)',
                borderRadius: '10px',
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.3)',
                position: 'relative',
                aspectRatio: '4/3',
              }}>
                {displayImg ? (
                  <>
                    <img src={displayImg} alt={cat.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: manualImg ? 1 : 0.7 }} />
                    {/* Auto-label or manual override label */}
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      background: manualImg ? 'rgba(201,168,76,0.9)' : 'rgba(0,0,0,0.6)',
                      borderRadius: '4px', padding: '2px 6px',
                      fontSize: '0.6rem', color: manualImg ? '#000' : 'rgba(255,255,255,0.7)',
                      fontWeight: 700, letterSpacing: '0.05em',
                    }}>
                      {manualImg ? 'CUSTOM' : 'AUTO'}
                    </div>
                    {/* Remove custom override button */}
                    {manualImg && (
                      <button
                        onClick={() => setCategoryImages(prev => {
                          const updated = { ...prev };
                          delete (updated as any)[cat.key];
                          return updated;
                        })}
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '50%',
                          width: 26, height: 26, cursor: 'pointer', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 700,
                        }}
                      >✕</button>
                    )}
                    {/* Upload override button at bottom */}
                    <label style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                      padding: '1.2rem 0.5rem 0.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--wa-gold)', fontWeight: 600 }}>{cat.label}</span>
                      <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {uploadingSlot === 200 ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={12} />}
                        Override
                      </span>
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCategoryImageUpload(cat.key, file); }}
                      />
                    </label>
                  </>
                ) : (
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: '100%', cursor: 'pointer',
                    color: 'rgba(235,230,220,0.3)', fontSize: '0.75rem', minHeight: '100px',
                  }}>
                    {uploadingSlot === 200 ? (
                      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        <Upload size={22} style={{ marginBottom: '0.3rem' }} />
                        <span style={{ fontWeight: 600 }}>{cat.label}</span>
                        <span style={{ fontSize: '0.62rem', opacity: 0.5 }}>No gallery photos yet</span>
                      </>
                    )}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCategoryImageUpload(cat.key, file); }}
                    />
                  </label>
                )}
              </div>
            );
          })}
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


// ── Gallery Management ───────────────────────────────────────────────────────
const GALLERY_CATEGORY_OPTIONS: Array<{ value: GalleryCategory; label: string }> = [
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'birds', label: 'Birds' },
  { value: 'landscapes', label: 'Landscapes' },
  { value: 'portraits', label: 'Portraits' },
  { value: 'others', label: 'Others' },
];


const GalleryManagement: React.FC = () => {
  const [category, setCategory] = useState<GalleryCategory>('wildlife');
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [browseCategory, setBrowseCategory] = useState<GalleryCategory | null>(null);
  const [browseYear, setBrowseYear] = useState<string | null>(null);
  const [browseMonth, setBrowseMonth] = useState<string | null>(null);

  React.useEffect(() => {
    const unsub = subscribeToGalleryPhotos((photos) => setGalleryPhotos(photos));
    return () => unsub();
  }, []);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // ── Inline image processor: resize + © WildSaura watermark + WebP ──
    const processImage = async (file: File): Promise<{ blob: Blob; filename: string; width: number; height: number; format: 'webp' | 'jpeg'; sizeBytes: number }> => {
      const MAX_W = 2400;
      const url = URL.createObjectURL(file);
      const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const i = document.createElement('img');
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Could not decode image'));
        i.decoding = 'async';
        i.src = url;
      });
      try {
        const ratio = img.naturalWidth > MAX_W ? MAX_W / img.naturalWidth : 1;
        const w = Math.round(img.naturalWidth * ratio);
        const h = Math.round(img.naturalHeight * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');
        ctx.imageSmoothingEnabled = true;
        (ctx as any).imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        const fontSize = Math.max(16, Math.min(48, Math.round(Math.max(w, h) * 0.022)));
        ctx.save();
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'right';
        ctx.globalAlpha = 0.55;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('© WildSaura', w - 24, h - 24);
        ctx.restore();
        const toBlob = (type: string, q: number) => new Promise<Blob | null>(res => { try { canvas.toBlob(b => res(b), type, q); } catch { res(null); } });
        let blob = await toBlob('image/webp', 0.82);
        let format: 'webp' | 'jpeg' = 'webp';
        if (!blob) blob = await toBlob('image/webp', 0.78);
        if (!blob) { blob = await toBlob('image/jpeg', 0.85); format = 'jpeg'; }
        if (!blob) throw new Error('Image encoding failed');
        const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
        return { blob, filename: `${baseName}.${format}`, width: w, height: h, format, sizeBytes: blob.size };
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    const selectedFiles = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'));
    event.target.value = '';
    if (selectedFiles.length === 0) return;
    if (selectedFiles.length > 20) {
      alert('Please upload maximum 20 photos at once.');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        const baseProgress = Math.round((index / selectedFiles.length) * 100);
        const processed = await processImage(file);
        const uploaded = await uploadGalleryBlobToStorage(
          processed.blob,
          processed.filename,
          category,
          (fileProgress) => {
            setProgress(Math.round(baseProgress + (fileProgress / selectedFiles.length)));
          }
        );
        await addGalleryPhotoToFirestore({
          title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
          category,
          imageUrl: uploaded.imageUrl,
          storagePath: uploaded.storagePath,
          width: processed.width,
          height: processed.height,
          format: processed.format,
          sizeBytes: processed.sizeBytes,
        });
      }
      setProgress(100);
    } catch (error) {
      const err = error as any;
      const reason = err?.code || err?.message || 'Unknown error';
      console.error('Gallery upload failed:', err);
      alert(`Gallery upload failed: ${reason}`);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1200);
    }
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    try {
      await deleteGalleryPhoto(photo);
      setDeleteId(null);
    } catch (error) {
      console.error('Gallery delete failed:', error);
      alert('Could not delete this gallery photo.');
    }
  };

  const handleRenameStart = (photo: GalleryPhoto) => {
    setEditingId(photo.id || photo.imageUrl);
    setEditingTitle(photo.title);
  };

  const handleRenameSave = async (photo: GalleryPhoto) => {
    if (!photo.id || !editingTitle.trim()) return;
    setRenaming(true);
    try {
      await updateGalleryPhotoTitle(photo.id, editingTitle.trim());
      setEditingId(null);
    } catch (err) {
      console.error('Rename failed:', err);
      alert('Could not rename this photo.');
    } finally {
      setRenaming(false);
    }
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    const toDelete = galleryPhotos.filter(p => selectedIds.has(p.id || p.imageUrl));
    for (const photo of toDelete) {
      try { await deleteGalleryPhoto(photo); } catch (e) { console.error('Bulk delete failed for', photo.id, e); }
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const toggleSelect = (key: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const MONTH_NAMES: Record<string, string> = { '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec' };
  const getPhotoYearMonth = (photo: GalleryPhoto): { year: string; month: string } => {
    if (photo.storagePath) { const parts = photo.storagePath.split('/'); if (parts.length >= 5) return { year: parts[2], month: parts[3] }; }
    if (photo.createdAt?.toDate) { const d: Date = photo.createdAt.toDate(); return { year: String(d.getFullYear()), month: String(d.getMonth() + 1).padStart(2, '0') }; }
    return { year: '2026', month: '05' };
  };
  const visiblePhotos = (browseCategory && browseYear && browseMonth)
    ? galleryPhotos.filter(p => { if (p.category !== browseCategory) return false; const { year, month } = getPhotoYearMonth(p); return year === browseYear && month === browseMonth; })
    : [];
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ color: 'var(--wa-light)', fontSize: '1rem', marginBottom: '1rem' }}>Upload Gallery Photos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as GalleryCategory)} style={inputStyle} disabled={uploading}>
              {GALLERY_CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Photos (10-20 at once supported)</label>
            <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={uploading} style={inputStyle} />
          </div>
        </div>
        {uploading || progress > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: 'rgba(235,230,220,0.65)', fontSize: '0.75rem' }}>
              <span>{uploading ? 'Uploading to category folder...' : 'Upload complete'}</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--wa-gold), #f97316)', transition: 'width 0.2s ease' }} />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Category/Year/Month Folder Navigation ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--wa-light)', fontSize: '1rem', margin: 0 }}>Gallery ({galleryPhotos.length})</h3>
          {/* Breadcrumb */}
          {browseCategory && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1, flexWrap: 'wrap' }}>
              <span style={{ color: 'rgba(201,168,76,0.4)', fontSize: '0.78rem' }}>›</span>
              <button onClick={() => { setBrowseYear(null); setBrowseMonth(null); setSelectMode(false); setSelectedIds(new Set()); }}
                style={{ background: 'none', border: 'none', color: browseYear ? 'rgba(201,168,76,0.7)' : 'var(--wa-gold)', cursor: browseYear ? 'pointer' : 'default', fontSize: '0.78rem', padding: 0, textDecoration: browseYear ? 'underline' : 'none' }}>
                {GALLERY_CATEGORY_OPTIONS.find(o => o.value === browseCategory)?.label}
              </button>
              {browseYear && <>
                <span style={{ color: 'rgba(201,168,76,0.4)', fontSize: '0.78rem' }}>›</span>
                <button onClick={() => { setBrowseMonth(null); setSelectMode(false); setSelectedIds(new Set()); }}
                  style={{ background: 'none', border: 'none', color: browseMonth ? 'rgba(201,168,76,0.7)' : 'var(--wa-gold)', cursor: browseMonth ? 'pointer' : 'default', fontSize: '0.78rem', padding: 0, textDecoration: browseMonth ? 'underline' : 'none' }}>
                  {browseYear}
                </button>
              </>}
              {browseMonth && <>
                <span style={{ color: 'rgba(201,168,76,0.4)', fontSize: '0.78rem' }}>›</span>
                <span style={{ color: 'var(--wa-gold)', fontSize: '0.78rem' }}>{MONTH_NAMES[browseMonth]}</span>
              </>}
            </div>
          )}
          {browseCategory && (
            <button onClick={() => { if (browseMonth) { setBrowseMonth(null); setSelectMode(false); setSelectedIds(new Set()); } else if (browseYear) setBrowseYear(null); else setBrowseCategory(null); }}
              style={{ padding: '0.3rem 0.65rem', borderRadius: 6, border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.07)', color: 'var(--wa-gold)', cursor: 'pointer', fontSize: '0.72rem' }}>← Back</button>
          )}
          {browseCategory && browseYear && browseMonth && (selectMode ? (
            <>
              <button onClick={() => { if (selectedIds.size === visiblePhotos.length) setSelectedIds(new Set()); else setSelectedIds(new Set(visiblePhotos.map(p => p.id || p.imageUrl))); }}
                style={{ padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.08)', color: 'var(--wa-gold)', cursor: 'pointer', fontSize: '0.72rem' }}>
                {selectedIds.size === visiblePhotos.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedIds.size > 0 && (<button onClick={handleBulkDelete} style={{ padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Trash2 size={12} /> Delete ({selectedIds.size})
              </button>)}
              <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }} style={{ padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.72rem' }}>Cancel</button>
            </>
          ) : (<button onClick={() => setSelectMode(true)} style={{ padding: '0.35rem 0.75rem', borderRadius: 6, border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.07)', color: 'var(--wa-gold)', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckSquare size={13} /> Select
          </button>))}
        </div>

        {/* Category Cards (level 1) */}
        {!browseCategory && (
          galleryPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(235,230,220,0.3)' }}>No gallery photos yet</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '1rem' }}>
              {GALLERY_CATEGORY_OPTIONS.map(option => {
                const catPhotos = galleryPhotos.filter(p => p.category === option.value);
                return (
                  <button key={option.value} onClick={() => { if (catPhotos.length > 0) setBrowseCategory(option.value as GalleryCategory); }}
                    style={{ border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', overflow: 'hidden', padding: 0, background: 'rgba(255,255,255,0.03)', cursor: catPhotos.length > 0 ? 'pointer' : 'default', opacity: catPhotos.length === 0 ? 0.38 : 1, textAlign: 'left' }}>
                    <div style={{ height: 115, position: 'relative', background: 'rgba(201,168,76,0.05)', overflow: 'hidden' }}>
                      {catPhotos[0]?.imageUrl
                        ? <img src={catPhotos[0].imageUrl} alt={option.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2.2rem' }}>📁</div>
                      }
                      <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)', color: 'var(--wa-gold)', fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{catPhotos.length}</span>
                    </div>
                    <span style={{ display: 'block', padding: '0.55rem 0.75rem', color: 'var(--wa-light)', fontSize: '0.82rem', fontWeight: 700 }}>📂 {option.label}</span>
                  </button>
                );
              })}
            </div>
          )
        )}

        {/* Year Folders (level 2) */}
        {browseCategory && !browseYear && (() => {
          const catPhotos = galleryPhotos.filter(p => p.category === browseCategory);
          const yearMap = new Map<string, GalleryPhoto[]>();
          catPhotos.forEach(p => { const { year } = getPhotoYearMonth(p); if (!yearMap.has(year)) yearMap.set(year, []); yearMap.get(year)!.push(p); });
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '1rem' }}>
              {Array.from(yearMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([year, yPhotos]) => (
                <button key={year} onClick={() => setBrowseYear(year)}
                  style={{ border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', overflow: 'hidden', padding: 0, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ height: 105, position: 'relative', overflow: 'hidden' }}>
                    <img src={yPhotos[0].imageUrl} alt={year} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)', color: 'var(--wa-gold)', fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{yPhotos.length}</span>
                  </div>
                  <span style={{ display: 'block', padding: '0.55rem 0.75rem', color: 'var(--wa-light)', fontSize: '0.82rem', fontWeight: 700 }}>📅 {year}</span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Month Folders (level 3) */}
        {browseCategory && browseYear && !browseMonth && (() => {
          const yPhotos = galleryPhotos.filter(p => { if (p.category !== browseCategory) return false; const { year } = getPhotoYearMonth(p); return year === browseYear; });
          const monthMap = new Map<string, GalleryPhoto[]>();
          yPhotos.forEach(p => { const { month } = getPhotoYearMonth(p); if (!monthMap.has(month)) monthMap.set(month, []); monthMap.get(month)!.push(p); });
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '1rem' }}>
              {Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([month, mPhotos]) => (
                <button key={month} onClick={() => setBrowseMonth(month)}
                  style={{ border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', overflow: 'hidden', padding: 0, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ height: 105, position: 'relative', overflow: 'hidden' }}>
                    <img src={mPhotos[0].imageUrl} alt={month} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)', color: 'var(--wa-gold)', fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{mPhotos.length}</span>
                  </div>
                  <span style={{ display: 'block', padding: '0.55rem 0.75rem', color: 'var(--wa-light)', fontSize: '0.82rem', fontWeight: 700 }}>🗓️ {MONTH_NAMES[month]}</span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Photo Grid (level 4) */}
        {browseCategory && browseYear && browseMonth && (
          visiblePhotos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(235,230,220,0.3)' }}>No photos in this folder.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {visiblePhotos.map((photo) => { const photoKey = photo.id || photo.imageUrl; const isSelected = selectedIds.has(photoKey); return (
                <div key={photoKey} onClick={selectMode ? () => toggleSelect(photoKey) : undefined}
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isSelected ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.1)'}`, borderRadius: '12px', overflow: 'hidden', position: 'relative', cursor: selectMode ? 'pointer' : 'default', boxShadow: isSelected ? '0 0 0 2px rgba(201,168,76,0.3)' : 'none' }}>
                  {selectMode && (<div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, width: 20, height: 20, borderRadius: 4, border: '2px solid rgba(201,168,76,0.85)', background: isSelected ? 'var(--wa-gold)' : 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <Check size={12} style={{ color: '#000' }} />}
                  </div>)}
                  <img src={photo.imageUrl} alt={photo.title} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                  <div style={{ padding: '0.8rem' }}>
                    {editingId === (photo.id || photo.imageUrl) ? (
                      <div style={{ marginBottom: '0.35rem' }}>
                        <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSave(photo); if (e.key === 'Escape') handleRenameCancel(); }}
                          style={{ ...inputStyle, fontSize: '0.82rem', padding: '0.3rem 0.5rem', marginBottom: '0.4rem' }}
                          autoFocus disabled={renaming} />
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => handleRenameSave(photo)} disabled={renaming || !editingTitle.trim()}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.12)', color: 'var(--wa-gold)', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <Save size={11} /> Save
                          </button>
                          <button onClick={handleRenameCancel} disabled={renaming}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <X size={11} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                        <h4 style={{ color: 'var(--wa-light)', fontSize: '0.85rem', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.title}</h4>
                        {!selectMode && (<button onClick={(e) => { e.stopPropagation(); handleRenameStart(photo); }} title="Rename"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(201,168,76,0.65)', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <Pencil size={12} />
                        </button>)}
                      </div>
                    )}
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '999px', background: 'rgba(201,168,76,0.12)', color: 'var(--wa-gold)', fontSize: '0.62rem', textTransform: 'uppercase' }}>{photo.category}</span>
                    {!selectMode && (<div style={{ marginTop: '0.75rem' }}>
                      {deleteId === photoKey ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => handleDelete(photo)} style={{ padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.18)', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
                          <button onClick={() => setDeleteId(null)} style={{ padding: '0.35rem 0.7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(photoKey)} style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.08)', color: 'rgba(248,113,113,0.85)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}><Trash2 size={13} /> Delete</button>
                      )}
                    </div>)}
                  </div>
                </div>
              ); })}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// ── Main Dashboard ───────────────────────────────────────────────────────────
export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  logoUrl, photos, onAddPhoto, onUpdatePhoto, onDeletePhoto, onLogout, onViewSite,
  stories, onAddStory, onDeleteStory, onUpdateStory,
  videos, onAddVideo, onDeleteVideo, onUpdateVideo,
  allComments = [], onDeleteComment,
}) => {
  const [view, setView] = useState<AdminView>('dashboard');
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [search, setSearch] = useState('');
  // Manage Photos — Year/Month folder navigation
  const [mpFolderMode, setMpFolderMode] = useState(false);
  const [mpYear, setMpYear] = useState<string | null>(null);
  const [mpMonth, setMpMonth] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [storyDeleteConfirm, setStoryDeleteConfirm] = useState<number | null>(null);
  const [videoDeleteConfirm, setVideoDeleteConfirm] = useState<number | null>(null);
  const [contactMessages, setContactMessages] = React.useState<ContactMessage[]>([]);
  const [msgDeleteConfirm, setMsgDeleteConfirm] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  React.useEffect(() => {
    const unsub = subscribeToContactMessages((msgs) => setContactMessages(msgs));
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeSidebarOnMobile = () => { if (isMobile) setSidebarOpen(false); };

  const totalLikes = photos.reduce((sum, p) => sum + p.likeCount, 0);
  const nextPhotoId = Math.max(0, ...photos.map((p) => p.id)) + 1;
  const nextStoryId = Math.max(0, ...stories.map((s) => s.id)) + 1;
  const nextVideoId = Math.max(0, ...videos.map((v) => v.id)) + 1;

  const filteredPhotos = photos.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(search.toLowerCase())
  );

  // Year/Month folder helpers for Manage Photos
  const MP_MONTH_NAMES: Record<string, string> = { '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec' };
  const getMpPhotoDate = (p: Photo): { year: string; month: string } => {
    if ((p as any).storagePath) { const parts = (p as any).storagePath.split('/'); if (parts.length >= 5) return { year: parts[2], month: parts[3] }; }
    if ((p as any).createdAt?.toDate) { const d: Date = (p as any).createdAt.toDate(); return { year: String(d.getFullYear()), month: String(d.getMonth() + 1).padStart(2, '0') }; }
    return { year: '2026', month: '05' };
  };

  const handleSaveNew = (data: Photo) => { onAddPhoto(data); setView('photos'); };
  const handleSaveEdit = (data: Photo) => { onUpdatePhoto(data); setEditingPhoto(null); };
  const handleDelete = (id: number) => { onDeletePhoto(id); setDeleteConfirm(null); };

  const handleSaveNewStory = (data: Story) => { onAddStory(data); setView('stories'); };
  const handleSaveEditStory = (data: Story) => { onUpdateStory(data); setEditingStory(null); };
  const handleDeleteStory = (id: number) => { onDeleteStory(id); setStoryDeleteConfirm(null); };

  const handleSaveNewVideo = (data: Video) => { onAddVideo(data); setView('videos'); };
  const handleSaveEditVideo = (data: Video) => { onUpdateVideo(data); setEditingVideo(null); };
  const handleDeleteVideo = (id: number) => { onDeleteVideo(id); setVideoDeleteConfirm(null); };

  const sidebarItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    width: '100%', padding: '0.65rem 1rem', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
    background: active ? 'rgba(249,115,22,0.2)' : 'transparent',
    color: active ? '#ffffff' : 'rgba(248,250,252,0.88)',
    transition: 'all 0.2s',
  });

  const getViewTitle = () => {
    if (view === 'dashboard') return 'Dashboard Home';
    if (view === 'photos') return editingPhoto ? 'Edit Photo' : 'Manage Photos';
    if (view === 'add') return 'Add New Photo';
    if (view === 'gallery') return 'Gallery Management';
    if (view === 'stories') return editingStory ? 'Edit Story' : 'Manage Stories';
    if (view === 'add-story') return 'Add New Story';
    if (view === 'videos') return editingVideo ? 'Edit Video' : 'Manage Videos';
    if (view === 'add-video') return 'Add New Video';
    if (view === 'comments') return 'Manage Comments';
    if (view === 'ai-settings') return 'AI Configuration';
    if (view === 'site-settings') return 'Site Settings';
    if (view === 'messages') return 'Contact Messages';
    return '';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--wa-dark)' }}>
      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'rgba(5,12,8,0.97)',
        borderRight: '1px solid rgba(201,168,76,0.12)',
        display: 'flex', flexDirection: 'column', padding: '1.25rem 0.75rem',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, left: 0,
        height: '100vh', boxSizing: 'border-box', overflowY: 'auto',
        zIndex: 100,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: isMobile && sidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.5rem', marginBottom: '2rem' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Wilds Aura" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
          ) : (
            <>
              <div style={{
                width: 32, height: 32, borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--wa-gold)', fontSize: '1rem', fontWeight: 700,
              }}>W</div>
              <span className="font-cinzel" style={{ color: 'var(--wa-gold)', fontSize: '0.85rem', fontWeight: 600 }}>Wilds Aura</span>
            </>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <button style={sidebarItemStyle(view === 'dashboard')} onClick={() => { setView('dashboard'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <LayoutDashboard size={18} /> Dashboard Home
          </button>
          <button style={sidebarItemStyle(view === 'photos')} onClick={() => { setView('photos'); setEditingPhoto(null); closeSidebarOnMobile(); }}>
            <Image size={18} /> Photos
          </button>
          <button style={sidebarItemStyle(view === 'add')} onClick={() => { setView('add'); setEditingPhoto(null); closeSidebarOnMobile(); }}>
            <Plus size={18} /> Add Photo
          </button>
          <button style={sidebarItemStyle(view === 'gallery')} onClick={() => { setView('gallery'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <FileImage size={18} /> Photo Gallery
          </button>

          <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(248,250,252,0.62)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1rem', marginBottom: '0.25rem' }}>Content</p>
          </div>

          <button style={sidebarItemStyle(view === 'stories')} onClick={() => { setView('stories'); setEditingStory(null); closeSidebarOnMobile(); }}>
            <BookOpen size={18} /> Stories
          </button>
          <button style={sidebarItemStyle(view === 'add-story')} onClick={() => { setView('add-story'); setEditingStory(null); closeSidebarOnMobile(); }}>
            <Plus size={18} /> Add Story
          </button>
          <button style={sidebarItemStyle(view === 'videos')} onClick={() => { setView('videos'); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <Film size={18} /> Videos
          </button>
          <button style={sidebarItemStyle(view === 'add-video')} onClick={() => { setView('add-video'); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <Plus size={18} /> Add Video
          </button>

          <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(248,250,252,0.62)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1rem', marginBottom: '0.25rem' }}>Social</p>
          </div>
          <button style={sidebarItemStyle(view === 'comments')} onClick={() => { setView('comments'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <MessageCircle size={18} /> Comments
            {allComments.length > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                borderRadius: '10px', background: 'rgba(201,168,76,0.2)', color: 'var(--wa-gold)',
              }}>{allComments.length}</span>
            )}
          </button>
          <button style={sidebarItemStyle(view === 'messages')} onClick={() => { setView('messages'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <Mail size={18} /> Messages
            {contactMessages.length > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                borderRadius: '10px', background: 'rgba(201,168,76,0.2)', color: 'var(--wa-gold)',
              }}>{contactMessages.length}</span>
            )}
          </button>

          <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(248,250,252,0.62)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1rem', marginBottom: '0.25rem' }}>Settings</p>
          </div>
          <button style={sidebarItemStyle(view === 'ai-settings')} onClick={() => { setView('ai-settings'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <Cpu size={18} /> AI Settings
          </button>
          <button style={sidebarItemStyle(view === 'site-settings')} onClick={() => { setView('site-settings'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <Globe size={18} /> Site Settings
          </button>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid rgba(201,168,76,0.08)', paddingTop: '0.75rem' }}>
          <button style={sidebarItemStyle(false)} onClick={onViewSite}><Eye size={18} /> View Site</button>
          <button
            style={{ ...sidebarItemStyle(false), color: 'rgba(239,68,68,0.6)' }}
            onClick={onLogout}
            onMouseOver={(e) => e.currentTarget.style.color = '#f87171'}
            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(239,68,68,0.6)'}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          padding: '0.75rem 1rem', borderBottom: '1px solid rgba(201,168,76,0.08)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                display: isMobile ? 'flex' : 'none',
                alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, flexShrink: 0,
                background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '8px', cursor: 'pointer', color: 'var(--wa-gold)',
              }}
              aria-label="Toggle menu"
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>☰</span>
            </button>

            {/* ← Dashboard back button (all views except dashboard) */}
            {view !== 'dashboard' && (
              <button
                onClick={() => { setView('dashboard'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0,
                  background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: '8px', cursor: 'pointer', color: 'var(--wa-gold)',
                  padding: '0.4rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap',
                  fontFamily: "'Cinzel', serif", letterSpacing: '0.05em',
                }}
              >
                ← Dashboard
              </button>
            )}

            <h1 className="font-cinzel" style={{
              fontSize: isMobile ? '0.85rem' : '1.1rem',
              color: 'var(--wa-light)', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{getViewTitle()}</h1>
          </div>

          <button onClick={onViewSite} style={{
            padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.75rem',
          }}><Eye size={14} />{!isMobile && ' View Site'}</button>
        </header>

        <div style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: 'auto' }}>
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <>
              {/* Quick action: View Website */}
              <div
                onClick={onViewSite}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', marginBottom: '1.25rem',
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
                  border: '1px solid rgba(201,168,76,0.25)', borderRadius: '12px',
                  cursor: 'pointer', transition: 'all 0.3s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.1))'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '10px',
                    background: 'rgba(201,168,76,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}>🏠</div>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--wa-light)', marginBottom: '0.15rem' }}>
                      View Website
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(235,230,220,0.45)' }}>
                      Open WildSaura homepage
                    </p>
                  </div>
                </div>
                <span style={{ color: 'var(--wa-gold)', fontSize: '1.2rem' }}>→</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard icon={<Image size={24} />} label="Total Photos" value={photos.length} color="blue" />
                <StatCard icon={<Heart size={24} />} label="Total Likes" value={totalLikes} color="red" />
                <StatCard icon={<BookOpen size={24} />} label="Stories" value={stories.length} color="green" />
                <StatCard icon={<Film size={24} />} label="Videos" value={videos.length} color="gold" />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 className="font-cinzel" style={{ fontSize: '0.85rem', color: 'var(--wa-gold)', marginBottom: '1rem', letterSpacing: '0.08em' }}>Category Breakdown</h3>
                {['wildlife', 'landscape', 'street', 'nature', 'other'].map((cat) => {
                  const count = photos.filter((p) => p.category === cat).length;
                  const pct = photos.length ? Math.round((count / photos.length) * 100) : 0;
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <span style={{ width: 75, fontSize: '0.75rem', color: 'rgba(235,230,220,0.5)', textTransform: 'capitalize' }}>{cat}</span>
                      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: 'linear-gradient(90deg, var(--wa-gold), var(--wa-gold-light))', transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ width: 24, fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)', textAlign: 'right' }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 className="font-cinzel" style={{ fontSize: '0.85rem', color: 'var(--wa-gold)', marginBottom: '1rem', letterSpacing: '0.08em' }}>Recent Photos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                  {photos.slice(-4).reverse().map((p) => (
                    <div key={p.id} style={{ borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                      <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.5rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--wa-light)', fontWeight: 600 }}>{p.title}</p>
                        <p style={{ fontSize: '0.6rem', color: 'rgba(201,168,76,0.6)', textTransform: 'capitalize' }}>{p.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Photos View */}
          {view === 'photos' && !editingPhoto && (
            <>
              {/* ── Top bar ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
                  {!mpFolderMode && (
                    <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(235,230,220,0.3)' }} />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search photos..."
                        style={{ ...inputStyle, paddingLeft: '2.25rem' }} />
                    </div>
                  )}
                  {mpFolderMode && mpYear && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button onClick={() => { setMpYear(null); setMpMonth(null); }} style={{ background: 'none', border: 'none', color: 'rgba(201,168,76,0.7)', cursor: 'pointer', fontSize: '0.78rem', padding: 0, textDecoration: 'underline' }}>All Years</button>
                      <span style={{ color: 'rgba(201,168,76,0.4)', fontSize: '0.78rem' }}>›</span>
                      {mpMonth ? (
                        <>
                          <button onClick={() => setMpMonth(null)} style={{ background: 'none', border: 'none', color: 'rgba(201,168,76,0.7)', cursor: 'pointer', fontSize: '0.78rem', padding: 0, textDecoration: 'underline' }}>{mpYear}</button>
                          <span style={{ color: 'rgba(201,168,76,0.4)', fontSize: '0.78rem' }}>›</span>
                          <span style={{ color: 'var(--wa-gold)', fontSize: '0.78rem' }}>{MP_MONTH_NAMES[mpMonth]}</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--wa-gold)', fontSize: '0.78rem' }}>{mpYear}</span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {mpFolderMode && mpYear && (
                    <button onClick={() => { if (mpMonth) setMpMonth(null); else setMpYear(null); }}
                      style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.07)', color: 'var(--wa-gold)', cursor: 'pointer', fontSize: '0.72rem' }}>← Back</button>
                  )}
                  <button className="btn-gold" onClick={() => setView('add')} style={{ padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {/* ── View mode toggle ── */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(201,168,76,0.08)', paddingBottom: '1rem' }}>
                <button onClick={() => { setMpFolderMode(false); setMpYear(null); setMpMonth(null); }}
                  style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: `1px solid ${!mpFolderMode ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`, background: !mpFolderMode ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)', color: !mpFolderMode ? 'var(--wa-gold)' : 'rgba(235,230,220,0.4)', cursor: 'pointer', fontSize: '0.75rem' }}>
                  📋 All Photos
                </button>
                <button onClick={() => { setMpFolderMode(true); setSearch(''); }}
                  style={{ padding: '0.35rem 0.85rem', borderRadius: '8px', border: `1px solid ${mpFolderMode ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`, background: mpFolderMode ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)', color: mpFolderMode ? 'var(--wa-gold)' : 'rgba(235,230,220,0.4)', cursor: 'pointer', fontSize: '0.75rem' }}>
                  📅 Year / Month
                </button>
              </div>

              {/* ── All Photos: 2-column compact grid ── */}
              {!mpFolderMode && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {filteredPhotos.map((p) => (
                      <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ position: 'relative' }}>
                          <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                          <span style={{ position: 'absolute', top: 5, right: 5, padding: '0.15rem 0.45rem', borderRadius: '999px', fontSize: '0.55rem', background: p.published !== false ? 'rgba(34,197,94,0.9)' : 'rgba(245,158,11,0.9)', color: '#fff', fontWeight: 700 }}>
                            {p.published !== false ? '● Live' : '● Draft'}
                          </span>
                        </div>
                        <div style={{ padding: '0.6rem' }}>
                          <h4 style={{ color: 'var(--wa-light)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.58rem', textTransform: 'capitalize', background: 'rgba(201,168,76,0.1)', color: 'var(--wa-gold)', border: '1px solid rgba(201,168,76,0.2)' }}>{p.category}</span>
                            {p.location && <span style={{ fontSize: '0.58rem', color: 'rgba(235,230,220,0.38)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{p.location}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', color: 'rgba(239,68,68,0.6)' }}><Heart size={11} /> {p.likeCount}</span>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button onClick={() => { const newPublished = p.published !== false ? false : true; onUpdatePhoto({ ...p, published: newPublished }); if (p.firestoreId) { updatePhotoInFirestore(p.firestoreId, { published: newPublished }).catch(err => console.warn('Publish toggle failed:', err)); } }} title={p.published !== false ? 'Unpublish' : 'Publish'} style={{ width: 26, height: 26, borderRadius: '5px', background: p.published !== false ? 'rgba(34,197,94,0.15)' : 'rgba(255,165,0,0.15)', border: `1px solid ${p.published !== false ? 'rgba(34,197,94,0.2)' : 'rgba(255,165,0,0.2)'}`, color: p.published !== false ? '#22c55e' : '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.published !== false ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                              <button onClick={() => setEditingPhoto(p)} style={{ width: 26, height: 26, borderRadius: '5px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={12} /></button>
                              {deleteConfirm === p.id ? (
                                <div style={{ display: 'flex', gap: '0.2rem' }}>
                                  <button onClick={() => handleDelete(p.id)} style={{ padding: '0 0.5rem', height: 26, borderRadius: '5px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '0.65rem' }}>Del</button>
                                  <button onClick={() => setDeleteConfirm(null)} style={{ width: 26, height: 26, borderRadius: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(235,230,220,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(p.id)} style={{ width: 26, height: 26, borderRadius: '5px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredPhotos.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(235,230,220,0.3)' }}>No photos found.</div>}
                </>
              )}

              {/* ── By Year/Month: Year folders ── */}
              {mpFolderMode && !mpYear && (() => {
                const yearMap = new Map<string, Photo[]>();
                photos.forEach(p => { const { year } = getMpPhotoDate(p); if (!yearMap.has(year)) yearMap.set(year, []); yearMap.get(year)!.push(p); });
                return yearMap.size === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(235,230,220,0.3)' }}>No photos yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '1rem' }}>
                    {Array.from(yearMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([year, yPhotos]) => (
                      <button key={year} onClick={() => setMpYear(year)}
                        style={{ border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', overflow: 'hidden', padding: 0, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ height: 105, position: 'relative', overflow: 'hidden' }}>
                          <img src={yPhotos[0].imageUrl} alt={year} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)', color: 'var(--wa-gold)', fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{yPhotos.length}</span>
                        </div>
                        <span style={{ display: 'block', padding: '0.55rem 0.75rem', color: 'var(--wa-light)', fontSize: '0.82rem', fontWeight: 700 }}>📅 {year}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* ── By Year/Month: Month folders ── */}
              {mpFolderMode && mpYear && !mpMonth && (() => {
                const yPhotos = photos.filter(p => getMpPhotoDate(p).year === mpYear);
                const monthMap = new Map<string, Photo[]>();
                yPhotos.forEach(p => { const { month } = getMpPhotoDate(p); if (!monthMap.has(month)) monthMap.set(month, []); monthMap.get(month)!.push(p); });
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '1rem' }}>
                    {Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([month, mPhotos]) => (
                      <button key={month} onClick={() => setMpMonth(month)}
                        style={{ border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', overflow: 'hidden', padding: 0, background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ height: 105, position: 'relative', overflow: 'hidden' }}>
                          <img src={mPhotos[0].imageUrl} alt={month} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)', color: 'var(--wa-gold)', fontSize: '0.65rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{mPhotos.length}</span>
                        </div>
                        <span style={{ display: 'block', padding: '0.55rem 0.75rem', color: 'var(--wa-light)', fontSize: '0.82rem', fontWeight: 700 }}>🗓️ {MP_MONTH_NAMES[month]}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* ── By Year/Month: Photo grid inside a month ── */}
              {mpFolderMode && mpYear && mpMonth && (() => {
                const mPhotos = photos.filter(p => { const d = getMpPhotoDate(p); return d.year === mpYear && d.month === mpMonth; });
                return mPhotos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(235,230,220,0.3)' }}>No photos in this folder.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {mPhotos.map((p) => (
                      <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ position: 'relative' }}>
                          <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                          <span style={{ position: 'absolute', top: 5, right: 5, padding: '0.15rem 0.45rem', borderRadius: '999px', fontSize: '0.55rem', background: p.published !== false ? 'rgba(34,197,94,0.9)' : 'rgba(245,158,11,0.9)', color: '#fff', fontWeight: 700 }}>
                            {p.published !== false ? '● Live' : '● Draft'}
                          </span>
                        </div>
                        <div style={{ padding: '0.6rem' }}>
                          <h4 style={{ color: 'var(--wa-light)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.58rem', textTransform: 'capitalize', background: 'rgba(201,168,76,0.1)', color: 'var(--wa-gold)', border: '1px solid rgba(201,168,76,0.2)' }}>{p.category}</span>
                            {p.location && <span style={{ fontSize: '0.58rem', color: 'rgba(235,230,220,0.38)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{p.location}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', color: 'rgba(239,68,68,0.6)' }}><Heart size={11} /> {p.likeCount}</span>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button onClick={() => { const newPublished = p.published !== false ? false : true; onUpdatePhoto({ ...p, published: newPublished }); if (p.firestoreId) { updatePhotoInFirestore(p.firestoreId, { published: newPublished }).catch(err => console.warn('Publish toggle failed:', err)); } }} title={p.published !== false ? 'Unpublish' : 'Publish'} style={{ width: 26, height: 26, borderRadius: '5px', background: p.published !== false ? 'rgba(34,197,94,0.15)' : 'rgba(255,165,0,0.15)', border: `1px solid ${p.published !== false ? 'rgba(34,197,94,0.2)' : 'rgba(255,165,0,0.2)'}`, color: p.published !== false ? '#22c55e' : '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.published !== false ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                              <button onClick={() => setEditingPhoto(p)} style={{ width: 26, height: 26, borderRadius: '5px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={12} /></button>
                              {deleteConfirm === p.id ? (
                                <div style={{ display: 'flex', gap: '0.2rem' }}>
                                  <button onClick={() => handleDelete(p.id)} style={{ padding: '0 0.5rem', height: 26, borderRadius: '5px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '0.65rem' }}>Del</button>
                                  <button onClick={() => setDeleteConfirm(null)} style={{ width: 26, height: 26, borderRadius: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(235,230,220,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(p.id)} style={{ width: 26, height: 26, borderRadius: '5px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {view === 'photos' && editingPhoto && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <PhotoForm initial={editingPhoto} onSave={handleSaveEdit} onCancel={() => setEditingPhoto(null)} nextId={nextPhotoId} />
            </div>
          )}

          {view === 'add' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <PhotoForm onSave={handleSaveNew} onCancel={() => setView('photos')} nextId={nextPhotoId} />
            </div>
          )}

          {view === 'gallery' && <GalleryManagement />}

          {/* Stories View */}
          {view === 'stories' && !editingStory && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button className="btn-gold" onClick={() => setView('add-story')} style={{ padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <Plus size={16} /> Add Story
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {stories.map((s) => (
                  <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                    <img src={s.coverImageUrl} alt={s.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ color: 'var(--wa-light)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>{s.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{s.excerpt.substring(0, 100)}...</p>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {s.tags.map((t) => (
                          <span key={t} style={{ padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.6rem', background: 'rgba(201,168,76,0.1)', color: 'var(--wa-gold)' }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(235,230,220,0.3)' }}>{s.viewCount} views · {s.likeCount} likes</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => setEditingStory(s)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={14} /></button>
                          {storyDeleteConfirm === s.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={() => handleDeleteStory(s.id)} style={{ padding: '0 0.6rem', height: 32, borderRadius: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
                              <button onClick={() => setStoryDeleteConfirm(null)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(235,230,220,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setStoryDeleteConfirm(s.id)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {stories.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(235,230,220,0.3)' }}>No stories yet. Create your first one!</div>}
            </>
          )}

          {view === 'stories' && editingStory && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <StoryForm initial={editingStory} onSave={handleSaveEditStory} onCancel={() => setEditingStory(null)} nextId={nextStoryId} />
            </div>
          )}

          {view === 'add-story' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <StoryForm onSave={handleSaveNewStory} onCancel={() => setView('stories')} nextId={nextStoryId} />
            </div>
          )}

          {/* Videos View */}
          {view === 'videos' && !editingVideo && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button className="btn-gold" onClick={() => setView('add-video')} style={{ padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <Plus size={16} /> Add Video
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {videos.map((v) => (
                  <div key={v.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ position: 'relative' }}>
                      {v.thumbnailUrl ? (
                        <img src={v.thumbnailUrl} alt={v.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: 140, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Film size={32} style={{ color: 'var(--wa-gold)', opacity: 0.4 }} />
                        </div>
                      )}
                      {v.duration && (
                        <div style={{ position: 'absolute', bottom: 8, right: 8, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
                          {v.duration}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ color: 'var(--wa-light)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>{v.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(235,230,220,0.4)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{v.description?.substring(0, 100) || 'No description'}...</p>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {v.tags.map((t) => (
                          <span key={t} style={{ padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.6rem', background: 'rgba(201,168,76,0.1)', color: 'var(--wa-gold)' }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(235,230,220,0.3)' }}>{v.viewCount} views · {v.likeCount} likes</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => setEditingVideo(v)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={14} /></button>
                          {videoDeleteConfirm === v.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={() => handleDeleteVideo(v.id)} style={{ padding: '0 0.6rem', height: 32, borderRadius: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
                              <button onClick={() => setVideoDeleteConfirm(null)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(235,230,220,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setVideoDeleteConfirm(v.id)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {videos.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(235,230,220,0.3)' }}>No videos yet. Upload your first one!</div>}
            </>
          )}

          {view === 'videos' && editingVideo && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <VideoForm initial={editingVideo} onSave={handleSaveEditVideo} onCancel={() => setEditingVideo(null)} nextId={nextVideoId} />
            </div>
          )}

          {view === 'add-video' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem' }}>
              <VideoForm onSave={handleSaveNewVideo} onCancel={() => setView('videos')} nextId={nextVideoId} />
            </div>
          )}


          {/* Comments Management View */}
          {view === 'comments' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 200 }}>
                  <Search size={16} style={{ color: 'var(--wa-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search comments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="wa-input"
                    style={{ flex: 1 }}
                  />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--wa-text-muted)' }}>
                  {allComments.length} total comments
                </span>
              </div>

              {allComments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--wa-text-muted)' }}>
                  <MessageCircle size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>No comments yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {allComments
                    .filter((c: any) =>
                      c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
                      c.content?.toLowerCase().includes(search.toLowerCase())
                    )
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((c: any) => {
                      const targetItem = c.targetType === 'photo'
                        ? photos.find(p => p.firestoreId === c.targetId)
                        : c.targetType === 'story'
                        ? stories.find(s => s.firestoreId === c.targetId)
                        : videos.find(v => v.firestoreId === c.targetId);
                      const targetName = targetItem?.title || `Unknown ${c.targetType}`;
                      const typeIcon = c.targetType === 'photo' ? '📷' : c.targetType === 'story' ? '📖' : '🎬';
                      const typeColor = c.targetType === 'photo' ? 'rgba(59,130,246,0.2)' : c.targetType === 'story' ? 'rgba(168,85,247,0.2)' : 'rgba(239,68,68,0.2)';

                      return (
                        <div key={c.id} style={{
                          padding: '1rem', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--wa-border)',
                          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                        }}>
                          {/* Avatar */}
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.displayName} style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0, objectFit: 'cover',
                            }} referrerPolicy="no-referrer" />
                          ) : (
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: c.avatarColor || 'var(--wa-gold)',
                              fontSize: '0.8rem', fontWeight: 700, color: '#000',
                            }}>
                              {(c.displayName || '?')[0].toUpperCase()}
                            </div>
                          )}

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--wa-text)' }}>{c.displayName}</span>
                              <span style={{
                                fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '4px',
                                background: typeColor, color: 'var(--wa-text-muted)',
                              }}>
                                {typeIcon} {c.targetType}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--wa-text-muted)' }}>
                                on "{targetName}"
                              </span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--wa-text)', opacity: 0.85, lineHeight: 1.5, wordBreak: 'break-word' }}>
                              {c.content}
                            </p>
                            <span style={{ fontSize: '0.65rem', color: 'var(--wa-text-muted)', marginTop: '0.3rem', display: 'block' }}>
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {/* Delete button */}
                          {onDeleteComment && (
                            <button
                              onClick={() => onDeleteComment(c.id)}
                              title="Delete comment"
                              style={{
                                background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.25)',
                                borderRadius: '6px', cursor: 'pointer', padding: '0.35rem',
                                color: 'rgba(255,100,100,0.7)', display: 'flex', alignItems: 'center',
                                transition: 'all 0.2s', flexShrink: 0,
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
          )}

          {/* Contact Messages View */}
          {view === 'messages' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(235,230,220,0.5)' }}>
                  {contactMessages.length} message{contactMessages.length !== 1 ? 's' : ''}
                </span>
              </div>

              {contactMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(235,230,220,0.3)' }}>
                  <Mail size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>No messages yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {contactMessages.map((msg) => (
                    <div key={msg.id} style={{
                      padding: '1.25rem', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(201,168,76,0.1)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--wa-light)' }}>{msg.name}</span>
                            <a href={`mailto:${msg.email}`} style={{ fontSize: '0.75rem', color: 'var(--wa-gold)', textDecoration: 'none' }}>{msg.email}</a>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(235,230,220,0.7)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.message}
                          </p>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(235,230,220,0.3)', marginTop: '0.5rem', display: 'block' }}>
                            {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                          <button onClick={(e) => { e.stopPropagation(); window.open(`mailto:${msg.email}`, '_blank'); }} title="Reply" style={{
                            width: 36, height: 36, borderRadius: '6px',
                            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)',
                            color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}><Mail size={14} /></button>
                          {msgDeleteConfirm === msg.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={async (e) => { e.stopPropagation(); if (msg.id) { try { await deleteContactMessage(msg.id); setMsgDeleteConfirm(null); } catch (err) { console.error('Delete failed:', err); alert('Delete failed. Check Firestore rules.'); setMsgDeleteConfirm(null); } } }} style={{
                                padding: '0 0.6rem', height: 36, borderRadius: '6px',
                                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                              }}>Delete</button>
                              <button onClick={(e) => { e.stopPropagation(); setMsgDeleteConfirm(null); }} style={{
                                width: 36, height: 36, borderRadius: '6px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(235,230,220,0.5)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}><X size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); setMsgDeleteConfirm(msg.id || null); }} style={{
                              width: 36, height: 36, borderRadius: '6px',
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)',
                              color: 'rgba(239,68,68,0.5)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* AI Settings View */}
          {view === 'ai-settings' && <AISettingsPanel />}
          {view === 'site-settings' && <SiteSettingsForm />}
        </div>
      </main>
    </div>
  );
};
