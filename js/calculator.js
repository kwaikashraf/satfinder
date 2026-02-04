/**
 * SatFinder Pro - Satellite Position Calculator
 * Calculates azimuth, elevation, and LNB tilt for satellite dish alignment
 */

class SatelliteCalculator {
    constructor() {
        // Earth's radius in km
        this.EARTH_RADIUS = 6378.137;
        // Geostationary orbit altitude in km
        this.GEO_ALTITUDE = 35786;
        // Geostationary orbit radius from Earth's center
        this.GEO_RADIUS = this.EARTH_RADIUS + this.GEO_ALTITUDE;
    }

    /**
     * Calculate azimuth angle from observer to satellite
     * @param {number} obsLat - Observer latitude in degrees
     * @param {number} obsLon - Observer longitude in degrees
     * @param {number} satLon - Satellite longitude in degrees
     * @returns {number} Azimuth in degrees (0-360, clockwise from North)
     */
    calculateAzimuth(obsLat, obsLon, satLon) {
        const latRad = this.toRadians(obsLat);
        const lonDiff = this.toRadians(satLon - obsLon);

        // Calculate azimuth using spherical trigonometry
        const azimuthRad = Math.atan2(Math.tan(lonDiff), Math.sin(latRad));
        let azimuth = this.toDegrees(azimuthRad);

        // Convert to compass bearing (0-360)
        if (obsLat < 0) {
            // Southern hemisphere
            azimuth = (azimuth + 360) % 360;
        } else {
            // Northern hemisphere
            azimuth = 180 + azimuth;
        }

        return this.normalizeAngle(azimuth);
    }

    /**
     * Calculate elevation angle from observer to satellite
     * @param {number} obsLat - Observer latitude in degrees
     * @param {number} obsLon - Observer longitude in degrees
     * @param {number} satLon - Satellite longitude in degrees
     * @returns {number} Elevation in degrees above horizon
     */
    calculateElevation(obsLat, obsLon, satLon) {
        const latRad = this.toRadians(obsLat);
        const lonDiffRad = this.toRadians(satLon - obsLon);

        // Calculate the angle from Earth's center to observer-satellite line
        const cosGamma = Math.cos(latRad) * Math.cos(lonDiffRad);

        // Calculate elevation
        const ratio = this.GEO_RADIUS / this.EARTH_RADIUS;
        const elevation = Math.atan(
            (cosGamma - 1 / ratio) / Math.sqrt(1 - cosGamma * cosGamma)
        );

        return this.toDegrees(elevation);
    }

    /**
     * Calculate LNB tilt (polarization skew) angle
     * @param {number} obsLat - Observer latitude in degrees
     * @param {number} obsLon - Observer longitude in degrees
     * @param {number} satLon - Satellite longitude in degrees
     * @returns {number} LNB tilt in degrees (positive = clockwise when facing dish)
     */
    calculateLNBTilt(obsLat, obsLon, satLon) {
        const latRad = this.toRadians(obsLat);
        const lonDiffRad = this.toRadians(satLon - obsLon);

        // Calculate polarization skew
        const tiltRad = Math.atan(
            Math.sin(lonDiffRad) / Math.tan(latRad)
        );

        return this.toDegrees(tiltRad);
    }

    /**
     * Calculate all satellite parameters at once
     * @param {number} obsLat - Observer latitude in degrees
     * @param {number} obsLon - Observer longitude in degrees
     * @param {number} satLon - Satellite longitude in degrees
     * @returns {Object} Object containing azimuth, elevation, lnbTilt, and visibility
     */
    calculateAll(obsLat, obsLon, satLon) {
        const azimuth = this.calculateAzimuth(obsLat, obsLon, satLon);
        const elevation = this.calculateElevation(obsLat, obsLon, satLon);
        const lnbTilt = this.calculateLNBTilt(obsLat, obsLon, satLon);

        // Check if satellite is visible (elevation > 0)
        const isVisible = elevation > 0;

        // Determine signal quality based on elevation
        let signalQuality = 'none';
        if (elevation > 30) signalQuality = 'excellent';
        else if (elevation > 20) signalQuality = 'good';
        else if (elevation > 10) signalQuality = 'fair';
        else if (elevation > 0) signalQuality = 'poor';

        return {
            azimuth: this.round(azimuth, 1),
            elevation: this.round(elevation, 1),
            lnbTilt: this.round(lnbTilt, 1),
            isVisible,
            signalQuality
        };
    }

    /**
     * Calculate distance to geostationary satellite
     * @param {number} obsLat - Observer latitude in degrees
     * @param {number} obsLon - Observer longitude in degrees
     * @param {number} satLon - Satellite longitude in degrees
     * @returns {number} Distance in km
     */
    calculateDistance(obsLat, obsLon, satLon) {
        const latRad = this.toRadians(obsLat);
        const lonDiffRad = this.toRadians(satLon - obsLon);

        const cosGamma = Math.cos(latRad) * Math.cos(lonDiffRad);

        // Distance using law of cosines
        const distance = Math.sqrt(
            this.EARTH_RADIUS * this.EARTH_RADIUS +
            this.GEO_RADIUS * this.GEO_RADIUS -
            2 * this.EARTH_RADIUS * this.GEO_RADIUS * cosGamma
        );

        return Math.round(distance);
    }

    /**
     * Convert degrees to radians
     */
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Convert radians to degrees
     */
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * Normalize angle to 0-360 range
     */
    normalizeAngle(angle) {
        while (angle < 0) angle += 360;
        while (angle >= 360) angle -= 360;
        return angle;
    }

    /**
     * Round to specified decimal places
     */
    round(value, decimals) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * Format degrees with direction indicator
     * @param {number} degrees - Angle in degrees
     * @param {boolean} isLatitude - True for lat, false for lon
     * @returns {string} Formatted string like "45.5° N"
     */
    formatCoordinate(degrees, isLatitude) {
        const abs = Math.abs(degrees);
        let direction;

        if (isLatitude) {
            direction = degrees >= 0 ? 'N' : 'S';
        } else {
            direction = degrees >= 0 ? 'E' : 'W';
        }

        return `${abs.toFixed(4)}° ${direction}`;
    }

    /**
     * Format satellite position
     * @param {number} position - Orbital position in degrees
     * @returns {string} Formatted string like "13.0° East"
     */
    formatSatellitePosition(position) {
        const abs = Math.abs(position);
        const direction = position >= 0 ? 'East' : 'West';
        return `${abs.toFixed(1)}° ${direction}`;
    }
}

// Create global instance
window.satCalculator = new SatelliteCalculator();
