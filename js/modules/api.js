/**
 * API Management Module (Optimized)
 * Handles all TikTok API requests and data processing with improved error handling
 */

import { API_CONFIG, ERROR_MESSAGES, FEATURES } from './constants.js';
import { isValidTikTokUrl, devLog, devWarn, withTimeout, retryAsync, isDevelopment } from './utils.js';
import { validateApiResponse } from './validators.js';

export class APIManager {
    constructor() {
        this.requestCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.requestTimestamps = [];
        // Single CORS proxy - no rotation needed
        this.failedApis = new Set(); // Track failed APIs
        this.apiHealthCheck = new Map(); // API health status
    }

    /**
     * Rate limiting helper
     */
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < API_CONFIG.RATE_LIMIT.MIN_INTERVAL) {
            const waitTime = API_CONFIG.RATE_LIMIT.MIN_INTERVAL - timeSinceLastRequest;
            devLog(`Rate limiting: waiting ${waitTime}ms before next request`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Clean old timestamps (older than 1 minute)
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => now - timestamp < 60000
        );
        
        // Check requests per minute limit
        if (this.requestTimestamps.length >= API_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
            const oldestRequest = this.requestTimestamps[0];
            const waitTime = 60000 - (now - oldestRequest);
            if (waitTime > 0) {
                devLog(`Rate limit exceeded: waiting ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        this.lastRequestTime = Date.now();
        this.requestTimestamps.push(this.lastRequestTime);
    }

    /**
     * Fetch video data with hybrid strategy: TikWM metadata + TikVid downloads
     */
    async fetchVideoData(url) {
        // Validate URL first
        if (!isValidTikTokUrl(url)) {
            throw new Error(ERROR_MESSAGES.INVALID_URL);
        }

        // Clean URL for caching
        const cleanUrl = this.cleanUrl(url);
        
        // Check cache first
        const cached = this.getFromCache(cleanUrl);
        if (cached) {
            devLog('Returning cached data for:', cleanUrl);
            return cached;
        }

        try {
            devLog('🚀 Fetching TikTok data with hybrid proxy strategy for:', cleanUrl);
            
            // Step 1: Get metadata from TikWM
            devLog('📊 Getting metadata from TikWM...');
            const metadataData = await this.fetchMetadata(cleanUrl);
            devLog('✅ TikWM metadata retrieved successfully');
            
            // Step 2: Get enhanced download links from TikVid proxy
            try {
                devLog('📥 Getting enhanced download links from TikVid proxy...');
                const downloadData = await this.fetchDownloadLinks(cleanUrl);
                devLog('✅ TikVid download links retrieved successfully');
                
                // Step 3: Combine both data sources
                const enhancedData = this.combineMetadataAndDownloads(metadataData, downloadData, cleanUrl);
                devLog('🔗 Combined data from both sources');
                
                // Validate response
                const validation = validateApiResponse(enhancedData);
                if (!validation.isValid) {
                    throw new Error(validation.error);
                }

                // Cache the result
                this.saveToCache(cleanUrl, enhancedData);
                
                return enhancedData;
                
            } catch (tikvidError) {
                devLog('📋 TikVid proxy failed, using TikWM with proxy fallback strategy:', tikvidError.message);
                // Mark data for proxy fallback mode
                metadataData.metadata = {
                    ...metadataData.metadata,
                    downloadMode: 'proxy_fallback',
                    source: 'tikwm_with_proxy_fallback',
                    note: 'TikVid proxy unavailable, downloads will try proxy then direct'
                };
                
                // Cache and return TikWM data with proxy fallback strategy
                this.saveToCache(cleanUrl, metadataData);
                return metadataData;
            }
            
        } catch (error) {
            devLog('Primary strategy failed, trying TikWM fallback:', error.message);
            // Fallback to TikWM only
            try {
                const fallbackData = await this.fetchMetadata(cleanUrl);
                fallbackData.metadata = {
                    ...fallbackData.metadata,
                    downloadMode: 'fallback',
                    source: 'tikwm_fallback',
                    note: 'Fallback mode: TikWM only with proxy attempts'
                };
                this.saveToCache(cleanUrl, fallbackData);
                return fallbackData;
            } catch (fallbackError) {
                devLog('All methods failed:', fallbackError.message);
                throw new Error(fallbackError.message || ERROR_MESSAGES.API_ERROR);
            }
        }
    }

    /**
     * Fetch metadata from TikWM (direct API calls only)
     */
    async fetchMetadata(url) {
        await this.waitForRateLimit();
        
        // Try TikWM directly for metadata
        try {
            devLog('Fetching metadata from TikWM...');
            return await this.fetchFromTikWM(url);
        } catch (error) {
            devWarn('TikWM metadata failed:', error.message);
            throw new Error('TikWM metadata API failed');
        }
    }

    /**
     * Fetch download links from TikVid proxy
     */
    async fetchDownloadLinks(url) {
        await this.waitForRateLimit();
        
        try {
            devLog('Fetching download links from TikVid proxy...');
            return await this.fetchFromTikVidProxy(url);
        } catch (error) {
            devWarn('TikVid proxy failed:', error.message);
            throw new Error('TikVid download API failed');
        }
    }

    /**
     * Fallback method using TikWM only when TikVid proxy fails
     */
    async tryFallbackAPIs(url) {
        try {
            devLog('Trying TikWM-only as fallback...');
            const data = await retryAsync(() => this.fetchFromTikWM(url), 2, 1000);
            
            devLog('Got metadata from TikWM fallback, basic download links available');
            return {
                ...data,
                metadata: {
                    ...data.metadata,
                    source: 'tikwm_fallback',
                    note: 'TikVid proxy unavailable, using TikWM basic downloads'
                }
            };
        } catch (error) {
            devWarn('TikWM fallback failed:', error.message);
            throw new Error('All API methods failed');
        }
    }

    /**
     * Fetch from TikWM API (for metadata) - direct calls only
     */
    async fetchFromTikWM(url) {
        const requestUrl = `${API_CONFIG.METADATA_APIS.TIKWM.url}${encodeURIComponent(url)}`;
        
            const response = await withTimeout(
                fetch(requestUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }),
                API_CONFIG.TIMEOUT
            );

            if (!response.ok) {
                throw new Error(`TikWM API error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.code === 0) {
                return this.normalizeTikwmData(result.data);
            } else {
                throw new Error(result.msg || 'TikWM API returned error');
            }
    }

    /**
     * Fetch from TikVid proxy server
     */
    async fetchFromTikVidProxy(url) {
        const requestUrl = `${API_CONFIG.DOWNLOAD_APIS.TIKVID_PROXY.url}${encodeURIComponent(url)}`;
        
        devLog(`Using TikVid proxy: ${requestUrl}`);
        
        const response = await withTimeout(
            fetch(requestUrl, {
                method: 'GET',
                headers: API_CONFIG.HEADERS.TIKVID_PROXY
            }),
            API_CONFIG.TIMEOUT
        );

        if (!response.ok) {
            throw new Error(`TikVid proxy API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            return this.normalizeTikVidData(result.data);
        } else {
            throw new Error(result.message || 'TikVid proxy API returned error');
        }
    }





    /**
     * Enhanced error handling with CORS detection and retry logic
     */
    handleApiError(error, apiName, url) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('cors') || 
            errorMessage.includes('blocked') || 
            errorMessage.includes('access to fetch') ||
            errorMessage.includes('cross-origin')) {
            devWarn(`${apiName} blocked by CORS policy`);
            this.markApiAsFailed(apiName, 'cors');
            throw new Error(`CORS_BLOCKED`);
        }
        
        if (errorMessage.includes('networkerror') || 
            errorMessage.includes('failed to fetch') ||
            errorMessage.includes('fetch error')) {
            devWarn(`${apiName} network connection failed`);
            this.markApiAsFailed(apiName, 'network');
            throw new Error(`NETWORK_ERROR`);
        }

        if (errorMessage.includes('timeout') || 
            errorMessage.includes('aborted')) {
            devWarn(`${apiName} request timed out`);
            this.markApiAsFailed(apiName, 'timeout');
            throw new Error(`TIMEOUT_ERROR`);
        }

        if (error.name === 'TypeError' && errorMessage.includes('fetch')) {
            devWarn(`${apiName} fetch type error - likely CORS or network issue`);
            this.markApiAsFailed(apiName, 'fetch_error');
            throw new Error(`FETCH_ERROR`);
        }
        
        // Log unknown errors for debugging
        devWarn(`${apiName} unknown error:`, error);
        throw error;
    }

    /**
     * Mark API as failed for health tracking
     */
    markApiAsFailed(apiName, reason) {
        const now = Date.now();
        this.failedApis.add(apiName);
        this.apiHealthCheck.set(apiName, {
            lastFailed: now,
            reason: reason,
            failCount: (this.apiHealthCheck.get(apiName)?.failCount || 0) + 1
        });
        
        // Remove from failed list after 5 minutes
        setTimeout(() => {
            this.failedApis.delete(apiName);
        }, 5 * 60 * 1000);
    }

    /**
     * Check if API is healthy
     */
    isApiHealthy(apiName) {
        if (this.failedApis.has(apiName)) {
            const health = this.apiHealthCheck.get(apiName);
            if (health && Date.now() - health.lastFailed < 5 * 60 * 1000) {
                devLog(`${apiName} marked as unhealthy: ${health.reason}`);
                return false;
            }
        }
        return true;
    }



    // REMOVED: parseBackupApiData - not needed with TikVid proxy strategy




    

    

    

    


    /**
     * Get best video URL with quality preference
     */
    getBestVideoUrl(data, preferHD = false) {
        if (!data) return null;
        
        // Priority order based on preference
        if (preferHD) {
            // For HD preference: hdplay > wmplay > play
            if (data.hdplay && data.hdplay !== data.play) {
                devLog('Using HD URL:', data.hdplay);
                return data.hdplay;
            }
            if (data.wmplay && data.wmplay !== data.play) {
                devLog('Using watermark-free URL:', data.wmplay);
                return data.wmplay;
            }
        } else {
            // For standard preference: wmplay > play > hdplay
            if (data.wmplay && data.wmplay !== data.play) {
                devLog('Using watermark-free URL:', data.wmplay);
                return data.wmplay;
            }
        }
        
        // Always fallback to standard play URL
        if (data.play) {
            devLog('Using standard play URL:', data.play);
            return data.play;
        }
        
        return null;
    }

    /**
     * Utility methods for API management
     */
    
    // Clean URL for consistent caching
    cleanUrl(url) {
        try {
            const urlObj = new URL(url);
            // Remove tracking parameters
            const paramsToRemove = ['_r', 'u_code', 'preview_pb', 'is_copy_url'];
            paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    // Cache management
    getFromCache(url) {
        const cached = this.requestCache.get(url);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        if (cached) {
            this.requestCache.delete(url); // Remove expired cache
        }
        return null;
    }

    saveToCache(url, data) {
        this.requestCache.set(url, {
            data: data,
            timestamp: Date.now()
        });
        
        // Cleanup old cache entries if too many
        if (this.requestCache.size > 50) {
            const firstKey = this.requestCache.keys().next().value;
            this.requestCache.delete(firstKey);
        }
    }

    // Parse download links from DOM
    parseDownloadLinks(doc) {
        const downloadLinks = doc.querySelectorAll('.dl-action a, .download-items__btn a, .download-link');
        const videoLinks = [];
        const audioLinks = [];

        downloadLinks.forEach(link => {
            const href = link.href;
            const text = link.textContent.toLowerCase();
            
            if (text.includes('video') || text.includes('mp4')) {
                // Check for video conversion data
                const audioUrl = link.getAttribute('data-audioUrl');
                const imageData = link.getAttribute('data-imageData');
                
                if (audioUrl) {
                    videoLinks.push({
                        url: href,
                        audioUrl: audioUrl,
                        imageData: imageData,
                        type: 'video'
                    });
                } else {
                    videoLinks.push(href);
                }
            } else if (text.includes('mp3') || text.includes('audio')) {
                audioLinks.push(href);
            }
        });

        // Extract direct image URLs from thumbnails
        const imageElements = doc.querySelectorAll('.download-items__thumb img, .image-gallery img');
        const images = Array.from(imageElements)
            .map(img => img.src)
            .filter(src => src && (src.includes('tiktokcdn') || src.includes('muscdn')));

        return { videoLinks, audioLinks, images };
    }

    // REMOVED: Legacy HTML parsing methods - using TikVid proxy instead

    // Normalize data from different APIs
    normalizeApiData({ title, cover, videoLinks, audioLinks, images, originalUrl, tikTokId, conversionData, downloadLinks, mp3DownloadUrl, contentType }) {
        const isPhotoSlideshow = images && images.length > 0;
        
        // Handle video links that might be objects with additional data
        const playUrl = Array.isArray(videoLinks) && videoLinks.length > 0 
            ? (typeof videoLinks[0] === 'object' ? videoLinks[0].url : videoLinks[0])
            : '';
            
        // Enhanced HD video URL detection
        let hdUrl = playUrl; // Default to standard quality
        
        // Method 1: Look for HD indicators in downloadLinks
        if (downloadLinks && Array.isArray(downloadLinks) && downloadLinks.length > 0) {
            // Priority order for HD detection
            const hdPatterns = [
                /-hd\.mp4/i,           // Explicit HD marker
                /_original\.mp4/i,      // Original quality
                /original/i,            // Contains "original"
                /1080p/i,              // 1080p quality
                /720p/i,               // 720p quality
                /high/i,               // High quality
                /hd/i                  // General HD marker
            ];
            
            for (const pattern of hdPatterns) {
                const hdLink = downloadLinks.find(link => 
                    typeof link === 'string' && pattern.test(link)
                );
                if (hdLink) {
                    hdUrl = hdLink;
                    devLog(`Found HD video with pattern ${pattern}: ${hdLink.substring(0, 50)}...`);
                    break;
                }
            }
            
            // If no HD patterns found, check if we have multiple video links
            if (hdUrl === playUrl && downloadLinks.length > 1) {
                const videoLinks = downloadLinks.filter(link => 
                    typeof link === 'string' && 
                    (link.includes('.mp4') || link.includes('video') || link.includes('tiktokcdn'))
                );
                
                if (videoLinks.length > 1) {
                    // Assume the second video link might be higher quality
                    hdUrl = videoLinks[1];
                    devLog(`Using second video link as HD: ${hdUrl.substring(0, 50)}...`);
                }
            }
        }
        
        // Method 2: Check if videoLinks array has multiple entries with quality info
        if (Array.isArray(videoLinks) && videoLinks.length > 1) {
            for (const videoLink of videoLinks) {
                if (typeof videoLink === 'object' && videoLink.quality) {
                    if (videoLink.quality.toLowerCase().includes('hd') || 
                        videoLink.quality.toLowerCase().includes('high') ||
                        videoLink.quality.includes('1080') ||
                        videoLink.quality.includes('720')) {
                        hdUrl = videoLink.url;
                        devLog(`Found HD video from videoLinks: ${videoLink.quality}`);
                        break;
                    }
                }
            }
        }
            
        const audioUrl = Array.isArray(audioLinks) && audioLinks.length > 0 
            ? audioLinks[0] 
            : (Array.isArray(videoLinks) && videoLinks.length > 0 && typeof videoLinks[0] === 'object' 
                ? videoLinks[0].audioUrl 
                : '');
        
        return {
            id: tikTokId || '',
            title: title || 'TikTok Video',
            cover: cover || '',
            origin_cover: cover || '',
            ai_dynamic_cover: cover || '',
            play: playUrl,
            hdplay: hdUrl,
            wmplay: hdUrl,
            music: audioUrl,
            size: 0,
            wm_size: 0,
            duration: 0,
            region: 'Global',
            play_count: 0,
            digg_count: 0,
            comment_count: 0,
            share_count: 0,
            collect_count: 0,
            download_count: 0,
            create_time: Math.floor(Date.now() / 1000),
            images: isPhotoSlideshow ? images : [],
            tikTokId: tikTokId || '',
            conversionData: conversionData || {},
            videoLinks: videoLinks || [], // Keep original structure for advanced usage
            audioLinks: audioLinks || [],
            downloadLinks: downloadLinks || [],
            mp3DownloadUrl: mp3DownloadUrl || '',
            contentType: contentType || (isPhotoSlideshow ? 'photo_slideshow' : 'video'),
            isPhotoSlideshow: isPhotoSlideshow,
            isVideo: !!playUrl,
            author: {
                id: '',
                nickname: 'TikTok User',
                unique_id: 'tiktokuser',
                avatar: ''
            },
            music_info: audioUrl ? {
                id: 'music_1',
                title: 'Original Sound',
                author: title || 'TikTok User',
                play: audioUrl,
                cover: cover || '',
                duration: 0
            } : null,
            // Enhanced metadata
            metadata: {
                totalImages: images ? images.length : 0,
                totalDownloadLinks: downloadLinks ? downloadLinks.length : 0,
                hasAudio: !!audioUrl,
                hasVideo: !!playUrl,
                hasMp3Download: !!mp3DownloadUrl,
                originalUrl: originalUrl || ''
            }
        };
    }

    /**
     * Normalize Tikwm API data (Enhanced with HD support)
     */
    normalizeTikwmData(data) {
        // Enhanced HD video detection for TikWM
        let hdVideoUrl = data.hdplay || data.play || '';
        let standardVideoUrl = data.play || '';
        
        // If TikWM provides multiple video qualities, prioritize HD
        if (data.hdplay && data.play && data.hdplay !== data.play) {
            hdVideoUrl = data.hdplay;
            standardVideoUrl = data.play;
            devLog('TikWM provided separate HD and standard quality videos');
        }
        
        // Check if we have watermark-free version
        let wmFreeUrl = data.wmplay || hdVideoUrl;
        
        return {
            id: data.id || '',
            title: data.title || 'TikTok Video',
            cover: data.cover || '',
            origin_cover: data.origin_cover || data.cover || '',
            ai_dynamic_cover: data.ai_dynamic_cover || data.cover || '',
            play: standardVideoUrl,
            hdplay: hdVideoUrl,
            wmplay: wmFreeUrl,
            music: data.music || '',
            size: data.size || 0,
            wm_size: data.wm_size || 0,
            duration: data.duration || 0,
            region: data.region || 'Global',
            play_count: data.play_count || 0,
            digg_count: data.digg_count || 0,
            comment_count: data.comment_count || 0,
            share_count: data.share_count || 0,
            download_count: data.download_count || 0,
            collect_count: data.collect_count || 0,
            create_time: data.create_time || Math.floor(Date.now() / 1000),
            author: data.author || {
                id: '',
                unique_id: 'tiktokuser',
                nickname: 'TikTok User',
                avatar: ''
            },
            music_info: data.music_info || (data.music && data.music !== '#' ? {
                id: data.music_info?.id || data.id || 'music_1',
                title: data.music_info?.title || 'Original Sound',
                author: data.music_info?.author || data.author?.nickname || 'TikTok User',
                play: data.music_info?.play || data.music,
                cover: data.music_info?.cover || data.cover || '',
                duration: data.music_info?.duration || 0,
                original: data.music_info?.original || false
            } : null),
            images: data.images || [],
            // Additional metadata
            tikTokId: data.id || '',
            isPhotoSlideshow: (data.images && data.images.length > 0),
            downloadLinks: [],
            conversionData: {},
            // Video quality metadata
            metadata: {
                hasHDVideo: !!(hdVideoUrl && hdVideoUrl !== standardVideoUrl),
                hasWatermarkFree: !!(wmFreeUrl && wmFreeUrl !== standardVideoUrl),
                videoQualities: {
                    standard: standardVideoUrl,
                    hd: hdVideoUrl,
                    watermarkFree: wmFreeUrl
                },
                source: 'tikwm'
            }
        };
    }

    /**
     * Normalize TikVid proxy data
     */
    normalizeTikVidData(data) {
        // Extract video downloads (multiple qualities)
        const videoDownloads = data.downloads?.filter(d => d.type === 'video') || [];
        const audioDownloads = data.downloads?.filter(d => d.type === 'audio') || [];
        
        // Organize video qualities
        const videoQualities = {};
        videoDownloads.forEach(video => {
            if (video.quality.includes('HD')) {
                videoQualities.hd = video.url;
            } else if (video.quality.includes('[1]')) {
                videoQualities.standard = video.url;
            } else if (video.quality.includes('[2]')) {
                videoQualities.watermarkFree = video.url;
            }
        });
        
        return {
            id: data.id || '',
            title: data.title || 'TikTok Video',
            cover: data.thumbnail || data.poster || '',
            contentType: data.contentType || 'video',
            videoPreview: data.videoPreview || '',
            
            // Download links from TikVid
            downloads: data.downloads || [],
            directVideoLinks: data.directVideoLinks || [],
            downloadCount: data.downloadCount || 0,
            
            // Image slideshow data
            photoList: data.photoList || [],
            photoCount: data.photoCount || 0,
            convertVideoData: data.convertVideoData || null,
            
            // TikVid specific data
            scriptVars: data.scriptVars || {},
            adsInfo: data.adsInfo || {},
            
            // Organized download links
            videoQualities: videoQualities,
            audioUrl: audioDownloads.length > 0 ? audioDownloads[0].url : '',
            
            metadata: {
                ...data.metadata,
                source: 'tikvid',
                hasDownloads: (data.downloads && data.downloads.length > 0),
                hasPhotos: (data.photoList && data.photoList.length > 0)
            }
        };
    }

    /**
     * Combine metadata from TikWM with download links from TikVid
     */
    combineMetadataAndDownloads(tikwmData, tikvidData, originalUrl) {
        // Use TikWM as base (has all the metadata, stats, author info)
        const combined = { ...tikwmData };
        
        // Preserve original TikWM URLs for preview (can be played in browser)
        const originalTikwmUrls = {
            play: tikwmData.play,
            hdplay: tikwmData.hdplay,
            wmplay: tikwmData.wmplay,
            music: tikwmData.music
        };
        
        // Keep original URLs for preview purposes - don't override with TikVid URLs
        // TikVid URLs are auto-download, TikWM URLs can be previewed
        devLog('Preserving TikWM URLs for preview:', originalTikwmUrls);
        
        // Store TikVid URLs separately for download purposes only
        const tikvidUrls = {};
        if (tikvidData.downloads && tikvidData.downloads.length > 0) {
            const videoDownloads = tikvidData.downloads.filter(d => d.type === 'video');
            const audioDownloads = tikvidData.downloads.filter(d => d.type === 'audio');
            
            if (videoDownloads.length > 0) {
                // Find HD video
                const hdVideo = videoDownloads.find(v => v.quality.includes('HD'));
                const standardVideo = videoDownloads.find(v => v.quality.includes('[1]'));
                const watermarkFreeVideo = videoDownloads.find(v => v.quality.includes('[2]'));
                
                if (hdVideo) tikvidUrls.hdplay = hdVideo.url;
                if (standardVideo) tikvidUrls.play = standardVideo.url;
                if (watermarkFreeVideo) tikvidUrls.wmplay = watermarkFreeVideo.url;
            }
            
            if (audioDownloads.length > 0) {
                tikvidUrls.music = audioDownloads[0].url;
            }
        }
        
        // Add TikVid-specific data including download URLs
        combined.tikvidData = {
            downloads: tikvidData.downloads || [],
            directVideoLinks: tikvidData.directVideoLinks || [],
            downloadCount: tikvidData.downloadCount || 0,
            photoList: tikvidData.photoList || [],
            photoCount: tikvidData.photoCount || 0,
            convertVideoData: tikvidData.convertVideoData || null,
            scriptVars: tikvidData.scriptVars || {},
            videoPreview: tikvidData.videoPreview || '',
            // Store TikVid download URLs separately
            downloadUrls: tikvidUrls
        };
        
        // Store original TikWM URLs for preview
        combined.originalUrls = originalTikwmUrls;
        
        // Enhanced music_info creation - prioritize TikWM music_info, then create from TikVid audio
        if (tikwmData.music_info && tikwmData.music_info.play) {
            // Use original TikWM music_info if available (has full metadata)
            combined.music_info = {
                id: tikwmData.music_info.id || tikvidData.id || 'music_1',
                title: tikwmData.music_info.title || 'Original Sound',
                author: tikwmData.music_info.author || combined.author?.nickname || 'TikTok User',
                play: tikwmData.music_info.play,
                cover: tikwmData.music_info.cover || combined.cover || tikvidData.thumbnail || '',
                duration: tikwmData.music_info.duration || 0,
                original: tikwmData.music_info.original || false
            };
            devLog('✅ Using TikWM music_info:', tikwmData.music_info.title);
        } else if (tikvidData.downloads && tikvidData.downloads.find(d => d.type === 'audio')) {
            // Create music_info from TikVid audio download
            const audioDownload = tikvidData.downloads.find(d => d.type === 'audio');
            combined.music_info = {
                id: tikvidData.id || 'music_1',
                title: combined.title || tikvidData.title || 'Background Music',
                author: combined.author?.nickname || 'TikTok User',
                play: audioDownload.url,
                cover: combined.cover || tikvidData.thumbnail || tikvidData.poster || '',
                duration: 0,
                quality: audioDownload.quality || 'MP3'
            };
            devLog('✅ Created music_info from TikVid audio download:', audioDownload.quality);
        } else {
            // Last fallback to basic audio URL
            const bestAudioUrl = tikvidUrls.music || originalTikwmUrls.music;
            if (bestAudioUrl && bestAudioUrl !== '#') {
                combined.music_info = {
                    id: tikvidData.id || 'music_1',
                    title: combined.title || 'Original Sound',
                    author: combined.author?.nickname || 'TikTok User',
                    play: bestAudioUrl,
                    cover: combined.cover || tikvidData.thumbnail || '',
                    duration: 0
                };
                devLog('✅ Created basic music_info with audio URL');
            } else {
                combined.music_info = null;
                devLog('❌ No valid audio source found for music_info');
            }
        }
        
        // Handle image slideshows
        if (tikvidData.photoList && tikvidData.photoList.length > 0) {
            combined.images = tikvidData.photoList.map(photo => photo.thumbnail);
            combined.isPhotoSlideshow = true;
            combined.tikvidData.imageDownloadLinks = tikvidData.photoList.map(photo => ({
                thumbnail: photo.thumbnail,
                downloadUrl: photo.downloadUrl,
                index: photo.index
            }));
        }
        
        // Update metadata
        combined.metadata = {
            ...combined.metadata,
            source: 'hybrid_tikwm_tikvid',
            hasHighQualityDownloads: !!(tikvidData.downloads && tikvidData.downloads.length > 0),
            originalUrl: originalUrl,
            combinedAt: new Date().toISOString()
        };
        
        devLog(`Combined data: TikWM metadata + TikVid downloads (${tikvidData.downloads?.length || 0} download links)`);
        
        return combined;
    }





    // REMOVED: Legacy normalization and enhancement methods - using TikVid proxy strategy







    // Clear cache
    clearCache() {
        this.requestCache.clear();
    }

    // Legacy compatibility
    isValidTikTokUrl(url) {
        return isValidTikTokUrl(url);
    }
}
