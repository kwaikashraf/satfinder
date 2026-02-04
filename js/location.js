/**
 * SatFinder Pro - GPS Location Handler
 * Handles device location using Geolocation API with fallback options
 */

class LocationHandler {
    constructor() {
        this.currentLocation = null;
        this.watchId = null;
        this.listeners = [];
        this.isWatching = false;

        // Default location options
        this.options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };
    }

    /**
     * Check if geolocation is available
     */
    isSupported() {
        return 'geolocation' in navigator;
    }

    /**
     * Get current location once
     * @returns {Promise<Object>} Location object with lat, lon, accuracy
     */
    async getCurrentLocation() {
        if (!this.isSupported()) {
            throw new Error('Geolocation is not supported by this browser');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        timestamp: position.timestamp
                    };
                    this.notifyListeners();
                    resolve(this.currentLocation);
                },
                (error) => {
                    reject(this.handleError(error));
                },
                this.options
            );
        });
    }

    /**
     * Start watching location for continuous updates
     */
    startWatching() {
        if (!this.isSupported()) {
            console.warn('Geolocation is not supported');
            return;
        }

        if (this.isWatching) {
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    timestamp: position.timestamp
                };
                this.notifyListeners();
            },
            (error) => {
                console.error('Location watch error:', this.handleError(error));
            },
            this.options
        );

        this.isWatching = true;
    }

    /**
     * Stop watching location
     */
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isWatching = false;
        }
    }

    /**
     * Set location manually
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    setManualLocation(lat, lon) {
        // Validate coordinates
        if (lat < -90 || lat > 90) {
            throw new Error('Latitude must be between -90 and 90 degrees');
        }
        if (lon < -180 || lon > 180) {
            throw new Error('Longitude must be between -180 and 180 degrees');
        }

        this.currentLocation = {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            accuracy: 0, // Perfect accuracy for manual entry
            altitude: null,
            timestamp: Date.now(),
            isManual: true
        };

        this.notifyListeners();
        return this.currentLocation;
    }

    /**
     * Get the current stored location
     */
    getLocation() {
        return this.currentLocation;
    }

    /**
     * Add listener for location updates
     * @param {Function} callback - Function to call on location update
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    /**
     * Remove listener
     * @param {Function} callback - Function to remove
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of location update
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentLocation);
            } catch (e) {
                console.error('Location listener error:', e);
            }
        });
    }

    /**
     * Handle geolocation errors
     */
    handleError(error) {
        let message;

        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location permission denied. Please enable location access in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information is unavailable. Please try again or enter coordinates manually.';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out. Please try again.';
                break;
            default:
                message = 'An unknown error occurred while getting location.';
        }

        return new Error(message);
    }

    /**
     * Format location for display
     */
    formatLocation() {
        if (!this.currentLocation) {
            return 'No location set';
        }

        const { lat, lon, isManual } = this.currentLocation;
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';

        const formatted = `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;

        return isManual ? `${formatted} (manual)` : formatted;
    }

    /**
     * Save location to localStorage
     */
    saveLocation() {
        if (this.currentLocation) {
            localStorage.setItem('satfinder_location', JSON.stringify(this.currentLocation));
        }
    }

    /**
     * Load location from localStorage
     */
    loadSavedLocation() {
        const saved = localStorage.getItem('satfinder_location');
        if (saved) {
            try {
                this.currentLocation = JSON.parse(saved);
                this.notifyListeners();
                return this.currentLocation;
            } catch (e) {
                console.error('Error loading saved location:', e);
            }
        }
        return null;
    }

    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 - First point latitude
     * @param {number} lon1 - First point longitude
     * @param {number} lat2 - Second point latitude
     * @param {number} lon2 - Second point longitude
     * @returns {number} Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(deg) {
        return deg * Math.PI / 180;
    }
}

// Create global instance
window.locationHandler = new LocationHandler();
