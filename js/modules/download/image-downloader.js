/**
 * Image Download Module
 * Handles individual image downloads and batch ZIP creation
 */

import { devLog, dispatchEvent, generateFilename, withTimeout, retryAsync, sleep } from '../utils.js';
import { EVENTS, DOWNLOAD_CONFIG } from '../constants.js';
import { validateImageBlob } from '../validators.js';

export class ImageDownloader {
    constructor() {
        this.activeDownloads = new Set();
    }

    /**
     * Download single image
     */
    async downloadSingleImage(imageUrl, index = 0) {
        const filename = generateFilename(`tiktok_image_${index + 1}`, 'jpg');
        const downloadId = `image_${index}_${Date.now()}`;
        
        this.activeDownloads.add(downloadId);

        try {
            await this.attemptImageDownload(imageUrl, filename);
        } catch (error) {
            devLog('All image download methods failed:', error);
            // Fallback: open in new tab
            window.open(imageUrl, '_blank', 'noopener,noreferrer');
        } finally {
            this.activeDownloads.delete(downloadId);
        }
    }

    /**
     * Attempt image download with proxy priority
     */
    async attemptImageDownload(imageUrl, filename) {
        const methods = [
            // Try TikVid proxy first (best for TikTok images)
            () => this.downloadImageViaProxy(imageUrl, filename),
            // Fallback to fetch if proxy doesn't work
            () => this.downloadImageViaFetch(imageUrl, filename),
            // Then try direct link
            () => this.createDirectDownload(imageUrl, filename),
            // Last resort: canvas method
            () => this.downloadImageViaCanvas(imageUrl, filename)
        ];

        for (const method of methods) {
            try {
                await retryAsync(method, 1, 500); // Reduced retries for faster fallback
                return; // Success
            } catch (error) {
                devLog('Image download method failed:', error.message);
                continue;
            }
        }

        throw new Error('All image download methods failed');
    }

    /**
     * Download image via TikVid proxy server
     */
    async downloadImageViaProxy(imageUrl, filename) {
        try {
            const proxyUrl = `https://cors-kimizk.vercel.app/api/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
            
            devLog('Using TikVid proxy for image:', proxyUrl);
            
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
                throw new Error(`TikVid proxy failed: ${response.status}`);
            }

            const blob = await response.blob();
            if (blob.size === 0) {
                throw new Error('Empty file received from proxy');
            }

            this.downloadBlob(blob, filename);
        } catch (error) {
            if (error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('fetch')) {
                throw new Error('TikVid proxy server không hoạt động. Chạy: node tikvid-proxy-server.js');
            }
            throw error;
        }
    }

    /**
     * Download image via fetch with no-cors fallback
     */
    async downloadImageViaFetch(imageUrl, filename) {
        try {
            // Try no-cors first for better compatibility
            const response = await withTimeout(
                fetch(imageUrl, {
                    method: 'GET',
                    mode: 'no-cors'
                }),
                DOWNLOAD_CONFIG.TIMEOUT
            );

            const blob = await response.blob();
            if (blob.size > 0) {
                this.downloadBlob(blob, filename);
                return;
            }
            throw new Error('Empty blob from no-cors fetch');

        } catch (noCorsError) {
            devLog('No-cors fetch failed, trying with CORS:', noCorsError.message);
            
            // Fallback to CORS mode
            const response = await withTimeout(
                fetch(imageUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'image/*,*/*;q=0.8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.tiktok.com/'
                    },
                    mode: 'cors'
                }),
                DOWNLOAD_CONFIG.TIMEOUT
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const validation = validateImageBlob(blob);
            
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            this.downloadBlob(blob, filename);
        }
    }

    /**
     * Download image via canvas (for CORS issues)
     */
    async downloadImageViaCanvas(imageUrl, filename) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let timeoutId;
            let resolved = false;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                img.onload = null;
                img.onerror = null;
                img.src = '';
            };

            const safeResolve = (value) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(value);
                }
            };

            const safeReject = (error) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    reject(error);
                }
            };

            // Set timeout
            timeoutId = setTimeout(() => {
                safeReject(new Error('Image load timeout'));
            }, DOWNLOAD_CONFIG.TIMEOUT);

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.naturalWidth || img.width || 100;
                    canvas.height = img.naturalHeight || img.height || 100;
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob((blob) => {
                        if (blob && blob.size > 0) {
                            this.downloadBlob(blob, filename);
                            safeResolve();
                        } else {
                            safeReject(new Error('Canvas to blob failed'));
                        }
                    }, 'image/jpeg', 0.9);
                } catch (error) {
                    safeReject(new Error(`Canvas processing failed: ${error.message}`));
                }
            };

            img.onerror = () => {
                // Try with CORS
                const corsImg = new Image();
                corsImg.crossOrigin = 'anonymous';
                corsImg.onload = img.onload;
                corsImg.onerror = () => safeReject(new Error('Image load failed'));
                corsImg.src = imageUrl;
            };

            img.src = imageUrl;
        });
    }

    /**
     * Create direct download link with enhanced mobile support
     */
    createDirectDownload(imageUrl, filename) {
        devLog('Creating direct image download for:', filename);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = imageUrl;
        downloadLink.download = filename;
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener noreferrer';
        downloadLink.style.display = 'none';
        
        // Add image-specific attributes
        downloadLink.setAttribute('type', 'image/jpeg');
        
        document.body.appendChild(downloadLink);
        
        // Enhanced mobile compatibility
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            // Mobile: Try multiple approaches
            downloadLink.click();
            
            // Also try opening in new window for mobile browsers that don't support download attribute
            setTimeout(() => {
                try {
                    const newWindow = window.open(imageUrl, '_blank', 'noopener,noreferrer');
                    if (!newWindow) {
                        // Popup blocked, try direct navigation
                        window.location.href = imageUrl;
                    }
                } catch (e) {
                    devLog('Mobile image download fallback failed:', e.message);
                }
            }, 100);
        } else {
            // Desktop: Standard download
            downloadLink.click();
        }
        
        document.body.removeChild(downloadLink);
        
        devLog('Direct image download link created and triggered');
        return Promise.resolve(); // Always succeeds for attempt method
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
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }

    /**
     * Download all images as ZIP
     */
    async downloadAllImagesAsZip(images) {
        if (!images || !Array.isArray(images) || images.length === 0) {
            throw new Error('No images to download');
        }

        try {
            // Show loading
            dispatchEvent(EVENTS.SHOW_LOADING, {
                message: 'Đang tạo file ZIP...'
            });

            const zip = new JSZip();
            const folder = zip.folder('tiktok_images');
            let successCount = 0;
            const totalImages = images.length;

            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: `Bắt đầu tải ${totalImages} ảnh...`,
                type: 'info'
            });

            // Process images with limited concurrency
            for (let i = 0; i < images.length; i += DOWNLOAD_CONFIG.CONCURRENT_DOWNLOADS) {
                const batch = images.slice(i, i + DOWNLOAD_CONFIG.CONCURRENT_DOWNLOADS);
                const results = await Promise.allSettled(
                    batch.map((imageUrl, batchIndex) => 
                        this.processImageForZip(imageUrl, i + batchIndex)
                    )
                );

                for (const [batchIndex, result] of results.entries()) {
                    const globalIndex = i + batchIndex;
                    
                    if (result.status === 'fulfilled' && result.value) {
                        const fileName = `image_${globalIndex + 1}.jpg`;
                        folder.file(fileName, result.value);
                        successCount++;
                        
                        devLog(`Added image ${globalIndex + 1} to ZIP (${result.value.size} bytes)`);
                    } else {
                        devLog(`Failed to process image ${globalIndex + 1}:`, result.reason);
                    }

                    // Update progress
                    const progress = Math.round(((globalIndex + 1) / totalImages) * 100);
                    dispatchEvent(EVENTS.UPDATE_LOADING_TEXT, {
                        message: `Đã xử lý ${globalIndex + 1}/${totalImages} ảnh (${progress}%)`
                    });
                }

                // Small delay between batches to prevent overwhelming the server
                if (i + DOWNLOAD_CONFIG.CONCURRENT_DOWNLOADS < images.length) {
                    await sleep(500);
                }
            }

            if (successCount === 0) {
                throw new Error('Không thể xử lý ảnh nào cho file ZIP');
            }

            // Generate and download ZIP
            devLog('Generating ZIP file...');
            const content = await zip.generateAsync({
                type: 'blob',
                compression: "DEFLATE",
                compressionOptions: {
                    level: 6
                }
            });

            devLog(`ZIP file generated: ${content.size} bytes`);

            const filename = generateFilename('tiktok_images', 'zip');
            this.downloadBlob(content, filename);

            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: `Tải thành công ${successCount}/${totalImages} ảnh trong file ZIP!`,
                type: 'success'
            });

        } catch (error) {
            devLog('ZIP creation error:', error);
            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: 'Không thể tạo ZIP. Vui lòng sử dụng tải từng ảnh.',
                type: 'warning'
            });
            throw error;
        } finally {
            dispatchEvent(EVENTS.HIDE_LOADING);
        }
    }

    /**
     * Process single image for ZIP creation
     */
    async processImageForZip(imageUrl, index) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    await sleep(1000 * attempt); // Exponential backoff
                }

                // Try fetch first
                const response = await withTimeout(
                    fetch(imageUrl, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-cache',
                        headers: {
                            'Accept': 'image/*,*/*;q=0.8',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://www.tiktok.com/'
                        }
                    }),
                    10000 // 10 second timeout for ZIP images
                );

                if (response.ok) {
                    const blob = await response.blob();
                    const validation = validateImageBlob(blob);
                    
                    if (validation.isValid) {
                        return blob;
                    } else {
                        throw new Error(validation.error);
                    }
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                lastError = error;
                devLog(`Image ${index + 1} attempt ${attempt + 1} failed:`, error.message);
                
                // Try canvas fallback on last attempt for CORS errors
                if (attempt === maxRetries - 1 && error.message.includes('CORS')) {
                    try {
                        return await this.getImageBlobViaCanvas(imageUrl);
                    } catch (canvasError) {
                        devLog(`Canvas fallback failed for image ${index + 1}:`, canvasError);
                    }
                }
            }
        }

        throw lastError || new Error(`Failed to process image ${index + 1}`);
    }

    /**
     * Get image blob via canvas
     */
    async getImageBlobViaCanvas(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let resolved = false;
            
            const cleanup = () => {
                img.onload = null;
                img.onerror = null;
                img.src = '';
            };
            
            const safeResolve = (value) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(value);
                }
            };
            
            const safeReject = (error) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    reject(error);
                }
            };
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.naturalWidth || img.width || 100;
                    canvas.height = img.naturalHeight || img.height || 100;
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob((blob) => {
                        if (blob && blob.size > 0) {
                            safeResolve(blob);
                        } else {
                            safeReject(new Error('Canvas to blob failed'));
                        }
                    }, 'image/jpeg', 0.9);
                } catch (error) {
                    safeReject(new Error(`Canvas processing failed: ${error.message}`));
                }
            };
            
            img.onerror = () => {
                safeReject(new Error('Image load failed'));
            };
            
            setTimeout(() => {
                safeReject(new Error('Image load timeout (15s)'));
            }, 15000);
            
            img.src = imageUrl;
        });
    }

    /**
     * Check if downloads are active
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
