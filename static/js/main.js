// ثلوثية الأعمال - Main JavaScript

// Global variables
let countdownIntervals = {};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize loading states
    initializeLoadingStates();
    
    // Initialize form validation
    initializeFormValidation();
    
    // Initialize countdown timers
    initializeCountdowns();
    
    // Initialize notifications
    initializeNotifications();
    
    // Initialize responsive features
    initializeResponsive();
}

// Tooltip initialization
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Loading states
function initializeLoadingStates() {
    // Show loading spinner for AJAX requests
    const loadingSpinner = document.createElement('div');
    loadingSpinner.id = 'globalLoadingSpinner';
    loadingSpinner.className = 'position-fixed top-50 start-50 translate-middle';
    loadingSpinner.style.zIndex = '9999';
    loadingSpinner.style.display = 'none';
    loadingSpinner.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">جاري التحميل...</span>
        </div>
    `;
    document.body.appendChild(loadingSpinner);
}

function showLoading() {
    const spinner = document.getElementById('globalLoadingSpinner');
    if (spinner) {
        spinner.style.display = 'block';
    }
}

function hideLoading() {
    const spinner = document.getElementById('globalLoadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            form.classList.add('was-validated');
        }, false);
    });
    
    // Real-time validation for specific fields
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(function(input) {
        input.addEventListener('blur', function() {
            validateEmail(this);
        });
    });
    
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(function(input) {
        input.addEventListener('input', function() {
            formatPhoneNumber(this);
        });
        
        input.addEventListener('blur', function() {
            validatePhoneNumber(this);
        });
    });
}

function validateEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(input.value);
    
    if (input.value && !isValid) {
        input.setCustomValidity('يرجى إدخال بريد إلكتروني صحيح');
        input.classList.add('is-invalid');
    } else {
        input.setCustomValidity('');
        input.classList.remove('is-invalid');
        if (input.value) {
            input.classList.add('is-valid');
        }
    }
}

function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    // Format Saudi phone numbers
    if (value.startsWith('966')) {
        value = '+' + value;
    } else if (value.startsWith('05')) {
        value = '+966' + value.substring(1);
    } else if (value.startsWith('5') && value.length === 9) {
        value = '+966' + value;
    } else if (value.length > 0 && !value.startsWith('+')) {
        value = '+' + value;
    }
    
    input.value = value;
}

function validatePhoneNumber(input) {
    // Accept multiple Saudi phone number formats
    const phoneRegex = /^(\+966[5-9]\d{8}|05\d{8}|5\d{8})$/;
    const isValid = phoneRegex.test(input.value);
    
    if (input.value && !isValid) {
        input.setCustomValidity('يرجى إدخال رقم جوال صحيح (مثال: 05xxxxxxxx أو 966xxxxxxxxx)');
        input.classList.add('is-invalid');
    } else {
        input.setCustomValidity('');
        input.classList.remove('is-invalid');
        if (input.value) {
            input.classList.add('is-valid');
        }
    }
}

// Countdown timers
function initializeCountdowns() {
    const countdownElements = document.querySelectorAll('[data-countdown]');
    
    countdownElements.forEach(function(element) {
        const targetDate = new Date(element.dataset.countdown);
        const elementId = element.id || 'countdown_' + Math.random().toString(36).substr(2, 9);
        element.id = elementId;
        
        startCountdown(elementId, targetDate);
    });
}

function startCountdown(elementId, targetDate) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Clear existing interval
    if (countdownIntervals[elementId]) {
        clearInterval(countdownIntervals[elementId]);
    }
    
    countdownIntervals[elementId] = setInterval(function() {
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;
        
        if (distance < 0) {
            clearInterval(countdownIntervals[elementId]);
            element.innerHTML = '<p class="text-muted">انتهت المدة</p>';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        updateCountdownDisplay(element, days, hours, minutes, seconds);
    }, 1000);
}

function updateCountdownDisplay(element, days, hours, minutes, seconds) {
    const daysEl = element.querySelector('#days') || element.querySelector('.days');
    const hoursEl = element.querySelector('#hours') || element.querySelector('.hours');
    const minutesEl = element.querySelector('#minutes') || element.querySelector('.minutes');
    const secondsEl = element.querySelector('#seconds') || element.querySelector('.seconds');
    
    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
}

// Notifications
function initializeNotifications() {
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            if (alert.parentNode) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    });
}

function showNotification(message, type = 'info', duration = 5000) {
    const alertTypes = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    };
    
    const alertClass = alertTypes[type] || 'alert-info';
    
    const alertElement = document.createElement('div');
    alertElement.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    alertElement.style.cssText = 'top: 20px; right: 20px; z-index: 1060; min-width: 300px;';
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
    `;
    
    document.body.appendChild(alertElement);
    
    // Auto-remove after duration
    setTimeout(function() {
        if (alertElement.parentNode) {
            const bsAlert = new bootstrap.Alert(alertElement);
            bsAlert.close();
        }
    }, duration);
    
    return alertElement;
}

// Responsive features
function initializeResponsive() {
    // Mobile menu handling
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNav = navbarCollapse.contains(event.target) || navbarToggler.contains(event.target);
            
            if (!isClickInsideNav && navbarCollapse.classList.contains('show')) {
                navbarToggler.click();
            }
        });
        
        // Close mobile menu when clicking on nav links
        const navLinks = navbarCollapse.querySelectorAll('.nav-link');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                if (navbarCollapse.classList.contains('show')) {
                    navbarToggler.click();
                }
            });
        });
    }
    
    // Responsive table handling
    makeTablesResponsive();
}

function makeTablesResponsive() {
    const tables = document.querySelectorAll('table:not(.table-responsive table)');
    
    tables.forEach(function(table) {
        if (!table.closest('.table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

// Utility functions
function formatDate(date, format = 'ar-SA') {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleDateString(format);
}

function formatTime(date, format = 'ar-SA') {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleTimeString(format, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(date, format = 'ar-SA') {
    return formatDate(date, format) + ' ' + formatTime(date, format);
}

// AJAX helpers
function makeRequest(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    showLoading();
    
    return fetch(url, finalOptions)
        .then(response => {
            hideLoading();
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                return response.text();
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Request failed:', error);
            showNotification('حدث خطأ في الطلب', 'error');
            throw error;
        });
}

// Form submission helpers
function submitForm(formElement, callback = null) {
    const formData = new FormData(formElement);
    const url = formElement.action || window.location.href;
    const method = formElement.method || 'POST';
    
    showLoading();
    
    fetch(url, {
        method: method,
        body: formData
    })
    .then(response => {
        hideLoading();
        
        if (response.ok) {
            if (callback) {
                callback(response);
            } else {
                showNotification('تم الإرسال بنجاح', 'success');
            }
        } else {
            throw new Error('Form submission failed');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Form submission error:', error);
        showNotification('فشل في إرسال النموذج', 'error');
    });
}

// Local storage helpers
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

// Animation helpers
function animateElement(element, animationClass, duration = 1000) {
    element.classList.add(animationClass);
    
    setTimeout(function() {
        element.classList.remove(animationClass);
    }, duration);
}

// Scroll helpers
function scrollToElement(element, offset = 0) {
    const elementPosition = element.offsetTop - offset;
    
    window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Modal helpers
function openModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        return modal;
    }
    return null;
}

function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
}

// Export functions for global use
window.BusinessTuesdays = {
    showNotification,
    makeRequest,
    submitForm,
    saveToLocalStorage,
    loadFromLocalStorage,
    formatDate,
    formatTime,
    formatDateTime,
    animateElement,
    scrollToElement,
    scrollToTop,
    openModal,
    closeModal,
    showLoading,
    hideLoading
};

// Service Worker registration (for PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/static/js/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    });
}
