import React, { useState, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Image, Plus, Pencil, Trash2, LogOut, Eye, EyeOff,
  MapPin, Heart, BarChart3, TrendingUp, X, Save, Search, BookOpen,
  Upload, Sparkles, Film, Camera, FileImage, Loader2, Info,
  Settings, Cpu, MessageCircle
} from 'lucide-react';
import { Photo, Story, Video } from '../types';
import { analyzePhoto, getAnimalInfo } from '../utils/aiService';
import { uploadPhotoToStorage, addPhotoToFirestore } from '../services/photoService';
import { getAISettings } from '../services/aiSettingsService';
import { AISettingsPanel } from './AISettings';
import { applyWatermark } from '../utils/watermark';
import { compressImageForAI } from '../utils/imageCompressor';
import { readExifFromFile } from '../utils/exifReader';



type AdminView = 'dashboard' | 'photos' | 'add' | 'stories' | 'add-story' | 'videos' | 'add-video' | 'comments' | 'ai-settings';

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



function detectCategory(filename: string): Photo['category'] {
  const lower = filename.toLowerCase();
  if (WILDLIFE_KEYWORDS.some(k => lower.includes(k))) return 'wildlife';
  if (LANDSCAPE_KEYWORDS.some(k => lower.includes(k))) return 'landscape';
  if (STREET_KEYWORDS.some(k => lower.includes(k))) return 'street';
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
  const [wikiSummary, setWikiSummary] = useState(initial?.wikiSummary || '');
  const [aiStatus, setAiStatus] = useState('');
  const [exifStatus, setExifStatus] = useState('');

  const handleFileSelected = useCallback(async (file: File) => {
    setUploading(true);
    setUploadedFileName(file.name);
    setExifStatus('');

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

      // Auto-compress large photos (max 2048px) to reduce upload size + improve AI speed
      if (!isVideo && file.size > 500 * 1024) { // >500KB
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = dataUrl;
          });
          const maxDim = 2048;
          if (img.width > maxDim || img.height > maxDim) {
            const scale = Math.min(maxDim / img.width, maxDim / img.height);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const compressed = canvas.toDataURL('image/jpeg', 0.85);
              const origKB = Math.round(dataUrl.length * 0.75 / 1024);
              const compKB = Math.round(compressed.length * 0.75 / 1024);
              console.log(`📸 Compressed: ${img.width}x${img.height} (${origKB}KB) → ${w}x${h} (${compKB}KB)`);
              dataUrl = compressed;
            }
          }
        } catch (compErr) {
          console.warn('Auto-compression failed, using original:', compErr);
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
    
    let finalImageUrl = imageUrl;
    let firestoreId: string | undefined;
    
    try {
      // Upload to Firebase Storage if it's a data URL
      if (imageUrl.startsWith('data:')) {
        try {
          finalImageUrl = await uploadPhotoToStorage(imageUrl, uploadedFileName || 'photo.jpg');
        } catch (err) {
          console.warn('Firebase Storage upload failed, using data URL:', err);
        }
      }
      
      // Save metadata to Firestore
      try {
        const docId = await addPhotoToFirestore({
          title, caption: caption || '', category, imageUrl: finalImageUrl,
          location: location || '', tags: finalTags, animalName,
          cameraModel, lens, aperture, shutterSpeed, iso, focalLength,
          likeCount: initial?.likeCount || 0,
          type: mediaType === 'video' ? 'video' : 'photo',
        });
        firestoreId = docId;
      } catch (err) {
        console.warn('Firestore save failed:', err);
      }
    } catch (err) {
      console.warn('Firebase operations failed:', err);
    }
    
    setSaving(false);
    onSave({
      id: initial?.id || nextId,
      firestoreId,
      title, category, imageUrl: finalImageUrl, location, caption,
      type: mediaType === 'video' ? 'video' : 'photo',
      cameraModel, lens, aperture, shutterSpeed, iso, focalLength,
      tags: finalTags, animalName, wikiSummary,
      photographer,
      likeCount: initial?.likeCount || 0, liked: initial?.liked || false,
      published: initial?.published !== false,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Upload Zone */}
      <div style={{ marginBottom: '1.5rem' }}>
        <UploadZone
          onFileSelected={handleFileSelected}
          previewUrl={previewDataUrl}
          uploading={uploading}
        />
      </div>

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
        }}><Save size={16} /> {saving ? 'Saving...' : initial ? 'Update Photo' : 'Add Photo'}</button>
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
          const wikiRes = await fetch(\`/api/wikipedia?animal=\${encodeURIComponent(searchAnimal)}\`);
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
          caption: wikiInfo ? \`Wikipedia: \${wikiInfo.substring(0, 500)}\` : '',
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
        setAiStatus(\`❌ AI generation failed: \${errData.error || 'Unknown error'}\`);
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

  const handleVideoUpload = useCallback(async (file: File) => {
    setUploadingVideo(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setVideoPreview(dataUrl);
      setVideoUrl(dataUrl);
      setUploadingVideo(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    setUploadingThumb(true);
    try {
      // Compress thumbnail like story cover (max 800px, JPEG 0.6)
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
      setThumbPreview(compressedUrl);
      let finalThumbUrl = compressedUrl;
      try {
        finalThumbUrl = await applyWatermark(compressedUrl);
      } catch {}
      setThumbnailUrl(finalThumbUrl);

      // Also try uploading to Firebase Storage for persistence
      try {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../firebase');
        const storageRef = ref(storage, `video-thumbnails/${Date.now()}_${file.name}`);
        const response = await fetch(finalThumbUrl);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const firebaseUrl = await getDownloadURL(storageRef);
        setThumbnailUrl(firebaseUrl);
      } catch {
        console.log('Firebase upload failed, using compressed data URL');
      }
    } catch {
      // Fallback to basic data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setThumbPreview(dataUrl);
        setThumbnailUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    setUploadingThumb(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;
    onSave({
      id: initial?.id || nextId,
      firestoreId: initial?.firestoreId,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      location,
      duration,
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
        <button type="submit" className="btn-gold" style={{
          padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem',
        }}><Save size={16} /> {initial ? 'Update Video' : 'Add Video'}</button>
      </div>
    </form>
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
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [storyDeleteConfirm, setStoryDeleteConfirm] = useState<number | null>(null);
  const [videoDeleteConfirm, setVideoDeleteConfirm] = useState<number | null>(null);

  const totalLikes = photos.reduce((sum, p) => sum + p.likeCount, 0);
  const nextPhotoId = Math.max(0, ...photos.map((p) => p.id)) + 1;
  const nextStoryId = Math.max(0, ...stories.map((s) => s.id)) + 1;
  const nextVideoId = Math.max(0, ...videos.map((v) => v.id)) + 1;

  const filteredPhotos = photos.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(search.toLowerCase())
  );

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
    background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
    color: active ? 'var(--wa-gold)' : 'rgba(235,230,220,0.5)',
    transition: 'all 0.2s',
  });

  const getViewTitle = () => {
    if (view === 'dashboard') return 'Dashboard Overview';
    if (view === 'photos') return editingPhoto ? 'Edit Photo' : 'Manage Photos';
    if (view === 'add') return 'Add New Photo';
    if (view === 'stories') return editingStory ? 'Edit Story' : 'Manage Stories';
    if (view === 'add-story') return 'Add New Story';
    if (view === 'videos') return editingVideo ? 'Edit Video' : 'Manage Videos';
    if (view === 'add-video') return 'Add New Video';
    if (view === 'comments') return 'Manage Comments';
    if (view === 'ai-settings') return 'AI Configuration';
    return '';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--wa-dark)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'rgba(0,0,0,0.4)',
        borderRight: '1px solid rgba(201,168,76,0.08)',
        display: 'flex', flexDirection: 'column', padding: '1.25rem 0.75rem',
        position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box', overflowY: 'auto',
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
          <button style={sidebarItemStyle(view === 'dashboard')} onClick={() => { setView('dashboard'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); }}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button style={sidebarItemStyle(view === 'photos')} onClick={() => { setView('photos'); setEditingPhoto(null); }}>
            <Image size={18} /> Photos
          </button>
          <button style={sidebarItemStyle(view === 'add')} onClick={() => { setView('add'); setEditingPhoto(null); }}>
            <Plus size={18} /> Add Photo
          </button>

          <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(235,230,220,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1rem', marginBottom: '0.25rem' }}>Content</p>
          </div>

          <button style={sidebarItemStyle(view === 'stories')} onClick={() => { setView('stories'); setEditingStory(null); }}>
            <BookOpen size={18} /> Stories
          </button>
          <button style={sidebarItemStyle(view === 'add-story')} onClick={() => { setView('add-story'); setEditingStory(null); }}>
            <Plus size={18} /> Add Story
          </button>
          <button style={sidebarItemStyle(view === 'videos')} onClick={() => { setView('videos'); setEditingVideo(null); }}>
            <Film size={18} /> Videos
          </button>
          <button style={sidebarItemStyle(view === 'add-video')} onClick={() => { setView('add-video'); setEditingVideo(null); }}>
            <Plus size={18} /> Add Video
          </button>

          <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(235,230,220,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1rem', marginBottom: '0.25rem' }}>Social</p>
          </div>
          <button style={sidebarItemStyle(view === 'comments')} onClick={() => { setView('comments'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); }}>
            <MessageCircle size={18} /> Comments
            {allComments.length > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                borderRadius: '10px', background: 'rgba(201,168,76,0.2)', color: 'var(--wa-gold)',
              }}>{allComments.length}</span>
            )}
          </button>

          <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', margin: '0.5rem 0', paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '0.6rem', color: 'rgba(235,230,220,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 1rem', marginBottom: '0.25rem' }}>Settings</p>
          </div>
          <button style={sidebarItemStyle(view === 'ai-settings')} onClick={() => { setView('ai-settings'); setEditingPhoto(null); setEditingStory(null); setEditingVideo(null); }}>
            <Cpu size={18} /> AI Settings
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          padding: '1rem 2rem', borderBottom: '1px solid rgba(201,168,76,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)',
        }}>
          <h1 className="font-cinzel" style={{ fontSize: '1.1rem', color: 'var(--wa-light)', fontWeight: 600 }}>{getViewTitle()}</h1>
          <button onClick={onViewSite} style={{
            padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: 'rgba(235,230,220,0.6)', cursor: 'pointer', fontSize: '0.75rem',
          }}><Eye size={14} /> View Site</button>
        </header>

        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          {/* Dashboard View */}
          {view === 'dashboard' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard icon={<Image size={24} />} label="Total Photos" value={photos.length} color="blue" />
                <StatCard icon={<Heart size={24} />} label="Total Likes" value={totalLikes} color="red" />
                <StatCard icon={<BookOpen size={24} />} label="Stories" value={stories.length} color="green" />
                <StatCard icon={<Film size={24} />} label="Videos" value={videos.length} color="gold" />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 className="font-cinzel" style={{ fontSize: '0.85rem', color: 'var(--wa-gold)', marginBottom: '1rem', letterSpacing: '0.08em' }}>Category Breakdown</h3>
                {['wildlife', 'landscape', 'street', 'other'].map((cat) => {
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: 350 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(235,230,220,0.3)' }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search photos..."
                    style={{ ...inputStyle, paddingLeft: '2.25rem' }} />
                </div>
                <button className="btn-gold" onClick={() => setView('add')} style={{ padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <Plus size={16} /> Add Photo
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredPhotos.map((p) => (
                  <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.3s' }}>
                    <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ color: 'var(--wa-light)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>{p.title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', textTransform: 'capitalize', background: 'rgba(201,168,76,0.1)', color: 'var(--wa-gold)', border: '1px solid rgba(201,168,76,0.2)' }}>{p.category}</span>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.6rem', background: p.published !== false ? 'rgba(34,197,94,0.1)' : 'rgba(255,165,0,0.1)', color: p.published !== false ? '#22c55e' : '#f59e0b', border: `1px solid ${p.published !== false ? 'rgba(34,197,94,0.15)' : 'rgba(255,165,0,0.15)'}` }}>
                          {p.published !== false ? '● Published' : '● Draft'}
                        </span>
                        {p.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'rgba(235,230,220,0.4)' }}><MapPin size={11} /> {p.location}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'rgba(239,68,68,0.6)' }}><Heart size={13} /> {p.likeCount}</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => onUpdatePhoto({ ...p, published: p.published === false ? true : false })} title={p.published !== false ? 'Unpublish' : 'Publish'} style={{ width: 32, height: 32, borderRadius: '6px', background: p.published !== false ? 'rgba(34,197,94,0.15)' : 'rgba(255,165,0,0.15)', border: `1px solid ${p.published !== false ? 'rgba(34,197,94,0.2)' : 'rgba(255,165,0,0.2)'}`, color: p.published !== false ? '#22c55e' : '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.published !== false ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                          <button onClick={() => setEditingPhoto(p)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={14} /></button>
                          {deleteConfirm === p.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button onClick={() => handleDelete(p.id)} style={{ padding: '0 0.6rem', height: 32, borderRadius: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(235,230,220,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(p.id)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
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
          {/* AI Settings View */}
          {view === 'ai-settings' && <AISettingsPanel />}
        </div>
      </main>
    </div>
  );
};
