/**
 * Renderer Class
 * Handles all canvas rendering operations
 */

import { CONFIG } from './config.js';

export class Renderer {
    /**
     * Create a new Renderer instance
     * @param {HTMLCanvasElement} canvas - The canvas element
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Device pixel ratio for sharp rendering
        this.dpr = window.devicePixelRatio || 1;
        
        // Logical dimensions (CSS pixels)
        this.width = 0;
        this.height = 0;
        
        // Initialize canvas size
        this.resize();
        
        // Bind resize handler
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Handle window resize with debouncing
     */
    handleResize() {
        // Debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        this.resizeTimeout = setTimeout(() => {
            this.resize();
            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('gameResize', {
                detail: { width: this.width, height: this.height }
            }));
        }, 100);
    }

    /**
     * Resize canvas to fit container
     */
    resize() {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Calculate size maintaining aspect ratio
        const maxWidth = containerRect.width - 32; // Account for padding
        const maxHeight = containerRect.height - 32;
        
        // Target square-ish canvas for the game
        const size = Math.min(maxWidth, maxHeight, 600);
        
        this.width = size;
        this.height = size;
        
        // Set canvas display size (CSS)
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        
        // Set canvas actual size (accounting for DPR)
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        
        // Scale context to match DPR
        this.ctx.scale(this.dpr, this.dpr);
    }

    /**
     * Clear the entire canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Fill canvas with background color
     * @param {string} color - Background color
     */
    fillBackground(color = CONFIG.colors.background) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Get canvas context
     * @returns {CanvasRenderingContext2D} Canvas 2D context
     */
    getContext() {
        return this.ctx;
    }

    /**
     * Get canvas dimensions
     * @returns {{width: number, height: number}} Canvas dimensions
     */
    getDimensions() {
        return {
            width: this.width,
            height: this.height
        };
    }

    /**
     * Draw text centered
     * @param {string} text - Text to draw
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {Object} options - Text options
     */
    drawCenteredText(text, x, y, options = {}) {
        const {
            font = '16px sans-serif',
            color = CONFIG.colors.text,
            align = 'center',
            baseline = 'middle'
        } = options;
        
        this.ctx.save();
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        window.removeEventListener('resize', this.handleResize);
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
    }
}
