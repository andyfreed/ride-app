import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch } from "wouter";
import MapPage from "@/pages/MapPage";
import RidesListPage from "@/pages/RidesListPage";
import ProfilePage from "@/pages/ProfilePage";
import RideDetailsPage from "@/pages/RideDetailsPage";
import NotFound from "@/pages/not-found";
import TabBar from "@/components/TabBar";
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

function App() {
  const [location, setLocation] = useLocation();
  const lastActiveTabRef = useRef<string>("/map");

  // Store last active tab to return to after viewing details
  useEffect(() => {
    if (["/map", "/rides", "/profile"].includes(location)) {
      lastActiveTabRef.current = location;
    }
  }, [location]);

  // Determine if we should show the tab bar (hide it on ride details page)
  const showTabBar = !location.startsWith("/rides/");

  return (
    <TooltipProvider>
      <div className="h-screen w-full flex flex-col">
        <div 
          className="ios-status-bar bg-background w-full h-11 fixed top-0 z-50 flex items-center justify-between px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
        ></div>

        <div className="flex-1 pt-11 pb-[83px] overflow-hidden relative">
          <Switch>
            <Route path="/map" component={MapPage} />
            <Route path="/rides" component={RidesListPage} />
            <Route path="/rides/:id" component={RideDetailsPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/">
              {() => {
                // Redirect to map by default
                setLocation("/map");
                return null;
              }}
            </Route>
            <Route component={NotFound} />
          </Switch>
        </div>

        {showTabBar && (
          <TabBar
            activeTab={location}
            onTabChange={setLocation}
            lastActiveTab={lastActiveTabRef.current}
          />
        )}
        
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

export default App;
