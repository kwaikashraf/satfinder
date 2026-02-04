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
        this.isInitialized = false;
    }

    init() {
        // Create audio context on first user interaction
        const initAudio = () => {
            this.createContext();
            this.isInitialized = true;
        };

        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
        document.addEventListener('touchend', initAudio, { once: true });
    }

    createContext() {
        if (!this.audioCtx) {
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext created, state:', this.audioCtx.state);
            } catch (e) {
                console.error('Failed to create AudioContext:', e);
            }
        }
    }

    async resumeContext() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            try {
                await this.audioCtx.resume();
                console.log('AudioContext resumed');
            } catch (e) {
                console.error('Failed to resume AudioContext:', e);
            }
        }
    }

    enable() {
        this.createContext();
        this.resumeContext();
        this.isEnabled = true;
        console.log('Sound enabled');

        // Play a short beep to confirm sound is working
        setTimeout(() => {
            if (this.isEnabled) {
                this.beep(800, 150);
            }
        }, 100);
    }

    disable() {
        this.isEnabled = false;
        this.stopBeeping();
        console.log('Sound disabled');
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.isEnabled;
    }

    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
    }

    beep(frequency = 800, duration = 100) {
        if (!this.isEnabled) return;

        // Ensure context exists and is running
        if (!this.audioCtx) {
            this.createContext();
        }

        if (!this.audioCtx) {
            console.warn('No AudioContext available');
            return;
        }

        // Resume if suspended (mobile browsers suspend audio)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.frequency.value = frequency;
            osc.type = 'sine';

            const now = this.audioCtx.currentTime;
            gain.gain.setValueAtTime(this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);

            osc.start(now);
            osc.stop(now + duration / 1000);
        } catch (e) {
            console.error('Beep error:', e);
        }
    }

    updateAlignment(angleDiff) {
        if (!this.isEnabled) return;

        this.lastAngleDiff = angleDiff;
        const absDiff = Math.abs(angleDiff);

        this.stopBeeping();

        if (absDiff < 2) {
            // Very close - rapid beeping
            this.beepInterval = setInterval(() => this.beep(1200, 50), 100);
        } else if (absDiff < 5) {
            // Close - fast beeping
            this.beepInterval = setInterval(() => this.beep(1000, 80), 200);
        } else if (absDiff < 15) {
            // Getting close - medium beeping
            this.beepInterval = setInterval(() => this.beep(800, 100), 400);
        } else if (absDiff < 30) {
            // Far - slow beeping
            this.beepInterval = setInterval(() => this.beep(600, 100), 800);
        }
        // Beyond 30 degrees - no beeping
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
