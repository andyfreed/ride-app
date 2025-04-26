import { GeolocationCoordinate } from "./utils";

export type GPSTrackerOptions = {
  highAccuracy: boolean;
  onPositionUpdate: (position: GeolocationCoordinate) => void;
  onError: (error: GeolocationPositionError) => void;
  pauseBetweenUpdates?: number; // milliseconds to pause between updates to save battery
};

export class GPSTracker {
  private watchId: number | null = null;
  private isTracking = false;
  private coordinates: GeolocationCoordinate[] = [];
  private pauseBetweenUpdates: number;
  private options: GPSTrackerOptions;
  private lastUpdateTime = 0;
  private highestSpeed = 0;

  constructor(options: GPSTrackerOptions) {
    this.options = options;
    this.pauseBetweenUpdates = options.pauseBetweenUpdates || 0;
  }

  public startTracking(): boolean {
    if (this.isTracking) return false;
    if (!navigator.geolocation) {
      this.options.onError({
        code: 2,
        message: "Geolocation is not supported by this browser.",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
      return false;
    }

    this.coordinates = [];
    this.highestSpeed = 0;
    this.lastUpdateTime = 0;
    this.isTracking = true;

    // Request a wake lock to prevent screen from turning off
    this.requestWakeLock();

    this.watchId = navigator.geolocation.watchPosition(
      this.handlePositionUpdate,
      this.handleError,
      {
        enableHighAccuracy: this.options.highAccuracy,
        timeout: 30000,
        maximumAge: 0
      }
    );

    return true;
  }

  public stopTracking(): GeolocationCoordinate[] {
    if (!this.isTracking) return this.coordinates;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking = false;
    this.releaseWakeLock();
    
    return this.coordinates;
  }

  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  public getCoordinates(): GeolocationCoordinate[] {
    return [...this.coordinates];
  }

  public getDistance(): number {
    // Distance is calculated by the consumer of this class
    return 0;
  }

  public getDuration(): number {
    if (this.coordinates.length < 2) return 0;
    
    const start = this.coordinates[0].timestamp;
    const end = this.coordinates[this.coordinates.length - 1].timestamp;
    
    return Math.floor((end - start) / 1000); // in seconds
  }

  public getMaxSpeed(): number {
    return this.highestSpeed;
  }

  public getAverageSpeed(): number {
    const speedReadings = this.coordinates
      .map(coord => coord.speed)
      .filter((speed): speed is number => speed !== null && speed !== undefined);
    
    if (speedReadings.length === 0) return 0;
    
    const sum = speedReadings.reduce((acc, speed) => acc + speed, 0);
    return sum / speedReadings.length;
  }

  public pauseTracking(): void {
    if (!this.isTracking || this.watchId === null) return;
    
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  public resumeTracking(): void {
    if (!this.isTracking || this.watchId !== null) return;
    
    this.watchId = navigator.geolocation.watchPosition(
      this.handlePositionUpdate,
      this.handleError,
      {
        enableHighAccuracy: this.options.highAccuracy,
        timeout: 30000,
        maximumAge: 0
      }
    );
  }

  private handlePositionUpdate = (position: GeolocationPosition) => {
    const now = Date.now();
    
    // Implement pause between updates to save battery
    if (this.pauseBetweenUpdates > 0 && now - this.lastUpdateTime < this.pauseBetweenUpdates) {
      return;
    }
    
    this.lastUpdateTime = now;
    
    const { latitude, longitude, altitude, speed, heading, accuracy, altitudeAccuracy } = position.coords;
    const timestamp = position.timestamp;
    
    // Update highest speed if needed
    if (speed !== null && speed > this.highestSpeed) {
      this.highestSpeed = speed;
    }
    
    const coordinate: GeolocationCoordinate = {
      latitude,
      longitude,
      timestamp,
      altitude,
      speed,
      heading,
      accuracy,
      altitudeAccuracy
    };
    
    this.coordinates.push(coordinate);
    this.options.onPositionUpdate(coordinate);
  };

  private handleError = (error: GeolocationPositionError) => {
    this.options.onError(error);
  };

  // Wake Lock API to prevent screen from turning off during tracking
  private wakeLock: any = null;
  
  private async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        // @ts-ignore - Wake Lock API might not be fully typed
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.log(`Wake Lock error: ${err}`);
      }
    }
  }
  
  private releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release()
        .then(() => {
          this.wakeLock = null;
        });
    }
  }
}
