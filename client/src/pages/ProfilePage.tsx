import { useSettings } from "@/contexts/SettingsContext";
import { useRide } from "@/contexts/RideContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formatDistance, formatDuration } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  CloudUpload, 
  HelpCircle, 
  LogOut,
  TrafficCone,
  Clock,
  Fuel
} from "lucide-react";

const ProfilePage = () => {
  const { rides } = useRide();
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const isMetric = settings.units === 'metric';

  // Calculate total stats
  const totalRides = rides.length;
  const totalDistance = rides.reduce((sum, ride) => sum + Number(ride.distance), 0);
  const totalDuration = rides.reduce((sum, ride) => sum + ride.duration, 0);

  const handleExportData = () => {
    if (rides.length === 0) {
      toast({
        title: "No Data to Export",
        description: "You haven't tracked any rides yet",
        variant: "destructive"
      });
      return;
    }

    // Create a JSON file with all rides
    const dataStr = JSON.stringify(rides, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = `mototrack-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Data Exported",
      description: "Your ride data has been downloaded as a JSON file"
    });
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-semibold mb-4 pt-2">Profile & Settings</h1>
      
      <Card className="bg-white rounded-xl shadow-sm mb-4">
        <CardContent className="p-4">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-neutral-200 mr-4 flex items-center justify-center">
              <User size={24} className="text-neutral-400" />
            </div>
            <div>
              <div className="font-semibold text-lg">Rider</div>
              <div className="text-sm text-neutral-400">Local User</div>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-3">
            <div className="flex justify-between items-center text-sm mb-2">
              <div className="flex items-center">
                <TrafficCone size={16} className="mr-2 text-neutral-400" />
                <span>Total Rides</span>
              </div>
              <span className="font-medium">{totalRides}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <div className="flex items-center">
                <Fuel size={16} className="mr-2 text-neutral-400" />
                <span>Distance Tracked</span>
              </div>
              <span className="font-medium">{formatDistance(totalDistance, isMetric)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center">
                <Clock size={16} className="mr-2 text-neutral-400" />
                <span>Time On TrafficCone</span>
              </div>
              <span className="font-medium">{formatDuration(totalDuration)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-xl shadow-sm mb-4">
        <CardContent className="divide-y divide-neutral-100">
          <div className="p-4">
            <div className="text-lg font-medium mb-2">Settings</div>
          </div>
          
          <div className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div>Units</div>
                <div className="text-sm text-neutral-400">Distance, speed</div>
              </div>
              <Select 
                value={settings.units} 
                onValueChange={(value: "imperial" | "metric") => updateSettings({ units: value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Miles (Imperial)</SelectItem>
                  <SelectItem value="metric">Kilometers (Metric)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div>Background Tracking</div>
                <div className="text-sm text-neutral-400">Continue when app is minimized</div>
              </div>
              <Switch 
                checked={settings.backgroundTracking} 
                onCheckedChange={(checked) => updateSettings({ backgroundTracking: checked })}
              />
            </div>
          </div>

          <div className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div>GPS Accuracy</div>
                <div className="text-sm text-neutral-400">Higher uses more battery</div>
              </div>
              <Select 
                value={settings.gpsAccuracy} 
                onValueChange={(value: "high" | "medium" | "low") => updateSettings({ gpsAccuracy: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div>Map Style</div>
                <div className="text-sm text-neutral-400">Appearance of the map</div>
              </div>
              <Select 
                value={settings.mapStyle} 
                onValueChange={(value: "standard" | "satellite" | "hybrid") => updateSettings({ mapStyle: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-xl shadow-sm mb-4">
        <CardContent className="divide-y divide-neutral-100">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-start p-4 h-auto"
            onClick={handleExportData}
          >
            <CloudUpload className="mr-3 text-neutral-400 h-5 w-5" />
            <span>Export Ride Data</span>
          </Button>
          
          <Button variant="ghost" className="w-full flex items-center justify-start p-4 h-auto">
            <HelpCircle className="mr-3 text-neutral-400 h-5 w-5" />
            <span>Help & Support</span>
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-neutral-400 py-4">
        MotoTrack v1.0.0
      </div>
    </div>
  );
};

export default ProfilePage;
