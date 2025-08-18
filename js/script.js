/**
 * TikTok Downloader - Main Entry Point
 * Modern modular implementation with separated concerns
 */

import { TikTokDownloader, isDevelopment } from './modules/index.js';

// Global reference for backward compatibility
window.tikTokDownloader = null;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create and initialize the main app
        window.tikTokDownloader = new TikTokDownloader();
        await window.tikTokDownloader.init();
        
        // Only log in development
        if (isDevelopment()) {
            console.log('TikTok Downloader v2.0.0 loaded successfully');
        }
    } catch (error) {
        console.error('Failed to load TikTok Downloader:', error);
        
        // Show error message to user
        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            max-width: 300px;
        `;
        errorContainer.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">Lỗi khởi tạo ứng dụng</div>
            <div style="font-size: 14px;">Vui lòng tải lại trang hoặc liên hệ hỗ trợ.</div>
        `;
        document.body.appendChild(errorContainer);
        
        // Auto remove error after 10 seconds
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.parentNode.removeChild(errorContainer);
            }
        }, 10000);
    }
});

/**
 * Handle service worker for PWA capabilities (optional)
 * Disabled for now to prevent 404 errors
 */
/*
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
*/

/**
 * Global error handler for unhandled promises and errors
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent the default browser behavior
    event.preventDefault();
    
    // Show user-friendly error message
    if (window.tikTokDownloader && window.tikTokDownloader.uiManager) {
        window.tikTokDownloader.uiManager.showToast(
            'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.', 
            'error'
        );
    }
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Show user-friendly error message for critical errors
    if (event.error && event.error.message && !event.error.message.includes('Script error')) {
        if (window.tikTokDownloader && window.tikTokDownloader.uiManager) {
            window.tikTokDownloader.uiManager.showToast(
                'Đã xảy ra lỗi. Vui lòng tải lại trang.', 
                'error'
            );
        }
    }
});

/**
 * Expose key functions globally for HTML onclick handlers (backward compatibility)
 */
window.downloadSingleImage = function(imageUrl, index) {
    if (isDevelopment()) {
        console.log('Global downloadSingleImage called:', imageUrl, index);
    }
    if (window.tikTokDownloader && window.tikTokDownloader.getDownloadManager) {
        window.tikTokDownloader.getDownloadManager().downloadSingleImage(imageUrl, index);
    } else {
        console.error('Download manager not available for image download');
    }
};

window.handleMediaDownload = function(event, url, filename) {
    if (isDevelopment()) {
        console.log('Global handleMediaDownload called:', url, filename);
    }
    if (window.tikTokDownloader && window.tikTokDownloader.getDownloadManager) {
        window.tikTokDownloader.getDownloadManager().handleMediaDownload(event, url, filename);
    } else {
        console.error('Download manager not available for media download');
    }
};
