/**
 * Theme Management Module (Optimized)
 * Handles light/dark theme switching and persistence
 */

import { THEME_CONFIG, ELEMENT_IDS, EVENTS } from './constants.js';
import { getElementById, dispatchEvent } from './utils.js';

export class ThemeManager {
    constructor() {
        this.themeToggle = null;
        this.currentTheme = THEME_CONFIG.DEFAULT_THEME;
    }

    /**
     * Initialize theme system
     */
    init() {
        this.themeToggle = getElementById(ELEMENT_IDS.THEME_TOGGLE);
        
        // Get saved theme or default
        const savedTheme = localStorage.getItem(THEME_CONFIG.STORAGE_KEY) || THEME_CONFIG.DEFAULT_THEME;
        this.setTheme(savedTheme);
        
        // Bind event listener
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Setup keyboard shortcut (Ctrl/Cmd + K)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        if (!THEME_CONFIG.THEMES.includes(theme)) {
            theme = THEME_CONFIG.DEFAULT_THEME;
        }
        
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_CONFIG.STORAGE_KEY, theme);
        
        // Update theme toggle icon
        if (this.themeToggle) {
            const lightIcon = this.themeToggle.querySelector('.theme-icon-light');
            const darkIcon = this.themeToggle.querySelector('.theme-icon-dark');
            
            if (lightIcon && darkIcon) {
                if (theme === 'dark') {
                    lightIcon.style.display = 'none';
                    darkIcon.style.display = 'block';
                } else {
                    lightIcon.style.display = 'block';
                    darkIcon.style.display = 'none';
                }
            }
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        
        // Dispatch custom event for other modules to listen to
        dispatchEvent(EVENTS.THEME_CHANGED, {
            theme: newTheme,
            message: newTheme === 'dark' ? 'Đã chuyển sang giao diện tối' : 'Đã chuyển sang giao diện sáng'
        });
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
}
