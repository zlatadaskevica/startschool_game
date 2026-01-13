/**
 * Main Entry Point
 * Initializes the game when DOM is ready
 */

import { Game } from './Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Get canvas element
    const canvas = document.getElementById('game-canvas');
    
    if (!canvas) {
        console.error('Game canvas not found!');
        return;
    }
    
    // Initialize game
    const game = new Game(canvas);
    
    // Expose game instance for debugging
    window.game = game;
    
    console.log('StartSchool Logic Game - Phase 9: Analytics & Accessibility');
    console.log('');
    console.log('🎮 14 levels with fun shapes!');
    console.log('');
    console.log('✨ Features:');
    console.log('  🏆 22 Achievements');
    console.log('  📊 Analytics tracking');
    console.log('  ⌨️ Full keyboard navigation (press H for help)');
    console.log('  ♿ Screen reader support');
    console.log('');
    console.log('Keyboard: WASD/Arrows=move, Space=play, R=reset, H=help');
});
