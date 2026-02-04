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
    }

    init(videoId, canvasId) {
        this.video = document.getElementById(videoId);
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) this.ctx = this.canvas.getContext('2d');
        window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
    }

    handleOrientation(event) {
        this.deviceOrientation = {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0
        };
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            this.video.srcObject = this.stream;
            await this.video.play();
            this.isActive = true;
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            this.render();
            return true;
        } catch (e) {
            console.error('Camera error:', e);
            return false;
        }
    }

    stop() {
        this.isActive = false;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        if (this.video) this.video.srcObject = null;
    }

    resizeCanvas() {
        if (!this.canvas || !this.video) return;
        this.canvas.width = this.video.videoWidth || this.video.clientWidth;
        this.canvas.height = this.video.videoHeight || this.video.clientHeight;
    }

    setLocation(loc) { this.userLocation = loc; }
    setSelectedSatellite(sat) { this.selectedSatellite = sat; }
    setSatellites(sats) { this.satellites = sats; }

    render() {
        if (!this.isActive) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.userLocation && this.selectedSatellite) {
            this.drawSatelliteMarker();
        }
        this.drawSatelliteArc();
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
        if (!this.userLocation) return;
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
