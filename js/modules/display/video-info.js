/**
 * Video Info Display Module
 * Handles the display of video information and metadata
 */

import { formatNumber, formatDate, formatDuration, getElementById } from '../utils.js';
import { ELEMENT_IDS } from '../constants.js';

export class VideoInfoRenderer {
    constructor() {
        this.infoGrid = null;
        this.infoSection = null;
        this.currentAudio = null;
        this.currentPlayButton = null;
    }

    /**
     * Initialize the video info renderer
     */
    init() {
        this.infoGrid = getElementById(ELEMENT_IDS.INFO_GRID);
        this.infoSection = getElementById(ELEMENT_IDS.INFO_SECTION);
    }

    /**
     * Render video information
     */
    render(data) {
        if (!data || !this.infoGrid) return;

        const content = this.generateInfoContent(data);
        this.infoGrid.innerHTML = content;
        
        this.showSection();
        this.setupMobileToggle();
    }

    /**
     * Generate the complete info content HTML
     */
    generateInfoContent(data) {
        const sections = [];
        
        // Author section
        if (data.author) {
            sections.push(this.generateAuthorSection(data.author, data.region));
        }
        
        // Info fields
        sections.push(this.generateInfoFields(data));
        
        // Music section
        if (data.music_info) {
            sections.push(this.generateMusicSection(data.music_info));
        }
        
        return sections.join('');
    }

    /**
     * Generate author information section
     */
    generateAuthorSection(author, region = null) {
        const countryFlag = this.getCountryFlag(region);
        
        return `
            <div class="author-card fade-in">
                <div class="author-avatar">
                    <img src="${author.avatar}" alt="${author.nickname}" 
                         onerror="this.src='${this.getDefaultAvatar()}'">
                </div>
                <div class="author-info">
                    <div class="author-name">${this.escapeHtml(author.nickname)}</div>
                    <div class="author-username">@${this.escapeHtml(author.unique_id)}</div>
                </div>
                ${countryFlag}
            </div>
        `;
    }

    /**
     * Generate info fields grid
     */
    generateInfoFields(data) {
        const fields = this.getInfoFields(data);
        
        return fields.map(field => {
            if (field.type === 'title') {
                return this.generateTitleField(field);
            }
            return this.generateRegularField(field);
        }).join('');
    }

    /**
     * Get array of info fields to display
     */
    getInfoFields(data) {
        return [
            {
                icon: 'fas fa-align-left',
                label: 'Tiêu đề',
                value: data.title || 'Không có tiêu đề',
                type: 'title'
            },
            {
                icon: 'fas fa-eye',
                label: 'Lượt xem',
                value: formatNumber(data.play_count),
                type: 'numeric'
            },
            {
                icon: 'fas fa-heart',
                label: 'Lượt thích',
                value: formatNumber(data.digg_count),
                type: 'numeric'
            },
            {
                icon: 'fas fa-comment',
                label: 'Bình luận',
                value: formatNumber(data.comment_count),
                type: 'numeric'
            },
            {
                icon: 'fas fa-share',
                label: 'Chia sẻ',
                value: formatNumber(data.share_count),
                type: 'numeric'
            },
            {
                icon: 'fas fa-bookmark',
                label: 'Lưu trữ',
                value: formatNumber(data.collect_count),
                type: 'numeric'
            },
            {
                icon: 'fas fa-download',
                label: 'Tải về',
                value: formatNumber(data.download_count),
                type: 'numeric'
            },
            {
                icon: 'fas fa-calendar',
                label: 'Ngày tạo',
                value: formatDate(data.create_time),
                type: 'text'
            },
            {
                icon: 'fas fa-clock',
                label: 'Thời lượng',
                value: formatDuration(data.duration),
                type: 'numeric'
            }
        ].filter(field => field.value && field.value !== 'N/A' && field.value !== '0');
    }

    /**
     * Generate title field HTML
     */
    generateTitleField(field) {
        return `
            <div class="info-item ${field.type}-item fade-in">
                <div class="info-header">
                    <div class="info-icon">
                        <i class="${field.icon}"></i>
                    </div>
                    <div class="info-label">${field.label}</div>
                </div>
                <div class="info-value" title="${this.escapeHtml(field.value)}">
                    ${this.escapeHtml(field.value)}
                </div>
            </div>
        `;
    }

    /**
     * Generate regular field HTML
     */
    generateRegularField(field) {
        return `
            <div class="info-item ${field.type}-item fade-in">
                <div class="info-icon">
                    <i class="${field.icon}"></i>
                </div>
                <div class="info-content">
                    <div class="info-label">${field.label}</div>
                    <div class="info-value" title="${this.escapeHtml(field.value)}">
                        ${this.escapeHtml(field.value)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate music section
     */
    generateMusicSection(musicInfo) {
        // Show quality badge if available (from TikVid)
        const qualityBadge = musicInfo.quality ? `<span class="quality-badge">${musicInfo.quality}</span>` : '';
        
        // Handle duration display
        const durationText = musicInfo.duration > 0 ? formatDuration(musicInfo.duration) : 'Unknown';
        
        return `
            <div class="music-card fade-in">
                <div class="music-header">
                    <i class="fas fa-music"></i>
                    <span>Nhạc nền</span>
                    ${qualityBadge}
                </div>
                <div class="music-content">
                    ${musicInfo.cover ? `
                    <div class="music-cover">
                        <img src="${musicInfo.cover}" alt="Music Cover"
                             onerror="this.style.display='none'">
                    </div>
                    ` : ''}
                    <div class="music-info">
                        <div class="music-title">${this.escapeHtml(musicInfo.title)}</div>
                        <div class="music-artist">by ${this.escapeHtml(musicInfo.author)}</div>
                        <div class="music-duration">${durationText}</div>
                    </div>
                    <div class="music-controls">
                        ${musicInfo.play && musicInfo.play !== '#' ? `
                        <button class="music-preview-btn" 
                                data-url="${musicInfo.play}" 
                                title="Nghe thử">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="music-download-btn" 
                                data-url="${musicInfo.play}" 
                                data-filename="music_${musicInfo.id || 'background'}.mp3"
                                title="Tải nhạc nền">
                            <i class="fas fa-download"></i>
                        </button>
                        ` : `
                        <button class="music-preview-btn disabled" 
                                title="Nhạc nền không khả dụng"
                                disabled>
                            <i class="fas fa-ban"></i>
                        </button>
                        <button class="music-download-btn disabled" 
                                title="Nhạc nền không khả dụng"
                                disabled>
                            <i class="fas fa-ban"></i>
                        </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show the info section with proper animation
     */
    showSection() {
        if (!this.infoSection) return;
        
        this.infoSection.style.display = 'block';
        this.infoSection.classList.add('fade-in');
    }

    /**
     * Setup mobile toggle functionality
     */
    setupMobileToggle() {
        if (!this.infoSection) return;
        
        const toggleBtn = getElementById(ELEMENT_IDS.INFO_TOGGLE_BTN);
        
        // Force recalculation on setup
        this.updateToggleForScreenSize();
        
        // Add resize listener for dynamic updates
        if (!this.resizeHandler) {
            this.resizeHandler = () => {
                // Debounce resize events
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    this.updateToggleForScreenSize();
                }, 150);
            };
            window.addEventListener('resize', this.resizeHandler);
        }
    }

    /**
     * Update toggle state based on screen size
     */
    updateToggleForScreenSize() {
        if (!this.infoSection) return;
        
        const toggleBtn = getElementById(ELEMENT_IDS.INFO_TOGGLE_BTN);
        const isMobile = window.innerWidth < 1024;
        
        if (isMobile) {
            // Mobile: collapsed by default, show toggle button
            this.infoSection.classList.add('collapsed');
            this.infoSection.classList.remove('expanded');
            
            if (toggleBtn) {
                toggleBtn.style.display = 'flex';
                toggleBtn.classList.remove('expanded');
                
                const toggleText = toggleBtn.querySelector('.toggle-text');
                if (toggleText) toggleText.textContent = 'Xem thêm';
                
                // Ensure toggle icon is correct
                const toggleIcon = toggleBtn.querySelector('.toggle-icon');
                if (toggleIcon) {
                    toggleIcon.classList.remove('fa-chevron-up');
                    toggleIcon.classList.add('fa-chevron-down');
                }
            }
        } else {
            // Desktop: always expanded, hide toggle button
            this.infoSection.classList.remove('collapsed');
            this.infoSection.classList.add('expanded');
            
            if (toggleBtn) {
                toggleBtn.style.display = 'none';
            }
        }
    }

    /**
     * Clear the info display
     */
    clear() {
        if (this.infoGrid) {
            this.infoGrid.innerHTML = '';
        }
        
        if (this.infoSection) {
            this.infoSection.style.display = 'none';
            this.infoSection.classList.remove('fade-in', 'collapsed', 'expanded');
        }
    }

    /**
     * Get default avatar SVG
     */
    getDefaultAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTIwIDEwQzE2LjY4NjMgMTAgMTQgMTIuNjg2MyAxNCAxNkMxNCAxOS4zMTM3IDE2LjY4NjMgMjIgMjAgMjJDMjMuMzEzNyAyMiAyNiAxOS4zMTM3IDI2IDE2QzI2IDEyLjY4NjMgMjMuMzEzNyAxMCAyMCAxMFoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTIwIDI2QzE0LjQ3NzIgMjYgMTAgMjguNDc3MiAxMCAzMi41VjM0SDE2SDE4VjMyLjVDMTggMzEuMTE5MyAxOC44OTU0IDMwIDIwIDMwQzIxLjEwNDYgMzAgMjIgMzEuMTE5MyAyMiAzMi41VjM0SDI0SDMwVjMyLjVDMzAgMjguNDc3MiAyNS41MjI4IDI2IDIwIDI2WiIgZmlsbD0iIzlDQTRBRiIvPgo8L3N2Zz4K';
    }

    /**
     * Get country flag HTML based on region code
     */
    getCountryFlag(region) {
        if (!region || typeof region !== 'string') {
            return '<div class="author-country-flag no-flag" title="Unknown region">?</div>';
        }

        const regionCode = region.toLowerCase();
        const flagPath = `flags/${regionCode}.svg`;
        const regionName = this.getRegionName(regionCode);

        return `
            <div class="author-country-flag" title="${regionName}">
                <img src="${flagPath}" 
                     alt="${regionName} flag" 
                     onerror="this.parentElement.className='author-country-flag no-flag'; this.parentElement.innerHTML='${regionCode.toUpperCase()}'; this.parentElement.title='${regionName}';">
            </div>
        `;
    }

    /**
     * Get human readable region name from region code
     */
    getRegionName(regionCode) {
        const regionNames = {
            'vn': 'Vietnam',
            'us': 'United States',
            'uk': 'United Kingdom',
            'jp': 'Japan',
            'kr': 'South Korea',
            'cn': 'China',
            'id': 'Indonesia',
            'th': 'Thailand',
            'ph': 'Philippines',
            'my': 'Malaysia',
            'sg': 'Singapore',
            'tw': 'Taiwan',
            'hk': 'Hong Kong',
            'in': 'India',
            'au': 'Australia',
            'ca': 'Canada',
            'fr': 'France',
            'de': 'Germany',
            'it': 'Italy',
            'es': 'Spain',
            'br': 'Brazil',
            'mx': 'Mexico',
            'ar': 'Argentina',
            'cl': 'Chile',
            'pe': 'Peru',
            'co': 'Colombia',
            'ru': 'Russia',
            'tr': 'Turkey',
            'eg': 'Egypt',
            'sa': 'Saudi Arabia',
            'ae': 'United Arab Emirates',
            'za': 'South Africa',
            'ng': 'Nigeria',
            'ke': 'Kenya',
            'ma': 'Morocco'
        };

        return regionNames[regionCode] || regionCode.toUpperCase();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
