import React, { useState, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Image, Plus, Pencil, Trash2, LogOut, Eye, EyeOff, CheckSquare, Check,
  MapPin, Heart, BarChart3, TrendingUp, X, Save, Search, BookOpen,
  Upload, Sparkles, Film, Camera, FileImage, Loader2, Info,
  Settings, Cpu, MessageCircle, Globe, Mail, Users, Activity, Share2, Wifi, Download, MessageSquare
} from 'lucide-react';
import { subscribeToAnalytics, subscribeToOnlineCount, SiteAnalytics, VisitorRecord } from '../services/analyticsService';
import { 
  fetchAllSelfAds, createSelfAd, updateSelfAd, deleteSelfAd, toggleSelfAd, 
  uploadAdImage, SelfAd 
} from '../services/selfAdService';
import { Photo, Story, Video, GalleryPhoto, GalleryCategory } from '../types';
import { analyzePhoto, getAnimalInfo } from '../utils/aiService';
import { uploadPhotoToStorage, uploadThumbnailToStorage, addPhotoToFirestore, updatePhotoInFirestore } from '../services/photoService';
import { getAISettings } from '../services/aiSettingsService';
import { AISettingsPanel } from './AISettings';
import { getSiteSettings, saveSiteSettings, uploadHeroImage, uploadDefaultThumbnail, uploadCategoryImage, SiteSettings } from '../services/siteSettingsService';
import { applyWatermark, bakeWatermarkOnFile } from '../utils/watermark';
import { uploadVideoToStorage, uploadVideoThumbnailToStorage } from '../services/videoService';
import { compressImageForAI, compressForUpload, generateThumbnail } from '../utils/imageCompressor';
import { processGalleryImage } from '../utils/galleryImageProcessor';
import { compressVideoForUpload } from '../utils/videoCompressor';
import { readExifFromFile } from '../utils/exifReader';
import { subscribeToContactMessages, deleteContactMessage, ContactMessage } from '../services/contactService';
import { addGalleryPhotoToFirestore, deleteGalleryPhoto, subscribeToGalleryPhotos, uploadGalleryBlobToStorage, updateGalleryPhotoTitle } from '../services/galleryService';
import './AdminDashboard.css';



type AdminView = 'dashboard' | 'photos' | 'add' | 'gallery' | 'stories' | 'add-story' | 'videos' | 'add-video' | 'comments' | 'messages' | 'ai-settings' | 'site-settings' | 'self-ads';

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
  width: '100%', padding: '0.78rem 0.9rem',
  background: '#101a15', border: '1px solid rgba(185,201,173,0.18)',
  borderRadius: '10px', color: 'var(--wa-text)', fontSize: '0.86rem',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.66rem', color: 'rgba(243,240,232,0.56)',
  marginBottom: '0.45rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
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

function toSeoSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
    <div className="admin-upload-zone">
      <label style={labelStyle}>{label} *</label>
      <div
        className="admin-upload-dropzone"
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
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string; hint?: string }> = ({ icon, label, value, color, hint }) => (
  <div className="admin-stat-card" style={{
    background: 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))', border: '1px solid rgba(243,240,232,0.1)',
    borderRadius: '18px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem',
    minHeight: 102,
  }}>
    <div className="admin-stat-card__icon" data-tone={color} style={{
      width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
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
    <div style={{ minWidth: 0 }}>
      <p className="admin-stat-card__value" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--wa-text)', lineHeight: 1 }}>{value}</p>
      <p className="admin-stat-card__label" style={{ fontSize: '0.67rem', color: 'rgba(243,240,232,0.5)', marginTop: '0.32rem', lineHeight: 1.2 }}>{label}</p>
      {hint && <p className="admin-stat-card__hint" style={{ fontSize: '0.59rem', color: 'rgba(185,201,173,0.64)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</p>}
    </div>
  </div>
);

const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018))',
  border: '1px solid rgba(243,240,232,0.1)',
  borderRadius: '20px',
  padding: '1.3rem',
  boxShadow: '0 18px 46px rgba(0,0,0,0.16)',
};

const MiniBar: React.FC<{ label: string; value: number; max: number; note?: string; color?: string }> = ({ label, value, max, note, color = 'var(--wa-gold)' }) => {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="admin-mini-bar" style={{ display: 'grid', gridTemplateColumns: 'minmax(82px, 0.8fr) 1.8fr auto', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
      <span style={{ fontSize: '0.68rem', color: 'rgba(235,230,220,0.62)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div className="admin-mini-bar__track" style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10 }} />
      </div>
      <span style={{ fontSize: '0.68rem', color: 'rgba(235,230,220,0.72)', textAlign: 'right', minWidth: 42 }}>{value}{note ? ` ${note}` : ''}</span>
    </div>
  );
};

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
  const [altText, setAltText] = useState(initial?.altText || '');
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle || initial?.title || '');
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription || initial?.caption || '');
  const [seoPhrasesInput, setSeoPhrasesInput] = useState(initial?.seoPhrases?.join(', ') || '');
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

      // Smart compression: WebP, adaptive quality, targets ~1MB max
      // Also generates a small thumbnail for fast gallery loading
      if (!isVideo) {
        try {
          const webpFile = await compressForUpload(file);
          setCompressedFile(webpFile);

          // Generate thumbnail for gallery (720px, capped around 280KB WebP)
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
          if (analysis.title && !seoTitle) setSeoTitle(analysis.title);
          if (analysis.caption) {
            setCaption(analysis.caption);
            if (!altText) setAltText(analysis.caption);
            if (!seoDescription) setSeoDescription(analysis.caption);
          }
          setCategory(analysis.category);
          if (analysis.location) setLocation(analysis.location);
          if (analysis.tags?.length) {
            setTags(analysis.tags);
            setTagsInput(analysis.tags.join(', '));
            if (!seoPhrasesInput) setSeoPhrasesInput(analysis.tags.join(', '));
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
  }, [previewDataUrl, uploadedFileName, category, title, caption, location, cameraModel, lens, aperture, shutterSpeed, iso, focalLength, altText, seoDescription, seoPhrasesInput, seoTitle]);

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;
    setSaving(true);
    const finalTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : tags;
    const finalSeoPhrases = seoPhrasesInput.split(',').map(t => t.trim()).filter(Boolean);
    
    // Parse lat/lng safely - strip any non-numeric chars except dot and minus
    const cleanLat = latitudeStr.replace(/[^0-9.\-]/g, '').trim();
    const cleanLng = longitudeStr.replace(/[^0-9.\-]/g, '').trim();
    const parsedLat = cleanLat ? parseFloat(cleanLat) : NaN;
    const parsedLng = cleanLng ? parseFloat(cleanLng) : NaN;
    const hasValidLat = !isNaN(parsedLat) && isFinite(parsedLat);
    const hasValidLng = !isNaN(parsedLng) && isFinite(parsedLng);
    
    let finalImageUrl = imageUrl;
    let thumbnailUrl = initial?.thumbnailUrl || '';
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
      const slug = toSeoSlug(title);
      const photoData: Record<string, any> = {
        title, caption: caption || '', altText: altText || caption || title,
        seoTitle: seoTitle || title, seoDescription: seoDescription || caption || '',
        seoPhrases: finalSeoPhrases,
        category, imageUrl: finalImageUrl,
        slug,
        thumbnailUrl: thumbnailUrl || '',
        location: location || '', tags: finalTags, animalName: animalName || '',
        cameraModel: cameraModel || '', lens: lens || '', aperture: aperture || '',
        shutterSpeed: shutterSpeed || '', iso: iso || '', focalLength: focalLength || '',
        likeCount: initial?.likeCount || 0,
        viewCount: initial?.viewCount || 0,
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
      slug: toSeoSlug(title),
      title, category, imageUrl: finalImageUrl, thumbnailUrl: thumbnailUrl || '', location, caption,
      altText: altText || caption || title,
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || caption || '',
      seoPhrases: finalSeoPhrases,
      type: mediaType === 'video' ? 'video' : 'photo',
      cameraModel, lens, aperture, shutterSpeed, iso, focalLength,
      tags: finalTags, animalName: animalName || '', wikiSummary: wikiSummary || '',
      photographer: photographer || '',
      originalSize: originalFileSize || undefined,
      compressedSize: compressedFile?.size || undefined,
      likeCount: initial?.likeCount || 0, viewCount: initial?.viewCount || 0, liked: initial?.liked || false,
      published: initial?.published !== false,
    };
    if (hasValidLat) savedPhoto.latitude = parsedLat;
    if (hasValidLng) savedPhoto.longitude = parsedLng;
    
    onSave(savedPhoto);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="admin-photo-studio">
      <aside className="admin-photo-studio__intro">
        <p>01 / Select &amp; describe</p>
        <h2>One frame.<br />A complete story.</h2>
        <p>Select the original photograph, then review its title, story, accessibility and search details before publishing.</p>
        <div className="admin-photo-studio__review-note">
          <strong>Human reviewed</strong>
          <span>Nothing publishes until every suggestion is checked.</span>
        </div>
      </aside>
      <div className="admin-photo-studio__workspace">
      {/* Upload Zone */}
      <div className="admin-photo-studio__upload" style={{ marginBottom: '1.5rem' }}>
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
      <div className="admin-photo-url-divider" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
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
      <div className="admin-metadata-assistant" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-metadata-assistant__heading">
          <span><Sparkles size={17} /></span>
          <div><small>Vision + search language</small><strong>WildSaura metadata assistant</strong></div>
        </div>
        <p>Generate an editable title, description, tags, alt text and search metadata from the selected photograph.</p>
        <button
          type="button"
          onClick={handleAiFill}
          disabled={aiGenerating}
          style={{
            width: '100%', padding: '0.75rem 1.25rem',
            background: '#b8dc16',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '10px', cursor: aiGenerating ? 'wait' : 'pointer',
            color: '#10130f', fontSize: '0.85rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'all 0.3s',
          }}
          onMouseOver={(e) => { if (!aiGenerating) e.currentTarget.style.background = '#c7eb2b'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#b8dc16'; }}
        >
          {aiGenerating ? (
            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {aiStatus || 'AI is analyzing...'}</>
          ) : (
            <><Sparkles size={18} /> Generate editorial details</>
          )}
        </button>
        {aiStatus && !aiGenerating && (
          <p style={{ fontSize: '0.75rem', color: 'var(--wa-gold)', textAlign: 'center', marginTop: '0.5rem' }}>{aiStatus}</p>
        )}
      </div>

      <div className="admin-photo-metadata-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Photograph title *</label>
          <input value={title} onChange={(e) => { setTitle(e.target.value); if (!seoTitle || seoTitle === title) setSeoTitle(e.target.value); }} required placeholder="A clear, memorable title" style={inputStyle} />
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
          <label style={labelStyle}>Photographer name</label>
          <input value={photographer} onChange={(e) => setPhotographer(e.target.value)} placeholder="e.g. Madan Shrestha" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Latitude</label>
              <input type="text" inputMode="decimal" value={latitudeStr} onChange={(e) => setLatitudeStr(e.target.value.replace(/[^0-9.\-]/g, ''))} placeholder="e.g. 27.7172" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Longitude</label>
              <input type="text" inputMode="decimal" value={longitudeStr} onChange={(e) => setLongitudeStr(e.target.value.replace(/[^0-9.\-]/g, ''))} placeholder="e.g. 85.3240" style={inputStyle} />
            </div>
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Story or description</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Describe the visible story, setting and moment..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
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

        <div>
          <label style={labelStyle}>SEO phrases</label>
          <input value={seoPhrasesInput} onChange={(e) => setSeoPhrasesInput(e.target.value)} placeholder="natural phrases, comma separated" style={inputStyle} />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Accessible media description</label>
          <textarea value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe what is visibly present in the photograph" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <section className="admin-photo-search-preview" style={{ gridColumn: '1 / -1' }}>
          <p>Search preview</p>
          <div>
            <label style={labelStyle}>SEO title</label>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Search result title" maxLength={70} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>SEO description</label>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="A concise search result description" maxLength={170} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div className="admin-photo-search-preview__result">
            <small>wildsaura.com/photo/{toSeoSlug(title) || 'photograph'}</small>
            <strong>{seoTitle || title || 'Photograph title'}</strong>
            <span>{seoDescription || caption || 'The search description will appear here.'}</span>
          </div>
        </section>

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
          <span className="font-cinzel" style={{ fontSize: '0.7rem', color: 'var(--wa-gold)', letterSpacing: '0.1em' }}>Camera &amp; EXIF data (auto-filled from photo)</span>
          {exifStatus && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: exifStatus.startsWith('✅') ? '#4ade80' : exifStatus.startsWith('⚠') ? '#fbbf24' : '#f87171' }}>{exifStatus}</span>}
        </div>
        <div><label style={labelStyle}>Camera Model</label><input value={cameraModel} onChange={(e) => setCameraModel(e.target.value)} placeholder="Auto-detected from JPEG" style={inputStyle} /></div>
        <div><label style={labelStyle}>Lens</label><input value={lens} onChange={(e) => setLens(e.target.value)} placeholder="RF 100-500mm" style={inputStyle} /></div>
        <div><label style={labelStyle}>Aperture</label><input value={aperture} onChange={(e) => setAperture(e.target.value)} placeholder="f/5.6" style={inputStyle} /></div>
        <div><label style={labelStyle}>Shutter Speed</label><input value={shutterSpeed} onChange={(e) => setShutterSpeed(e.target.value)} placeholder="1/1000s" style={inputStyle} /></div>
        <div><label style={labelStyle}>ISO</label><input value={iso} onChange={(e) => setIso(e.target.value)} placeholder="800" style={inputStyle} /></div>
        <div><label style={labelStyle}>Focal Length</label><input value={focalLength} onChange={(e) => setFocalLength(e.target.value)} placeholder="400mm" style={inputStyle} /></div>
      </div>

      <div className="admin-photo-studio__actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
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
      // Story covers share the same photo-grade WebP pipeline as the main
      // portfolio: up to 2560px and about 1MB. The old 800px thumbnail was
      // visibly soft in featured cards and on high-density screens.
      const coverFile = await bakeWatermarkOnFile(file);
      const finalUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(coverFile);
      });
      setPreviewUrl(finalUrl);
      setCoverImageUrl(finalUrl);

      // Also try uploading to Firebase Storage for persistence
      try {
        const { ref, uploadBytes, getDownloadURL, storage } = await import('../firebaseStorage');
        const storageRef = ref(storage, `story-covers/${Date.now()}_${coverFile.name}`);
        await uploadBytes(storageRef, coverFile, {
          contentType: coverFile.type || 'image/webp',
          cacheControl: 'public,max-age=31536000,immutable',
        });
        const firebaseUrl = await getDownloadURL(storageRef);
        setCoverImageUrl(firebaseUrl);
      } catch {
        console.log('Firebase upload failed, using optimized data URL');
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
      const storyProvider = settings.storyProvider;

      // Step 1: Analyze cover image with AI Vision (use previewUrl data URL, not firebase URL)
      let animalName = '';
      let imageAnalysis = '';
      let detectedLocation = '';
      const imageForAI = previewUrl || coverImageUrl;
      if (imageForAI) {
        setAiStatus('📸 Analyzing photo with AI Vision...');
        try {
          const analyzeRes = await fetch('/api/analyze', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: imageForAI, provider: photoProvider }),
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
      let uploadFile: File | Blob = file;
      try {
        uploadFile = await generateThumbnail(file, 900);
        console.log(`📸 Story image compressed: ${(file.size/1024).toFixed(0)}KB → ${(uploadFile.size/1024).toFixed(0)}KB`);
      } catch (compErr) {
        console.warn('Compression failed, using original:', compErr);
      }

      const { ref, uploadBytes, getDownloadURL, storage } = await import('../firebaseStorage');
      
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
  const [videoOriginalSize, setVideoOriginalSize] = useState(initial?.originalSize || 0);
  const [videoCompressedSize, setVideoCompressedSize] = useState(initial?.compressedSize || 0);
  const [videoCompressionStatus, setVideoCompressionStatus] = useState('');

  const handleVideoUpload = useCallback(async (file: File) => {
    setUploadingVideo(true);
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
    setVideoUrl(previewUrl);
    setVideoOriginalSize(file.size);
    setVideoCompressedSize(0);
    setVideoCompressionStatus('Preparing video compression...');
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

    try {
      const result = await compressVideoForUpload(file, (p) => setVideoUploadProgress(p));
      setVideoFile(result.file);
      setVideoCompressedSize(result.compressedSize);
      setVideoCompressionStatus(result.message);
    } catch (err: any) {
      console.warn('Video compression failed, using original:', err);
      setVideoFile(file);
      setVideoCompressedSize(file.size);
      setVideoCompressionStatus(`Compression failed, original will upload (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
    } finally {
      setVideoUploadProgress(0);
    }
    setUploadingVideo(false);
  }, [aspectRatio]);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    setUploadingThumb(true);
    try {
      const webpFile = await generateThumbnail(file, 720);
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
      originalSize: videoOriginalSize || initial?.originalSize,
      compressedSize: videoCompressedSize || videoFile?.size || initial?.compressedSize,
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
        {videoCompressionStatus && (
          <div style={{ marginTop: '0.6rem', padding: '0.65rem 0.8rem', borderRadius: 8, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', color: 'rgba(235,230,220,0.72)', fontSize: '0.75rem' }}>
            {videoCompressionStatus}
          </div>
        )}
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
  const [batchTitle, setBatchTitle] = useState('');
  const [batchPhotographer, setBatchPhotographer] = useState('Madan Shrestha');
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
    // ── Gallery image processor: compress + © WildSaura watermark + WebP (max 700KB target) ──
    const processImage = processGalleryImage;

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
      const cleanBatchTitle = batchTitle.trim();
      const cleanPhotographer = batchPhotographer.trim();
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        const baseProgress = Math.round((index / selectedFiles.length) * 100);
        const processed = await processImage(file);
        const fallbackTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
        const uploadTitle = cleanBatchTitle
          ? selectedFiles.length > 1
            ? `${cleanBatchTitle} ${String(index + 1).padStart(2, '0')}`
            : cleanBatchTitle
          : fallbackTitle;
        const uploaded = await uploadGalleryBlobToStorage(
          processed.blob,
          processed.filename,
          category,
          (fileProgress) => {
            setProgress(Math.round(baseProgress + (fileProgress / selectedFiles.length)));
          }
        );
        await addGalleryPhotoToFirestore({
          title: uploadTitle,
          category,
          imageUrl: uploaded.imageUrl,
          storagePath: uploaded.storagePath,
          width: processed.width,
          height: processed.height,
          format: processed.format,
          sizeBytes: processed.sizeBytes,
          originalSize: file.size,
          photographer: cleanPhotographer,
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as GalleryCategory)} style={inputStyle} disabled={uploading}>
              {GALLERY_CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Batch Title</label>
            <input value={batchTitle} onChange={(e) => setBatchTitle(e.target.value)} disabled={uploading} placeholder="e.g. Chitwan Safari" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Photographer</label>
            <input value={batchPhotographer} onChange={(e) => setBatchPhotographer(e.target.value)} disabled={uploading} placeholder="e.g. Madan Shrestha" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Photos (10-20 at once supported)</label>
            <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={uploading} style={inputStyle} />
          </div>
        </div>
        <p style={{ margin: '0.7rem 0 0', color: 'rgba(235,230,220,0.45)', fontSize: '0.72rem' }}>
          Batch title fills all selected photos automatically as Title 01, Title 02, etc. Uploads are compressed to WebP before Firebase storage.
        </p>
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
                      <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(5,14,9,0.88)', color: 'var(--wa-gold)', fontSize: '0.75rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{catPhotos.length}</span>
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
                    <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(5,14,9,0.88)', color: 'var(--wa-gold)', fontSize: '0.75rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{yPhotos.length}</span>
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
                    <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(5,14,9,0.88)', color: 'var(--wa-gold)', fontSize: '0.75rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{mPhotos.length}</span>
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
                    <div style={{ marginTop: '0.45rem', color: 'rgba(235,230,220,0.42)', fontSize: '0.65rem', lineHeight: 1.4 }}>
                      {photo.photographer && <div>By {photo.photographer}</div>}
                      {photo.sizeBytes && <div>{(photo.sizeBytes / 1024 / 1024).toFixed(2)}MB {photo.format?.toUpperCase() || ''}</div>}
                    </div>
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

// ── Self Ads Panel Component ──────────────────────────────────────────────
const SelfAdsPanel: React.FC = () => {
  const [ads, setAds] = React.useState<SelfAd[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [editAd, setEditAd] = React.useState<SelfAd | null>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [linkUrl, setLinkUrl] = React.useState('');
  const [linkText, setLinkText] = React.useState('Visit Now');
  const [priority, setPriority] = React.useState(1);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const loadAds = async () => {
    setLoading(true);
    const data = await fetchAllSelfAds();
    setAds(data);
    setLoading(false);
  };

  React.useEffect(() => { loadAds(); }, []);

  const resetForm = () => {
    setTitle(''); setDescription(''); setLinkUrl(''); setLinkText('Visit Now');
    setPriority(1); setImageFile(null); setImagePreview(''); setEditAd(null);
    setShowCreate(false);
  };

  const handleEdit = (ad: SelfAd) => {
    setEditAd(ad);
    setTitle(ad.title);
    setDescription(ad.description || '');
    setLinkUrl(ad.linkUrl || '');
    setLinkText(ad.linkText || 'Visit Now');
    setPriority(ad.priority);
    setImagePreview(ad.imageUrl || '');
    setShowCreate(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!title.trim()) return alert('Title is required!');
    setSaving(true);
    try {
      let imageUrl = editAd?.imageUrl || '';
      let imagePath = editAd?.imagePath || '';
      if (imageFile) {
        const uploaded = await uploadAdImage(imageFile);
        imageUrl = uploaded.url;
        imagePath = uploaded.path;
      }
      if (editAd) {
        await updateSelfAd(editAd.id, { title, description, linkUrl, linkText, priority, imageUrl, imagePath } as any);
      } else {
        await createSelfAd({ title, description, imageUrl, imagePath, linkUrl, linkText, enabled: true, priority });
      }
      resetForm();
      await loadAds();
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
    setSaving(false);
  };

  const handleDelete = async (ad: SelfAd) => {
    if (!confirm('Delete "' + ad.title + '"?')) return;
    await deleteSelfAd(ad);
    await loadAds();
  };

  const handleToggle = async (ad: SelfAd) => {
    await toggleSelfAd(ad.id, !ad.enabled);
    await loadAds();
  };

  const bx: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem' };
  const ix: React.CSSProperties = { width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none' };
  const lx: React.CSSProperties = { display: 'block', marginBottom: '0.3rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px' };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>{String.fromCodePoint(0x1f4e2)} Self Promotion Ads</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Create your own popup ads — shows when visitors open the site</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }} style={{ padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg, #c9a84c, #b8943f)', border: 'none', borderRadius: '10px', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>+ Create Ad</button>
      </div>

      {showCreate && (
        <div style={{ ...bx, marginBottom: '1.5rem', border: '1px solid rgba(201,168,76,0.3)' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#c9a84c', fontSize: '1.1rem' }}>{editAd ? 'Edit Ad' : 'Create New Ad'}</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div><label style={lx}>Title *</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Check out our marketplace!" style={ix} /></div>
            <div><label style={lx}>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." rows={3} style={{ ...ix, resize: 'vertical' as const }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={lx}>Link URL</label><input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={ix} /></div>
              <div><label style={lx}>Button Text</label><input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Visit Now" style={ix} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={lx}>Priority (higher = first)</label><input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} max={100} style={ix} /></div>
              <div><label style={lx}>Ad Image</label><input type="file" accept="image/*" onChange={handleImageSelect} style={{ ...ix, padding: '0.45rem' }} /></div>
            </div>
            {imagePreview && <div style={{ textAlign: 'center' }}><img src={imagePreview} alt="Preview" style={{ maxWidth: '300px', maxHeight: '180px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} /></div>}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={resetForm} style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '0.6rem 1.5rem', background: saving ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #c9a84c, #b8943f)', border: 'none', borderRadius: '8px', color: '#1a1a2e', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving...' : (editAd ? 'Update' : 'Create')}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
      ) : ads.length === 0 ? (
        <div style={{ ...bx, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{String.fromCodePoint(0x1f4e2)}</div>
          <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>No Self Ads Yet</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Create your first ad to show popups to visitors!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {ads.map(ad => (
            <div key={ad.id} style={{ ...bx, display: 'flex', gap: '1rem', alignItems: 'center', opacity: ad.enabled ? 1 : 0.5, flexWrap: 'wrap' }}>
              {ad.imageUrl && <img src={ad.imageUrl} alt={ad.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />}
              <div style={{ flex: 1, minWidth: '150px' }}>
                <h4 style={{ margin: '0 0 0.25rem', color: '#fff', fontSize: '0.95rem' }}>{ad.title}</h4>
                {ad.description && <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '300px' }}>{ad.description}</p>}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                  {ad.linkUrl && <span style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{ad.linkUrl.replace(/https?:\/\//, '').slice(0, 30)}</span>}
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>Priority: {ad.priority}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => handleToggle(ad)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, background: ad.enabled ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)', color: ad.enabled ? '#4caf50' : 'rgba(255,255,255,0.4)' }}>{ad.enabled ? 'Active' : 'Paused'}</button>
                <button onClick={() => handleEdit(ad)} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8rem' }}>{String.fromCodePoint(0x270f)}{String.fromCodePoint(0xfe0f)}</button>
                <button onClick={() => handleDelete(ad)} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(244,67,54,0.2)', background: 'transparent', color: '#f44336', cursor: 'pointer', fontSize: '0.8rem' }}>{String.fromCodePoint(0x1f5d1)}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...bx, marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', color: '#c9a84c', fontSize: '1rem' }}>How Self Ads Work</h3>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 0.5rem' }}>1. <strong style={{ color: '#fff' }}>Create an ad</strong> {String.fromCodePoint(0x2014)} Add title, image, description, and link</p>
          <p style={{ margin: '0 0 0.5rem' }}>2. <strong style={{ color: '#fff' }}>Popup appears</strong> {String.fromCodePoint(0x2014)} When a visitor opens your site, the ad shows (2s delay)</p>
          <p style={{ margin: '0 0 0.5rem' }}>3. <strong style={{ color: '#fff' }}>Close = dismissed</strong> {String.fromCodePoint(0x2014)} Once closed, it hides until they reopen the site</p>
          <p style={{ margin: '0 0 0.5rem' }}>4. <strong style={{ color: '#fff' }}>Multiple ads?</strong> {String.fromCodePoint(0x2014)} Highest priority shows. Same priority = random</p>
          <p style={{ margin: 0 }}>5. <strong style={{ color: '#fff' }}>Toggle anytime</strong> {String.fromCodePoint(0x2014)} Enable/disable ads instantly</p>
        </div>
      </div>
    </div>
  );
};


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
      setSidebarOpen(!mobile);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobile, sidebarOpen]);

  const closeSidebarOnMobile = () => { if (isMobile) setSidebarOpen(false); };

  const totalLikes = photos.reduce((sum, p) => sum + p.likeCount, 0);

  // Real Firebase Analytics
  const [analytics, setAnalytics] = useState<SiteAnalytics | null>(null);
  const [recentVisitors, setRecentVisitors] = useState<VisitorRecord[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');
  
  // Load analytics on dashboard view
  React.useEffect(() => {
    if (view !== 'dashboard') return;
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    setOnlineError(null);
    
    // Realtime Database keeps dashboard analytics live without manual refresh.
    const unsubAnalytics = subscribeToAnalytics((data, visitors) => {
      if (!cancelled) {
        setAnalytics(data);
        setRecentVisitors(visitors);
        setAnalyticsLoading(false);
      }
    }, (message) => { if (!cancelled) setAnalyticsError(message); });

    // Subscribe to online count
    const unsub = subscribeToOnlineCount((count) => {
      if (!cancelled) setOnlineCount(count);
    }, (message) => { if (!cancelled) setOnlineError(message); });

    return () => { cancelled = true; unsubAnalytics(); unsub(); };
  }, [view]);

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
    display: 'flex', alignItems: 'center', gap: '0.7rem',
    width: '100%', padding: '0.7rem 0.85rem', border: '1px solid transparent',
    borderRadius: '11px', cursor: 'pointer', fontSize: '0.78rem', textAlign: 'left',
    background: active ? 'rgba(185,201,173,0.12)' : 'transparent',
    borderColor: active ? 'rgba(185,201,173,0.16)' : 'transparent',
    color: active ? '#f3f0e8' : 'rgba(243,240,232,0.6)',
    fontWeight: active ? 650 : 500,
    transition: 'all 0.2s',
  });

  const getViewTitle = () => {
    if (view === 'dashboard') return 'Dashboard Home';
    if (view === 'self-ads') return 'Self Promotion Ads';
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

  const formatMetric = (value: number | undefined) => (value ?? 0).toLocaleString();
  const rangeSummary = analytics ? {
    today: { label: 'Today', visitors: analytics.todayVisitors, pageViews: analytics.todayPageViews, trend: analytics.dailyTrend.slice(-1), categories: analytics.todayTopCategories },
    week: { label: '7 Days', visitors: analytics.weekVisitors, pageViews: analytics.weekPageViews, trend: analytics.dailyTrend.slice(-7), categories: analytics.weekTopCategories },
    month: { label: '30 Days', visitors: analytics.monthVisitors, pageViews: analytics.monthPageViews, trend: analytics.dailyTrend.slice(-30), categories: analytics.monthTopCategories },
    year: { label: 'This Year', visitors: analytics.yearVisitors, pageViews: analytics.yearPageViews, trend: analytics.monthlyTrend, categories: analytics.yearTopCategories },
    all: { label: 'All Time', visitors: analytics.totalVisitors, pageViews: analytics.totalPageViews, trend: analytics.yearlyTrend.length ? analytics.yearlyTrend : analytics.monthlyTrend, categories: analytics.topCategories },
  }[analyticsRange] : null;
  const activeCategories = rangeSummary?.categories?.length ? rangeSummary.categories : (analytics?.topCategories || []);
  const trendMax = Math.max(1, ...(rangeSummary?.trend || []).map((point) => point.visitors));
  const categoryMax = Math.max(1, ...activeCategories.map((item) => item.total));
  const pageMax = Math.max(1, ...(analytics?.topPages || []).map((item) => item.views));
  const topCategory = activeCategories[0] || analytics?.topCategories?.[0];

  return (
    <div className="admin-dashboard admin-shell" data-admin-view={view} style={{ display: 'flex', minHeight: '100vh', background: 'var(--wa-dark)' }}>
      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(3,8,5,0.88)',
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar */}
      <aside id="admin-navigation" className="admin-sidebar" style={{
        width: 264, background: 'rgba(8,18,13,0.98)',
        borderRight: '1px solid rgba(243,240,232,0.1)',
        display: 'flex', flexDirection: 'column', padding: '1.15rem 0.8rem',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, left: 0,
        height: '100vh', boxSizing: 'border-box', overflowY: 'auto',
        zIndex: 100,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: isMobile && sidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
      }}>
        <div className="admin-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.2rem 0.45rem 1.1rem', marginBottom: '0.8rem' }}>
          <div className="admin-brand__mark">
            {logoUrl ? (
              <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span>WA</span>
            )}
          </div>
          <div className="admin-brand__copy">
            <span>Wilds Aura</span>
            <small>Field desk</small>
          </div>
          {isMobile && (
            <button className="admin-sidebar__close" onClick={() => setSidebarOpen(false)} aria-label="Close admin menu">
              <X size={17} />
            </button>
          )}
        </div>

        <nav className="admin-nav" aria-label="Admin navigation" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
          <button style={sidebarItemStyle(view === 'dashboard')} onClick={() => { setView('dashboard'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <LayoutDashboard size={18} /> Dashboard Home
          </button>
          <button style={sidebarItemStyle(view === 'self-ads')} onClick={() => { setView('self-ads'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <span style={{ fontSize: '1.1rem' }}>📢</span> Self Ads
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

          <div className="admin-nav__section" style={{ borderTop: '1px solid rgba(243,240,232,0.08)', margin: '0.6rem 0 0.25rem', paddingTop: '0.65rem' }}>
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

          <div className="admin-nav__section" style={{ borderTop: '1px solid rgba(243,240,232,0.08)', margin: '0.6rem 0 0.25rem', paddingTop: '0.65rem' }}>
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

          <div className="admin-nav__section" style={{ borderTop: '1px solid rgba(243,240,232,0.08)', margin: '0.6rem 0 0.25rem', paddingTop: '0.65rem' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(248,250,252,0.62)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1rem', marginBottom: '0.25rem' }}>Settings</p>
          </div>
          <button style={sidebarItemStyle(view === 'ai-settings')} onClick={() => { setView('ai-settings'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <Cpu size={18} /> AI Settings
          </button>
          <button style={sidebarItemStyle(view === 'site-settings')} onClick={() => { setView('site-settings'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); closeSidebarOnMobile(); }}>
            <Globe size={18} /> Site Settings
          </button>
        </nav>

        <div className="admin-sidebar__footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid rgba(243,240,232,0.08)', paddingTop: '0.75rem' }}>
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
      <main className="admin-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="admin-topbar" style={{
          padding: '0.85rem 1.2rem', borderBottom: '1px solid rgba(243,240,232,0.08)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            {/* Hamburger — mobile only */}
            <button
              className="admin-menu-button"
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                display: isMobile ? 'flex' : 'none',
                alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, flexShrink: 0,
                background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '8px', cursor: 'pointer', color: 'var(--wa-gold)',
              }}
              aria-label="Toggle menu"
              aria-controls="admin-navigation"
              aria-expanded={sidebarOpen}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>☰</span>
            </button>

            {/* ← Dashboard back button (all views except dashboard) */}
            {view !== 'dashboard' && (
              <button
                className="admin-back-button"
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

            <div className="admin-topbar__title">
              <span>{view === 'dashboard' ? 'Studio operations' : 'Wilds Aura / Admin'}</span>
              <h1 className="font-playfair" style={{
              fontSize: isMobile ? '0.95rem' : '1.18rem',
              color: 'var(--wa-light)', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{getViewTitle()}</h1>
            </div>
          </div>

          <button className="admin-view-site" onClick={onViewSite} style={{
            padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.75rem',
          }}><Eye size={14} />{!isMobile && ' View Site'}</button>
        </header>

        <div className="admin-content" style={{ padding: isMobile ? '1rem' : 'clamp(1.5rem, 3vw, 2.6rem)', flex: 1, overflowY: 'auto' }}>
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <>
              <section className="admin-dashboard-intro">
                <div>
                  <span className="admin-eyebrow">Collection control</span>
                  <h2>Your field work,<br />in one place.</h2>
                  <p>Publish new encounters, shape the journal, and follow how every story travels.</p>
                </div>
                <div className="admin-quick-actions" aria-label="Quick actions">
                  <button onClick={() => setView('add')}><Camera size={16} /> New photograph</button>
                  <button onClick={() => setView('add-story')}><BookOpen size={16} /> Write a story</button>
                  <button onClick={() => setView('add-video')}><Film size={16} /> Add a film</button>
                </div>
                <div className="admin-live-status">
                  <span /> {onlineCount} live {onlineCount === 1 ? 'visitor' : 'visitors'}
                </div>
              </section>

              {(analyticsError || onlineError) && (
                <div role="alert" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid #f59e0b', borderRadius: 12, color: '#fcd34d' }}>
                  <strong>Analytics data is incomplete.</strong>
                  <p>Firebase has not returned all data. Check the connection and Firebase App Check configuration. Missing counts do not mean there were no visitors.</p>
                  <details>
                    <summary style={{ cursor: 'pointer' }}>Connection details</summary>
                    <p style={{ overflowWrap: 'anywhere' }}>{analyticsError} {onlineError}</p>
                  </details>
                </div>
              )}

              <div className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.7rem', marginBottom: '1rem' }}>
                <StatCard icon={<Users size={21} />} label="All Visitors" value={analyticsLoading ? '...' : analyticsError && !analytics?.totalVisitors ? 'Unavailable' : formatMetric(analytics?.totalVisitors)} color="blue" hint={analyticsError ? 'Partial data — reconnecting' : `${formatMetric(analytics?.anonymousVisitors)} anonymous`} />
                <StatCard icon={<Wifi size={21} />} label="Online Now" value={onlineError ? "Unavailable" : onlineCount} color="green" hint="live sessions" />
                <StatCard icon={<Eye size={21} />} label="Page Views" value={analyticsLoading ? '...' : formatMetric(analytics?.totalPageViews)} color="gold" hint={`${formatMetric(analytics?.totalEvents)} actions`} />
                <StatCard icon={<BarChart3 size={21} />} label="Top Category" value={topCategory?.category || '-'} color="green" hint={topCategory ? `${topCategory.total} actions` : 'waiting for data'} />
                <StatCard icon={<Heart size={21} />} label="Likes" value={formatMetric(analytics?.totalLikes || totalLikes)} color="red" />
                <StatCard icon={<Download size={21} />} label="Downloads" value={formatMetric(analytics?.totalDownloads)} color="red" />
                <StatCard icon={<Share2 size={21} />} label="Shares" value={formatMetric(analytics?.totalShares)} color="gold" />
                <StatCard icon={<MessageSquare size={21} />} label="Comments" value={formatMetric(analytics?.totalComments)} color="blue" />
              </div>

              <div className="admin-panel admin-panel--tracking" style={{ ...panelStyle, marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                  <div>
                    <h3 className="font-cinzel" style={{ fontSize: '0.85rem', color: 'var(--wa-gold)', letterSpacing: '0.08em', margin: 0 }}>
                      <TrendingUp size={16} style={{ marginRight: '0.4rem', verticalAlign: '-3px' }} />
                      Visitor Tracking
                    </h3>
                    <p style={{ fontSize: '0.68rem', color: 'rgba(235,230,220,0.45)', margin: '0.25rem 0 0' }}>
                      Anonymous and logged-in sessions, grouped day/month/year.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', maxWidth: '100%' }}>
                    {[
                      ['today', 'Today'],
                      ['week', '7D'],
                      ['month', '30D'],
                      ['year', 'Year'],
                      ['all', 'All'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setAnalyticsRange(key as typeof analyticsRange)}
                        style={{
                          border: '1px solid rgba(201,168,76,0.2)',
                          background: analyticsRange === key ? 'rgba(201,168,76,0.18)' : 'rgba(0,0,0,0.18)',
                          color: analyticsRange === key ? 'var(--wa-gold)' : 'rgba(235,230,220,0.58)',
                          borderRadius: 999,
                          padding: '0.32rem 0.62rem',
                          fontSize: '0.66rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.55rem', marginBottom: '0.9rem' }}>
                  {[
                    { label: `${rangeSummary?.label || 'Period'} Visitors`, value: rangeSummary?.visitors || 0, color: '#4ade80' },
                    { label: `${rangeSummary?.label || 'Period'} Views`, value: rangeSummary?.pageViews || 0, color: '#60a5fa' },
                    { label: 'Logged In', value: analytics?.loggedInVisitors || 0, color: 'var(--wa-gold)' },
                    { label: 'Anonymous', value: analytics?.anonymousVisitors || 0, color: '#a7f3d0' },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: '0.7rem', borderRadius: 10, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ fontSize: '1.2rem', fontWeight: 800, color: item.color, lineHeight: 1 }}>{analyticsLoading ? '...' : formatMetric(item.value)}</p>
                      <p style={{ fontSize: '0.64rem', color: 'rgba(235,230,220,0.45)', marginTop: '0.25rem' }}>{item.label}</p>
                    </div>
                  ))}
                </div>

                {(rangeSummary?.trend || []).length > 0 ? (
                  <div style={{ display: 'grid', gap: '0.25rem' }}>
                    {(rangeSummary?.trend || []).slice(-10).map((point) => (
                      <MiniBar key={point.label} label={point.label} value={point.visitors} max={trendMax} note="visitors" color="#4ade80" />
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(235,230,220,0.42)', fontSize: '0.72rem', margin: 0 }}>
                    {analyticsLoading ? 'Loading visitor history…' : analyticsError ? 'Some tracking data could not be loaded. See the message above.' : 'No visits recorded for this period. Select All to view historical totals.'}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-panel" style={panelStyle}>
                  <h3 className="font-cinzel" style={{ fontSize: '0.82rem', color: 'var(--wa-gold)', marginBottom: '0.8rem', letterSpacing: '0.08em' }}>
                    Most Active Categories {rangeSummary ? `- ${rangeSummary.label}` : ''}
                  </h3>
                  {activeCategories.length > 0 ? (
                    activeCategories.map((item) => (
                      <MiniBar
                        key={item.category}
                        label={item.category}
                        value={item.total}
                        max={categoryMax}
                        note="actions"
                        color="linear-gradient(90deg, var(--wa-gold), #4ade80)"
                      />
                    ))
                  ) : (
                    <p style={{ color: 'rgba(235,230,220,0.42)', fontSize: '0.72rem' }}>No category activity yet.</p>
                  )}
                </div>

                <div className="admin-panel" style={panelStyle}>
                  <h3 className="font-cinzel" style={{ fontSize: '0.82rem', color: 'var(--wa-gold)', marginBottom: '0.8rem', letterSpacing: '0.08em' }}>
                    Top Pages
                  </h3>
                  {(analytics?.topPages || []).length > 0 ? (
                    analytics!.topPages.map((item) => (
                      <MiniBar key={item.page} label={item.page === '/' ? 'Home' : item.page} value={item.views} max={pageMax} note="views" color="#60a5fa" />
                    ))
                  ) : (
                    <p style={{ color: 'rgba(235,230,220,0.42)', fontSize: '0.72rem' }}>No page views tracked yet.</p>
                  )}
                </div>
              </div>

              <div className="admin-panel" style={{ ...panelStyle, marginBottom: '1rem' }}>
                <h3 className="font-cinzel" style={{ fontSize: '0.82rem', color: 'var(--wa-gold)', marginBottom: '0.8rem', letterSpacing: '0.08em' }}>
                  <Users size={16} style={{ marginRight: '0.4rem', verticalAlign: '-3px' }} />
                  Latest Visitor Sessions
                </h3>
                {recentVisitors.length > 0 ? (
                  <div style={{ display: 'grid', gap: '0.45rem' }}>
                    {recentVisitors.map((v, idx) => (
                      <div key={`${v.sessionId || v.email || idx}`} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.65rem', borderRadius: 10, background: 'rgba(0,0,0,0.16)' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: v.visitorType === 'logged-in' ? 'rgba(201,168,76,0.18)' : 'rgba(96,165,250,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {v.avatarUrl ? <img src={v.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={15} style={{ color: v.visitorType === 'logged-in' ? 'var(--wa-gold)' : '#60a5fa' }} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.76rem', color: 'var(--wa-light)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.visitorType === 'anonymous' ? 'Anonymous visitor' : (v.displayName || 'Logged-in visitor')}
                          </p>
                          <p style={{ fontSize: '0.61rem', color: 'rgba(235,230,220,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.lastPage || '/'}{v.topCategory ? ` · ${v.topCategory}` : ''}{v.date ? ` · ${v.date}` : ''}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700 }}>{v.pageViews || 0} views</p>
                          <p style={{ fontSize: '0.58rem', color: 'rgba(235,230,220,0.38)' }}>{v.events || 0} actions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(235,230,220,0.42)', fontSize: '0.72rem' }}>No visitor sessions yet.</p>
                )}
              </div>

              <div className="admin-stat-grid admin-stat-grid--content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.7rem' }}>
                <StatCard icon={<Image size={21} />} label="Photos" value={photos.length} color="blue" />
                <StatCard icon={<BookOpen size={21} />} label="Stories" value={stories.length} color="green" />
                <StatCard icon={<Film size={21} />} label="Videos" value={videos.length} color="gold" />
                <StatCard icon={<Activity size={21} />} label="Community Posts" value={formatMetric(analytics?.totalCommunityPosts)} color="green" />
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
                          <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(5,14,9,0.88)', color: 'var(--wa-gold)', fontSize: '0.75rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{yPhotos.length}</span>
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
                          <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(5,14,9,0.88)', color: 'var(--wa-gold)', fontSize: '0.75rem', fontWeight: 700, padding: '0.18rem 0.45rem', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.28)' }}>{mPhotos.length}</span>
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
        {view === 'self-ads' && <SelfAdsPanel />}
        </div>
      </main>
    </div>
  );
};
