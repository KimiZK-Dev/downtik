/**
 * Main App Module (Optimized)
 * Coordinates all other modules and manages the application state
 */

import { ThemeManager } from './theme.js';
import { UIManager } from './ui.js';
import { APIManager } from './api.js';
import { DisplayManager } from './display.js';
import { DownloadManager } from './download.js';
import { EVENTS, ERROR_MESSAGES } from './constants.js';
import { devLog, dispatchEvent } from './utils.js';
import { isValidTikTokUrl } from './validators.js';

export class TikTokDownloader {
    constructor() {
        this.currentData = null;
        this.isProcessing = false;
        
        // Initialize managers
        this.themeManager = new ThemeManager();
        this.uiManager = new UIManager();
        this.apiManager = new APIManager();
        this.displayManager = new DisplayManager();
        this.downloadManager = new DownloadManager();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize all managers
            this.themeManager.init();
            this.uiManager.init();
            this.displayManager.init();
            this.downloadManager.init();
            
            // Setup event listeners for inter-module communication
            this.setupEventListeners();
            
            console.log('TikTok Downloader initialized successfully');
        } catch (error) {
            console.error('Failed to initialize TikTok Downloader:', error);
        }
    }

    /**
     * Setup event listeners for module communication
     */
    setupEventListeners() {
        // Form submission
        const downloadForm = document.getElementById('downloadForm');
        if (downloadForm) {
            downloadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleDownload();
            });
        }

        // URL input validation
        document.addEventListener(EVENTS.URL_INPUT, (e) => {
            const url = e.detail.url;
            const isValid = url && isValidTikTokUrl(url);
            this.uiManager.updateValidationState(isValid);
        });

        // URL pasted
        document.addEventListener(EVENTS.URL_PASTED, (e) => {
            const url = e.detail.url;
            if (url && isValidTikTokUrl(url)) {
                this.uiManager.setUrlInput(url);
                this.uiManager.updateValidationState(true);
                this.uiManager.showToast('Đã dán link thành công!', 'success');
            } else {
                this.uiManager.showToast('Không tìm thấy link TikTok hợp lệ trong bảng nhớ tạm', 'warning');
            }
        });

        // Download requested
        document.addEventListener(EVENTS.DOWNLOAD_REQUESTED, () => {
            this.handleDownload();
        });

        // Data cleared
        document.addEventListener(EVENTS.DATA_CLEARED, () => {
            this.clearCurrentData();
            this.uiManager.updateValidationState(false);
        });

        // Toast requests from other modules
        document.addEventListener(EVENTS.SHOW_TOAST, (e) => {
            this.uiManager.showToast(e.detail.message, e.detail.type);
        });

        // Loading management
        document.addEventListener(EVENTS.SHOW_LOADING, (e) => {
            this.uiManager.showLoading(e.detail.message);
        });

        document.addEventListener(EVENTS.HIDE_LOADING, () => {
            this.uiManager.hideLoading();
        });

        document.addEventListener(EVENTS.UPDATE_LOADING_TEXT, (e) => {
            this.uiManager.updateLoadingText(e.detail.message);
        });

        // Retry button in error modal
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.uiManager.hideErrorModal();
                this.handleDownload();
            });
        }
    }

    /**
     * Handle download request
     */
    async handleDownload() {
        if (this.isProcessing) return;
        
        const url = this.uiManager.getUrlInput();
        if (!url || !isValidTikTokUrl(url)) {
            this.uiManager.showToast(ERROR_MESSAGES.INVALID_URL, 'error');
            return;
        }

        try {
            this.isProcessing = true;
            
            // Show spaceship loader for API processing
            this.uiManager.showApiLoader('Đang tải thông tin');
            
            devLog('Starting download process for URL:', url);
            
            // Clear old data and preview first
            this.clearCurrentData();
            devLog('Cleared old data, fetching new data...');
            
            // Fetch video data
            const data = await this.apiManager.fetchVideoData(url);
            devLog('Data fetched successfully:', data);
            
            this.currentData = data;
            
            // Hide loader before displaying content
            this.uiManager.hideCustomLoader();
            
            // Display information and preview
            this.displayManager.displayVideoInfo(data);
            this.displayManager.displayPreview(data);
            devLog('Display completed successfully');
            
            this.uiManager.showToast('Tải thông tin thành công!', 'success');
            
        } catch (error) {
            console.error('Download error details:', error);
            console.error('Error stack:', error.stack);
            
            // Hide loader immediately for errors
            this.uiManager.hideCustomLoaderImmediate();
            
            let errorTitle = 'Lỗi tải thông tin';
            let errorMessage = 'Không thể tải thông tin video. Vui lòng kiểm tra link và thử lại.';
            
            // Enhanced error messages based on error type
            if (error.message) {
                if (error.message.includes('Invalid URL') || error.message.includes('không hợp lệ')) {
                    errorTitle = 'URL không hợp lệ';
                    errorMessage = 'Link TikTok không đúng định dạng. Vui lòng kiểm tra và thử lại.';
                } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
                    errorTitle = 'Lỗi kết nối';
                    errorMessage = 'Không thể kết nối tới server. Vui lòng kiểm tra mạng và thử lại.';
                } else if (error.message.includes('API')) {
                    errorTitle = 'Lỗi API';
                    errorMessage = 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau ít phút. Hoặc kiểm tra lại link TikTok và thử lại.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            // Show enhanced error notification
            this.uiManager.showErrorNotification(errorTitle, errorMessage, 'error');
            
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Clear current data and preview
     */
    clearCurrentData() {
        this.currentData = null;
        
        // Use display manager to clear content
        this.displayManager.clearDisplay();
        
        // Only reset video thumbnail if needed (display manager handles it)
        // this.resetVideoThumbnail(); // Removed to prevent conflicts
    }

    /**
     * Reset video thumbnail to original state
     */
    resetVideoThumbnail() {
        const mediaContainer = document.querySelector('#videoPreview .media-container');
        if (mediaContainer) {
            // Stop any playing videos and clear completely
            const videos = mediaContainer.querySelectorAll('video');
            videos.forEach(video => {
                video.pause();
                video.src = '';
                video.load(); // Reset video element
                video.removeAttribute('src');
                video.removeAttribute('poster');
            });
            
            // Always restore to clean thumbnail state
            mediaContainer.innerHTML = `
                <img class="preview-image" id="videoThumbnail" alt="Video thumbnail">
                <div class="media-overlay">
                    <i class="fas fa-play"></i>
                </div>
            `;
        }
    }

    /**
     * Get current data (for external access)
     */
    getCurrentData() {
        return this.currentData;
    }

    /**
     * Get processing state
     */
    getProcessingState() {
        return this.isProcessing;
    }

    /**
     * Legacy method for backward compatibility
     */
    downloadSingleImage(imageUrl, index) {
        this.downloadManager.downloadSingleImage(imageUrl, index);
    }

    /**
     * Legacy method for backward compatibility
     */
    handleMediaDownload(event, url, filename) {
        this.downloadManager.handleMediaDownload(event, url, filename);
    }

    /**
     * Get download manager (for external access)
     */
    getDownloadManager() {
        return this.downloadManager;
    }

    /**
     * Get API manager (for external access)
     */
    getAPIManager() {
        return this.apiManager;
    }
}
