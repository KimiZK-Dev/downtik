/**
 * Display Management Module (Refactored)
 * Orchestrates different display components for video info and previews
 */

import { VideoInfoRenderer } from './display/video-info.js';
import { VideoPreviewRenderer } from './display/video-preview.js';
import { ImageGalleryRenderer } from './display/image-gallery.js';
import { getElementById } from './utils.js';
import { ELEMENT_IDS } from './constants.js';
import { validateVideoData, validateImageData } from './validators.js';

export class DisplayManager {
    constructor() {
        this.currentData = null;
        this.previewSection = null;
        
        // Initialize sub-renderers
        this.videoInfo = new VideoInfoRenderer();
        this.videoPreview = new VideoPreviewRenderer();
        this.imageGallery = new ImageGalleryRenderer();
    }

    /**
     * Initialize display manager and sub-components
     */
    init() {
        this.previewSection = getElementById(ELEMENT_IDS.PREVIEW_SECTION);
        
        // Initialize all sub-renderers
        this.videoInfo.init();
        this.videoPreview.init();
        this.imageGallery.init();
    }

    /**
     * Display video information
     */
    displayVideoInfo(data) {
        if (!data) return;
        
        this.currentData = data;
        this.videoInfo.render(data);
    }

    /**
     * Display preview content
     */
    displayPreview(data) {
        if (!data) return;
        
        this.currentData = data;

        // Validate data and determine type
        const isImageSlideshow = data.images && Array.isArray(data.images) && data.images.length > 0;
        
        if (isImageSlideshow) {
            const validation = validateImageData(data);
            if (validation.isValid) {
                this.imageGallery.render(data);
            }
        } else {
            const validation = validateVideoData(data);
            if (validation.isValid) {
                this.videoPreview.render(data);
            }
        }

        this.showPreviewSection();
    }

    /**
     * Show preview section with animation
     */
    showPreviewSection() {
        if (this.previewSection) {
            this.previewSection.style.display = 'block';
            this.previewSection.classList.add('fade-in');
        }
    }

    /**
     * Clear all display content
     */
    clearDisplay() {
        this.currentData = null;
        
        // Clear all sub-renderers
        this.videoInfo.clear();
        this.videoPreview.clear();
        this.imageGallery.clear();
        
        // Hide preview section
        if (this.previewSection) {
            this.previewSection.style.display = 'none';
            this.previewSection.classList.remove('fade-in');
        }
    }

    /**
     * Get current data
     */
    getCurrentData() {
        return this.currentData;
    }

    /**
     * Legacy compatibility methods (delegating to sub-renderers)
     */
    
    // For backward compatibility with existing code
    showVideoInline(data) {
        this.videoPreview.showVideoInline();
    }

    resetVideoPreview() {
        this.videoPreview.resetToThumbnail();
    }

    restoreVideoThumbnail(data) {
        this.videoPreview.restoreVideoThumbnail();
    }
}
