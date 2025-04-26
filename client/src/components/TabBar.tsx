import { MapIcon, ListIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  lastActiveTab: string;
}

const TabBar = ({ activeTab, onTabChange, lastActiveTab }: TabBarProps) => {
  return (
    <div 
      className="bg-white fixed bottom-0 w-full flex justify-around items-center border-t border-neutral-200 z-40"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 34px)',
        height: 'calc(49px + env(safe-area-inset-bottom, 34px))'
      }}
    >
      <TabButton 
        icon={<ListIcon size={20} />} 
        label="Rides" 
        isActive={activeTab === "/rides"} 
        onClick={() => onTabChange("/rides")}
      />
      <TabButton 
        icon={<MapIcon size={20} />} 
        label="Map" 
        isActive={activeTab === "/map"} 
        onClick={() => onTabChange("/map")}
      />
      <TabButton 
        icon={<UserIcon size={20} />} 
        label="Profile" 
        isActive={activeTab === "/profile"} 
        onClick={() => onTabChange("/profile")}
      />
    </div>
  );
};

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton = ({ icon, label, isActive, onClick }: TabButtonProps) => {
  return (
    <button 
      className="flex flex-col items-center justify-center pt-2 pb-1 w-1/3" 
      onClick={onClick}
    >
      <div className={cn(
        "text-lg", 
        isActive ? "text-primary" : "text-neutral-400"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[10px] mt-1", 
        isActive ? "text-primary font-medium" : "text-neutral-400"
      )}>
        {label}
      </span>
    </button>
  );
};

export default TabBar;
