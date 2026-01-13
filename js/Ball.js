/**
 * Ball Class
 * Represents the main interactive ball in the game
 */

import { CONFIG } from './config.js';

export class Ball {
    /**
     * Create a new Ball instance
     * @param {number} gridX - Grid X position (column)
     * @param {number} gridY - Grid Y position (row)
     */
    constructor(gridX = 0, gridY = 0) {
        // Grid position (logical)
        this.gridX = gridX;
        this.gridY = gridY;
        
        // Target grid position (for animation)
        this.targetGridX = gridX;
        this.targetGridY = gridY;
        
        // Pixel position (visual) - will be calculated
        this.x = 0;
        this.y = 0;
        
        // Animation start position
        this.startX = 0;
        this.startY = 0;
        
        // Visual properties
        this.radius = 0;
        this.color = CONFIG.colors.primary;
        this.scale = 1;
        this.opacity = 1;
        
        // Animation state
        this.isAnimating = false;
        this.animationProgress = 0;
        
        // Pulse animation for idle state
        this.pulsePhase = 0;
        this.pulseSpeed = 0.02;
        this.pulseAmount = 0.05;
        
        // Trail effect for movement
        this.trail = [];
        this.maxTrailLength = 5;
        
        // Grid reference for position calculations
        this.cellSize = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    /**
     * Update pixel position based on grid position and cell size
     * @param {number} cellSize - Size of each grid cell
     * @param {number} offsetX - X offset for centering
     * @param {number} offsetY - Y offset for centering
     */
    updatePosition(cellSize, offsetX, offsetY) {
        this.cellSize = cellSize;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        
        this.x = offsetX + (this.gridX + 0.5) * cellSize;
        this.y = offsetY + (this.gridY + 0.5) * cellSize;
        this.startX = this.x;
        this.startY = this.y;
        this.radius = cellSize * CONFIG.ball.radiusRatio;
    }

    /**
     * Get pixel position for a grid coordinate
     * @param {number} gridX - Grid X
     * @param {number} gridY - Grid Y
     * @returns {{x: number, y: number}} Pixel position
     */
    gridToPixel(gridX, gridY) {
        return {
            x: this.offsetX + (gridX + 0.5) * this.cellSize,
            y: this.offsetY + (gridY + 0.5) * this.cellSize
        };
    }

    /**
     * Set grid position
     * @param {number} gridX - New grid X position
     * @param {number} gridY - New grid Y position
     */
    setGridPosition(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.targetGridX = gridX;
        this.targetGridY = gridY;
    }

    /**
     * Start moving to a new grid position
     * @param {number} targetGridX - Target grid X
     * @param {number} targetGridY - Target grid Y
     */
    startMove(targetGridX, targetGridY) {
        this.targetGridX = targetGridX;
        this.targetGridY = targetGridY;
        
        // Store start position
        this.startX = this.x;
        this.startY = this.y;
        
        this.isAnimating = true;
        this.animationProgress = 0;
        
        // Add to trail
        this.addTrailPoint();
    }

    /**
     * Add current position to trail
     */
    addTrailPoint() {
        this.trail.push({ x: this.x, y: this.y, opacity: 0.3 });
        
        // Limit trail length
        while (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    /**
     * Update ball animation with eased progress
     * @param {number} easedProgress - Progress from 0 to 1 (already eased)
     */
    updateAnimation(easedProgress) {
        if (!this.isAnimating) return;
        
        this.animationProgress = easedProgress;
        
        // Calculate target pixel position
        const targetPos = this.gridToPixel(this.targetGridX, this.targetGridY);
        
        // Interpolate position
        this.x = this.startX + (targetPos.x - this.startX) * easedProgress;
        this.y = this.startY + (targetPos.y - this.startY) * easedProgress;
        
        // Add subtle bounce at the end
        if (easedProgress > 0.8) {
            const bounceProgress = (easedProgress - 0.8) / 0.2;
            const bounce = Math.sin(bounceProgress * Math.PI) * 0.05;
            this.scale = 1 + bounce;
        }
    }

    /**
     * Complete the current animation
     */
    completeAnimation() {
        this.gridX = this.targetGridX;
        this.gridY = this.targetGridY;
        
        const targetPos = this.gridToPixel(this.gridX, this.gridY);
        this.x = targetPos.x;
        this.y = targetPos.y;
        this.startX = this.x;
        this.startY = this.y;
        
        this.isAnimating = false;
        this.animationProgress = 0;
        this.scale = 1;
    }

    /**
     * Update ball state (called each frame)
     * @param {number} deltaTime - Time since last frame in ms
     */
    update(deltaTime) {
        // Update pulse animation (only when not moving)
        if (!this.isAnimating) {
            this.pulsePhase += this.pulseSpeed;
            if (this.pulsePhase > Math.PI * 2) {
                this.pulsePhase -= Math.PI * 2;
            }
        }
        
        // Fade out trail
        this.trail.forEach((point, index) => {
            point.opacity *= 0.9;
        });
        
        // Remove faded trail points
        this.trail = this.trail.filter(point => point.opacity > 0.01);
    }

    /**
     * Get current visual scale including pulse effect
     * @returns {number} Current scale factor
     */
    getCurrentScale() {
        if (this.isAnimating) {
            return this.scale;
        }
        const pulseScale = 1 + Math.sin(this.pulsePhase) * this.pulseAmount;
        return this.scale * pulseScale;
    }

    /**
     * Render the ball on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        // Render trail first (behind ball)
        this.renderTrail(ctx);
        
        const currentScale = this.getCurrentScale();
        const currentRadius = this.radius * currentScale;
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Draw shadow
        ctx.shadowColor = 'rgba(0, 15, 238, 0.3)';
        ctx.shadowBlur = CONFIG.ball.shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = CONFIG.ball.shadowOffsetY;
        
        // Draw main ball with gradient
        const gradient = ctx.createRadialGradient(
            this.x - currentRadius * 0.3,
            this.y - currentRadius * 0.3,
            0,
            this.x,
            this.y,
            currentRadius
        );
        gradient.addColorStop(0, '#4D5AFF');  // Lighter center
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, '#0008AA');   // Darker edge
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw highlight
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        const highlightGradient = ctx.createRadialGradient(
            this.x - currentRadius * 0.3,
            this.y - currentRadius * 0.4,
            0,
            this.x - currentRadius * 0.3,
            this.y - currentRadius * 0.4,
            currentRadius * 0.5
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Render trail effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderTrail(ctx) {
        this.trail.forEach((point, index) => {
            ctx.save();
            ctx.globalAlpha = point.opacity;
            
            const trailRadius = this.radius * 0.6 * (index / this.trail.length);
            
            ctx.beginPath();
            ctx.arc(point.x, point.y, trailRadius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            
            ctx.restore();
        });
    }

    /**
     * Check if a point is inside the ball
     * @param {number} px - Point X coordinate
     * @param {number} py - Point Y coordinate
     * @returns {boolean} True if point is inside ball
     */
    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) <= (this.radius * this.radius);
    }

    /**
     * Reset ball to initial state
     */
    reset() {
        this.scale = 1;
        this.opacity = 1;
        this.isAnimating = false;
        this.animationProgress = 0;
        this.trail = [];
    }
}
