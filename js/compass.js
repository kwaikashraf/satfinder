/**
 * SatFinder Pro - Compass Handler
 * Digital compass using device orientation sensors
 */

class CompassHandler {
    constructor() {
        this.currentHeading = null;
        this.targetAzimuth = null;
        this.isSupported = false;
        this.listeners = [];
        this.compassElement = null;
        this.headingElement = null;
        this.targetElement = null;
        this.magneticDeclination = 0;
        this.headingHistory = [];
        this.historySize = 5;
        this.checkSupport();
    }

    checkSupport() {
        if (window.DeviceOrientationEvent) {
            this.needsPermission = typeof DeviceOrientationEvent.requestPermission === 'function';
            if (!this.needsPermission) this.isSupported = true;
        }
    }

    async requestPermission() {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.isSupported = true;
                    return true;
                }
            } catch (e) { console.error(e); }
        }
        return false;
    }

    init(compassRoseId, headingId, targetId) {
        this.compassElement = document.getElementById(compassRoseId);
        this.headingElement = document.getElementById(headingId);
        this.targetElement = document.getElementById(targetId);
    }

    async start() {
        if (this.needsPermission && !(await this.requestPermission())) {
            this.showFallback();
            return false;
        }
        if (!this.isSupported) {
            this.showFallback();
            return false;
        }
        const handler = (e) => this.handleOrientation(e);
        if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handler, true);
        } else {
            window.addEventListener('deviceorientation', handler, true);
        }
        return true;
    }

    handleOrientation(event) {
        let heading;
        if (event.webkitCompassHeading !== undefined) {
            heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            heading = 360 - event.alpha;
        } else return;
        heading = (heading + this.magneticDeclination + 360) % 360;
        heading = this.smoothHeading(heading);
        this.currentHeading = heading;
        this.updateDisplay();
        this.listeners.forEach(cb => cb(heading));
    }

    smoothHeading(h) {
        this.headingHistory.push(h);
        if (this.headingHistory.length > this.historySize) this.headingHistory.shift();
        let sinSum = 0, cosSum = 0;
        for (const v of this.headingHistory) {
            sinSum += Math.sin(v * Math.PI / 180);
            cosSum += Math.cos(v * Math.PI / 180);
        }
        return (Math.atan2(sinSum, cosSum) * 180 / Math.PI + 360) % 360;
    }

    updateDisplay() {
        if (this.compassElement) this.compassElement.style.transform = `rotate(${-this.currentHeading}deg)`;
        if (this.headingElement) this.headingElement.textContent = `${Math.round(this.currentHeading)}°`;
        if (this.targetElement && this.targetAzimuth !== null) {
            const rel = this.targetAzimuth - this.currentHeading;
            this.targetElement.style.transform = `translateX(-50%) rotate(${rel}deg)`;
            this.updateAlignmentStatus(rel);
        }
    }

    updateAlignmentStatus(rel) {
        let diff = ((rel + 180) % 360) - 180;
        if (diff < -180) diff += 360;
        const abs = Math.abs(diff);
        const el = document.getElementById('alignmentStatus');
        if (!el) return;
        el.classList.remove('aligned', 'close');
        if (abs < 5) {
            el.classList.add('aligned');
            el.querySelector('span').textContent = 'Aligned! Lock in your dish position.';
        } else if (abs < 15) {
            el.classList.add('close');
            el.querySelector('span').textContent = 'Almost there! Fine-tune your position.';
        } else {
            el.querySelector('span').textContent = diff > 0 ? `Turn ${Math.round(abs)}° right` : `Turn ${Math.round(abs)}° left`;
        }
    }

    setTarget(azimuth) {
        this.targetAzimuth = azimuth;
        if (this.targetElement) {
            this.targetElement.style.display = 'block';
            if (this.currentHeading !== null) {
                this.targetElement.style.transform = `translateX(-50%) rotate(${azimuth - this.currentHeading}deg)`;
            }
        }
    }

    clearTarget() {
        this.targetAzimuth = null;
        if (this.targetElement) this.targetElement.style.display = 'none';
    }

    setMagneticDeclination(d) { this.magneticDeclination = d; }
    addListener(cb) { if (typeof cb === 'function') this.listeners.push(cb); }
    getHeading() { return this.currentHeading; }

    showFallback() {
        if (this.headingElement) this.headingElement.textContent = 'N/A';
        const el = document.getElementById('alignmentStatus');
        if (el) el.querySelector('span').textContent = 'Compass not available. Use azimuth with external compass.';
    }

    getCardinalDirection(h = this.currentHeading) {
        if (h === null) return '--';
        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return dirs[Math.round(h / 22.5) % 16];
    }
}

window.compassHandler = new CompassHandler();
