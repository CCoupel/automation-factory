/**
 * Automation Factory - Marketing Site JavaScript
 * Handles interactions, animations, and smooth navigation
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initMobileMenu();
    initSmoothScroll();
    initNavbarScroll();
    initAnimateOnScroll();
    initGalaxyTreeInteraction();
    initInstallationTabs();
    initCopyButtons();
    initFeatureTooltips();
    initFeatureLegend();
    initScreenshotSlideshow();
});

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');

    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            document.body.classList.toggle('menu-open');
        });

        // Close menu when clicking on a link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', function() {
                document.body.classList.remove('menu-open');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.navbar') && document.body.classList.contains('menu-open')) {
                document.body.classList.remove('menu-open');
            }
        });
    }
}

/**
 * Smooth Scroll for Anchor Links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');

            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Navbar Background on Scroll
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        // Add/remove background opacity based on scroll
        if (currentScroll > 50) {
            navbar.style.background = 'rgba(15, 23, 42, 0.95)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.8)';
        }

        lastScroll = currentScroll;
    });
}

/**
 * Animate Elements on Scroll
 */
function initAnimateOnScroll() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Observe collab cards
    document.querySelectorAll('.collab-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Observe section headers
    document.querySelectorAll('.section-header').forEach(header => {
        header.style.opacity = '0';
        header.style.transform = 'translateY(20px)';
        header.style.transition = 'all 0.6s ease';
        observer.observe(header);
    });

    // Observe demo steps
    document.querySelectorAll('.demo-step').forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateX(-20px)';
        step.style.transition = `all 0.5s ease ${index * 0.15}s`;
        observer.observe(step);
    });

    // Observe galaxy features
    document.querySelectorAll('.galaxy-feature').forEach((feature, index) => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateX(-20px)';
        feature.style.transition = `all 0.5s ease ${index * 0.15}s`;
        observer.observe(feature);
    });
}

// Add CSS class for animated elements
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .animate-in {
            opacity: 1 !important;
            transform: translate(0, 0) !important;
        }
    </style>
`);

/**
 * Galaxy Tree Interaction (Demo)
 */
function initGalaxyTreeInteraction() {
    const treeItems = document.querySelectorAll('.tree-item.namespace');

    treeItems.forEach(item => {
        item.addEventListener('click', function() {
            const arrow = this.querySelector('.tree-arrow');
            const isExpanded = this.classList.contains('expanded');

            // Get all sibling role items
            let sibling = this.nextElementSibling;
            while (sibling && sibling.classList.contains('indent')) {
                if (isExpanded) {
                    sibling.style.display = 'none';
                } else {
                    sibling.style.display = 'flex';
                }
                sibling = sibling.nextElementSibling;
            }

            // Toggle expanded state
            this.classList.toggle('expanded');
            if (arrow) {
                arrow.textContent = isExpanded ? '▶' : '▼';
            }
        });
    });

    // Initialize: hide non-expanded items
    document.querySelectorAll('.tree-item.namespace:not(.expanded)').forEach(namespace => {
        let sibling = namespace.nextElementSibling;
        while (sibling && sibling.classList.contains('indent')) {
            sibling.style.display = 'none';
            sibling = sibling.nextElementSibling;
        }
    });
}

/**
 * Stats Counter Animation
 */
function animateStats() {
    const stats = document.querySelectorAll('.stat-value');

    stats.forEach(stat => {
        const text = stat.textContent;
        const hasPlus = text.includes('+');
        const hasComma = text.includes(',');
        const hasPercent = text.includes('%');

        // Parse the number
        let targetValue = parseInt(text.replace(/[^0-9]/g, ''));

        if (isNaN(targetValue)) return;

        let currentValue = 0;
        const duration = 2000;
        const increment = targetValue / (duration / 16);

        const updateCounter = () => {
            currentValue += increment;

            if (currentValue < targetValue) {
                let displayValue = Math.floor(currentValue);

                if (hasComma) {
                    displayValue = displayValue.toLocaleString();
                }

                stat.textContent = displayValue + (hasPlus ? '+' : '') + (hasPercent ? '%' : '');
                requestAnimationFrame(updateCounter);
            } else {
                stat.textContent = text; // Reset to original
            }
        };

        updateCounter();
    });
}

// Trigger stats animation when hero is visible
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateStats();
            heroObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    heroObserver.observe(heroStats);
}

/**
 * Installation Tabs
 */
function initInstallationTabs() {
    const tabs = document.querySelectorAll('.install-tab');
    const panels = document.querySelectorAll('.install-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab and corresponding panel
            this.classList.add('active');
            const targetPanel = document.getElementById(`${targetTab}-panel`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

/**
 * Copy Button Functionality
 */
function initCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');

    copyButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            const codeBlock = this.closest('.code-block');
            const code = codeBlock.querySelector('code');

            if (code) {
                // Get text content without HTML comments styling
                const textContent = code.textContent;

                try {
                    await navigator.clipboard.writeText(textContent);

                    // Show copied feedback
                    const originalText = this.textContent;
                    this.textContent = 'Copié !';
                    this.classList.add('copied');

                    setTimeout(() => {
                        this.textContent = originalText;
                        this.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            }
        });
    });
}

/**
 * Feature Tooltips - Show detailed description on click
 */
function initFeatureTooltips() {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'feature-tooltip';
    document.body.appendChild(tooltip);

    let hideTimeout;

    // Add click handlers to all feature items
    document.querySelectorAll('.version-features li[data-i18n-detail]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();

            const detailKey = this.getAttribute('data-i18n-detail');
            const lang = window.LanguageManager ? window.LanguageManager.currentLang : 'fr';
            const detail = window.translations && window.translations[lang]
                ? window.translations[lang][detailKey]
                : '';

            if (!detail) return;

            // Clear any pending hide
            clearTimeout(hideTimeout);

            // Position tooltip near the clicked element
            const rect = this.getBoundingClientRect();
            tooltip.textContent = detail;
            tooltip.classList.add('visible');

            // Calculate position
            const tooltipRect = tooltip.getBoundingClientRect();
            let left = rect.left;
            let top = rect.bottom + 8;

            // Adjust if tooltip goes off screen
            if (left + tooltipRect.width > window.innerWidth - 20) {
                left = window.innerWidth - tooltipRect.width - 20;
            }
            if (left < 20) left = 20;

            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';

            // Auto-hide after 3 seconds
            hideTimeout = setTimeout(() => {
                tooltip.classList.remove('visible');
            }, 3000);
        });
    });

    // Hide tooltip when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.version-features li[data-i18n-detail]')) {
            tooltip.classList.remove('visible');
        }
    });
}

/**
 * Feature Legend - Filter features by type
 */
function initFeatureLegend() {
    const legendItems = document.querySelectorAll('.legend-item');
    const featureItems = document.querySelectorAll('.version-features li');
    let activeFilter = null;

    legendItems.forEach(item => {
        item.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');

            // If clicking the same filter or "all", reset
            if (filter === 'all' || filter === activeFilter) {
                activeFilter = null;
                legendItems.forEach(li => li.classList.remove('active'));
                featureItems.forEach(fi => fi.classList.remove('filtered-out'));
                return;
            }

            // Set new filter
            activeFilter = filter;

            // Update legend UI
            legendItems.forEach(li => li.classList.remove('active'));
            this.classList.add('active');

            // Filter features
            featureItems.forEach(fi => {
                const featureType = fi.className.match(/feat-(\w+)/);
                if (featureType && featureType[1] === filter) {
                    fi.classList.remove('filtered-out');
                } else {
                    fi.classList.add('filtered-out');
                }
            });
        });
    });
}

/**
 * Screenshot Slideshow for Hero Section
 */
function initScreenshotSlideshow() {
    const slideshow = document.querySelector('.screenshot-slideshow');
    if (!slideshow) return;

    const slides = slideshow.querySelectorAll('.slide');
    const dotsContainer = slideshow.querySelector('.slide-dots');
    const prevBtn = slideshow.querySelector('.slide-btn.prev');
    const nextBtn = slideshow.querySelector('.slide-btn.next');

    let currentSlide = 0;
    let autoPlayInterval;
    const autoPlayDelay = 5000; // 5 seconds

    // Create dots
    slides.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'slide-dot' + (index === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.slide-dot');

    function goToSlide(index) {
        // Remove active class from current slide and dot
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');

        // Update current slide
        currentSlide = index;
        if (currentSlide >= slides.length) currentSlide = 0;
        if (currentSlide < 0) currentSlide = slides.length - 1;

        // Add active class to new slide and dot
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    // Event listeners
    if (prevBtn) prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoPlay();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoPlay();
    });

    // Auto-play
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, autoPlayDelay);
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    // Pause on hover
    slideshow.addEventListener('mouseenter', () => {
        clearInterval(autoPlayInterval);
    });

    slideshow.addEventListener('mouseleave', () => {
        startAutoPlay();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
            resetAutoPlay();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
            resetAutoPlay();
        }
    });

    // Start auto-play
    startAutoPlay();
}
