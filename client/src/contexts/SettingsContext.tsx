import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Settings, settingsSchema } from "@shared/schema";
import { saveSettings as saveSettingsToDb, getSettings as getSettingsFromDb } from "@/lib/indexedDB";

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
}

const defaultSettings: Settings = {
  units: "imperial",
  backgroundTracking: true,
  gpsAccuracy: "high",
  mapStyle: "standard",
};

// Create default context value with defaults
const defaultContextValue: SettingsContextType = {
  settings: defaultSettings,
  updateSettings: async () => console.error("SettingsProvider not initialized")
};

const SettingsContext = createContext<SettingsContextType>(defaultContextValue);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from IndexedDB on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const savedSettings = await getSettingsFromDb();
        if (savedSettings) {
          // Parse through schema to ensure all fields are valid
          const parsedSettings = settingsSchema.parse(savedSettings);
          setSettings(parsedSettings);
        } else {
          // If no settings found, save the defaults
          await saveSettingsToDb(defaultSettings);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        // Use defaults on error
        await saveSettingsToDb(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Update settings
  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      // Validate through schema
      const validatedSettings = settingsSchema.parse(updatedSettings);
      
      // Save to IndexedDB
      await saveSettingsToDb(validatedSettings);
      
      // Update state
      setSettings(validatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  // Always provide the context, but if still loading use the defaults
  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
