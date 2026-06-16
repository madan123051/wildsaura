import React, { useEffect, useRef, useState } from 'react';
import { Photo } from '../types';
import { X, MapPin } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageUrl';

interface PhotoMapProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  onPhotoClick: (photo: Photo) => void;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
    __photoMapClick__: (photoId: string) => void;
  }
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyCDGB4dH4T0aSvzP8d7PcHVsqMzMY35tVs';

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#5a5a6a' }] },
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#1e1e30' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6a6a7a' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a3a4a' }] },
];

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      return;
    }

    window.initGoogleMaps = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

export const PhotoMap: React.FC<PhotoMapProps> = ({ photos, isOpen, onClose, onPhotoClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const photosWithLocation = photos.filter(p => p.latitude && p.longitude);
  const photoClickRef = useRef(onPhotoClick);
  photoClickRef.current = onPhotoClick;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadGoogleMaps();
        if (cancelled || !mapRef.current) return;

        const google = window.google;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 20, lng: 80 },
          zoom: 3,
          styles: darkMapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          backgroundColor: '#1a1a2e',
        });

        mapInstanceRef.current = map;
        const infoWindow = new google.maps.InfoWindow();
        infoWindowRef.current = infoWindow;

        // Clear old markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasMarkers = false;

        photosWithLocation.forEach((photo) => {
          const position = { lat: photo.latitude!, lng: photo.longitude! };
          bounds.extend(position);
          hasMarkers = true;
          const markerImageUrl = getOptimizedImageUrl(photo.thumbnailUrl || photo.imageUrl, {
            width: 160,
            height: 160,
            quality: 70,
          }) || photo.thumbnailUrl || photo.imageUrl;
          const popupImageUrl = getOptimizedImageUrl(photo.thumbnailUrl || photo.imageUrl, {
            width: 360,
            height: 220,
            quality: 72,
          }) || photo.thumbnailUrl || photo.imageUrl;

          const marker = new google.maps.Marker({
            position,
            map,
            title: photo.title,
            icon: {
              url: markerImageUrl,
              scaledSize: new google.maps.Size(44, 44),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(22, 22),
            },
          });

          marker.addListener('click', () => {
            const photoId = photo.firestoreId || String(photo.id);
            const escapedTitle = photo.title.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
            const escapedLocation = (photo.location || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
            const content = `
              <div style="background:#1a1a2e;color:#fff;padding:0;border-radius:8px;max-width:240px;font-family:system-ui,-apple-system,sans-serif;overflow:hidden;">
                <img src="${popupImageUrl}" alt="${escapedTitle}" style="width:100%;height:140px;object-fit:cover;display:block;" />
                <div style="padding:10px 12px;">
                  <h4 style="margin:0 0 4px;font-size:0.9rem;color:#fff;">${escapedTitle}</h4>
                  <p style="margin:0 0 8px;font-size:0.75rem;color:#8a8a8a;">${escapedLocation}</p>
                  <button
                    onclick="window.__photoMapClick__('${photoId}')"
                    style="width:100%;padding:6px 0;background:linear-gradient(135deg,#c9a84c,#b8943f);color:#1a1a2e;border:none;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;letter-spacing:0.05em;"
                  >
                    View Photo ›
                  </button>
                </div>
              </div>
            `;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        // Set up global click handler for info window buttons
        window.__photoMapClick__ = (photoId: string) => {
          const found = photos.find(p => p.firestoreId === photoId || String(p.id) === photoId);
          if (found) photoClickRef.current(found);
        };

        if (hasMarkers) {
          map.fitBounds(bounds);
          google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
            if (map.getZoom() > 15) map.setZoom(15);
          });
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load map. Please try again.');
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      delete (window as any).__photoMapClick__;
    };
  }, [isOpen, photos]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        background: 'linear-gradient(135deg, #1a1a2e, #0e0e1a)',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} color="#c9a84c" />
          <h3 style={{
            margin: 0,
            fontSize: '1rem',
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: '#c9a84c',
          }}>
            Photo Locations
          </h3>
          <span style={{
            fontSize: '0.75rem',
            color: '#8a8a8a',
            marginLeft: '0.5rem',
          }}>
            {photosWithLocation.length} photo{photosWithLocation.length !== 1 ? 's' : ''} on map
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(201,168,76,0.2)';
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
          }}>
            <div style={{ textAlign: 'center' }}>
              <MapPin size={32} color="#c9a84c" style={{ animation: 'pulse 1.5s infinite' }} />
              <p style={{ color: '#8a8a8a', marginTop: '0.75rem', fontSize: '0.85rem' }}>Loading map...</p>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#ff6b6b',
          }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && photosWithLocation.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#8a8a8a',
            background: 'rgba(26,26,46,0.9)',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid rgba(201,168,76,0.2)',
          }}>
            <MapPin size={40} color="#c9a84c" style={{ opacity: 0.5 }} />
            <p style={{ margin: '0.75rem 0 0.25rem', color: '#fff', fontSize: '1rem' }}>No Photo Locations Yet</p>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>Add latitude &amp; longitude to photos in the admin panel to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
