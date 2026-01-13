/**
 * Effects System - Phase 7: UX Polish
 * Particle effects, animations, and visual feedback
 */

/**
 * Particle - Single animated particle
 */
class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 4;
        this.vy = options.vy || (Math.random() - 0.5) * 4;
        this.size = options.size || Math.random() * 6 + 2;
        this.color = options.color || '#FF77C9';
        this.life = options.life || 1;
        this.decay = options.decay || 0.02;
        this.gravity = options.gravity || 0;
        this.shape = options.shape || 'circle'; // circle, square, star
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        this.size *= 0.98;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        
        if (this.shape === 'square') {
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        } else if (this.shape === 'star') {
            this.drawStar(ctx, this.x, this.y, 5, this.size, this.size/2);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
    }

    isDead() {
        return this.life <= 0;
    }
}

/**
 * Trail Point - For ball trail effect
 */
class TrailPoint {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1;
        this.decay = 0.08;
    }

    update() {
        this.life -= this.decay;
    }

    isDead() {
        return this.life <= 0;
    }
}

/**
 * Effects Manager - Handles all visual effects
 */
export class EffectsManager {
    constructor() {
        this.particles = [];
        this.trail = [];
        this.screenShake = { intensity: 0, duration: 0 };
        this.flashOverlay = { alpha: 0, color: '#ffffff' };
    }

    /**
     * Update all effects
     */
    update() {
        // Update particles
        this.particles = this.particles.filter(p => {
            p.update();
            return !p.isDead();
        });

        // Update trail
        this.trail = this.trail.filter(t => {
            t.update();
            return !t.isDead();
        });

        // Update screen shake
        if (this.screenShake.duration > 0) {
            this.screenShake.duration--;
            if (this.screenShake.duration <= 0) {
                this.screenShake.intensity = 0;
            }
        }

        // Update flash overlay
        if (this.flashOverlay.alpha > 0) {
            this.flashOverlay.alpha -= 0.05;
        }
    }

    /**
     * Render all effects
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        // Render trail
        this.trail.forEach(point => {
            ctx.save();
            ctx.globalAlpha = point.life * 0.5;
            ctx.fillStyle = point.color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8 * point.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Render particles
        this.particles.forEach(p => p.draw(ctx));
    }

    /**
     * Render overlay effects (flash, etc)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} width 
     * @param {number} height 
     */
    renderOverlay(ctx, width, height) {
        if (this.flashOverlay.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.flashOverlay.alpha;
            ctx.fillStyle = this.flashOverlay.color;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    }

    /**
     * Get screen shake offset
     * @returns {{x: number, y: number}}
     */
    getShakeOffset() {
        if (this.screenShake.intensity <= 0) return { x: 0, y: 0 };
        
        return {
            x: (Math.random() - 0.5) * this.screenShake.intensity * 2,
            y: (Math.random() - 0.5) * this.screenShake.intensity * 2
        };
    }

    /**
     * Spawn collect effect - sparkles when target collected
     * @param {number} x 
     * @param {number} y 
     */
    spawnCollectEffect(x, y) {
        const colors = ['#FFD700', '#FFA500', '#FF77C9', '#ffffff'];
        
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const speed = Math.random() * 3 + 2;
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 5 + 3,
                decay: 0.025,
                shape: Math.random() > 0.5 ? 'star' : 'circle'
            }));
        }
    }

    /**
     * Spawn finish effect - big celebration
     * @param {number} x 
     * @param {number} y 
     */
    spawnFinishEffect(x, y) {
        const colors = ['#44ff44', '#22cc22', '#FFD700', '#ffffff'];
        
        // Big burst
        for (let i = 0; i < 24; i++) {
            const angle = (Math.PI * 2 / 24) * i;
            const speed = Math.random() * 5 + 3;
            
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                decay: 0.015,
                shape: 'star'
            }));
        }

        // Flash
        this.flashOverlay = { alpha: 0.3, color: '#44ff44' };
    }

    /**
     * Spawn error effect - hit obstacle
     * @param {number} x 
     * @param {number} y 
     */
    spawnErrorEffect(x, y) {
        // Red particles
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#ff4444',
                size: Math.random() * 6 + 3,
                decay: 0.04
            }));
        }

        // Screen shake
        this.screenShake = { intensity: 5, duration: 10 };
        
        // Red flash
        this.flashOverlay = { alpha: 0.2, color: '#ff4444' };
    }

    /**
     * Spawn move effect - small particles on movement
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     */
    spawnMoveEffect(x, y, color = '#000FEE') {
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: color,
                size: Math.random() * 3 + 1,
                decay: 0.06
            }));
        }
    }

    /**
     * Add trail point
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     */
    addTrailPoint(x, y, color = '#000FEE') {
        this.trail.push(new TrailPoint(x, y, color));
        
        // Limit trail length
        if (this.trail.length > 20) {
            this.trail.shift();
        }
    }

    /**
     * Spawn level complete confetti
     * @param {number} width 
     * @param {number} height 
     */
    spawnConfetti(width, height) {
        const colors = ['#FF77C9', '#000FEE', '#FFD700', '#44ff44', '#ff6b6b', '#4ecdc4'];
        
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle(
                Math.random() * width,
                -20,
                {
                    vx: (Math.random() - 0.5) * 3,
                    vy: Math.random() * 3 + 2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 8 + 4,
                    decay: 0.005,
                    gravity: 0.1,
                    shape: Math.random() > 0.5 ? 'square' : 'circle'
                }
            ));
        }
    }

    /**
     * Clear all effects
     */
    clear() {
        this.particles = [];
        this.trail = [];
        this.screenShake = { intensity: 0, duration: 0 };
        this.flashOverlay = { alpha: 0, color: '#ffffff' };
    }
}

/**
 * Sound Manager - Simple Web Audio sounds
 */
export class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.initialized = false;
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.log('Web Audio not supported');
            this.enabled = false;
        }
    }

    /**
     * Play a simple tone
     * @param {number} frequency 
     * @param {number} duration 
     * @param {string} type 
     * @param {number} volume 
     */
    playTone(frequency, duration = 0.1, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * Play move sound
     */
    playMove() {
        this.playTone(440, 0.05, 'sine', 0.15);
    }

    /**
     * Play collect sound
     */
    playCollect() {
        this.playTone(587, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(784, 0.1, 'sine', 0.2), 50);
    }

    /**
     * Play finish/win sound
     */
    playWin() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.2, 'sine', 0.25), i * 100);
        });
    }

    /**
     * Play error sound
     */
    playError() {
        this.playTone(200, 0.2, 'square', 0.2);
        setTimeout(() => this.playTone(150, 0.3, 'square', 0.15), 100);
    }

    /**
     * Play button click
     */
    playClick() {
        this.playTone(800, 0.03, 'sine', 0.1);
    }

    /**
     * Toggle sound on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

/**
 * Tutorial Overlay Manager
 */
export class TutorialManager {
    constructor() {
        this.currentTutorial = null;
        this.shownTutorials = new Set(this.loadShown());
        this.overlay = null;
    }

    /**
     * Load shown tutorials from localStorage
     */
    loadShown() {
        try {
            const data = localStorage.getItem('startschool_tutorials');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Save shown tutorials
     */
    saveShown() {
        try {
            localStorage.setItem('startschool_tutorials', JSON.stringify([...this.shownTutorials]));
        } catch {
            // Ignore
        }
    }

    /**
     * Show tutorial if not shown before
     * @param {string} id 
     * @param {object} config 
     */
    show(id, config) {
        if (this.shownTutorials.has(id)) return false;

        this.currentTutorial = id;
        this.createOverlay(config);
        return true;
    }

    /**
     * Create tutorial overlay
     * @param {object} config 
     */
    createOverlay(config) {
        // Remove existing
        this.removeOverlay();

        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay show';
        this.overlay.innerHTML = `
            <div class="tutorial-content">
                <div class="tutorial-icon">${config.icon || '💡'}</div>
                <h3 class="tutorial-title">${config.title}</h3>
                <p class="tutorial-text">${config.text}</p>
                ${config.steps ? `
                    <ul class="tutorial-steps">
                        ${config.steps.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                ` : ''}
                <button class="tutorial-btn">Got it!</button>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Bind close
        const btn = this.overlay.querySelector('.tutorial-btn');
        btn.addEventListener('click', () => this.dismiss());
        
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.dismiss();
        });
    }

    /**
     * Dismiss current tutorial
     */
    dismiss() {
        if (this.currentTutorial) {
            this.shownTutorials.add(this.currentTutorial);
            this.saveShown();
        }
        this.removeOverlay();
        this.currentTutorial = null;
    }

    /**
     * Remove overlay element
     */
    removeOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    /**
     * Reset all tutorials (show them again)
     */
    reset() {
        this.shownTutorials.clear();
        this.saveShown();
    }
}

/**
 * Tutorial configurations
 */
export const TUTORIALS = {
    arrows: {
        icon: '🎮',
        title: 'Basic Movement',
        text: 'Use arrow buttons to plan your path!',
        steps: [
            'Tap ↑ ↓ ← → to add moves',
            'Press ▶ Play to execute',
            'Reach the 🏁 finish!'
        ]
    },
    blocks: {
        icon: '📦',
        title: 'Action Blocks',
        text: 'Save sequences as reusable blocks!',
        steps: [
            'Tap ● Record button',
            'Add moves (they\'ll be recorded)',
            'Tap ● again to save the block',
            'Click the block to use it!'
        ]
    },
    repeat: {
        icon: '🔁',
        title: 'Repeat Loops',
        text: 'Repeat actions multiple times!',
        steps: [
            'Tap 🔁 Repeat button',
            'Add moves to repeat',
            'Tap 🔁 again to close',
            'Change ×N to set repetitions'
        ]
    },
    recursion: {
        icon: '🔄',
        title: 'Recursion',
        text: 'Create self-calling functions!',
        steps: [
            'Tap 🔄 to create recursive block',
            'Add moves + the block itself',
            'Set depth to control repetitions',
            'Like a function that calls itself!'
        ]
    }
};
