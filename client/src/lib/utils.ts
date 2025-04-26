import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function formatSpeed(speedMps: number, isMetric: boolean): string {
  if (isMetric) {
    // Convert m/s to km/h
    const speedKmh = (speedMps * 3.6).toFixed(0);
    return `${speedKmh} km/h`;
  } else {
    // Convert m/s to mph
    const speedMph = (speedMps * 2.237).toFixed(0);
    return `${speedMph} mph`;
  }
}

export function formatDistance(distanceMeters: number, isMetric: boolean): string {
  if (isMetric) {
    if (distanceMeters < 1000) {
      return `${distanceMeters.toFixed(0)} m`;
    }
    // Convert to kilometers
    const distanceKm = (distanceMeters / 1000).toFixed(1);
    return `${distanceKm} km`;
  } else {
    // Convert to miles
    const distanceMiles = (distanceMeters / 1609.34).toFixed(1);
    return `${distanceMiles} mi`;
  }
}

export function formatElevation(elevationMeters: number, isMetric: boolean): string {
  if (isMetric) {
    return `${elevationMeters.toFixed(0)} m`;
  } else {
    // Convert to feet
    const elevationFeet = (elevationMeters * 3.28084).toFixed(0);
    return `${elevationFeet} ft`;
  }
}

export function calculateDistance(coords: GeolocationCoordinate[]): number {
  let distance = 0;
  
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    distance += haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }
  
  return distance;
}

// Calculate distance between two points using Haversine formula
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface GeolocationCoordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  altitudeAccuracy?: number | null;
}

export function calculateBounds(coordinates: GeolocationCoordinate[]) {
  if (!coordinates.length) return undefined;
  
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;
  
  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });
  
  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ];
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  });
}
