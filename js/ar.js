/**
 * SatFinder Pro - AR Camera View
 * Augmented reality overlay showing satellite positions
 */

class ARHandler {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;
        this.stream = null;
        this.animationFrame = null;
        this.satellites = [];
        this.selectedSatellite = null;
        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.userLocation = null;
        this.hasOrientationPermission = false;
        this.errorMessage = null;
    }

    init(videoId, canvasId) {
        this.video = document.getElementById(videoId);
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) this.ctx = this.canvas.getContext('2d');
    }

    async requestOrientationPermission() {
        // iOS 13+ requires permission for DeviceOrientation
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.hasOrientationPermission = true;
                    this.setupOrientationListener();
                    return true;
                }
            } catch (e) {
                console.error('Orientation permission error:', e);
            }
            return false;
        } else {
            // Android and other platforms don't need permission
            this.hasOrientationPermission = true;
            this.setupOrientationListener();
            return true;
        }
    }

    setupOrientationListener() {
        window.addEventListener('deviceorientation', (e) => this.handleOrientation(e), true);
        window.addEventListener('deviceorientationabsolute', (e) => this.handleOrientation(e), true);
    }

    handleOrientation(event) {
        this.deviceOrientation = {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0
        };
    }

    async start() {
        const btn = document.getElementById('arStartBtn');

        try {
            // First, request orientation permission
            await this.requestOrientationPermission();

            // Check if camera is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showError('Camera not available. Please use HTTPS.');
                return false;
            }

            // Request camera access
            console.log('Requesting camera access...');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            console.log('Camera access granted');
            this.video.srcObject = this.stream;
            this.video.setAttribute('playsinline', 'true'); // Required for iOS
            this.video.setAttribute('autoplay', 'true');

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.video.play().then(resolve).catch(reject);
                };
                this.video.onerror = reject;
                setTimeout(() => reject(new Error('Video load timeout')), 5000);
            });

            console.log('Video playing');
            this.isActive = true;
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            // Hide start button and error
            if (btn) btn.classList.add('hidden');
            this.hideError();

            this.render();
            return true;
        } catch (e) {
            console.error('AR Camera error:', e);
            let errorMsg = 'Camera access failed. ';

            if (e.name === 'NotAllowedError') {
                errorMsg += 'Please allow camera access in your browser settings.';
            } else if (e.name === 'NotFoundError') {
                errorMsg += 'No camera found on this device.';
            } else if (e.name === 'NotSupportedError' || e.message?.includes('HTTPS')) {
                errorMsg += 'Camera requires HTTPS. Please use a secure connection.';
            } else {
                errorMsg += e.message || 'Unknown error occurred.';
            }

            this.showError(errorMsg);
            return false;
        }
    }

    showError(message) {
        this.errorMessage = message;
        const btn = document.getElementById('arStartBtn');
        if (btn) {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style="color: #ef4444; font-size: 12px; text-align: center;">${message}</span>
                <span style="margin-top: 8px; color: #00d4ff;">Tap to retry</span>
            `;
            btn.classList.remove('hidden');
        }
    }

    hideError() {
        this.errorMessage = null;
    }

    stop() {
        this.isActive = false;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        if (this.video) this.video.srcObject = null;

        // Show start button again
        const btn = document.getElementById('arStartBtn');
        if (btn) {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Start AR Camera</span>
            `;
            btn.classList.remove('hidden');
        }
    }

    resizeCanvas() {
        if (!this.canvas || !this.video) return;
        // Use client dimensions as fallback
        this.canvas.width = this.video.videoWidth || this.video.clientWidth || 640;
        this.canvas.height = this.video.videoHeight || this.video.clientHeight || 480;
    }

    setLocation(loc) { this.userLocation = loc; }
    setSelectedSatellite(sat) { this.selectedSatellite = sat; }
    setSatellites(sats) { this.satellites = sats; }

    render() {
        if (!this.isActive) return;

        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.userLocation && this.selectedSatellite) {
                this.drawSatelliteMarker();
            }
            this.drawSatelliteArc();
        }

        this.animationFrame = requestAnimationFrame(() => this.render());
    }

    drawSatelliteMarker() {
        if (!this.selectedSatellite || !this.userLocation) return;
        const calc = window.satCalculator.calculateAll(
            this.userLocation.lat, this.userLocation.lon, this.selectedSatellite.position
        );
        if (!calc.isVisible) return;

        const heading = (360 - this.deviceOrientation.alpha) % 360;
        let angleDiff = calc.azimuth - heading;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        const hFov = 60;
        if (Math.abs(angleDiff) > hFov / 2) return;

        const x = this.canvas.width / 2 + (angleDiff / (hFov / 2)) * (this.canvas.width / 2);
        const pitch = this.deviceOrientation.beta - 90;
        const elevDiff = calc.elevation - pitch;
        const y = this.canvas.height / 2 - (elevDiff / 30) * (this.canvas.height / 2);

        // Glow
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 40);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 40, 0, Math.PI * 2);
        this.ctx.fill();

        // Marker
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 12, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Label
        this.ctx.font = 'bold 14px Inter, sans-serif';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.selectedSatellite.name, x, y - 25);
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.fillText(`${calc.elevation.toFixed(1)}° elevation`, x, y + 35);

        // Update info panel
        const info = document.getElementById('arInfo');
        if (info) {
            info.querySelector('.ar-satellite-name').textContent = this.selectedSatellite.name;
            info.querySelector('.ar-angle').textContent = `Az: ${calc.azimuth.toFixed(1)}° El: ${calc.elevation.toFixed(1)}°`;
        }
    }

    drawSatelliteArc() {
        if (!this.userLocation || !this.ctx) return;
        this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height * 0.4);
        this.ctx.quadraticCurveTo(this.canvas.width / 2, this.canvas.height * 0.1, this.canvas.width, this.canvas.height * 0.4);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
}

window.arHandler = new ARHandler();
