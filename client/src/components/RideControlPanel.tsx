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
    <div className="bg-white shadow-md transition-all duration-200 px-4 py-3">
      {!isRecording ? (
        /* Not Recording State */
        <div className="flex flex-col items-center">
          <Button
            className="bg-primary text-white rounded-full py-3 px-8 font-semibold text-base shadow-lg w-full max-w-xs flex items-center justify-center"
            onClick={onStart}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Ride
          </Button>
        </div>
      ) : (
        /* Recording State */
        <div className="flex flex-col gap-4 animate-in fade-in">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-neutral-400">Duration</span>
              <span className="text-xl font-semibold">{formatDuration(duration)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-neutral-400">Distance</span>
              <span className="text-xl font-semibold">{formatDistance(distance, isMetric)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-neutral-400">Current Speed</span>
              <span className="text-xl font-semibold">{formatSpeed(currentSpeed, isMetric)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-neutral-400">Avg Speed</span>
              <span className="text-xl font-semibold">{formatSpeed(avgSpeed, isMetric)}</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={isPaused ? onResume : onPause}
              aria-label={isPaused ? "Resume ride" : "Pause ride"}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-14 w-14"
              onClick={onStop}
              aria-label="OctagonMinus ride"
            >
              <OctagonMinus className="h-6 w-6" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={onAddWaypoint}
              aria-label="Add waypoint"
            >
              <MapPin className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideControlPanel;
