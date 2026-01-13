/**
 * Grid Class
 * Manages the game grid and coordinate system
 */

import { CONFIG } from './config.js';

export class Grid {
    /**
     * Create a new Grid instance
     * @param {number} rows - Number of rows
     * @param {number} cols - Number of columns
     */
    constructor(rows = CONFIG.grid.rows, cols = CONFIG.grid.cols) {
        this.rows = rows;
        this.cols = cols;
        this.cellSize = CONFIG.grid.cellSize;
        this.padding = CONFIG.grid.padding;
        
        // Calculated dimensions
        this.width = 0;
        this.height = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Grid state (for future use with targets)
        this.cells = this.createEmptyGrid();
    }

    /**
     * Create empty grid array
     * @returns {Array<Array<null>>} 2D array of null values
     */
    createEmptyGrid() {
        return Array(this.rows).fill(null).map(() => 
            Array(this.cols).fill(null)
        );
    }

    /**
     * Calculate grid dimensions based on canvas size
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    calculateDimensions(canvasWidth, canvasHeight) {
        // Calculate available space
        const availableWidth = canvasWidth - (this.padding * 2);
        const availableHeight = canvasHeight - (this.padding * 2);
        
        // Calculate cell size to fit grid in available space
        const cellSizeByWidth = availableWidth / this.cols;
        const cellSizeByHeight = availableHeight / this.rows;
        
        // Use smaller cell size to ensure grid fits
        this.cellSize = Math.floor(Math.min(cellSizeByWidth, cellSizeByHeight));
        
        // Calculate actual grid dimensions
        this.width = this.cellSize * this.cols;
        this.height = this.cellSize * this.rows;
        
        // Calculate offset to center grid
        this.offsetX = (canvasWidth - this.width) / 2;
        this.offsetY = (canvasHeight - this.height) / 2;
    }

    /**
     * Convert grid coordinates to pixel coordinates
     * @param {number} gridX - Grid X (column)
     * @param {number} gridY - Grid Y (row)
     * @returns {{x: number, y: number}} Pixel coordinates (center of cell)
     */
    gridToPixel(gridX, gridY) {
        return {
            x: this.offsetX + (gridX + 0.5) * this.cellSize,
            y: this.offsetY + (gridY + 0.5) * this.cellSize
        };
    }

    /**
     * Convert pixel coordinates to grid coordinates
     * @param {number} pixelX - Pixel X coordinate
     * @param {number} pixelY - Pixel Y coordinate
     * @returns {{gridX: number, gridY: number} | null} Grid coordinates or null if outside
     */
    pixelToGrid(pixelX, pixelY) {
        const gridX = Math.floor((pixelX - this.offsetX) / this.cellSize);
        const gridY = Math.floor((pixelY - this.offsetY) / this.cellSize);
        
        if (this.isValidPosition(gridX, gridY)) {
            return { gridX, gridY };
        }
        return null;
    }

    /**
     * Check if grid position is valid
     * @param {number} gridX - Grid X (column)
     * @param {number} gridY - Grid Y (row)
     * @returns {boolean} True if position is within grid bounds
     */
    isValidPosition(gridX, gridY) {
        return gridX >= 0 && gridX < this.cols && 
               gridY >= 0 && gridY < this.rows;
    }

    /**
     * Render the grid on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {boolean} showGrid - Whether to show grid lines
     */
    render(ctx, showGrid = true) {
        ctx.save();
        
        // Draw clean background for grid area
        ctx.fillStyle = CONFIG.colors.surface;
        ctx.fillRect(
            this.offsetX,
            this.offsetY,
            this.width,
            this.height
        );
        
        // No grid lines or dots - form is the visual guide
        
        ctx.restore();
    }

    /**
     * Reset grid state
     */
    reset() {
        this.cells = this.createEmptyGrid();
    }
}
