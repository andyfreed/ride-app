import { useEffect, useRef, useState } from "react";
import { Coordinate } from "@shared/schema";
import { GeolocationCoordinate, calculateBounds } from "@/lib/utils";
import { ZoomIn, ZoomOut, Crosshair, Layers, Satellite } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

// Import Leaflet directly in the browser
// This workaround is needed as Leaflet requires window object
declare global {
  interface Window {
    L: any;
  }
}

// Inject necessary Leaflet styles once
if (typeof window !== 'undefined') {
  // Add Leaflet CSS to head if not already present
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);
  }
  
  // Add custom CSS fixes for better iOS compatibility
  if (!document.getElementById('leaflet-fixes-css')) {
    const style = document.createElement('style');
    style.id = 'leaflet-fixes-css';
    style.textContent = `
      .leaflet-container {
        width: 100%;
        height: 100%;
        /* Disable iOS text selection */
        -webkit-user-select: none;
        user-select: none;
        /* Improved touch handling */
        touch-action: manipulation;
        /* Fix for iOS scroll bouncing */
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
      .map-container {
        position: relative;
        width: 100%;
        height: 100%;
        z-index: 0;
        overflow: hidden;
      }
      /* Make leaflet markers work better on iOS */
      .leaflet-marker-icon,
      .leaflet-marker-shadow {
        -webkit-backface-visibility: hidden;
      }
      /* Make leaflet control buttons larger for touch */
      .leaflet-touch .leaflet-control-zoom-in,
      .leaflet-touch .leaflet-control-zoom-out {
        font-size: 22px;
      }
      /* Fix iOS Safari overscrolling issues */
      .leaflet-touch .leaflet-control-layers,
      .leaflet-touch .leaflet-bar {
        border: 2px solid rgba(0,0,0,0.2);
        background-clip: padding-box;
      }
      /* Fix for iOS momentum scrolling */
      .map-controls {
        touch-action: none;
      }
      /* Fix iOS safe area */
      @supports(padding: max(0px)) {
        .map-controls-bottom {
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          bottom: env(safe-area-inset-bottom);
        }
        .map-controls-top {
          padding-top: max(12px, env(safe-area-inset-top));
          top: env(safe-area-inset-top);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

interface MapViewProps {
  coordinates: GeolocationCoordinate[];
  currentPosition?: GeolocationCoordinate;
  isTracking: boolean;
  gpsStatus: 'strong' | 'weak' | 'none';
  followPosition?: boolean;
  onMapReady?: () => void;
}

const MapView = ({ 
  coordinates, 
  currentPosition, 
  isTracking, 
  gpsStatus, 
  followPosition = true,
  onMapReady
}: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const positionMarkerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { settings } = useSettings();
  const [mapType, setMapType] = useState<'standard' | 'satellite'>(
    settings?.mapStyle === 'satellite' ? 'satellite' : 'standard'
  );

  // Load Leaflet script once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // If Leaflet is already loaded, no need to reload
    if (window.L) return;
    
    // Load Leaflet.js if not loaded yet
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.async = true;
    
    document.body.appendChild(script);
  }, []);

  // Initialize the map when the container is ready and Leaflet is loaded
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || typeof window === 'undefined') return;
    
    const initMap = () => {
      if (!window.L || !mapContainerRef.current || mapRef.current) return;
      
      // Clear the container first
      mapContainerRef.current.innerHTML = '';
      
      try {
        const L = window.L;
        
        // Force clear any previous instance that might still be attached
        if (mapContainerRef.current.hasChildNodes()) {
          mapContainerRef.current.innerHTML = '';
        }
            
        // Create the map with all interactive features enabled
        mapRef.current = L.map(mapContainerRef.current, {
          center: [37.7749, -122.4194], // Default: San Francisco
          zoom: 13,
          zoomControl: false,           // We'll add our own zoom controls
          attributionControl: false,    // Hide attribution for cleaner UI
          dragging: true,               // Enable map dragging
          tap: true,                    // Enable tap for mobile
          touchZoom: true,              // Enable pinch zoom on mobile
          doubleClickZoom: true,        // Enable double click zoom
          scrollWheelZoom: true,        // Enable mouse wheel zoom
          keyboard: false,              // Disable keyboard navigation
          inertia: true,                // Enable inertia panning for smoother dragging
          fadeAnimation: true,          // Smooth fade animations
          zoomAnimation: true          // Smooth zoom animations
        });
        
        // Add a tile layer
        if (mapType === 'standard') {
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(mapRef.current);
        } else {
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
          }).addTo(mapRef.current);
        }
        
        // Create a layer for the route
        routeLayerRef.current = L.polyline([], { 
          color: '#0057FF', 
          weight: 5,
          lineJoin: 'round'
        }).addTo(mapRef.current);
        
        // Create a marker for current position
        positionMarkerRef.current = L.circleMarker([0, 0], {
          radius: 8,
          fillColor: '#0057FF',
          fillOpacity: 1,
          color: '#fff',
          weight: 2
        }).addTo(mapRef.current);
        
        // Signal that map is ready
        setMapLoaded(true);
        if (onMapReady) onMapReady();
        
        // Invalidate size after a short delay to fix rendering issues
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Check if Leaflet is already loaded
    if (window.L) {
      initMap();
    } else {
      // Wait for Leaflet to load
      const checkInterval = setInterval(() => {
        if (window.L) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
      
      // Cleanup interval after 10 seconds if Leaflet doesn't load
      setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        routeLayerRef.current = null;
        positionMarkerRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [mapContainerRef.current]);

  // Update map tile layer when mapType changes
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    
    try {
      const L = window.L;
      
      // Remove existing tile layers
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) {
          mapRef.current.removeLayer(layer);
        }
      });
      
      // Add new tile layer based on map type
      if (mapType === 'standard') {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(mapRef.current);
      } else {
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
    } catch (error) {
      console.error('Error updating map tiles:', error);
    }
  }, [mapType]);

  // Update route path when coordinates change
  useEffect(() => {
    if (!mapRef.current || !routeLayerRef.current || !window.L || !mapLoaded) return;
    
    try {
      const latlngs = coordinates.map(coord => [coord.latitude, coord.longitude]);
      routeLayerRef.current.setLatLngs(latlngs);
      
      if (latlngs.length > 1 && !followPosition) {
        // Fit the map to the route bounds
        const bounds = calculateBounds(coordinates);
        if (bounds) {
          // Convert bounds object to Leaflet bounds format
          const latLngBounds = [
            [bounds.minLat, bounds.minLng],
            [bounds.maxLat, bounds.maxLng]
          ] as [[number, number], [number, number]];
          
          mapRef.current.fitBounds(latLngBounds, { padding: [30, 30] });
        }
      }
    } catch (error) {
      console.error('Error updating route:', error);
    }
  }, [coordinates, followPosition, mapLoaded]);

  // Update current position marker
  useEffect(() => {
    if (!mapRef.current || !positionMarkerRef.current || !currentPosition || !mapLoaded) return;
    
    try {
      positionMarkerRef.current.setLatLng([currentPosition.latitude, currentPosition.longitude]);
      
      if (followPosition) {
        mapRef.current.setView(
          [currentPosition.latitude, currentPosition.longitude], 
          mapRef.current.getZoom()
        );
      }
    } catch (error) {
      console.error('Error updating position marker:', error);
    }
  }, [currentPosition, followPosition, mapLoaded]);

  // Update map settings when user settings change
  useEffect(() => {
    if (settings?.mapStyle) {
      setMapType(settings.mapStyle === 'standard' ? 'standard' : 'satellite');
    }
  }, [settings?.mapStyle]);

  // Define the color for GPS status
  const gpsStatusColor = gpsStatus === 'strong' 
    ? 'text-green-500' 
    : gpsStatus === 'weak' 
      ? 'text-yellow-500' 
      : 'text-red-500';
  
  // Map control handlers
  const handleCenterMap = () => {
    if (!mapRef.current || !currentPosition) return;
    mapRef.current.setView([currentPosition.latitude, currentPosition.longitude], 15);
  };
  
  const handleZoomIn = () => {
    if (!mapRef.current) return;
    mapRef.current.setZoom(mapRef.current.getZoom() + 1);
  };
  
  const handleZoomOut = () => {
    if (!mapRef.current) return;
    mapRef.current.setZoom(mapRef.current.getZoom() - 1);
  };
  
  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  return (
    <div className="relative h-full w-full bg-gray-100 overflow-hidden">
      {/* Map container (lowest layer) */}
      <div className="absolute inset-0 z-0">
        <div 
          id="map" 
          ref={mapContainerRef} 
          className="h-full w-full"
        />
      </div>
      
      {/* Controls overlay layer (highest layer) */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* GPS Status Indicator */}
        <div className="absolute left-4 map-controls-top bg-white px-3 py-1.5 rounded-full shadow-lg flex items-center pointer-events-auto map-controls">
          <div className={`mr-2 ${gpsStatusColor}`}>
            <Satellite size={16} />
          </div>
          <span className="text-xs font-medium">
            GPS Signal: {gpsStatus === 'strong' ? 'Strong' : gpsStatus === 'weak' ? 'Weak' : 'Unavailable'}
          </span>
        </div>
        
        {/* Map Controls - using map-controls-bottom class for iOS safe area */}
        <div className="absolute right-4 map-controls-bottom flex flex-col space-y-3 pointer-events-auto map-controls" style={{bottom: '32px'}}>
          <button
            className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-500 border border-gray-200 active:bg-gray-100"
            aria-label="Center map on location"
            onClick={handleCenterMap}
          >
            <Crosshair size={24} className="text-blue-500" />
          </button>
          <button
            className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-500 border border-gray-200 active:bg-gray-100"
            aria-label="Zoom in"
            onClick={handleZoomIn}
          >
            <ZoomIn size={24} />
          </button>
          <button
            className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-500 border border-gray-200 active:bg-gray-100"
            aria-label="Zoom out"
            onClick={handleZoomOut}
          >
            <ZoomOut size={24} />
          </button>
          <button
            className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-500 border border-gray-200 active:bg-gray-100"
            aria-label="Change map type"
            onClick={toggleMapType}
          >
            {mapType === 'standard' ? <Satellite size={24} /> : <Layers size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapView;
