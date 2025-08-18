/**
 * Validation Module
 * Centralized validation logic for URLs, data, and user inputs
 */

import { VALIDATION, REGEX_PATTERNS, ERROR_MESSAGES } from './constants.js';
import { isNotEmpty, isDefined } from './utils.js';

// ===== URL VALIDATION =====

/**
 * Validate TikTok URL format and domain
 */
export const validateTikTokUrl = (url) => {
    const result = {
        isValid: false,
        error: null,
        cleanUrl: null
    };
    
    // Check if URL exists and is string
    if (!isDefined(url) || typeof url !== 'string') {
        result.error = ERROR_MESSAGES.INVALID_URL;
        return result;
    }
    
    // Clean and normalize URL
    const cleanUrl = url.trim();
    if (!isNotEmpty(cleanUrl)) {
        result.error = ERROR_MESSAGES.INVALID_URL;
        return result;
    }
    
    try {
        // Add protocol if missing
        let normalizedUrl = cleanUrl;
        if (!normalizedUrl.startsWith('http')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }
        
        const urlObj = new URL(normalizedUrl);
        
        // Check domain
        const hostname = urlObj.hostname.toLowerCase();
        const isValidDomain = VALIDATION.TIKTOK_DOMAINS.some(domain => 
            hostname === domain || hostname.endsWith('.' + domain)
        );
        
        if (!isValidDomain) {
            result.error = ERROR_MESSAGES.INVALID_URL;
            return result;
        }
        
        // Additional pattern check
        if (!REGEX_PATTERNS.TIKTOK_URL.test(normalizedUrl)) {
            result.error = ERROR_MESSAGES.INVALID_URL;
            return result;
        }
        
        result.isValid = true;
        result.cleanUrl = normalizedUrl;
        
    } catch (error) {
        result.error = ERROR_MESSAGES.INVALID_URL;
    }
    
    return result;
};

/**
 * Quick URL validation (boolean only)
 */
export const isValidTikTokUrl = (url) => {
    return validateTikTokUrl(url).isValid;
};

// ===== DATA VALIDATION =====

/**
 * Validate API response data structure
 */
export const validateApiResponse = (data) => {
    const result = {
        isValid: false,
        error: null,
        data: null
    };
    
    if (!isDefined(data)) {
        result.error = 'Không có dữ liệu từ API';
        return result;
    }
    
    // Check required fields for video data
    const requiredFields = ['title'];
    const hasRequiredFields = requiredFields.every(field => 
        isDefined(data[field]) && isNotEmpty(data[field])
    );
    
    if (!hasRequiredFields) {
        result.error = 'Dữ liệu video không đầy đủ';
        return result;
    }
    
    // Validate URLs if present
    if (data.play && !isValidUrl(data.play)) {
        result.error = 'Link video không hợp lệ';
        return result;
    }
    
    if (data.music && !isValidUrl(data.music)) {
        result.error = 'Link audio không hợp lệ';
        return result;
    }
    
    // Validate images array
    if (data.images && Array.isArray(data.images)) {
        const invalidImages = data.images.filter(img => !isValidUrl(img));
        if (invalidImages.length > 0) {
            result.error = 'Một số link hình ảnh không hợp lệ';
            return result;
        }
    }
    
    result.isValid = true;
    result.data = data;
    return result;
};

/**
 * Validate video data specifically
 */
export const validateVideoData = (data) => {
    const baseValidation = validateApiResponse(data);
    if (!baseValidation.isValid) {
        return baseValidation;
    }
    
    // Video specific validation
    if (!data.play && !data.hdplay) {
        baseValidation.error = 'Không tìm thấy link video';
        baseValidation.isValid = false;
        return baseValidation;
    }
    
    return baseValidation;
};

/**
 * Validate image slideshow data
 */
export const validateImageData = (data) => {
    const baseValidation = validateApiResponse(data);
    if (!baseValidation.isValid) {
        return baseValidation;
    }
    
    // Image specific validation
    if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
        baseValidation.error = 'Không tìm thấy hình ảnh';
        baseValidation.isValid = false;
        return baseValidation;
    }
    
    return baseValidation;
};

// ===== FILE VALIDATION =====

/**
 * Validate file URL for download
 */
export const validateDownloadUrl = (url, filename = '') => {
    const result = {
        isValid: false,
        error: null,
        type: null
    };
    
    if (!isDefined(url) || !isNotEmpty(url)) {
        result.error = 'URL tải xuống không hợp lệ';
        return result;
    }
    
    if (url === '#' || url === 'javascript:void(0)' || url === 'undefined' || url === 'null') {
        result.error = 'URL tải xuống không khả dụng';
        return result;
    }
    
    // Check for empty or placeholder URLs
    if (url.trim() === '' || url.toLowerCase() === 'null' || url.toLowerCase() === 'undefined') {
        result.error = 'URL tải xuống trống hoặc không hợp lệ';
        return result;
    }
    
    if (!isValidUrl(url)) {
        result.error = 'Format URL không hợp lệ';
        return result;
    }
    
    // Determine file type from filename or URL
    const fileType = determineFileType(url, filename);
    
    result.isValid = true;
    result.type = fileType;
    return result;
};

/**
 * Determine file type from URL or filename
 */
export const determineFileType = (url, filename = '') => {
    const checkString = (filename || url).toLowerCase();
    
    if (checkString.includes('.mp4') || checkString.includes('video')) {
        return 'video';
    }
    if (checkString.includes('.mp3') || checkString.includes('audio') || checkString.includes('music')) {
        return 'audio';
    }
    if (checkString.includes('.jpg') || checkString.includes('.jpeg') || 
        checkString.includes('.png') || checkString.includes('.webp') || 
        checkString.includes('image')) {
        return 'image';
    }
    
    return 'unknown';
};

// ===== INPUT VALIDATION =====

/**
 * Validate form input
 */
export const validateFormInput = (input, type = 'text') => {
    const result = {
        isValid: false,
        error: null,
        value: null
    };
    
    if (!isDefined(input)) {
        result.error = 'Vui lòng nhập dữ liệu';
        return result;
    }
    
    const value = typeof input === 'string' ? input.trim() : input;
    
    switch (type) {
        case 'url':
            return validateTikTokUrl(value);
            
        case 'text':
            if (!isNotEmpty(value)) {
                result.error = 'Vui lòng nhập văn bản';
                return result;
            }
            break;
            
        case 'number':
            if (isNaN(value) || value < 0) {
                result.error = 'Vui lòng nhập số hợp lệ';
                return result;
            }
            break;
            
        default:
            break;
    }
    
    result.isValid = true;
    result.value = value;
    return result;
};

// ===== UTILITY VALIDATION FUNCTIONS =====

/**
 * Generic URL validation
 */
export const isValidUrl = (url) => {
    if (!isDefined(url) || typeof url !== 'string') {
        return false;
    }
    
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Check if string is a valid HTTP(S) URL
 */
export const isValidHttpUrl = (url) => {
    if (!isValidUrl(url)) return false;
    
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
};

/**
 * Validate email format (basic)
 */
export const isValidEmail = (email) => {
    if (!isDefined(email) || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

/**
 * Validate filename for download
 */
export const isValidFilename = (filename) => {
    if (!isDefined(filename) || !isNotEmpty(filename)) {
        return false;
    }
    
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(filename)) {
        return false;
    }
    
    // Check length
    if (filename.length > 255) {
        return false;
    }
    
    return true;
};

// ===== CONTENT VALIDATION =====

/**
 * Validate image blob/file
 */
export const validateImageBlob = (blob) => {
    const result = {
        isValid: false,
        error: null,
        size: 0
    };
    
    if (!blob || !(blob instanceof Blob)) {
        result.error = 'Dữ liệu hình ảnh không hợp lệ';
        return result;
    }
    
    if (blob.size === 0) {
        result.error = 'File hình ảnh trống';
        return result;
    }
    
    // Check if it's an image MIME type
    if (!blob.type.startsWith('image/')) {
        result.error = 'File không phải là hình ảnh';
        return result;
    }
    
    result.isValid = true;
    result.size = blob.size;
    return result;
};

/**
 * Validate media blob/file
 */
export const validateMediaBlob = (blob, expectedType = 'any') => {
    const result = {
        isValid: false,
        error: null,
        size: 0,
        type: null
    };
    
    if (!blob || !(blob instanceof Blob)) {
        result.error = 'Dữ liệu media không hợp lệ';
        return result;
    }
    
    if (blob.size === 0) {
        result.error = 'File media trống';
        return result;
    }
    
    // Determine type
    if (blob.type.startsWith('video/')) {
        result.type = 'video';
    } else if (blob.type.startsWith('audio/')) {
        result.type = 'audio';
    } else if (blob.type.startsWith('image/')) {
        result.type = 'image';
    } else {
        result.type = 'unknown';
    }
    
    // Check expected type
    if (expectedType !== 'any' && result.type !== expectedType) {
        result.error = `Kiểu file không đúng. Mong đợi: ${expectedType}, nhận được: ${result.type}`;
        return result;
    }
    
    result.isValid = true;
    result.size = blob.size;
    return result;
};

// ===== SECURITY VALIDATION =====

/**
 * Basic XSS prevention for text content
 */
export const sanitizeText = (text) => {
    if (!isDefined(text) || typeof text !== 'string') {
        return '';
    }
    
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize HTML content
 */
export const validateHtmlContent = (html) => {
    const result = {
        isValid: false,
        error: null,
        sanitized: null
    };
    
    if (!isDefined(html) || typeof html !== 'string') {
        result.error = 'Nội dung HTML không hợp lệ';
        return result;
    }
    
    // Basic sanitization - remove script tags and event handlers
    let sanitized = html
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '');
    
    result.isValid = true;
    result.sanitized = sanitized;
    return result;
};

// ===== EXPORT VALIDATION PRESETS =====

/**
 * Validation presets for common use cases
 */
export const validationPresets = {
    tiktokUrl: (url) => validateTikTokUrl(url),
    downloadUrl: (url, filename) => validateDownloadUrl(url, filename),
    apiResponse: (data) => validateApiResponse(data),
    videoData: (data) => validateVideoData(data),
    imageData: (data) => validateImageData(data),
    formInput: (input, type) => validateFormInput(input, type)
};
