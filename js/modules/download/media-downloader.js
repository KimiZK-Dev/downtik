/**
 * Media Download Module
 * Handles video and audio downloads with multiple fallback methods
 */

import { devLog, dispatchEvent, generateFilename, withTimeout, retryAsync } from '../utils.js';
import { EVENTS, DOWNLOAD_CONFIG, API_CONFIG } from '../constants.js';
import { UIManager } from '../ui.js';

export class MediaDownloader {
    constructor() {
        this.activeDownloads = new Set();
        this.uiManager = new UIManager();
    }

    /**
     * Download media file (video/audio)
     */
    async downloadMedia(url, filename, type = 'video') {
        if (!url || url === '#') {
            throw new Error('Invalid URL');
        }

        const downloadId = `${type}_${Date.now()}`;
        this.activeDownloads.add(downloadId);

        try {
            devLog('Starting media download:', url, filename);
            
            // Show spaceship loader with download info
            this.uiManager.showDownloadLoader(filename, type);

            await this.attemptDownload(url, filename);
            
            // Hide loader and show success
            this.uiManager.hideCustomLoader();
            this.uiManager.showErrorNotification(
                'Tải thành công!',
                `${type === 'video' ? 'Video' : 'Audio'} đã được tải về máy`,
                'success'
            );

        } catch (error) {
            devLog('Fetch download failed, trying direct download:', error);
            
            // Hide loader immediately for errors
            this.uiManager.hideCustomLoaderImmediate();
            this.uiManager.showErrorNotification(
                'Tải trực tiếp',
                `Không thể tải qua proxy. Đã mở liên kết tải trực tiếp`,
                'warning'
            );
            
            this.createDirectDownloadLink(url, filename);
        } finally {
            this.activeDownloads.delete(downloadId);
        }
    }

    /**
     * Attempt download with TikVid proxy priority
     */
    async attemptDownload(url, filename) {
        // Check if this is a TikVid download URL that should use proxy
        const isTikVidUrl = url.includes('dl.snapcdn.app') || url.includes('tikvid.io') || url.includes('muscdn.com');
        
        let methods;
        if (isTikVidUrl) {
            // For TikVid URLs, use TikVid proxy FIRST
            methods = [
                () => this.downloadViaTikVidProxy(url, filename),
                () => this.downloadViaFetch(url, filename),
                () => this.createDirectDownloadLink(url, filename)
            ];
        } else {
            // For other URLs (TikWM), still try proxy first, then direct methods
            methods = [
                () => this.downloadViaTikVidProxy(url, filename),
                () => this.downloadViaFetch(url, filename),
                () => this.createDirectDownloadLink(url, filename)
            ];
        }

        for (const method of methods) {
            try {
                await retryAsync(method, 2, 1000);
                return; // Success
            } catch (error) {
                devLog('Download method failed:', error.message);
                
                // Show helpful error for TikVid URLs when proxy/API fails
                if (isTikVidUrl && (error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('Failed to fetch'))) {
                    throw new Error('❌ TikVid API không khả dụng!\n\n🔄 Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.\n\n🌐 API: https://cors-kimizk.vercel.app');
                }
                
                continue; // Try next method
            }
        }

        throw new Error('❌ Không thể tải file qua các phương thức có sẵn.\n\n🔄 Vui lòng thử lại sau hoặc kiểm tra:\n• Kết nối mạng\n• URL có hợp lệ không\n• Server API có hoạt động không');
    }

    /**
     * Download via fetch and blob with enhanced compatibility
     */
    async downloadViaFetch(url, filename) {
        try {
            // Try with no-cors first for better compatibility
            const response = await withTimeout(
                fetch(url, {
                    method: 'GET',
                    mode: 'no-cors'
                }),
                DOWNLOAD_CONFIG.TIMEOUT
            );

            // For no-cors, we can't check response.ok, so try to get blob
            const blob = await response.blob();
            if (blob.size === 0) {
                throw new Error('Empty file received');
            }

            this.downloadBlob(blob, filename);
            return;

        } catch (noCorsError) {
            devLog('No-cors download failed, trying with cors:', noCorsError.message);
            
            // Fallback to CORS mode with headers
            const response = await withTimeout(
                fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': '*/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    mode: 'cors'
                }),
                DOWNLOAD_CONFIG.TIMEOUT
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            if (blob.size === 0) {
                throw new Error('Empty file received');
            }

            this.downloadBlob(blob, filename);
        }
    }

    /**
     * Download via TikVid proxy server
     */
    async downloadViaTikVidProxy(url, filename) {
        // First check if proxy server is running
        await this.checkTikVidProxyHealth();
        
        const proxyUrl = `${API_CONFIG.DOWNLOAD_PROXY.TIKVID_DOWNLOAD.url}${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        
        devLog('Using TikVid download proxy:', proxyUrl);
        
        const response = await withTimeout(
            fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': '*/*'
                }
            }),
            DOWNLOAD_CONFIG.TIMEOUT
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`TikVid proxy failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
            throw new Error('Empty file received from TikVid proxy');
        }

        this.downloadBlob(blob, filename);
    }

    /**
     * Check if TikVid API is available
     */
    async checkTikVidProxyHealth() {
        try {
            // Use Vercel API endpoint instead of localhost
            const healthUrl = 'https://cors-kimizk.vercel.app/api/proxy';
            const testUrl = 'https://www.tiktok.com/@dopaminenjoyer_/video/7538289696007392530'; // Simple test URL
            
            const response = await withTimeout(
                fetch(`${healthUrl}?url=${encodeURIComponent(testUrl)}`, { 
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }),
                5000 // 5 second timeout for health check
            );
            
            // Even if the test URL fails, if we get a response, the API is working
            if (response.status === 200 || response.status === 400) {
                devLog('✅ TikVid API is available');
                return true;
            } else {
                throw new Error(`API returned status: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`❌ TikVid API không khả dụng!\n\n🔄 Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.\n🌐 API: https://cors-kimizk.vercel.app\n\nChi tiết lỗi: ${error.message}`);
        }
    }

    /**
     * Enhanced direct download with better user feedback
     */
    async downloadViaDirectLink(url, filename) {
        devLog('Attempting direct download link creation for:', filename);
        this.createDirectDownloadLink(url, filename);
        return Promise.resolve(); // Always succeeds
    }

    /**
     * Download blob as file
     */
    downloadBlob(blob, filename) {
        const blobUrl = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }

    /**
     * Create direct download link with enhanced browser compatibility
     */
    createDirectDownloadLink(url, filename) {
        devLog('Creating direct download link for:', filename);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener noreferrer';
        downloadLink.style.display = 'none';
        
        // Add additional attributes for better compatibility
        downloadLink.setAttribute('type', 'application/octet-stream');
        
        document.body.appendChild(downloadLink);
        
        // For mobile devices, try different approaches
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            // Mobile: Open in new tab first, then try download
            downloadLink.target = '_blank';
            downloadLink.click();
            
            // Also try setting window.location after a delay
            setTimeout(() => {
                try {
                    window.open(url, '_blank');
                } catch (e) {
                    devLog('Mobile fallback failed:', e.message);
                }
            }, 100);
        } else {
            // Desktop: Direct download
            downloadLink.click();
        }
        
        document.body.removeChild(downloadLink);
        
        devLog('Direct download link created and clicked');
    }

    /**
     * Check if download is active
     */
    isDownloading() {
        return this.activeDownloads.size > 0;
    }

    /**
     * Cancel all active downloads
     */
    cancelAll() {
        this.activeDownloads.clear();
    }
}
