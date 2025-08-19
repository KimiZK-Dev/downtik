/**
 * Utility Functions
 * Shared helper functions used across the application
 */

import { DEV_CONFIG, isDevelopment, REGEX_PATTERNS } from './constants.js';

// Re-export isDevelopment for other modules
export { isDevelopment };

// ===== LOGGING UTILITIES =====

/**
 * Development-only console logging
 */
export const devLog = (...args) => {
    if (isDevelopment() && DEV_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.log(...args);
    }
};

export const devWarn = (...args) => {
    if (isDevelopment() && DEV_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.warn(...args);
    }
};

export const devError = (...args) => {
    if (isDevelopment() && DEV_CONFIG.ENABLE_CONSOLE_LOGS) {
        console.error(...args);
    }
};

// ===== NUMBER FORMATTING =====

/**
 * Format number with K, M, B suffixes
 */
export const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    
    const absNum = Math.abs(num);
    if (absNum >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(1) + 'B';
    }
    if (absNum >= 1_000_000) {
        return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (absNum >= 1_000) {
        return (num / 1_000).toFixed(1) + 'K';
    }
    return num.toString();
};

// ===== DATE FORMATTING =====

/**
 * Format duration in seconds to MM:SS
 */
export const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return 'N/A';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format date from timestamp with relative time
 */
export const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
    
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// ===== STRING UTILITIES =====

/**
 * Sanitize filename for download
 */
export const sanitizeFilename = (filename) => {
    if (!filename) return 'download';
    
    return filename
        .replace(REGEX_PATTERNS.FILENAME_SANITIZE, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100); // Limit length
};

/**
 * Generate unique filename with kimizk branding and random 5-character ID
 */
export const generateFilename = (prefix, extension) => {
    // Generate random ID with mixed letters and numbers
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomId = '';
    
    for (let i = 0; i < 5; i++) {
        randomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Map prefixes to kimizk format
    let kimizKPrefix = prefix;
    if (prefix.includes('video')) {
        if (prefix.includes('hd') || prefix.includes('HD')) {
            kimizKPrefix = 'kimizk-vid(hd)';
        } else if (prefix.includes('sd') || prefix.includes('SD')) {
            kimizKPrefix = 'kimizk-vid(sd)';
        } else {
            kimizKPrefix = 'kimizk-vid';
        }
    } else if (prefix.includes('image') || prefix.includes('pic')) {
        kimizKPrefix = 'kimizk-pic';
    } else if (prefix.includes('audio') || prefix.includes('music') || prefix.includes('mp3')) {
        kimizKPrefix = 'kimizk-au';
    } else if (prefix.includes('tiktok')) {
        // Handle legacy tiktok prefixes
        if (prefix.includes('video')) {
            kimizKPrefix = 'kimizk-vid';
        } else if (prefix.includes('image')) {
            kimizKPrefix = 'kimizk-pic';
        } else {
            kimizKPrefix = 'kimizk-vid'; // default for tiktok content
        }
    }
    
    return `${kimizKPrefix}-${randomId}.${extension}`;
};

/**
 * Extract filename from URL
 */
export const extractFilename = (url, defaultName = 'download') => {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();
        return filename && filename.includes('.') ? filename : defaultName;
    } catch {
        return defaultName;
    }
};

// ===== URL UTILITIES =====

/**
 * Validate TikTok URL
 */
export const isValidTikTokUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('tiktok.com') || 
               urlObj.hostname.includes('vm.tiktok.com') ||
               urlObj.hostname.includes('vt.tiktok.com');
    } catch {
        return false;
    }
};

/**
 * Clean and normalize TikTok URL
 */
export const cleanTikTokUrl = (url) => {
    if (!url) return '';
    
    // Remove whitespace
    url = url.trim();
    
    // Add protocol if missing
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }
    
    try {
        const urlObj = new URL(url);
        // Remove unnecessary parameters
        urlObj.searchParams.delete('_r');
        urlObj.searchParams.delete('u_code');
        urlObj.searchParams.delete('preview_pb');
        
        return urlObj.toString();
    } catch {
        return url;
    }
};

// ===== DOM UTILITIES =====

/**
 * Safely get element by ID
 */
export const getElementById = (id) => {
    const element = document.getElementById(id);
    if (!element && isDevelopment()) {
        devWarn(`Element with ID '${id}' not found`);
    }
    return element;
};

/**
 * Safely query selector
 */
export const querySelector = (selector, parent = document) => {
    const element = parent.querySelector(selector);
    if (!element && isDevelopment()) {
        devWarn(`Element with selector '${selector}' not found`);
    }
    return element;
};

/**
 * Create element with attributes and classes
 */
export const createElement = (tag, options = {}) => {
    const element = document.createElement(tag);
    
    if (options.classes) {
        if (Array.isArray(options.classes)) {
            element.classList.add(...options.classes);
        } else {
            element.className = options.classes;
        }
    }
    
    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }
    
    if (options.innerHTML) {
        element.innerHTML = options.innerHTML;
    }
    
    if (options.textContent) {
        element.textContent = options.textContent;
    }
    
    return element;
};

// ===== ASYNC UTILITIES =====

/**
 * Sleep/delay function
 */
export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry async function with exponential backoff
 */
export const retryAsync = async (fn, maxRetries = 3, baseDelay = 1000) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                devWarn(`Retry ${i + 1}/${maxRetries} failed, waiting ${delay}ms:`, error.message);
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
};

/**
 * Timeout wrapper for promises
 */
export const withTimeout = (promise, timeoutMs) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
};

// ===== DEBOUNCE & THROTTLE =====

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function
 */
export const throttle = (func, wait) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
};

// ===== EVENT UTILITIES =====

/**
 * Dispatch custom event safely
 */
export const dispatchEvent = (eventName, detail = {}) => {
    try {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    } catch (error) {
        devError('Failed to dispatch event:', eventName, error);
    }
};

/**
 * Add event listener with cleanup tracking
 */
export const addEventListenerWithCleanup = (target, event, handler, options = {}) => {
    target.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => {
        target.removeEventListener(event, handler, options);
    };
};

// ===== PERFORMANCE UTILITIES =====

/**
 * Simple performance timing
 */
export const measurePerformance = (name, fn) => {
    if (!isDevelopment() || !DEV_CONFIG.ENABLE_PERFORMANCE_LOGS) {
        return fn();
    }
    
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`⚡ ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
};

/**
 * Async performance timing
 */
export const measurePerformanceAsync = async (name, fn) => {
    if (!isDevelopment() || !DEV_CONFIG.ENABLE_PERFORMANCE_LOGS) {
        return await fn();
    }
    
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    console.log(`⚡ ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
};

// ===== MEMORY UTILITIES =====

/**
 * Clean up object references
 */
export const cleanup = (obj) => {
    if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
            delete obj[key];
        });
    }
};

// ===== VALIDATION UTILITIES =====

/**
 * Check if value is defined and not null
 */
export const isDefined = (value) => {
    return value !== null && value !== undefined;
};

/**
 * Check if string is not empty
 */
export const isNotEmpty = (str) => {
    return typeof str === 'string' && str.trim().length > 0;
};

/**
 * Safe JSON parse
 */
export const safeJsonParse = (str, defaultValue = null) => {
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
};

// ===== FEATURE DETECTION =====

/**
 * Check if browser supports feature
 */
export const supportsFeature = {
    clipboard: () => !!navigator.clipboard?.readText,
    serviceWorker: () => 'serviceWorker' in navigator,
    vibration: () => 'vibrate' in navigator,
    webp: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('webp') > -1;
    }
};

// ===== ERROR HANDLING =====

/**
 * Safe error handler that doesn't throw
 */
export const safeExecute = (fn, fallback = null) => {
    try {
        return fn();
    } catch (error) {
        devError('Safe execution failed:', error);
        return fallback;
    }
};

/**
 * Safe async error handler
 */
export const safeExecuteAsync = async (fn, fallback = null) => {
    try {
        return await fn();
    } catch (error) {
        devError('Safe async execution failed:', error);
        return fallback;
    }
};

// ===== OBJECT UTILITIES =====

/**
 * Deep clone object (simple version)
 */
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map(deepClone);
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });
    return cloned;
};

/**
 * Merge objects deeply
 */
export const deepMerge = (target, source) => {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    });
    
    return result;
};
