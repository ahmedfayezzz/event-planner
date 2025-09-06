// ثلوثية الأعمال - QR Code Scanner

class QRScanner {
    constructor(videoElement, onScanCallback) {
        this.video = videoElement;
        this.onScan = onScanCallback;
        this.scanning = false;
        this.stream = null;
        this.canvas = null;
        this.context = null;
        this.animationFrame = null;
        
        this.initializeCanvas();
    }
    
    initializeCanvas() {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
    }
    
    async start() {
        try {
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            this.video.srcObject = this.stream;
            this.video.play();
            
            this.scanning = true;
            this.video.addEventListener('loadedmetadata', () => {
                this.startScanning();
            });
            
            return true;
        } catch (error) {
            console.error('Error starting QR scanner:', error);
            this.handleCameraError(error);
            return false;
        }
    }
    
    stop() {
        this.scanning = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.video.srcObject) {
            this.video.srcObject = null;
        }
    }
    
    startScanning() {
        if (!this.scanning) return;
        
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        this.scanFrame();
    }
    
    scanFrame() {
        if (!this.scanning) return;
        
        try {
            this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Use jsQR library for QR code detection
            if (window.jsQR) {
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    this.handleQRDetection(code);
                    return;
                }
            }
            
            // Continue scanning
            this.animationFrame = requestAnimationFrame(() => this.scanFrame());
        } catch (error) {
            console.error('Error scanning frame:', error);
            this.animationFrame = requestAnimationFrame(() => this.scanFrame());
        }
    }
    
    handleQRDetection(code) {
        console.log('QR Code detected:', code.data);
        
        // Visual feedback
        this.showDetectionFeedback();
        
        // Call the callback
        if (this.onScan) {
            this.onScan(code.data);
        }
        
        // Brief pause before continuing scan
        setTimeout(() => {
            if (this.scanning) {
                this.animationFrame = requestAnimationFrame(() => this.scanFrame());
            }
        }, 1000);
    }
    
    showDetectionFeedback() {
        // Add visual feedback to show QR code was detected
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 255, 0, 0.3);
            border: 3px solid #00ff00;
            border-radius: 8px;
            pointer-events: none;
            animation: qr-flash 0.5s ease-out;
            z-index: 1000;
        `;
        
        // Add flash animation
        if (!document.querySelector('#qr-flash-style')) {
            const style = document.createElement('style');
            style.id = 'qr-flash-style';
            style.textContent = `
                @keyframes qr-flash {
                    0% { opacity: 0; transform: scale(1.1); }
                    50% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(0.9); }
                }
            `;
            document.head.appendChild(style);
        }
        
        const container = this.video.parentElement;
        if (container.style.position !== 'absolute' && container.style.position !== 'relative') {
            container.style.position = 'relative';
        }
        
        container.appendChild(overlay);
        
        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.parentElement.removeChild(overlay);
            }
        }, 500);
    }
    
    handleCameraError(error) {
        let message = 'فشل في الوصول للكاميرا';
        
        if (error.name === 'NotAllowedError') {
            message = 'يرجى السماح بالوصول للكاميرا';
        } else if (error.name === 'NotFoundError') {
            message = 'لم يتم العثور على كاميرا';
        } else if (error.name === 'NotReadableError') {
            message = 'الكاميرا قيد الاستخدام من تطبيق آخر';
        }
        
        this.showError(message);
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger text-center';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
        `;
        
        const container = this.video.parentElement;
        container.insertBefore(errorDiv, this.video);
        
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.parentElement.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// QR Code Generator
class QRGenerator {
    static generate(text, options = {}) {
        const defaultOptions = {
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        return new Promise((resolve, reject) => {
            try {
                const qr = new QRCode(document.createElement('div'), {
                    text: text,
                    width: finalOptions.width,
                    height: finalOptions.height,
                    colorDark: finalOptions.colorDark,
                    colorLight: finalOptions.colorLight,
                    correctLevel: finalOptions.correctLevel
                });
                
                // Get the generated image
                setTimeout(() => {
                    const img = qr._el.querySelector('img');
                    if (img) {
                        resolve(img.src);
                    } else {
                        reject(new Error('Failed to generate QR code'));
                    }
                }, 100);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    static generateForUser(userId, sessionId) {
        const data = {
            type: 'attendance',
            user_id: userId,
            session_id: sessionId,
            timestamp: Date.now()
        };
        
        return this.generate(JSON.stringify(data));
    }
    
    static generateForSession(sessionId) {
        const data = {
            type: 'session',
            session_id: sessionId,
            url: `${window.location.origin}/admin/checkin/${sessionId}`,
            timestamp: Date.now()
        };
        
        return this.generate(JSON.stringify(data));
    }
}

// QR Code Validator
class QRValidator {
    static validate(qrData) {
        try {
            // Try to parse as JSON first
            const data = JSON.parse(qrData);
            
            if (data.type === 'attendance') {
                return this.validateAttendanceQR(data);
            } else if (data.type === 'session') {
                return this.validateSessionQR(data);
            }
        } catch (error) {
            // If not JSON, treat as plain text
            return this.validatePlainTextQR(qrData);
        }
        
        return { valid: false, error: 'Invalid QR code format' };
    }
    
    static validateAttendanceQR(data) {
        if (!data.user_id || !data.session_id) {
            return { valid: false, error: 'Missing user or session ID' };
        }
        
        // Check timestamp (QR codes expire after 24 hours)
        const now = Date.now();
        const qrAge = now - data.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (qrAge > maxAge) {
            return { valid: false, error: 'QR code expired' };
        }
        
        return {
            valid: true,
            type: 'attendance',
            userId: data.user_id,
            sessionId: data.session_id
        };
    }
    
    static validateSessionQR(data) {
        if (!data.session_id) {
            return { valid: false, error: 'Missing session ID' };
        }
        
        return {
            valid: true,
            type: 'session',
            sessionId: data.session_id,
            url: data.url
        };
    }
    
    static validatePlainTextQR(qrData) {
        // Handle plain text QR codes (like URLs or user IDs)
        if (qrData.startsWith('http')) {
            return {
                valid: true,
                type: 'url',
                url: qrData
            };
        }
        
        // Check if it's a user ID pattern
        const userIdMatch = qrData.match(/user[_\-]?(\d+)/i);
        if (userIdMatch) {
            return {
                valid: true,
                type: 'user',
                userId: parseInt(userIdMatch[1])
            };
        }
        
        return {
            valid: true,
            type: 'text',
            data: qrData
        };
    }
}

// Utility functions for QR operations
const QRUtils = {
    // Load jsQR library if not already loaded
    async loadJsQR() {
        if (window.jsQR) {
            return true;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Failed to load jsQR library'));
            document.head.appendChild(script);
        });
    },
    
    // Load QRCode library for generation
    async loadQRCode() {
        if (window.QRCode) {
            return true;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Failed to load QRCode library'));
            document.head.appendChild(script);
        });
    },
    
    // Check camera support
    isCameraSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
    
    // Check if device has back camera
    async hasBackCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => 
                device.kind === 'videoinput' && 
                device.label.toLowerCase().includes('back')
            );
        } catch (error) {
            return false;
        }
    },
    
    // Download QR code as image
    downloadQRCode(dataUrl, filename = 'qrcode.png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    
    // Share QR code
    async shareQRCode(dataUrl, title = 'QR Code') {
        if (navigator.share && navigator.canShare) {
            try {
                // Convert data URL to blob
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const file = new File([blob], 'qrcode.png', { type: 'image/png' });
                
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: title,
                        files: [file]
                    });
                    return true;
                }
            } catch (error) {
                console.error('Error sharing QR code:', error);
            }
        }
        
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(dataUrl);
            return true;
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return false;
        }
    }
};

// Export classes for global use
window.QRScanner = QRScanner;
window.QRGenerator = QRGenerator;
window.QRValidator = QRValidator;
window.QRUtils = QRUtils;

// Initialize QR scanning functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Load required libraries
    try {
        await QRUtils.loadJsQR();
        console.log('jsQR library loaded successfully');
    } catch (error) {
        console.error('Failed to load jsQR library:', error);
    }
    
    // Check camera support
    if (!QRUtils.isCameraSupported()) {
        console.warn('Camera not supported on this device');
        
        // Hide camera-related UI elements
        const cameraElements = document.querySelectorAll('[data-requires-camera]');
        cameraElements.forEach(element => {
            element.style.display = 'none';
        });
        
        // Show fallback message
        const fallbackElements = document.querySelectorAll('[data-camera-fallback]');
        fallbackElements.forEach(element => {
            element.style.display = 'block';
        });
    }
});
