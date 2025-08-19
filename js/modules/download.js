/**
 * Download Management Module (Refactored)
 * Orchestrates different download components and handles UI events
 */

import { MediaDownloader } from './download/media-downloader.js';
import { ImageDownloader } from './download/image-downloader.js';
import { devLog, dispatchEvent } from './utils.js';
import { EVENTS, ELEMENT_IDS } from './constants.js';
import { validateDownloadUrl } from './validators.js';

export class DownloadManager {
    constructor() {
        // Initialize sub-downloaders
        this.mediaDownloader = new MediaDownloader();
        this.imageDownloader = new ImageDownloader();
        this.currentAudio = null;
        this.currentPlayButton = null;
    }

    /**
     * Initialize download manager
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Setup download event listeners
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            // Gallery image download
            if (e.target.closest('.gallery-download-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.gallery-download-btn');
                const url = btn.dataset.url;
                const index = parseInt(btn.dataset.index) || 0;
                
                devLog('Gallery download clicked:', { url, index, dataset: btn.dataset });
                
                if (!url || url === 'undefined') {
                    console.error('Invalid image URL:', url);
                    dispatchEvent(EVENTS.SHOW_TOAST, {
                        message: 'URL ảnh không hợp lệ. Vui lòng thử lại.',
                        type: 'error'
                    });
                    return;
                }
                
                this.downloadSingleImage(url, index);
            }

            // Music download
            if (e.target.closest('.music-download-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.music-download-btn');
                const url = btn.dataset.url;
                const filename = btn.dataset.filename;
                devLog('Music download from DOM:', url, filename);
                this.handleMediaDownload(e, url, filename);
            }

            // Music preview
            if (e.target.closest('.music-preview-btn:not(.disabled)')) {
                e.preventDefault();
                const btn = e.target.closest('.music-preview-btn');
                const url = btn.dataset.url;
                devLog('Music preview from DOM:', url);
                this.handleMusicPreview(btn, url);
            }

            // Download all images as ZIP
            if (e.target.closest(`#${ELEMENT_IDS.DOWNLOAD_ALL_IMAGES}`)) {
                e.preventDefault();
                this.downloadAllImages();
            }

            // Download all images individually
            if (e.target.closest('.download-all-images-individually')) {
                e.preventDefault();
                this.downloadAllImagesIndividually();
            }
        });
    }

    /**
     * Handle media download (video/audio)
     */
    async handleMediaDownload(event, url, filename) {
        try {
            event.preventDefault();
            
            devLog('Downloading:', url, filename);
            
            // Validate download URL
            const validation = validateDownloadUrl(url, filename);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }
            
            // Determine media type
            const type = validation.type === 'audio' ? 'audio' : 'video';
            
            await this.mediaDownloader.downloadMedia(url, filename, type);
            
        } catch (error) {
            console.error('Download error:', error);
            
            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: error.message || 'Không thể tải xuống. Vui lòng thử lại.',
                type: 'error'
            });
        }
    }

    /**
     * Download single image
     */
    async downloadSingleImage(imageUrl, index = 0) {
        try {
            devLog('Downloading single image:', imageUrl, index);
            await this.imageDownloader.downloadSingleImage(imageUrl, index);
        } catch (error) {
            console.error('Single image download error:', error);
            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: 'Không thể tải ảnh. Vui lòng thử lại.',
                type: 'error'
            });
        }
    }

    /**
     * Download all images as ZIP
     */
    async downloadAllImages() {
        try {
            // Get current data from the global app instance
            const currentData = window.tikTokDownloader?.getCurrentData();
            if (!currentData?.images || !Array.isArray(currentData.images) || currentData.images.length === 0) {
                dispatchEvent(EVENTS.SHOW_TOAST, {
                    message: 'Không có ảnh để tải xuống',
                    type: 'warning'
                });
                return;
            }

            devLog('Downloading all images as ZIP:', currentData.images.length, 'images');
            await this.imageDownloader.downloadAllImagesAsZip(currentData.images);
            
        } catch (error) {
            console.error('ZIP download error:', error);
            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: error.message || 'Không thể tạo ZIP. Vui lòng thử lại.',
                type: 'error'
            });
        }
    }

    /**
     * Download all images individually (one by one)
     */
    async downloadAllImagesIndividually() {
        try {
            // Get current data from the global app instance
            const currentData = window.tikTokDownloader?.getCurrentData();
            if (!currentData?.images || !Array.isArray(currentData.images) || currentData.images.length === 0) {
                dispatchEvent(EVENTS.SHOW_TOAST, {
                    message: 'Không có ảnh để tải xuống',
                    type: 'warning'
                });
                return;
            }

            const totalImages = currentData.images.length;
            devLog('Downloading all images individually:', totalImages, 'images');

            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: `Bắt đầu tải ${totalImages} ảnh lần lượt...`,
                type: 'info'
            });

            // Download images with a small delay between each to avoid overwhelming
            for (let i = 0; i < currentData.images.length; i++) {
                try {
                    await this.downloadSingleImage(currentData.images[i], i);
                    
                    // Small delay between downloads
                    if (i < currentData.images.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.warn(`Failed to download image ${i + 1}:`, error);
                    // Continue with next image
                }
            }

            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: `Đã tải xong ${totalImages} ảnh!`,
                type: 'success'
            });
            
        } catch (error) {
            console.error('Individual download error:', error);
            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: error.message || 'Không thể tải ảnh. Vui lòng thử lại.',
                type: 'error'
            });
        }
    }

    /**
     * Check if downloads are active
     */
    isDownloading() {
        return this.mediaDownloader.isDownloading() || this.imageDownloader.isDownloading();
    }

    /**
     * Cancel all active downloads
     */
    cancelAll() {
        this.mediaDownloader.cancelAll();
        this.imageDownloader.cancelAll();
        this.stopCurrentAudio();
    }

    /**
     * Handle music preview
     */
    async handleMusicPreview(button, url) {
        try {
            // If clicking the same button that's currently playing, stop it
            if (this.currentPlayButton === button && this.currentAudio && !this.currentAudio.paused) {
                devLog('Stopping current audio - same button clicked');
                
                // Remove event listeners to prevent conflicts
                this.currentAudio.removeEventListener('canplay', this.currentAudioCanPlayHandler);
                this.currentAudio.removeEventListener('ended', this.currentAudioEndedHandler);
                this.currentAudio.removeEventListener('error', this.currentAudioErrorHandler);
                
                // Stop audio immediately
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
                this.currentPlayButton = null;
                
                // Change icon to play
                this.changeIconSmooth(button, 'fas fa-play');
                
                // Reset button state
                setTimeout(() => {
                    button.classList.remove('loading');
                    button.title = 'Nghe thử';
                }, 200);
                
                devLog('Audio stopped and icon changed to play');
                return;
            }

            // Stop any other audio that might be playing
            if (this.currentAudio && !this.currentAudio.paused) {
                this.stopCurrentAudio();
            }

            // Create new audio element (always start from beginning)
            this.currentAudio = new Audio();
            this.currentPlayButton = button;

            // Update button state to loading with smooth transition
            const icon = button.querySelector('i');
            const originalIcon = icon.className;
            
            this.changeIconSmooth(button, 'fas fa-spinner fa-spin');
            button.classList.add('loading');

            // Set up audio events with stored handlers
            this.currentAudioCanPlayHandler = () => {
                devLog('Audio can play - changing to pause icon');
                this.changeIconSmooth(button, 'fas fa-pause');
                button.classList.remove('loading');
                button.title = 'Dừng phát';
            };

            this.currentAudioEndedHandler = () => {
                devLog('Audio ended');
                this.changeIconSmooth(button, 'fas fa-play');
                setTimeout(() => {
                    button.classList.remove('loading');
                    button.title = 'Nghe thử';
                }, 200);
                this.currentPlayButton = null;
                this.currentAudio = null;
            };

            this.currentAudioErrorHandler = (e) => {
                devLog('Audio error:', e);
                this.changeIconSmooth(button, 'fas fa-play');
                setTimeout(() => {
                    button.classList.remove('loading');
                    button.title = 'Nghe thử';
                }, 200);
                this.currentPlayButton = null;
                this.currentAudio = null;
                
                dispatchEvent(EVENTS.SHOW_TOAST, {
                    message: 'Không thể phát nhạc. Vui lòng thử tải về để nghe.',
                    type: 'warning'
                });
            };

            this.currentAudio.addEventListener('loadstart', () => {
                devLog('Audio loading started');
            });

            this.currentAudio.addEventListener('canplay', this.currentAudioCanPlayHandler);
            this.currentAudio.addEventListener('ended', this.currentAudioEndedHandler);
            this.currentAudio.addEventListener('error', this.currentAudioErrorHandler);

            // Start playing
            this.currentAudio.src = url;
            this.currentAudio.volume = 0.7; // Set volume to 70%
            await this.currentAudio.play();

        } catch (error) {
            devLog('Music preview error:', error);
            this.resetPlayButton(button, 'fas fa-play');
            
            let errorMessage = 'Không thể phát nhạc';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Trình duyệt chặn tự động phát nhạc. Vui lòng thử lại.';
            }
            
            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: errorMessage,
                type: 'error'
            });
        }
    }

    /**
     * Stop current audio
     */
    stopCurrentAudio() {
        devLog('stopCurrentAudio called');
        
        if (this.currentAudio) {
            // Remove event listeners to prevent conflicts
            if (this.currentAudioCanPlayHandler) {
                this.currentAudio.removeEventListener('canplay', this.currentAudioCanPlayHandler);
            }
            if (this.currentAudioEndedHandler) {
                this.currentAudio.removeEventListener('ended', this.currentAudioEndedHandler);
            }
            if (this.currentAudioErrorHandler) {
                this.currentAudio.removeEventListener('error', this.currentAudioErrorHandler);
            }
            
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            devLog('Audio stopped and reset');
        }

        if (this.currentPlayButton) {
            devLog('Resetting play button to play icon');
            // Direct icon change for other buttons
            this.changeIconSmooth(this.currentPlayButton, 'fas fa-play');
            setTimeout(() => {
                this.currentPlayButton.classList.remove('loading');
                this.currentPlayButton.title = 'Nghe thử';
            }, 200);
            this.currentPlayButton = null;
        }
        
        // Clear event handlers
        this.currentAudioCanPlayHandler = null;
        this.currentAudioEndedHandler = null;
        this.currentAudioErrorHandler = null;
    }

    /**
     * Reset play button to default state
     */
    resetPlayButton(button, iconClass) {
        const icon = button.querySelector('i');
        icon.className = iconClass;
        button.classList.remove('playing', 'loading');
        button.title = 'Nghe thử';
    }

    /**
     * Reset play button with smooth transition
     */
    resetPlayButtonSmooth(button, iconClass) {
        this.changeIconSmooth(button, iconClass);
        // Remove classes after icon change completes
        setTimeout(() => {
            button.classList.remove('playing', 'loading');
            button.title = 'Nghe thử';
        }, 200); // Wait for full transition to complete
    }

    /**
     * Change icon with smooth fade transition
     */
    changeIconSmooth(button, newIconClass) {
        const icon = button.querySelector('i');
        const oldIconClass = icon.className;
        
        devLog(`Changing icon from "${oldIconClass}" to "${newIconClass}"`);
        
        // If already the same icon, don't change
        if (oldIconClass === newIconClass) {
            devLog('Same icon, skipping change');
            return;
        }
        
        // Add fade out class
        button.classList.add('icon-changing');
        
        // Force reflow to ensure class is applied
        button.offsetHeight;
        
        // Change icon after fade out
        setTimeout(() => {
            icon.className = newIconClass;
            // Force reflow
            icon.offsetHeight;
            // Remove fade out class to fade in
            button.classList.remove('icon-changing');
            devLog(`Icon changed to "${newIconClass}"`);
        }, 100); // Half of the CSS transition duration
    }
}
