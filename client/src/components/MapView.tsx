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
  const { settings } = useSettings();
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  // Add custom CSS to ensure the map container is properly styled
  useEffect(() => {
    // Add custom CSS to fix touch issues
    if (!document.getElementById('leaflet-custom-css')) {
      const style = document.createElement('style');
      style.id = 'leaflet-custom-css';
      style.textContent = `
        .leaflet-container {
          touch-action: none;
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
        .leaflet-touch .leaflet-control-layers,
        .leaflet-touch .leaflet-bar {
          border: 2px solid rgba(0,0,0,0.2);
          border-radius: 4px;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Initialize the map
  useEffect(() => {
    // Clean up any existing map instance to prevent duplicates
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      positionMarkerRef.current = null;
    }
    
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    
    // Check if Leaflet CSS is loaded
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      document.head.appendChild(link);
    }
    
    // Add meta viewport tag for proper touch handling if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }
    
    const L = window.L;
    if (!L) {
      // Check if script is already being loaded
      if (!document.querySelector('script[src*="leaflet.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        script.async = true;
        script.onload = initializeMap;
        document.body.appendChild(script);
      } else {
        // Wait for existing script to load
        const checkIfLeafletLoaded = setInterval(() => {
          if (window.L) {
            clearInterval(checkIfLeafletLoaded);
            initializeMap();
          }
        }, 100);
      }
    } else {
      initializeMap();
    }

    function initializeMap() {
      if (mapRef.current || !mapContainerRef.current) return;
      
      const L = window.L;
      
      // Create map instance
      mapRef.current = L.map(mapContainerRef.current, {
        center: [37.7749, -122.4194], // Default: San Francisco
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        tap: true,
        scrollWheelZoom: true
      });
      
      // Set map type based on settings
      updateTileLayer();
      
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
      
      if (onMapReady) {
        onMapReady();
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        routeLayerRef.current = null;
        positionMarkerRef.current = null;
      }
    };
  }, []);

  // Update tile layer when map type changes
  useEffect(() => {
    updateTileLayer();
  }, [mapType]);

  // Update map settings when user settings change
  useEffect(() => {
    if (settings.mapStyle) {
      setMapType(settings.mapStyle === 'standard' ? 'standard' : 'satellite');
    }
  }, [settings.mapStyle]);

  const updateTileLayer = () => {
    // Only attempt to update tile layer if Leaflet is loaded and map is initialized
    const L = window?.L;
    if (!L || !mapRef.current) return;
    
    try {
      // Remove existing tile layers
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.TileLayer) {
          mapRef.current.removeLayer(layer);
        }
      });
      
      // Add appropriate tile layer
      if (mapType === 'standard' || !mapType) {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(mapRef.current);
      } else {
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
    } catch (error) {
      console.error('Error updating tile layer:', error);
    }
  };

  // Update route on the map
  useEffect(() => {
    if (!mapRef.current || !routeLayerRef.current || !window.L) return;
    
    const L = window.L;
    const latlngs = coordinates.map(coord => [coord.latitude, coord.longitude]);
    
    routeLayerRef.current.setLatLngs(latlngs);
    
    if (latlngs.length > 1 && !followPosition) {
      // Fit the map to the route bounds
      const bounds = calculateBounds(coordinates);
      if (bounds) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [coordinates, followPosition]);

  // Update current position marker
  useEffect(() => {
    if (!mapRef.current || !positionMarkerRef.current || !currentPosition) return;
    
    positionMarkerRef.current.setLatLng([currentPosition.latitude, currentPosition.longitude]);
    
    if (followPosition) {
      mapRef.current.setView([currentPosition.latitude, currentPosition.longitude], mapRef.current.getZoom());
    }
  }, [currentPosition, followPosition]);

  // Define the color for GPS status
  const gpsStatusColor = gpsStatus === 'strong' 
    ? 'text-success' 
    : gpsStatus === 'weak' 
      ? 'text-warning' 
      : 'text-destructive';
  
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

  // Add additional event handlers to ensure map is interactive
  useEffect(() => {
    if (!mapContainerRef.current || !mapRef.current) return;
    
    // Add touch event handler
    const mapContainer = mapContainerRef.current;
    
    // Explicitly disable touch events from being handled by the browser
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };
    
    mapContainer.addEventListener('touchstart', preventDefault, { passive: false });
    mapContainer.addEventListener('touchmove', preventDefault, { passive: false });
    
    return () => {
      mapContainer.removeEventListener('touchstart', preventDefault);
      mapContainer.removeEventListener('touchmove', preventDefault);
    };
  }, [mapRef.current]);

  return (
    <div className="absolute inset-0 bg-neutral-200 h-full w-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full touch-none" 
        style={{ 
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      ></div>
      
      {/* GPS Status Indicator */}
      <div className="absolute left-4 top-4 bg-white/90 px-3 py-1.5 rounded-full shadow-md flex items-center">
        <div className={`mr-2 ${gpsStatusColor}`}>
          <Satellite size={16} />
        </div>
        <span className="text-xs font-medium">
          GPS Signal: {gpsStatus === 'strong' ? 'Strong' : gpsStatus === 'weak' ? 'Weak' : 'Unavailable'}
        </span>
      </div>
      
      {/* Map Controls */}
      <div className="absolute right-4 bottom-32 flex flex-col space-y-2">
        <button
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-500"
          aria-label="Center map on location"
          onClick={handleCenterMap}
        >
          <Crosshair size={18} className="text-primary" />
        </button>
        <button
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-500"
          aria-label="Zoom in"
          onClick={handleZoomIn}
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-500"
          aria-label="Zoom out"
          onClick={handleZoomOut}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-500"
          aria-label="Change map type"
          onClick={toggleMapType}
        >
          {mapType === 'standard' ? <Satellite size={18} /> : <Layers size={18} />}
        </button>
      </div>
    </div>
  );
};

export default MapView;
