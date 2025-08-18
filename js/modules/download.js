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
    }
}
