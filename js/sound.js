/**
 * SatFinder Pro - Sound Handler
 * Audio feedback for satellite dish alignment
 */

class SoundHandler {
    constructor() {
        this.isEnabled = false;
        this.audioCtx = null;
        this.volume = 0.5;
        this.beepInterval = null;
        this.lastAngleDiff = null;
    }

    init() {
        // Create audio context on user interaction
        document.addEventListener('click', () => this.createContext(), { once: true });
        document.addEventListener('touchstart', () => this.createContext(), { once: true });
    }

    createContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    enable() {
        this.isEnabled = true;
        this.createContext();
    }

    disable() {
        this.isEnabled = false;
        this.stopBeeping();
    }

    toggle() {
        if (this.isEnabled) this.disable();
        else this.enable();
        return this.isEnabled;
    }

    setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); }

    beep(frequency = 800, duration = 100) {
        if (!this.audioCtx || !this.isEnabled) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.frequency.value = frequency;
        osc.type = 'sine';
        gain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration / 1000);
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + duration / 1000);
    }

    updateAlignment(angleDiff) {
        if (!this.isEnabled) return;
        this.lastAngleDiff = angleDiff;
        const absDiff = Math.abs(angleDiff);

        this.stopBeeping();
        if (absDiff < 2) {
            this.beepInterval = setInterval(() => this.beep(1200, 50), 100);
        } else if (absDiff < 5) {
            this.beepInterval = setInterval(() => this.beep(1000, 80), 200);
        } else if (absDiff < 15) {
            this.beepInterval = setInterval(() => this.beep(800, 100), 400);
        } else if (absDiff < 30) {
            this.beepInterval = setInterval(() => this.beep(600, 100), 800);
        }
    }

    stopBeeping() {
        if (this.beepInterval) {
            clearInterval(this.beepInterval);
            this.beepInterval = null;
        }
    }

    playSuccess() {
        if (!this.audioCtx || !this.isEnabled) return;
        [523.25, 659.25, 783.99].forEach((f, i) => {
            setTimeout(() => this.beep(f, 150), i * 150);
        });
    }
}

window.soundHandler = new SoundHandler();
