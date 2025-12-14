/**
 * User Location Store
 *
 * Handles browser geolocation:
 * - Requests permission when needed
 * - Stores user's coordinates
 * - Provides location context for tools like Maps & Directions
 *
 * Privacy-first approach:
 * - Only requests location when user needs directions
 * - Stores in memory only (not persisted)
 * - User can deny permission, falls back to IP geolocation in n8n
 */

import { create } from 'zustand';

interface LocationState {
  // User's coordinates (null if not available)
  latitude: number | null;
  longitude: number | null;

  // Permission and loading state
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable';
  isLoading: boolean;
  error: string | null;

  // Last updated timestamp
  lastUpdated: Date | null;

  // Actions
  requestLocation: () => Promise<{ latitude: number; longitude: number } | null>;
  clearLocation: () => void;
  getLocationForApi: () => { user_latitude?: number; user_longitude?: number };
}

export const useLocationStore = create<LocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  permissionStatus: 'prompt',
  isLoading: false,
  error: null,
  lastUpdated: null,

  /**
   * Request user's location via browser Geolocation API
   * Returns coordinates if successful, null if denied/unavailable
   */
  requestLocation: async () => {
    // Check if geolocation is available
    if (typeof window === 'undefined' || !navigator.geolocation) {
      set({ permissionStatus: 'unavailable', error: 'Geolocation not supported' });
      return null;
    }

    // If we already have recent location (within 5 minutes), return it
    const state = get();
    if (
      state.latitude !== null &&
      state.longitude !== null &&
      state.lastUpdated &&
      Date.now() - state.lastUpdated.getTime() < 5 * 60 * 1000
    ) {
      return { latitude: state.latitude, longitude: state.longitude };
    }

    set({ isLoading: true, error: null });

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Use less accurate but faster method
          timeout: 10000, // 10 second timeout
          maximumAge: 300000, // Accept cached position up to 5 minutes old
        });
      });

      const { latitude, longitude } = position.coords;

      set({
        latitude,
        longitude,
        permissionStatus: 'granted',
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      console.log('[LOCATION] Got user location:', latitude.toFixed(4), longitude.toFixed(4));
      return { latitude, longitude };
    } catch (error) {
      const geoError = error as GeolocationPositionError;

      let errorMessage = 'Failed to get location';
      let permissionStatus: 'denied' | 'unavailable' = 'unavailable';

      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          errorMessage = 'Location permission denied';
          permissionStatus = 'denied';
          break;
        case geoError.POSITION_UNAVAILABLE:
          errorMessage = 'Location unavailable';
          break;
        case geoError.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
      }

      console.log('[LOCATION] Error:', errorMessage);

      set({
        permissionStatus,
        isLoading: false,
        error: errorMessage,
      });

      return null;
    }
  },

  /**
   * Clear stored location
   */
  clearLocation: () => {
    set({
      latitude: null,
      longitude: null,
      lastUpdated: null,
      error: null,
    });
  },

  /**
   * Get location data formatted for API calls
   * Returns empty object if no location available
   */
  getLocationForApi: () => {
    const { latitude, longitude } = get();

    if (latitude !== null && longitude !== null) {
      return {
        user_latitude: latitude,
        user_longitude: longitude,
      };
    }

    return {};
  },
}));

/**
 * Hook to check if we should prompt for location
 * Used by chat components when user asks for directions
 */
export function shouldPromptForLocation(): boolean {
  const { permissionStatus, latitude } = useLocationStore.getState();
  // Prompt if we haven't asked yet and don't have a location
  return permissionStatus === 'prompt' && latitude === null;
}
