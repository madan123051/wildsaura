import React, { useEffect, useState } from 'react';
import { Camera, Search, ChevronLeft, ChevronRight, X, Trash2, Heart } from 'lucide-react';
import { GalleryPhoto, GalleryCategory } from '../types';
import { formatDate } from '../utils/dateFormatter';  // ← FIXED: Use correct export name

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  onAddPhoto: (photo: Omit<GalleryPhoto, 'id'>) => Promise<void>;
  onDeletePhoto: (id: string) => Promise<void>;
  onLikePhoto: (id: string, currentLikes: number) => Promise<void>;
}

const CATEGORIES: GalleryCategory[] = ['Wildlife', 'Birds', 'Landscapes', 'Portraits', 'Others'];

export function PhotoGallery({ photos, onAddPhoto, onDeletePhoto, onLikePhoto }: PhotoGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('Wildlife');
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const filteredPhotos = photos.filter(photo => {
    const matchesCategory = photo.category === selectedCategory;
    const matchesSearch = photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onAddPhoto({
        url: file.name, // Will be replaced by upload function
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
        category: selectedCategory,
        likes: 0,
      });
      e.currentTarget.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-slate-900">Photo Gallery</h1>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Upload */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search photos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <label className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ opacity: isUploading ? 0.5 : 1 }}>
              {isUploading ? 'Uploading...' : 'Upload Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">No photos in this category yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl cursor-pointer transition-shadow"
              >
                <div className="relative h-48 bg-slate-200">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Photo';
                    }}
                  />
                  {/* Date Badge */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs font-medium">
                    📅 {formatDate(photo.uploadedAt)}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 mb-2">{photo.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">{photo.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-amber-600 font-medium">{photo.category}</span>
                    <span className="text-sm font-semibold text-slate-700">❤️ {photo.likes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedPhoto.title}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  📅 Uploaded {formatDate(selectedPhoto.uploadedAt)} • {selectedPhoto.category}
                </p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            {/* Image */}
            <div className="bg-slate-100 p-6">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="w-full h-auto rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400?text=Photo';
                }}
              />
            </div>

            {/* Description & Actions */}
            <div className="p-6">
              <p className="text-slate-700 mb-6">{selectedPhoto.description || 'No description'}</p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onLikePhoto(selectedPhoto.id!, selectedPhoto.likes);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
                >
                  <Heart className="w-5 h-5" />
                  Like ({selectedPhoto.likes})
                </button>

                <button
                  onClick={() => {
                    onDeletePhoto(selectedPhoto.id!);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
