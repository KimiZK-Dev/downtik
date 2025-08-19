/**
 * Video Preview Display Module
 * Handles video preview and playback functionality
 */

import { getElementById, dispatchEvent, devLog, devWarn, generateFilename } from '../utils.js';
import { ELEMENT_IDS, EVENTS } from '../constants.js';

export class VideoPreviewRenderer {
    constructor() {
        this.videoPreview = null;
        this.videoThumbnail = null;
        this.mediaContainer = null;
        this.currentData = null;
    }

    /**
     * Initialize the video preview renderer
     */
    init() {
        this.videoPreview = getElementById(ELEMENT_IDS.VIDEO_PREVIEW);
        this.videoThumbnail = getElementById(ELEMENT_IDS.VIDEO_THUMBNAIL);
        
        if (this.videoPreview) {
            this.mediaContainer = this.videoPreview.querySelector('.media-container');
        }
    }

    /**
     * Render video preview
     */
    render(data) {
        if (!data || !this.videoPreview) return;

        this.currentData = data;
        
        // Show video preview, hide image preview
        this.videoPreview.style.display = 'block';
        const imagePreview = getElementById(ELEMENT_IDS.IMAGE_PREVIEW);
        if (imagePreview) {
            imagePreview.style.display = 'none';
        }

        this.setupThumbnail(data);
        this.setupDownloadLinks(data);
        this.setupMediaOverlay();
    }

    /**
     * Setup video thumbnail
     */
    setupThumbnail(data) {
        // Reset to thumbnail view if there are inline videos
        this.resetToThumbnail();

        if (this.videoThumbnail && data.ai_dynamic_cover) {
            this.videoThumbnail.src = data.ai_dynamic_cover;
            this.videoThumbnail.alt = data.title || 'Video thumbnail';
            
            // Detect orientation when image loads
            this.detectImageOrientation(this.videoThumbnail);
        }
    }

    /**
     * Setup download links with event handlers (Enhanced for TikVid)
     */
    setupDownloadLinks(data) {
        this.setupVideoDownload(data);
        this.setupVideoHDDownload(data);
        this.setupAudioDownload(data);
        
        // Add TikVid-specific download options if available
        if (data.tikvidData && data.tikvidData.downloads) {
            this.setupTikVidDownloads(data);
        }
    }

    /**
     * Setup video download link (standard quality) - Enhanced for TikVid
     */
    setupVideoDownload(data) {
        const downloadVideo = getElementById(ELEMENT_IDS.DOWNLOAD_VIDEO);
        if (!downloadVideo) return;

        // Get best download URL (prioritize TikVid for downloads)
        let downloadUrl = null;
        
        // Priority 1: TikVid download URLs (high quality)
        if (data.tikvidData && data.tikvidData.downloadUrls) {
            downloadUrl = data.tikvidData.downloadUrls.play || data.tikvidData.downloadUrls.wmplay;
        }
        
        // Priority 2: TikVid downloads array
        if (!downloadUrl && data.tikvidData && data.tikvidData.downloads) {
            const standardVideo = data.tikvidData.downloads.find(d => 
                d.type === 'video' && (d.quality.includes('[1]') || d.quality.includes('MP4'))
            );
            if (standardVideo) {
                downloadUrl = standardVideo.url;
            }
        }
        
        // Priority 3: Fallback to original TikWM URL
        if (!downloadUrl && data.originalUrls) {
            downloadUrl = data.originalUrls.play;
        }
        
        // Priority 4: Final fallback to current URLs
        if (!downloadUrl && data.play) {
            downloadUrl = data.play;
        }
        
        if (!downloadUrl) {
            downloadVideo.style.display = 'none';
            return;
        }

        downloadVideo.style.display = 'block';
        const filename = generateFilename('video-sd', 'mp4');
        
        downloadVideo.href = '#';
        downloadVideo.download = filename;
        
        // Remove existing listeners by cloning
        const newDownloadVideo = downloadVideo.cloneNode(true);
        downloadVideo.parentNode.replaceChild(newDownloadVideo, downloadVideo);
        
        newDownloadVideo.onclick = (e) => {
            e.preventDefault();
            devLog('Video download clicked:', downloadUrl, filename);
            
            if (window.tikTokDownloader?.getDownloadManager) {
                window.tikTokDownloader.getDownloadManager().handleMediaDownload(e, downloadUrl, filename);
            } else {
                console.error('Download manager not available');
            }
        };
    }

    /**
     * Setup video HD download link (Enhanced for TikVid)
     */
    setupVideoHDDownload(data) {
        const downloadVideoHD = getElementById(ELEMENT_IDS.DOWNLOAD_VIDEO_HD);
        if (!downloadVideoHD) return;

        let hdUrl = null;
        let hdQuality = 'HD';
        
        // Method 1: Check TikVid download URLs (highest priority)
        if (data.tikvidData && data.tikvidData.downloadUrls) {
            if (data.tikvidData.downloadUrls.hdplay) {
                hdUrl = data.tikvidData.downloadUrls.hdplay;
                hdQuality = 'HD (TikVid)';
                devLog('Using TikVid HD download URL:', hdUrl);
            } else if (data.tikvidData.downloadUrls.wmplay) {
                hdUrl = data.tikvidData.downloadUrls.wmplay;
                hdQuality = 'Watermark Free (TikVid)';
                devLog('Using TikVid watermark-free URL:', hdUrl);
            }
        }
        
        // Method 2: Check TikVid downloads array
        if (!hdUrl && data.tikvidData && data.tikvidData.downloads) {
            const hdVideo = data.tikvidData.downloads.find(d => 
                d.type === 'video' && d.quality.includes('HD')
            );
            if (hdVideo) {
                hdUrl = hdVideo.url;
                hdQuality = hdVideo.quality;
                devLog('Using TikVid HD URL from downloads:', hdUrl, hdQuality);
            }
        }
        
        // Method 3: Use APIManager's getBestVideoUrl if available
        if (!hdUrl && window.tikTokDownloader?.getAPIManager) {
            const apiManager = window.tikTokDownloader.getAPIManager();
            hdUrl = apiManager.getBestVideoUrl(data, true); // preferHD = true
            devLog('HD URL from APIManager:', hdUrl);
        }
        
        // Method 4: Fallback to original TikWM URLs
        if (!hdUrl && data.originalUrls) {
            if (data.originalUrls.hdplay && data.originalUrls.hdplay !== data.originalUrls.play) {
                hdUrl = data.originalUrls.hdplay;
                hdQuality = 'HD (TikWM)';
                devLog('Using original TikWM HD URL:', hdUrl);
            } else if (data.originalUrls.wmplay && data.originalUrls.wmplay !== data.originalUrls.play) {
                hdUrl = data.originalUrls.wmplay;
                hdQuality = 'Watermark Free (TikWM)';
                devLog('Using original TikWM watermark-free URL:', hdUrl);
            }
        }
        
        // Method 5: Final fallback to current URLs
        if (!hdUrl) {
            // Priority order for HD detection
            if (data.hdplay && data.hdplay !== data.play) {
                hdUrl = data.hdplay;
                hdQuality = 'HD';
                devLog('Using current hdplay URL:', hdUrl);
            } else if (data.wmplay && data.wmplay !== data.play) {
                hdUrl = data.wmplay;
                hdQuality = 'No Watermark';
                devLog('Using current wmplay URL:', hdUrl);
            } else if (data.downloadLinks && data.downloadLinks.length > 1) {
                // Look for HD indicators in download links
                const hdLink = data.downloadLinks.find(link => 
                    typeof link === 'string' && (
                        link.includes('-hd.') || 
                        link.includes('_original.') ||
                        link.includes('1080p') ||
                        link.includes('720p')
                    )
                );
                if (hdLink) {
                    hdUrl = hdLink;
                    hdQuality = 'HD Download';
                    devLog('Using HD download link:', hdUrl);
                } else if (data.downloadLinks.length > 0) {
                    // Use first download link as HD alternative
                    hdUrl = data.downloadLinks[0];
                    hdQuality = 'Download';
                    devLog('Using first download link as HD:', hdUrl);
                }
            } else {
                // Last resort: use regular play URL but mark as HD
                hdUrl = data.play;
                hdQuality = 'Standard';
                devLog('Using standard play URL as HD fallback:', hdUrl);
            }
        }

        if (!hdUrl) {
            devWarn('No HD URL found, hiding HD button');
            downloadVideoHD.style.display = 'none';
            return;
        }

        const filename = generateFilename('video-hd', 'mp4');
        
        downloadVideoHD.href = '#';
        downloadVideoHD.download = filename;
        
        // // Update button text to show quality
        // const buttonText = downloadVideoHD.querySelector('span');
        // if (buttonText) {
        //     buttonText.textContent = `Tải ${hdQuality}`;
        // }
        
        // Remove existing listeners by cloning
        const newDownloadVideoHD = downloadVideoHD.cloneNode(true);
        downloadVideoHD.parentNode.replaceChild(newDownloadVideoHD, downloadVideoHD);
        
        newDownloadVideoHD.onclick = (e) => {
            e.preventDefault();
            devLog(`Video ${hdQuality} download clicked:`, hdUrl, filename);
            
            if (window.tikTokDownloader?.getDownloadManager) {
                window.tikTokDownloader.getDownloadManager().handleMediaDownload(e, hdUrl, filename);
            } else {
                console.error('Download manager not available');
            }
        };

        // Always show HD button if we have a URL
        newDownloadVideoHD.style.display = 'flex';
        devLog(`HD button configured with ${hdQuality} quality:`, hdUrl.substring(0, 50) + '...');
    }

    /**
     * Setup audio download link (Enhanced for TikVid)
     */
    setupAudioDownload(data) {
        const downloadAudio = getElementById(ELEMENT_IDS.DOWNLOAD_AUDIO);
        if (!downloadAudio) return;

        // Get best audio URL with priority order
        let audioUrl = null;
        
        // Priority 1: TikVid download URLs (highest quality)
        if (data.tikvidData && data.tikvidData.downloadUrls && data.tikvidData.downloadUrls.music) {
            audioUrl = data.tikvidData.downloadUrls.music;
            devLog('Using TikVid MP3 download URL:', audioUrl);
        }
        
        // Priority 2: TikVid downloads array
        else if (data.tikvidData && data.tikvidData.downloads) {
            const audioDownload = data.tikvidData.downloads.find(d => 
                d.type === 'audio' && d.quality.includes('MP3')
            );
            if (audioDownload) {
                audioUrl = audioDownload.url;
                devLog('Using TikVid MP3 from downloads array:', audioUrl);
            }
        }
        
        // Priority 3: Original TikWM music URL (for preview only, not download)
        if (!audioUrl && data.originalUrls && data.originalUrls.music) {
            audioUrl = data.originalUrls.music;
            devLog('Using original TikWM music URL:', audioUrl);
        }
        
        // Priority 4: Current music URL
        if (!audioUrl && data.music) {
            audioUrl = data.music;
            devLog('Using current music URL:', audioUrl);
        }
        
        // Priority 3: Music info play URL
        if (!audioUrl && data.music_info && data.music_info.play) {
            audioUrl = data.music_info.play;
            devLog('Using music_info play URL:', audioUrl);
        }

        if (!audioUrl) {
            downloadAudio.style.display = 'none';
            devLog('No audio URL available');
            return;
        }

        downloadAudio.style.display = 'block';
        const filename = generateFilename('audio', 'mp3');
        
        downloadAudio.href = '#';
        downloadAudio.download = filename;
        
        // Remove existing listeners by cloning
        const newDownloadAudio = downloadAudio.cloneNode(true);
        downloadAudio.parentNode.replaceChild(newDownloadAudio, downloadAudio);
        
        newDownloadAudio.onclick = (e) => {
            e.preventDefault();
            devLog('Audio download clicked:', audioUrl, filename);
            
            if (window.tikTokDownloader?.getDownloadManager) {
                window.tikTokDownloader.getDownloadManager().handleMediaDownload(e, audioUrl, filename);
            } else {
                console.error('Download manager not available');
            }
        };
    }

    /**
     * Setup TikVid-specific download options
     */
    setupTikVidDownloads(data) {
        if (!data.tikvidData || !data.tikvidData.downloads) return;

        // Add additional download quality options
        const videoDownloads = data.tikvidData.downloads.filter(d => d.type === 'video');
        const audioDownloads = data.tikvidData.downloads.filter(d => d.type === 'audio');
        
        devLog(`TikVid downloads available: ${videoDownloads.length} video, ${audioDownloads.length} audio`);
        
        // Show download count in metadata
        if (data.tikvidData.downloadCount > 0) {
            this.showDownloadCount(data.tikvidData.downloadCount);
        }
        
        // Handle image slideshows
        if (data.tikvidData.photoList && data.tikvidData.photoList.length > 0) {
            this.setupImageDownloads(data.tikvidData);
        }
    }

    /**
     * Setup image downloads for TikVid slideshows (using DownloadManager event delegation)
     */
    setupImageDownloads(tikvidData) {
        const downloadAllImages = getElementById(ELEMENT_IDS.DOWNLOAD_ALL_IMAGES);
        const downloadIndividually = document.querySelector('.download-all-images-individually');
        
        if (!downloadAllImages || !tikvidData.photoList) return;

        // Show both buttons
        downloadAllImages.style.display = 'block';
        if (downloadIndividually) {
            downloadIndividually.style.display = 'block';
        }
        
        // Update button text for ZIP download
        const zipText = downloadAllImages.querySelector('span');
        if (zipText) {
            zipText.textContent = `Tải ZIP (${tikvidData.photoCount} ảnh)`;
        }
        
        // Update button text for individual download
        const individualText = downloadIndividually?.querySelector('span');
        if (individualText) {
            individualText.textContent = `Tải lần lượt (${tikvidData.photoCount} ảnh)`;
        }
        
        // No need to add onclick handlers - DownloadManager handles them via event delegation
        devLog(`Setup TikVid image download options for ${tikvidData.photoCount} images`);
    }

    /**
     * Show download count in UI
     */
    showDownloadCount(count) {
        // Add download count badge to UI if needed
        devLog(`${count} download options available from TikVid`);
    }

    /**
     * Setup media overlay click handler
     */
    setupMediaOverlay() {
        if (!this.mediaContainer) return;

        const mediaOverlay = this.mediaContainer.querySelector('.media-overlay');
        if (!mediaOverlay) return;

        mediaOverlay.style.cursor = 'pointer';
        
        // Remove existing listeners by cloning
        const newOverlay = mediaOverlay.cloneNode(true);
        mediaOverlay.parentNode.replaceChild(newOverlay, mediaOverlay);
        
        newOverlay.addEventListener('click', () => {
            this.showVideoInline();
        });
    }

    /**
     * Show video inline with player
     */
    showVideoInline() {
        if (!this.currentData?.play) {
            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: 'Video không khả dụng',
                type: 'error'
            });
            return;
        }

        if (!this.mediaContainer) return;

        const videoElement = this.createVideoElement();
        this.setupVideoEventListeners(videoElement);
        
        // Replace content with video
        this.mediaContainer.innerHTML = '';
        this.mediaContainer.appendChild(videoElement);
        
        // Add restore button
        const restoreButton = this.createRestoreButton();
        this.mediaContainer.appendChild(restoreButton);
    }

    /**
     * Create video element (Using TikWM URLs for preview)
     */
    createVideoElement() {
        const videoElement = document.createElement('video');
        
        // Use original TikWM URLs for preview (not TikVid download URLs)
        // TikWM URLs can be played in browser, TikVid URLs auto-download
        let previewUrl = null;
        
        // PRIORITIZE TikWM URLs for video preview (playable in browser)
        // TikVid URLs are for downloading, TikWM URLs are for streaming
        
        // Priority 1: Original TikWM URLs preserved for preview
        if (this.currentData.originalUrls) {
            previewUrl = this.currentData.originalUrls.play ||           // Standard quality
                        this.currentData.originalUrls.wmplay ||          // Watermark version
                        this.currentData.originalUrls.hdplay;            // HD quality
            devLog('Using preserved TikWM URL for preview:', previewUrl);
        } 
        // Priority 2: Current URLs if they are TikWM (not TikVid download URLs)
        else if (this.currentData.play && !this.currentData.play.includes('dl.snapcdn.app')) {
            previewUrl = this.currentData.play;
            devLog('Using current TikWM play URL for preview:', previewUrl);
        }
        else if (this.currentData.wmplay && !this.currentData.wmplay.includes('dl.snapcdn.app')) {
            previewUrl = this.currentData.wmplay;
            devLog('Using current TikWM wmplay URL for preview:', previewUrl);
        }
        else if (this.currentData.hdplay && !this.currentData.hdplay.includes('dl.snapcdn.app')) {
            previewUrl = this.currentData.hdplay;
            devLog('Using current TikWM hdplay URL for preview:', previewUrl);
        }
        // Priority 3: For image slideshows, use videoPreview URL from TikVid
        else if (this.currentData.isPhotoSlideshow && this.currentData.tikvidData?.videoPreview) {
            previewUrl = this.currentData.tikvidData.videoPreview;
            devLog('Using TikVid videoPreview for slideshow:', previewUrl);
        }
        
        // Fallback to any available URL if none found
        if (!previewUrl) {
            previewUrl = this.currentData.play || this.currentData.hdplay || this.currentData.wmplay;
        }
        
        videoElement.src = previewUrl;
        videoElement.className = 'preview-video';
        videoElement.controls = true;
        videoElement.autoplay = true;
        
        // Detect video orientation when metadata loads
        this.detectVideoOrientation(videoElement);
        
        devLog('Using preview URL:', previewUrl);
        
        return videoElement;
    }

    /**
     * Setup video event listeners
     */
    setupVideoEventListeners(videoElement) {
        let hasShownLoadingToast = false;
        let hasShownReadyToast = false;

        videoElement.addEventListener('loadstart', () => {
            if (!hasShownLoadingToast) {
                dispatchEvent(EVENTS.SHOW_TOAST, {
                    message: 'Đang tải video...',
                    type: 'info'
                });
                hasShownLoadingToast = true;
            }
        });

        videoElement.addEventListener('canplay', () => {
            if (!hasShownReadyToast) {
                dispatchEvent(EVENTS.SHOW_TOAST, {
                    message: 'Video đã sẵn sàng!',
                    type: 'success'
                });
                hasShownReadyToast = true;
            }
        });

        videoElement.addEventListener('error', () => {
            dispatchEvent(EVENTS.SHOW_TOAST, {
                message: 'Không thể tải video',
                type: 'error'
            });
            this.restoreVideoThumbnail();
        });

        videoElement.addEventListener('seeking', () => {
            hasShownLoadingToast = true;
        });
    }

    /**
     * Create restore button
     */
    createRestoreButton() {
        const restoreButton = document.createElement('button');
        restoreButton.className = 'restore-thumbnail-btn';
        restoreButton.innerHTML = '<i class="fas fa-undo"></i>';
        restoreButton.title = 'Quay lại thumbnail';
        
        restoreButton.addEventListener('click', () => {
            this.restoreVideoThumbnail();
        });
        
        return restoreButton;
    }

    /**
     * Restore video thumbnail view
     */
    restoreVideoThumbnail() {
        if (!this.mediaContainer || !this.currentData) return;

        this.mediaContainer.innerHTML = `
            <img class="preview-image" id="${ELEMENT_IDS.VIDEO_THUMBNAIL}" 
                 alt="Video thumbnail" src="${this.currentData.ai_dynamic_cover}">
            <div class="media-overlay">
                <i class="fas fa-play"></i>
            </div>
        `;

        // Update reference
        this.videoThumbnail = getElementById(ELEMENT_IDS.VIDEO_THUMBNAIL);
        
        // Re-detect orientation for restored thumbnail
        this.detectImageOrientation(this.videoThumbnail);
        
        // Re-setup overlay
        this.setupMediaOverlay();
    }

    /**
     * Reset to thumbnail view (clean up any playing videos)
     */
    resetToThumbnail() {
        if (!this.mediaContainer) return;

        const videos = this.mediaContainer.querySelectorAll('video');
        if (videos.length === 0) return;

        // Stop and clean up videos
        videos.forEach(video => {
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
            } catch (error) {
                console.warn('Error stopping video:', error);
            }
        });

        // Restore thumbnail structure
        this.mediaContainer.innerHTML = `
            <img class="preview-image" id="${ELEMENT_IDS.VIDEO_THUMBNAIL}" alt="Video thumbnail">
            <div class="media-overlay">
                <i class="fas fa-play"></i>
            </div>
        `;

        // Update reference
        this.videoThumbnail = getElementById(ELEMENT_IDS.VIDEO_THUMBNAIL);
        
        // Re-detect orientation when resetting
        if (this.currentData?.ai_dynamic_cover) {
            this.videoThumbnail.src = this.currentData.ai_dynamic_cover;
            this.detectImageOrientation(this.videoThumbnail);
        }
    }

    /**
     * Clear the video preview
     */
    clear() {
        // Stop any playing videos
        this.resetToThumbnail();
        
        // Clear download links
        this.clearDownloadLinks();
        
        // Hide preview
        if (this.videoPreview) {
            this.videoPreview.style.display = 'none';
        }
        
        this.currentData = null;
    }

    /**
     * Clear download links safely
     */
    clearDownloadLinks() {
        const downloadVideo = getElementById(ELEMENT_IDS.DOWNLOAD_VIDEO);
        const downloadVideoHD = getElementById(ELEMENT_IDS.DOWNLOAD_VIDEO_HD);
        const downloadAudio = getElementById(ELEMENT_IDS.DOWNLOAD_AUDIO);
        
        if (downloadVideo) {
            downloadVideo.href = '#';
            downloadVideo.download = '';
            downloadVideo.onclick = null;
        }
        
        if (downloadVideoHD) {
            downloadVideoHD.href = '#';
            downloadVideoHD.download = '';
            downloadVideoHD.onclick = null;
            downloadVideoHD.style.display = 'flex';
        }
        
        if (downloadAudio) {
            downloadAudio.href = '#';
            downloadAudio.download = '';
            downloadAudio.onclick = null;
        }
    }

    /**
     * Get current video data
     */
    getCurrentData() {
        return this.currentData;
    }

    /**
     * Detect image orientation and apply CSS class
     */
    detectImageOrientation(imageElement) {
        if (!imageElement || !this.mediaContainer) return;

        imageElement.onload = () => {
            const aspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
            
            let orientationClass = 'square';
            if (aspectRatio > 1.2) {
                orientationClass = 'landscape';
            } else if (aspectRatio < 0.8) {
                orientationClass = 'portrait';
            }
            
            // Remove existing orientation classes
            this.mediaContainer.classList.remove('landscape', 'portrait', 'square');
            // Add new orientation class
            this.mediaContainer.classList.add(orientationClass);
            
            devLog(`Image orientation detected: ${orientationClass} (${imageElement.naturalWidth}x${imageElement.naturalHeight}, ratio: ${aspectRatio.toFixed(2)})`);
        };
    }

    /**
     * Detect video orientation and apply CSS class
     */
    detectVideoOrientation(videoElement) {
        if (!videoElement || !this.mediaContainer) return;

        videoElement.addEventListener('loadedmetadata', () => {
            const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
            
            let orientationClass = 'square';
            if (aspectRatio > 1.2) {
                orientationClass = 'landscape';
            } else if (aspectRatio < 0.8) {
                orientationClass = 'portrait';
            }
            
            // Remove existing orientation classes
            this.mediaContainer.classList.remove('landscape', 'portrait', 'square');
            // Add new orientation class
            this.mediaContainer.classList.add(orientationClass);
            
            devLog(`Video orientation detected: ${orientationClass} (${videoElement.videoWidth}x${videoElement.videoHeight}, ratio: ${aspectRatio.toFixed(2)})`);
        });
    }
}
