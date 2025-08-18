/**
 * Application Constants
 * Centralized configuration and constants
 */

// API Configuration - Proxy Strategy: TikWM for metadata + TikVid proxy for downloads
export const API_CONFIG = {
    // TikWM: Primary source for metadata
    METADATA_APIS: {
        TIKWM: {
            url: "https://www.tikwm.com/api/?url=",
            priority: 1,
            purpose: "TikTok metadata (title, author, stats, cover, basic video/audio URLs)"
        }
    },
    
    // TikVid: High-quality downloads via Vercel API
    DOWNLOAD_APIS: {
        TIKVID_PROXY: {
            url: "https://cors-kimizk.vercel.app/api/proxy?url=",
            priority: 1,
            purpose: "High-quality video/audio/image downloads via Vercel serverless API",
            enabled: true // Enabled for proxy downloads
        }
    },
    
    // Download proxy for TikVid download URLs
    DOWNLOAD_PROXY: {
        TIKVID_DOWNLOAD: {
            url: "https://cors-kimizk.vercel.app/api/download?url=",
            purpose: "Proxy TikVid download URLs to bypass CORS via Vercel",
            enabled: true // Enabled for proxy downloads
        }
    },
    
    TIMEOUT: 15000,
    MAX_RETRIES: 3,
    
    // Rate limiting configuration
    RATE_LIMIT: {
        MIN_INTERVAL: 2000, // 2 seconds between requests
        MAX_REQUESTS_PER_MINUTE: 30,
        BURST_LIMIT: 5 // Max 5 requests in burst
    },
    
    // Request headers for different APIs
    HEADERS: {
        TIKWM: {
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
        },
        TIKVID_PROXY: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
};

// Validation Patterns
export const VALIDATION = {
    TIKTOK_DOMAINS: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
    URL_PATTERN: /^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\//i
};

// File Extensions and Types
export const FILE_TYPES = {
    VIDEO: {
        EXTENSIONS: ['.mp4', '.avi', '.mov'],
        MIME_TYPES: ['video/mp4', 'video/avi', 'video/quicktime']
    },
    AUDIO: {
        EXTENSIONS: ['.mp3', '.wav', '.aac'],
        MIME_TYPES: ['audio/mpeg', 'audio/wav', 'audio/aac']
    },
    IMAGE: {
        EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
        MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp']
    }
};

// UI Configuration
export const UI_CONFIG = {
    TOAST_DURATION: 2000,
    LOADING_DELAY: 300,
    ANIMATION_DURATION: 300,
    MAX_TOASTS: 5,
    DEBOUNCE_DELAY: 300
};

// Download Configuration - Proxy Optimized
export const DOWNLOAD_CONFIG = {
    MAX_RETRIES: 3, // Standard retries for proxy downloads
    RETRY_DELAY: 1000,
    CONCURRENT_DOWNLOADS: 3,
    CHUNK_SIZE: 1024 * 1024, // 1MB
    TIMEOUT: 30000,
    // Proxy download preferences
    PREFER_PROXY_DOWNLOADS: true,
    FALLBACK_TO_DIRECT: true, // Enable direct fallback when proxy fails
    USE_BLOB_DOWNLOADS: true,
    MOBILE_COMPATIBLE: true
};

// Error Messages
export const ERROR_MESSAGES = {
    INVALID_URL: 'Vui lòng nhập link TikTok hợp lệ',
    NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng thử lại.',
    API_ERROR: 'Không thể tải thông tin video từ API',
    DOWNLOAD_ERROR: 'Không thể tải xuống qua API. Vui lòng thử lại sau.',
    CORS_ERROR: 'Lỗi CORS. Đang thử phương thức khác...',
    TIMEOUT_ERROR: 'Hết thời gian chờ. Vui lòng thử lại.',
    UNKNOWN_ERROR: 'Đã xảy ra lỗi không mong muốn',
    PROXY_DOWNLOAD_FALLBACK: 'Vercel API không hoạt động. Đang thử tải trực tiếp...'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    URL_PASTED: 'Đã dán link thành công!',
    DATA_LOADED: 'Tải thông tin thành công!',
    DOWNLOAD_STARTED: 'Đang tải xuống qua API...',
    DOWNLOAD_COMPLETED: 'Tải xuống hoàn thành!',
    DOWNLOAD_PROXY: 'Đang tải qua TikVid Vercel API...',
    VIDEO_READY: 'Video đã sẵn sàng!',
    THEME_CHANGED_DARK: 'Đã chuyển sang giao diện tối',
    THEME_CHANGED_LIGHT: 'Đã chuyển sang giao diện sáng'
};

// Warning Messages
export const WARNING_MESSAGES = {
    NO_CLIPBOARD_URL: 'Không tìm thấy link TikTok hợp lệ trong bảng nhớ tạm',
    PARTIAL_DOWNLOAD: 'Một số file không thể tải xuống',
    QUALITY_LIMITED: 'Chất lượng video có thể bị giới hạn',
    SLOW_CONNECTION: 'Kết nối chậm. Quá trình tải có thể mất thời gian.'
};

// Theme Configuration
export const THEME_CONFIG = {
    STORAGE_KEY: 'theme',
    DEFAULT_THEME: 'light',
    THEMES: ['light', 'dark']
};

// Event Names
export const EVENTS = {
    URL_INPUT: 'urlInput',
    URL_PASTED: 'urlPasted',
    DOWNLOAD_REQUESTED: 'downloadRequested',
    DATA_CLEARED: 'dataCleared',
    SHOW_TOAST: 'showToast',
    SHOW_LOADING: 'showLoading',
    HIDE_LOADING: 'hideLoading',
    UPDATE_LOADING_TEXT: 'updateLoadingText',
    THEME_CHANGED: 'themeChanged'
};

// DOM Element IDs (for better maintainability)
export const ELEMENT_IDS = {
    // Form elements
    DOWNLOAD_FORM: 'downloadForm',
    TIKTOK_URL: 'tiktokUrl',
    DOWNLOAD_BTN: 'downloadBtn',
    PASTE_BTN: 'pasteBtn',
    CLEAR_BTN: 'clearBtn',
    
    // Content sections
    INFO_SECTION: 'infoSection',
    INFO_GRID: 'infoGrid',
    PREVIEW_SECTION: 'previewSection',
    VIDEO_PREVIEW: 'videoPreview',
    IMAGE_PREVIEW: 'imagePreview',
    
    // Preview elements
    VIDEO_THUMBNAIL: 'videoThumbnail',
    IMAGE_GALLERY: 'imageGallery',
    
    // Download buttons
    DOWNLOAD_VIDEO: 'downloadVideo',
    DOWNLOAD_VIDEO_HD: 'downloadVideoHD',
    DOWNLOAD_AUDIO: 'downloadAudio',
    DOWNLOAD_ALL_IMAGES: 'downloadAllImages',
    
    // Modal elements
    ERROR_MODAL: 'errorModal',
    ERROR_MESSAGE: 'errorMessage',
    CLOSE_ERROR_MODAL: 'closeErrorModal',
    RETRY_BTN: 'retryBtn',
    
    // UI elements
    LOADING_OVERLAY: 'loadingOverlay',
    TOAST_CONTAINER: 'toastContainer',
    THEME_TOGGLE: 'themeToggle',
    INFO_TOGGLE_BTN: 'infoToggleBtn'
};

// Regular Expressions
export const REGEX_PATTERNS = {
    TIKTOK_URL: /^https?:\/\/(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/.+/i,
    VIDEO_ID: /\/(\d+)/,
    USERNAME: /@([a-zA-Z0-9_.]+)/,
    FILENAME_SANITIZE: /[<>:"/\\|?*]/g
};

// Performance Configuration
export const PERFORMANCE_CONFIG = {
    LAZY_LOAD_THRESHOLD: '50px',
    IMAGE_QUALITY: 0.9,
    VIDEO_PRELOAD: 'metadata',
    INTERSECTION_THRESHOLD: 0.1
};

// Feature Flags
export const FEATURES = {
    ENABLE_SERVICE_WORKER: false,
    ENABLE_ANALYTICS: false,
    ENABLE_ERROR_REPORTING: true,
    ENABLE_PERFORMANCE_MONITORING: false,
    ENABLE_BACKUP_API: true,
    ENABLE_CANVAS_FALLBACK: true
};

// Development Configuration
export const DEV_CONFIG = {
    ENABLE_CONSOLE_LOGS: false, // Will be overridden by isDevelopment check
    ENABLE_PERFORMANCE_LOGS: false,
    MOCK_API_RESPONSES: false
};

// Utility function to check if in development
export const isDevelopment = () => {
    return window.location.hostname.includes('localhost') || 
           window.location.hostname.includes('127.0.0.1');
};

// Runtime configuration based on environment
if (isDevelopment()) {
    DEV_CONFIG.ENABLE_CONSOLE_LOGS = true;
    DEV_CONFIG.ENABLE_PERFORMANCE_LOGS = true;
}
