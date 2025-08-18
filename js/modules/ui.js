/**
 * UI Management Module (Optimized)
 * Handles UI interactions, notifications, and visual feedback
 */

import { ELEMENT_IDS, EVENTS, UI_CONFIG } from './constants.js';
import { getElementById, dispatchEvent, debounce, devLog } from './utils.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.isProcessing = false;
    }

    /**
     * Initialize UI elements
     */
    init() {
        // Get elements using constants
        this.elements = {
            // Form elements
            downloadForm: getElementById(ELEMENT_IDS.DOWNLOAD_FORM),
            tiktokUrl: getElementById(ELEMENT_IDS.TIKTOK_URL),
            downloadBtn: getElementById(ELEMENT_IDS.DOWNLOAD_BTN),
            pasteBtn: getElementById(ELEMENT_IDS.PASTE_BTN),
            clearBtn: getElementById(ELEMENT_IDS.CLEAR_BTN),
            
            // Content sections
            infoSection: getElementById(ELEMENT_IDS.INFO_SECTION),
            infoGrid: getElementById(ELEMENT_IDS.INFO_GRID),
            previewSection: getElementById(ELEMENT_IDS.PREVIEW_SECTION),
            videoPreview: getElementById(ELEMENT_IDS.VIDEO_PREVIEW),
            imagePreview: getElementById(ELEMENT_IDS.IMAGE_PREVIEW),
            
            // Info toggle
            infoToggleBtn: getElementById(ELEMENT_IDS.INFO_TOGGLE_BTN),
            
            // Preview elements
            videoThumbnail: getElementById(ELEMENT_IDS.VIDEO_THUMBNAIL),
            imageGallery: getElementById(ELEMENT_IDS.IMAGE_GALLERY),
            
            // Download buttons
            downloadVideo: getElementById(ELEMENT_IDS.DOWNLOAD_VIDEO),
            downloadVideoHD: getElementById(ELEMENT_IDS.DOWNLOAD_VIDEO_HD),
            downloadAudio: getElementById(ELEMENT_IDS.DOWNLOAD_AUDIO),
            downloadAllImages: getElementById(ELEMENT_IDS.DOWNLOAD_ALL_IMAGES),
            
            // Modal elements
            errorModal: getElementById(ELEMENT_IDS.ERROR_MODAL),
            errorMessage: getElementById(ELEMENT_IDS.ERROR_MESSAGE),
            closeErrorModal: getElementById(ELEMENT_IDS.CLOSE_ERROR_MODAL),
            retryBtn: getElementById(ELEMENT_IDS.RETRY_BTN),
            
            // Loading and toast
            loadingOverlay: getElementById(ELEMENT_IDS.LOADING_OVERLAY),
            toastContainer: getElementById(ELEMENT_IDS.TOAST_CONTAINER)
        };

        this.bindEvents();
        this.setupKeyboardShortcuts();
    }

    /**
     * Bind UI event listeners
     */
    bindEvents() {
        // Button events
        if (this.elements.pasteBtn) {
            this.elements.pasteBtn.addEventListener('click', () => this.handlePaste());
        }
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this.handleClear());
        }
        if (this.elements.infoToggleBtn) {
            this.elements.infoToggleBtn.addEventListener('click', () => this.handleInfoToggle());
        }
        if (this.elements.closeErrorModal) {
            this.elements.closeErrorModal.addEventListener('click', () => this.hideErrorModal());
        }

        // Input validation with debouncing
        if (this.elements.tiktokUrl) {
            const debouncedValidation = debounce(() => {
                dispatchEvent(EVENTS.URL_INPUT, {
                    url: this.elements.tiktokUrl.value.trim()
                });
            }, UI_CONFIG.DEBOUNCE_DELAY);
            
            this.elements.tiktokUrl.addEventListener('input', debouncedValidation);
        }
        
        // Close modal on backdrop click
        if (this.elements.errorModal) {
            this.elements.errorModal.addEventListener('click', (e) => {
                if (e.target === this.elements.errorModal) {
                    this.hideErrorModal();
                }
            });
        }

        // Listen to theme changes to show notifications
        document.addEventListener(EVENTS.THEME_CHANGED, (e) => {
            this.showToast(e.detail.message, 'info');
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + V for paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && e.target !== this.elements.tiktokUrl) {
                e.preventDefault();
                this.handlePaste();
            }
            
            // Ctrl/Cmd + Enter for download
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                dispatchEvent(EVENTS.DOWNLOAD_REQUESTED);
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.hideErrorModal();
            }
        });
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Đang xử lý...') {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.querySelector('.loading-text').textContent = message;
            this.elements.loadingOverlay.style.display = 'flex';
            this.isProcessing = true;
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
            this.isProcessing = false;
            document.body.style.overflow = '';
        }
    }

    /**
     * Update loading text
     */
    updateLoadingText(message) {
        const loadingText = this.elements.loadingOverlay?.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    /**
     * Show error modal
     */
    showErrorModal(message) {
        if (this.elements.errorMessage && this.elements.errorModal) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide error modal
     */
    hideErrorModal() {
        if (this.elements.errorModal) {
            this.elements.errorModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = UI_CONFIG.TOAST_DURATION) {
        if (!this.elements.toastContainer) return;

        // Prevent duplicate messages
        const existingToasts = this.elements.toastContainer.querySelectorAll('.toast');
        for (const existingToast of existingToasts) {
            const existingMessage = existingToast.querySelector('.toast-message');
            if (existingMessage && existingMessage.textContent === message) {
                return; // Don't show duplicate
            }
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.setProperty('--toast-duration', `${duration}ms`);
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const titles = {
            success: 'Thành công',
            error: 'Lỗi',
            warning: 'Cảnh báo',
            info: 'Thông tin'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Đóng">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add subtle vibration effect on mobile for important notifications
        if ('vibrate' in navigator && (type === 'success' || type === 'error')) {
            navigator.vibrate(type === 'success' ? [50] : [100, 50, 100]);
        }

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Add to top of container (newest first)
        this.elements.toastContainer.insertBefore(toast, this.elements.toastContainer.firstChild);

        // Auto-remove after duration
        const timeoutId = setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        // Store timeout ID for potential cancellation
        toast.timeoutId = timeoutId;

        // Limit number of toasts
        const allToasts = this.elements.toastContainer.querySelectorAll('.toast');
        if (allToasts.length > UI_CONFIG.MAX_TOASTS) {
            for (let i = UI_CONFIG.MAX_TOASTS; i < allToasts.length; i++) {
                this.removeToast(allToasts[i]);
            }
        }
    }

    /**
     * Remove toast notification
     */
    removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        // Clear timeout if exists
        if (toast.timeoutId) {
            clearTimeout(toast.timeoutId);
        }

        // Add removing class for exit animation
        toast.classList.add('removing');
        
        // Remove after animation completes
        toast.addEventListener('animationend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, { once: true });
        
        // Fallback timeout in case animation doesn't fire
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 500); // Match animation duration
    }

    /**
     * Handle paste button click
     */
    async handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            dispatchEvent(EVENTS.URL_PASTED, { url: text });
        } catch (error) {
            console.error('Paste error:', error);
            this.showToast('Không thể đọc từ bảng nhớ tạm', 'error');
        }
    }

    /**
     * Handle clear button click
     */
    handleClear() {
        if (this.elements.tiktokUrl) {
            this.elements.tiktokUrl.value = '';
        }
        if (this.elements.infoSection) {
            this.elements.infoSection.style.display = 'none';
        }
        if (this.elements.previewSection) {
            this.elements.previewSection.style.display = 'none';
        }
        
        // Dispatch custom event
        dispatchEvent(EVENTS.DATA_CLEARED);
        
        this.showToast('Đã xóa thông tin', 'info');
    }

    /**
     * Validate input and update button state
     */
    updateValidationState(isValid) {
        if (this.elements.downloadBtn) {
            this.elements.downloadBtn.disabled = !isValid;
        }
    }

    /**
     * Set URL input value
     */
    setUrlInput(url) {
        if (this.elements.tiktokUrl) {
            this.elements.tiktokUrl.value = url;
        }
    }

    /**
     * Get URL input value
     */
    getUrlInput() {
        return this.elements.tiktokUrl?.value.trim() || '';
    }

    /**
     * Check if currently processing
     */
    getProcessingState() {
        return this.isProcessing;
    }

    /**
     * Handle info section toggle for mobile
     */
    handleInfoToggle() {
        if (!this.elements.infoSection || !this.elements.infoToggleBtn) return;

        const isCollapsed = this.elements.infoSection.classList.contains('collapsed');
        const toggleText = this.elements.infoToggleBtn.querySelector('.toggle-text');
        const toggleIcon = this.elements.infoToggleBtn.querySelector('.toggle-icon');
        
        if (isCollapsed) {
            // Expand
            this.elements.infoSection.classList.remove('collapsed');
            this.elements.infoSection.classList.add('expanded');
            this.elements.infoToggleBtn.classList.add('expanded');
            
            if (toggleText) toggleText.textContent = 'Thu gọn';
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-chevron-down');
                toggleIcon.classList.add('fa-chevron-up');
            }
        } else {
            // Collapse
            this.elements.infoSection.classList.remove('expanded');
            this.elements.infoSection.classList.add('collapsed');
            this.elements.infoToggleBtn.classList.remove('expanded');
            
            if (toggleText) toggleText.textContent = 'Xem thêm';
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-chevron-up');
                toggleIcon.classList.add('fa-chevron-down');
            }
        }
        
        // Add smooth animation
        this.elements.infoSection.style.transition = 'max-height 0.3s ease-in-out';
    }

    /**
     * Show custom loader with text
     * @param {string} text - Loading text to display
     */
    showCustomLoader(text = 'Đang xử lý...') {
        try {
            const loader = document.getElementById('customLoader');
            const loaderText = document.getElementById('loaderText');
            
            if (loader && loaderText) {
                loaderText.textContent = text;
                loader.classList.add('show');
                devLog('🚀 Custom loader shown:', text);
            }
        } catch (error) {
            console.error('❌ Error showing custom loader:', error);
        }
    }

    /**
     * Hide custom loader with fade out effect
     */
    hideCustomLoader() {
        try {
            const loader = document.getElementById('customLoader');
            
            if (loader && loader.classList.contains('show')) {
                // Add fade-out class for smooth transition
                loader.classList.add('fade-out');
                
                // Remove show class after fade-out animation
                setTimeout(() => {
                    loader.classList.remove('show', 'fade-out');
                    devLog('🚀 Custom loader hidden with fade out');
                }, 800); // Match CSS transition duration
            }
        } catch (error) {
            console.error('❌ Error hiding custom loader:', error);
        }
    }

    /**
     * Hide custom loader immediately (for errors)
     */
    hideCustomLoaderImmediate() {
        try {
            const loader = document.getElementById('customLoader');
            
            if (loader) {
                loader.classList.remove('show', 'fade-out');
                devLog('🚀 Custom loader hidden immediately');
            }
        } catch (error) {
            console.error('❌ Error hiding custom loader immediately:', error);
        }
    }

    /**
     * Show error notification with better styling
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {string} type - Error type (error, warning, info)
     */
    showErrorNotification(title, message, type = 'error') {
        try {
            // Hide any existing loader immediately for errors
            this.hideCustomLoaderImmediate();
            
            // Get icon based on type
            let icon = '❌';
            let className = 'error';
            
            switch (type) {
                case 'warning':
                    icon = '⚠️';
                    className = 'warning';
                    break;
                case 'info':
                    icon = 'ℹ️';
                    className = 'info';
                    break;
                case 'success':
                    icon = '✅';
                    className = 'success';
                    break;
                default:
                    icon = '❌';
                    className = 'error';
            }

            // Create enhanced toast message
            const toastMessage = `${icon} <strong>${title}</strong><br><small>${message}</small>`;
            
            // Show toast with longer duration for errors
            const duration = type === 'error' ? 5000 : 3000;
            this.showToast(toastMessage, className, duration);
            
            devLog(`🚨 Error notification shown: ${title} - ${message}`);
        } catch (error) {
            console.error('❌ Error showing error notification:', error);
            // Fallback to simple alert
            alert(`${title}\n${message}`);
        }
    }

    /**
     * Show download progress loader
     * @param {string} filename - Name of file being downloaded
     * @param {string} type - Type of download (video, audio, image, zip)
     */
    showDownloadLoader(filename, type = 'file') {
        const typeTexts = {
            'video': ' Đang tải video',
            'audio': 'Đang tải audio', 
            'image': 'Đang tải ảnh',
            'zip': 'Đang nén và tải ZIP',
            'file': 'Đang tải file'
        };
        
        const text = `${typeTexts[type] || typeTexts['file']}: ${filename}`;
        this.showCustomLoader(text);
    }

    /**
     * Show API processing loader
     * @param {string} action - Action being performed
     */
    showApiLoader(action = 'Đang xử lý yêu cầu') {
        this.showCustomLoader(`${action}...`);
    }
}
