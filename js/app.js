/**
 * SatFinder Pro - Main Application Controller
 */

class SatFinderApp {
    constructor() {
        this.satellites = window.SATELLITES || [];
        this.selectedSatellite = null;
        this.favorites = [];
        this.currentTab = 'compass';
        this.location = null;
        this.calculatedData = null;
    }

    async init() {
        this.loadFavorites();
        this.setupEventListeners();
        this.renderSatelliteList();
        window.compassHandler.init('compassRose', 'currentHeading', 'targetIndicator');
        window.arHandler.init('arVideo', 'arCanvas');
        window.soundHandler.init();

        // Load saved location
        const saved = window.locationHandler.loadSavedLocation();
        if (saved) {
            this.location = saved;
            this.updateLocationDisplay();
            this.updateCalculations();
        }

        window.locationHandler.addListener((loc) => {
            this.location = loc;
            this.updateLocationDisplay();
            this.updateCalculations();
        });

        window.compassHandler.addListener((heading) => {
            if (this.calculatedData && window.soundHandler.isEnabled) {
                let diff = this.calculatedData.azimuth - heading;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                window.soundHandler.updateAlignment(diff);
            }
        });

        await window.compassHandler.start();
        this.initMap();
    }

    setupEventListeners() {
        // Location button
        document.getElementById('getLocationBtn')?.addEventListener('click', () => this.getLocation());

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Satellite selector
        document.getElementById('selectedSatellite')?.addEventListener('click', () => this.switchTab('satellites'));

        // Favorite button
        document.getElementById('favoriteBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.selectedSatellite) this.toggleFavorite(this.selectedSatellite);
        });

        // Satellite search
        document.getElementById('satelliteSearch')?.addEventListener('input', (e) => this.filterSatellites(e.target.value));

        // Filter tabs
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterSatellites(document.getElementById('satelliteSearch')?.value || '', btn.dataset.filter);
            });
        });

        // Sound toggle
        document.getElementById('soundToggle')?.addEventListener('click', () => this.toggleSound());

        // Settings
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings')?.addEventListener('click', () => this.closeSettings());
        document.getElementById('applyCoords')?.addEventListener('click', () => this.applyManualCoords());

        // AR button - add both click and touch for mobile
        const arBtn = document.getElementById('arStartBtn');
        if (arBtn) {
            arBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startAR();
            });
            arBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.startAR();
            });
        }

        // Volume slider
        document.getElementById('volumeSlider')?.addEventListener('input', (e) => {
            window.soundHandler.setVolume(e.target.value / 100);
        });
    }

    async getLocation() {
        const btn = document.getElementById('getLocationBtn');
        btn.classList.add('loading');
        try {
            await window.locationHandler.getCurrentLocation();
            window.locationHandler.saveLocation();
        } catch (e) {
            alert(e.message);
        }
        btn.classList.remove('loading');
    }

    updateLocationDisplay() {
        const el = document.getElementById('locationText');
        if (el) el.textContent = window.locationHandler.formatLocation();
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === `${tabId}-tab`));

        // Handle AR tab
        if (tabId === 'ar') {
            // Show AR start button if camera is not active
            const btn = document.getElementById('arStartBtn');
            if (btn && !window.arHandler.isActive) {
                btn.classList.remove('hidden');
                btn.classList.add('visible');
            }
        } else {
            window.arHandler.stop();
        }

        // Redraw map when switching to map tab
        if (tabId === 'map') {
            setTimeout(() => this.drawMap(), 100);
        }
    }

    renderSatelliteList(filter = '', showFavoritesOnly = false) {
        const list = document.getElementById('satellitesList');
        if (!list) return;

        let sats = this.satellites;
        if (showFavoritesOnly) sats = sats.filter(s => this.favorites.includes(s.name));
        if (filter) {
            const f = filter.toLowerCase();
            sats = sats.filter(s => s.name.toLowerCase().includes(f) || (s.region && s.region.toLowerCase().includes(f)));
        }

        list.innerHTML = sats.map(sat => {
            const pos = window.satCalculator.formatSatellitePosition(sat.position);
            const isFav = this.favorites.includes(sat.name);
            const isSel = this.selectedSatellite?.name === sat.name;
            return `
                <div class="satellite-item${isSel ? ' selected' : ''}" data-name="${sat.name}">
                    <div class="sat-icon">🛰️</div>
                    <div class="sat-info">
                        <span class="sat-name">${sat.name}</span>
                        <span class="sat-position">${pos}</span>
                    </div>
                    <button class="favorite-btn${isFav ? ' active' : ''}" data-name="${sat.name}">
                        <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                </div>`;
        }).join('');

        // Use event delegation for better mobile touch handling
        list.querySelectorAll('.satellite-item').forEach(item => {
            const handler = (e) => {
                e.preventDefault();
                if (!e.target.closest('.favorite-btn')) {
                    this.selectSatellite(this.satellites.find(s => s.name === item.dataset.name));
                }
            };
            item.addEventListener('click', handler);
            item.addEventListener('touchend', handler);
        });

        list.querySelectorAll('.favorite-btn').forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const sat = this.satellites.find(s => s.name === btn.dataset.name);
                if (sat) this.toggleFavorite(sat);
            };
            btn.addEventListener('click', handler);
            btn.addEventListener('touchend', handler);
        });
    }

    filterSatellites(term, filter = 'all') {
        this.renderSatelliteList(term, filter === 'favorites');
    }

    selectSatellite(sat) {
        if (!sat) return;
        this.selectedSatellite = sat;
        console.log('Selected satellite:', sat.name, 'Position:', sat.position);

        const el = document.getElementById('selectedSatellite');
        if (el) {
            el.querySelector('.sat-name').textContent = sat.name;
            el.querySelector('.sat-position').textContent = window.satCalculator.formatSatellitePosition(sat.position);
        }

        const favBtn = document.getElementById('favoriteBtn');
        if (favBtn) favBtn.classList.toggle('active', this.favorites.includes(sat.name));

        // Update AR with selected satellite
        window.arHandler.setSelectedSatellite(sat);

        // Calculate and update display
        this.updateCalculations();

        // Set compass target after calculations
        if (this.calculatedData) {
            console.log('Calculated:', this.calculatedData);
            window.compassHandler.setTarget(this.calculatedData.azimuth);
        }

        this.renderSatelliteList(document.getElementById('satelliteSearch')?.value || '');
        this.switchTab('compass');
    }

    updateCalculations() {
        if (!this.location || !this.selectedSatellite) return;

        this.calculatedData = window.satCalculator.calculateAll(
            this.location.lat, this.location.lon, this.selectedSatellite.position
        );

        document.getElementById('azimuthValue').textContent = `${this.calculatedData.azimuth}°`;
        document.getElementById('elevationValue').textContent = `${this.calculatedData.elevation}°`;
        document.getElementById('lnbValue').textContent = `${this.calculatedData.lnbTilt}°`;

        const dist = window.satCalculator.calculateDistance(
            this.location.lat, this.location.lon, this.selectedSatellite.position
        );
        document.getElementById('satDistance').textContent = `~${dist.toLocaleString()} km`;
        document.getElementById('satLongitude').textContent = window.satCalculator.formatSatellitePosition(this.selectedSatellite.position);

        window.compassHandler.setTarget(this.calculatedData.azimuth);
        window.arHandler.setLocation(this.location);
        this.drawMap();
    }

    toggleFavorite(sat) {
        const idx = this.favorites.indexOf(sat.name);
        if (idx > -1) this.favorites.splice(idx, 1);
        else this.favorites.push(sat.name);
        this.saveFavorites();
        this.renderSatelliteList(document.getElementById('satelliteSearch')?.value || '');
        if (this.selectedSatellite?.name === sat.name) {
            document.getElementById('favoriteBtn')?.classList.toggle('active', this.favorites.includes(sat.name));
        }
    }

    saveFavorites() { localStorage.setItem('satfinder_favorites', JSON.stringify(this.favorites)); }
    loadFavorites() {
        try {
            this.favorites = JSON.parse(localStorage.getItem('satfinder_favorites')) || [];
        } catch { this.favorites = []; }
    }

    toggleSound() {
        const enabled = window.soundHandler.toggle();
        const btn = document.getElementById('soundToggle');
        if (btn) {
            btn.querySelector('.sound-on').classList.toggle('hidden', !enabled);
            btn.querySelector('.sound-off').classList.toggle('hidden', enabled);
            btn.classList.toggle('active', enabled);
        }
    }

    async startAR() {
        const btn = document.getElementById('arStartBtn');
        const success = await window.arHandler.start();
        if (success && btn) btn.classList.add('hidden');
    }

    openSettings() { document.getElementById('settingsModal')?.classList.add('open'); }
    closeSettings() { document.getElementById('settingsModal')?.classList.remove('open'); }

    applyManualCoords() {
        const lat = parseFloat(document.getElementById('manualLat')?.value);
        const lon = parseFloat(document.getElementById('manualLon')?.value);
        if (isNaN(lat) || isNaN(lon)) { alert('Please enter valid coordinates'); return; }
        try {
            window.locationHandler.setManualLocation(lat, lon);
            window.locationHandler.saveLocation();
            this.closeSettings();
        } catch (e) { alert(e.message); }
    }

    initMap() {
        this.mapCanvas = document.getElementById('mapCanvas');
        if (this.mapCanvas) this.mapCtx = this.mapCanvas.getContext('2d');
    }

    drawMap() {
        if (!this.mapCtx || !this.mapCanvas) return;
        const c = this.mapCanvas, ctx = this.mapCtx;
        c.width = c.parentElement.clientWidth;
        c.height = c.parentElement.clientHeight;

        // Background gradient
        const bg = ctx.createLinearGradient(0, 0, 0, c.height);
        bg.addColorStop(0, '#0a0e17');
        bg.addColorStop(1, '#1a2235');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, c.width, c.height);

        // Grid
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 6; i++) {
            const y = (c.height / 6) * i;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
        }
        for (let i = 0; i <= 8; i++) {
            const x = (c.width / 8) * i;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
        }

        // Equator
        const eqY = c.height / 2;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(0, eqY); ctx.lineTo(c.width, eqY); ctx.stroke();
        ctx.setLineDash([]);

        if (!this.location) return;

        // User location
        const ux = ((this.location.lon + 180) / 360) * c.width;
        const uy = ((90 - this.location.lat) / 180) * c.height;

        const uGrad = ctx.createRadialGradient(ux, uy, 0, ux, uy, 30);
        uGrad.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
        uGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = uGrad;
        ctx.beginPath(); ctx.arc(ux, uy, 30, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(ux, uy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ux, uy, 4, 0, Math.PI * 2); ctx.fill();

        if (!this.selectedSatellite) return;

        // Satellite
        const sx = ((this.selectedSatellite.position + 180) / 360) * c.width;
        const sy = eqY;

        const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 25);
        sGrad.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
        sGrad.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = sGrad;
        ctx.beginPath(); ctx.arc(sx, sy, 25, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#00d4ff';
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();

        // Line
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.setLineDash([]);

        // Labels
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('You', ux, uy - 20);
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(this.selectedSatellite.name.split(' ')[0], sx, sy - 15);
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SatFinderApp();
    window.app.init();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    }
});
