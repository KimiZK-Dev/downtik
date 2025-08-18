/**
 * Module Index
 * Central export point for all application modules
 */

// Core modules
export { TikTokDownloader } from './app.js';

// Feature modules
export { ThemeManager } from './theme.js';
export { UIManager } from './ui.js';
export { APIManager } from './api.js';
export { DisplayManager } from './display.js';
export { DownloadManager } from './download.js';

// Utility modules
export * from './constants.js';
export * from './utils.js';
export * from './validators.js';

// Sub-modules
export { VideoInfoRenderer } from './display/video-info.js';
export { VideoPreviewRenderer } from './display/video-preview.js';
export { ImageGalleryRenderer } from './display/image-gallery.js';
export { MediaDownloader } from './download/media-downloader.js';
export { ImageDownloader } from './download/image-downloader.js';

// Version info
export const VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();
