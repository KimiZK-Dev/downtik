/**
 * Image Gallery Display Module
 * Handles image slideshow preview and gallery functionality
 */

import { getElementById, devLog, generateFilename } from '../utils.js';
import { ELEMENT_IDS } from '../constants.js';

export class ImageGalleryRenderer {
    constructor() {
        this.imagePreview = null;
        this.imageGallery = null;
        this.currentImages = [];
    }

    /**
     * Initialize the image gallery renderer
     */
    init() {
        this.imagePreview = getElementById(ELEMENT_IDS.IMAGE_PREVIEW);
        this.imageGallery = getElementById(ELEMENT_IDS.IMAGE_GALLERY);
        this.setupGlobalDownloadFunctions();
    }

    /**
     * Render image gallery (Enhanced for TikVid)
     */
    render(data) {
        if (!this.imagePreview || !this.imageGallery) return;

        // Handle TikVid image slideshow data
        if (data.tikvidData && data.tikvidData.photoList && data.tikvidData.photoList.length > 0) {
            this.currentImages = data.tikvidData.photoList;
            this.renderMode = 'tikvid';
        }
        // Fallback to standard images array
        else if (data?.images && Array.isArray(data.images) && data.images.length > 0) {
            this.currentImages = data.images.map((url, index) => ({
                thumbnail: url,
                downloadUrl: url,
                index: index + 1
            }));
            this.renderMode = 'standard';
        } else {
            return;
        }
        
        // Show image preview, hide video preview
        this.imagePreview.style.display = 'block';
        const videoPreview = getElementById(ELEMENT_IDS.VIDEO_PREVIEW);
        if (videoPreview) {
            videoPreview.style.display = 'none';
        }

        this.renderGallery();
        this.setupBulkDownload(data);
    }

    /**
     * Render the image gallery grid (Enhanced for TikVid)
     */
    renderGallery() {
        if (!this.imageGallery) return;

        const galleryHTML = this.currentImages.map((imageData, index) => {
            if (this.renderMode === 'tikvid') {
                return this.createTikVidGalleryItem(imageData, index);
            } else {
                return this.createGalleryItem(imageData.thumbnail, index);
            }
        }).join('');

        this.imageGallery.innerHTML = galleryHTML;
    }

    /**
     * Create individual gallery item HTML
     */
    createGalleryItem(imageUrl, index) {
        return `
            <div class="gallery-item fade-in" style="animation-delay: ${index * 0.1}s">
                <img src="${imageUrl}" 
                     alt="Hình ảnh ${index + 1}" 
                     loading="lazy" 
                     onerror="this.style.display='none'; this.parentElement.querySelector('.error-placeholder').style.display='flex';">
                
                <div class="error-placeholder" style="display: none;">
                    <i class="fas fa-image"></i>
                    <span>Lỗi tải ảnh</span>
                </div>
                
                <div class="gallery-overlay">
                    <button class="gallery-download-btn"
                            data-url="${this.escapeForAttribute(imageUrl)}"
                            data-index="${index}"
                            title="Tải ảnh ${index + 1}">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Create TikVid gallery item HTML with enhanced download
     */
    createTikVidGalleryItem(imageData, index) {
        return `
            <div class="gallery-item tikvid-item fade-in" style="animation-delay: ${index * 0.1}s" data-index="${imageData.index}">
                <img src="${imageData.thumbnail}" 
                     alt="Hình ảnh ${imageData.index}" 
                     loading="lazy" 
                     onerror="this.style.display='none'; this.parentElement.querySelector('.error-placeholder').style.display='flex';">
                
                <div class="error-placeholder" style="display: none;">
                    <i class="fas fa-image"></i>
                    <span>Lỗi tải ảnh</span>
                </div>
                
                <div class="gallery-overlay">
                    <button onclick="window.downloadTikVidImage('${this.escapeForAttribute(imageData.downloadUrl)}', ${imageData.index})" 
                            class="gallery-download-btn tikvid-download"
                            title="Tải ảnh ${imageData.index} (TikVid HD)">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;
    }



    /**
     * Setup bulk download for all images (using DownloadManager event delegation)
     */
    setupBulkDownload(data) {
        const downloadAllImages = getElementById(ELEMENT_IDS.DOWNLOAD_ALL_IMAGES);
        const downloadIndividually = document.querySelector('.download-all-images-individually');
        
        if (!downloadAllImages || this.currentImages.length === 0) return;

        // Show both buttons
        downloadAllImages.style.display = 'block';
        if (downloadIndividually) {
            downloadIndividually.style.display = 'block';
        }
        
        // Update button text for ZIP download
        const zipText = downloadAllImages.querySelector('span');
        if (zipText) {
            zipText.textContent = `Tải ZIP (${this.currentImages.length} ảnh)`;
        }
        
        // Update button text for individual download
        const individualText = downloadIndividually?.querySelector('span');
        if (individualText) {
            individualText.textContent = `Tải lần lượt (${this.currentImages.length} ảnh)`;
        }
        
        // No need to add onclick handlers - DownloadManager handles them via event delegation
        devLog(`Setup bulk download options for ${this.currentImages.length} images`);
    }

    /**
     * Download all images
     */
    downloadAllImages() {
        if (!window.tikTokDownloader?.getDownloadManager) {
            console.error('Download manager not available');
            return;
        }
        
        const downloadManager = window.tikTokDownloader.getDownloadManager();
        
        this.currentImages.forEach((imageData, index) => {
            const downloadUrl = this.renderMode === 'tikvid' ? imageData.downloadUrl : imageData.thumbnail;
            const imageIndex = this.renderMode === 'tikvid' ? imageData.index : index + 1;
            const filename = generateFilename(`image_${imageIndex}`, 'jpg');
            
            // Add small delay between downloads to prevent overwhelming the browser
            setTimeout(() => {
                // Create a fake event object for the download manager
                const fakeEvent = { preventDefault: () => {} };
                downloadManager.handleMediaDownload(fakeEvent, downloadUrl, filename);
            }, index * 100);
        });
        
        console.log(`Started downloading ${this.currentImages.length} images`);
    }

    /**
     * Clear the image gallery
     */
    clear() {
        if (this.imageGallery) {
            this.imageGallery.innerHTML = '';
        }
        
        if (this.imagePreview) {
            this.imagePreview.style.display = 'none';
        }
        
        this.currentImages = [];
        this.renderMode = null;
    }

    /**
     * Setup global download functions for onclick handlers (DEPRECATED - using event delegation instead)
     */
    setupGlobalDownloadFunctions() {
        // Keep for backward compatibility but these shouldn't be called anymore
        // All downloads now go through DownloadManager event delegation
        
        window.downloadSingleImage = (imageUrl, index) => {
            console.warn('DEPRECATED: downloadSingleImage global function called. Using event delegation instead.');
            // No-op to prevent duplicate downloads
        };

        window.downloadTikVidImage = (downloadUrl, index) => {
            console.warn('DEPRECATED: downloadTikVidImage global function called. Using event delegation instead.');
            // No-op to prevent duplicate downloads
        };
    }

    /**
     * Get current images
     */
    getCurrentImages() {
        return this.currentImages;
    }

    /**
     * Escape string for HTML attribute
     */
    escapeForAttribute(str) {
        if (typeof str !== 'string') return '';
        
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Create image blob URL for download
     */
    async createImageBlobUrl(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.warn('Failed to create blob URL:', error);
            return imageUrl;
        }
    }
}

// Expose global functions for backward compatibility
