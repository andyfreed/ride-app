import { Button } from "@/components/ui/button";
import { Play, Pause, OctagonMinus, MapPin } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { formatDistance, formatDuration, formatSpeed } from "@/lib/utils";
import { useState } from "react";

interface RideControlPanelProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  distance: number;
  currentSpeed: number;
  avgSpeed: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAddWaypoint: () => void;
}

const RideControlPanel = ({
  isRecording,
  isPaused,
  duration,
  distance,
  currentSpeed,
  avgSpeed,
  onStart,
  onPause,
  onResume,
  onStop,
  onAddWaypoint
}: RideControlPanelProps) => {
  const { settings } = useSettings();
  const isMetric = settings.units === 'metric';

  return (
    <div className="bg-white shadow-md transition-all duration-200 px-4 py-4 pb-safe overflow-hidden">
      {!isRecording ? (
        /* Not Recording State */
        <div className="flex flex-col items-center">
          <Button
            className="bg-primary text-white rounded-full py-4 px-8 font-semibold text-lg shadow-lg w-full max-w-xs flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
            onClick={onStart}
            style={{ minHeight: '54px' }} // Ensure tall enough touch target for iOS
          >
            <Play className="mr-2 h-5 w-5" />
            Start Ride
          </Button>
        </div>
      ) : (
        /* Recording State */
        <div className="flex flex-col gap-5 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-neutral-400">Duration</span>
              <span className="text-2xl font-semibold">{formatDuration(duration)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-neutral-400">Distance</span>
              <span className="text-2xl font-semibold">{formatDistance(distance, isMetric)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-neutral-400">Current Speed</span>
              <span className="text-2xl font-semibold">{formatSpeed(currentSpeed, isMetric)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-neutral-400">Avg Speed</span>
              <span className="text-2xl font-semibold">{formatSpeed(avgSpeed, isMetric)}</span>
            </div>
          </div>

          {/* iOS-optimized touch controls with larger touch targets */}
          <div className="flex justify-center gap-5 mt-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-16 w-16 shadow-sm border-2 touch-manipulation active:scale-95 transition-transform"
              onClick={isPaused ? onResume : onPause}
              aria-label={isPaused ? "Resume ride" : "Pause ride"}
            >
              {isPaused ? <Play className="h-7 w-7" /> : <Pause className="h-7 w-7" />}
            </Button>
            
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-20 w-20 shadow-md touch-manipulation active:scale-95 transition-transform"
              onClick={onStop}
              aria-label="End ride"
            >
              <OctagonMinus className="h-8 w-8" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-16 w-16 shadow-sm border-2 touch-manipulation active:scale-95 transition-transform"
              onClick={onAddWaypoint}
              aria-label="Add waypoint"
            >
              <MapPin className="h-7 w-7" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideControlPanel;
