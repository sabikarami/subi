// Global variables
let isTestingActive = false;
let testingInterval = null;
let currentSubDomain = '';

// DOM elements
const elements = {
    form: document.getElementById('configForm'),
    subDomainInput: document.getElementById('subDomain'),
    stopBtn: document.getElementById('stopBtn'),
    progressSection: document.getElementById('progressSection'),
    resultsSection: document.getElementById('resultsSection'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    totalConfigs: document.getElementById('totalConfigs'),
    testedConfigs: document.getElementById('testedConfigs'),
    workingConfigs: document.getElementById('workingConfigs'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    resultsGrid: document.getElementById('resultsGrid'),
    downloadBtn: document.getElementById('downloadBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    nextTestTime: document.getElementById('nextTestTime'),
    lastUpdate: document.getElementById('lastUpdate')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateNextTestTime();
    loadLastResults();
});

// Initialize application
function initializeApp() {
    updateStatus('ready', 'آماده');
    updateLastUpdateTime();
    
    // Check if there's a saved subdomain
    const savedSubDomain = localStorage.getItem('v2ray_subdomain');
    if (savedSubDomain) {
        elements.subDomainInput.value = savedSubDomain;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    elements.form.addEventListener('submit', handleFormSubmit);
    
    // Stop button
    elements.stopBtn.addEventListener('click', stopTesting);
    
    // Download button
    elements.downloadBtn.addEventListener('click', downloadResults);
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', refreshTest);
    
    // Auto-refresh every 30 seconds during testing
    setInterval(checkTestingStatus, 30000);
    
    // Update next test time every minute
    setInterval(updateNextTestTime, 60000);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const subDomain = elements.subDomainInput.value.trim();
    if (!subDomain) {
        showNotification('لطفاً آدرس ساب دامین را وارد کنید', 'error');
        return;
    }
    
    if (!isValidUrl(subDomain)) {
        showNotification('آدرس وارد شده معتبر نیست', 'error');
        return;
    }
    
    currentSubDomain = subDomain;
    localStorage.setItem('v2ray_subdomain', subDomain);
    
    await startTesting();
}

// Validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Start testing process
async function startTesting() {
    if (isTestingActive) return;
    
    isTestingActive = true;
    updateStatus('testing', 'در حال تست');
    showLoading(true);
    
    // Update UI
    elements.form.querySelector('button[type="submit"]').disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressSection.style.display = 'block';
    elements.progressSection.classList.add('fade-in');
    
    try {
        // Start the testing process
        const response = await fetch('/api/start-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subDomain: currentSubDomain
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('تست با موفقیت شروع شد', 'success');
            startProgressMonitoring();
        } else {
            throw new Error(result.error || 'خطا در شروع تست');
        }
        
    } catch (error) {
        console.error('Error starting test:', error);
        showNotification('خطا در شروع تست: ' + error.message, 'error');
        stopTesting();
    } finally {
        showLoading(false);
    }
}

// Start progress monitoring
function startProgressMonitoring() {
    testingInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/test-progress');
            const data = await response.json();
            
            if (data.success) {
                updateProgress(data.progress);
                
                if (data.progress.completed) {
                    await completeTest();
                }
            }
        } catch (error) {
            console.error('Error checking progress:', error);
        }
    }, 2000); // Check every 2 seconds
}

// Update progress display
function updateProgress(progress) {
    elements.totalConfigs.textContent = progress.total || 0;
    elements.testedConfigs.textContent = progress.tested || 0;
    elements.workingConfigs.textContent = progress.working || 0;
    
    const percentage = progress.total > 0 ? (progress.tested / progress.total) * 100 : 0;
    elements.progressFill.style.width = percentage + '%';
    
    if (progress.currentTest) {
        elements.progressText.textContent = `در حال تست: ${progress.currentTest}`;
    } else if (progress.completed) {
        elements.progressText.textContent = 'تست کامل شد';
    } else {
        elements.progressText.textContent = 'در حال پردازش...';
    }
}

// Complete test
async function completeTest() {
    clearInterval(testingInterval);
    isTestingActive = false;
    
    updateStatus('ready', 'آماده');
    elements.form.querySelector('button[type="submit"]').disabled = false;
    elements.stopBtn.disabled = true;
    
    // Load and display results
    await loadResults();
    
    showNotification('تست با موفقیت کامل شد', 'success');
    updateLastUpdateTime();
}

// Stop testing
async function stopTesting() {
    if (!isTestingActive) return;
    
    try {
        await fetch('/api/stop-test', { method: 'POST' });
        
        clearInterval(testingInterval);
        isTestingActive = false;
        
        updateStatus('ready', 'آماده');
        elements.form.querySelector('button[type="submit"]').disabled = false;
        elements.stopBtn.disabled = true;
        
        showNotification('تست متوقف شد', 'warning');
        
    } catch (error) {
        console.error('Error stopping test:', error);
        showNotification('خطا در متوقف کردن تست', 'error');
    }
}

// Load results
async function loadResults() {
    try {
        const response = await fetch('/api/results');
        const data = await response.json();
        
        if (data.success && data.results) {
            displayResults(data.results);
            elements.resultsSection.style.display = 'block';
            elements.resultsSection.classList.add('fade-in');
        }
    } catch (error) {
        console.error('Error loading results:', error);
        showNotification('خطا در بارگذاری نتایج', 'error');
    }
}

// Load last results on page load
async function loadLastResults() {
    try {
        const response = await fetch('/api/last-results');
        const data = await response.json();
        
        if (data.success && data.results && data.results.length > 0) {
            displayResults(data.results);
            elements.resultsSection.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading last results:', error);
    }
}

// Display results
function displayResults(results) {
    elements.resultsGrid.innerHTML = '';
    
    results.forEach((config, index) => {
        const resultItem = createResultItem(config, index + 1);
        elements.resultsGrid.appendChild(resultItem);
    });
}

// Create result item element
function createResultItem(config, rank) {
    const item = document.createElement('div');
    item.className = 'result-item slide-in';
    
    const speedClass = getSpeedClass(config.speed);
    const speedText = formatSpeed(config.speed);
    
    item.innerHTML = `
        <div class="result-header">
            <div class="result-rank">${rank}</div>
            <div class="result-speed ${speedClass}">${speedText}</div>
        </div>
        <div class="result-info">
            <div><strong>نام:</strong> ${config.name || 'نامشخص'}</div>
            <div><strong>نوع:</strong> ${config.type || 'نامشخص'}</div>
            <div><strong>سرور:</strong> ${config.server || 'نامشخص'}</div>
            <div><strong>پینگ:</strong> ${config.ping || 'نامشخص'} ms</div>
        </div>
        <div class="result-config">${config.config}</div>
    `;
    
    return item;
}

// Get speed class for styling
function getSpeedClass(speed) {
    if (speed > 50) return 'high-speed';
    if (speed > 20) return 'medium-speed';
    return 'low-speed';
}

// Format speed display
function formatSpeed(speed) {
    if (speed > 1000) {
        return (speed / 1000).toFixed(1) + ' GB/s';
    }
    return speed.toFixed(1) + ' MB/s';
}

// Download results
async function downloadResults() {
    try {
        const response = await fetch('/api/download');
        
        if (!response.ok) {
            throw new Error('خطا در دانلود فایل');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `v2ray-configs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('فایل با موفقیت دانلود شد', 'success');
        
    } catch (error) {
        console.error('Error downloading results:', error);
        showNotification('خطا در دانلود فایل', 'error');
    }
}

// Refresh test
async function refreshTest() {
    if (!currentSubDomain) {
        showNotification('لطفاً ابتدا آدرس ساب دامین را وارد کنید', 'warning');
        return;
    }
    
    await startTesting();
}

// Check testing status
async function checkTestingStatus() {
    if (!isTestingActive) return;
    
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (!data.isActive && isTestingActive) {
            // Test completed or stopped
            await completeTest();
        }
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

// Update status indicator
function updateStatus(type, text) {
    elements.statusDot.className = `status-dot ${type}`;
    elements.statusText.textContent = text;
}

// Show/hide loading overlay
function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 1001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border-left: 4px solid ${getNotificationColor(type)};
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Get notification icon
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Get notification color
function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#10b981';
        case 'error': return '#ef4444';
        case 'warning': return '#f59e0b';
        default: return '#3b82f6';
    }
}

// Update next test time
function updateNextTestTime() {
    try {
        const now = new Date();
        const nextTest = new Date(now);
        
        // Calculate next 6-hour interval
        const hours = now.getHours();
        const nextHour = Math.ceil((hours + 1) / 6) * 6;
        nextTest.setHours(nextHour, 0, 0, 0);
        
        if (nextTest <= now) {
            nextTest.setDate(nextTest.getDate() + 1);
        }
        
        const timeUntil = nextTest - now;
        const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
        
        elements.nextTestTime.textContent = `${hoursUntil} ساعت و ${minutesUntil} دقیقه`;
        
    } catch (error) {
        elements.nextTestTime.textContent = 'در حال محاسبه...';
    }
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tehran'
    };
    
    elements.lastUpdate.textContent = now.toLocaleDateString('fa-IR', options);
}

// Utility function to format Persian numbers
function toPersianNumbers(str) {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.toString().replace(/\d/g, (digit) => persianNumbers[parseInt(digit)]);
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        font-family: 'Vazirmatn', sans-serif;
        direction: rtl;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-content i {
        font-size: 1.2rem;
    }
    
    .notification.success .notification-content i {
        color: #10b981;
    }
    
    .notification.error .notification-content i {
        color: #ef4444;
    }
    
    .notification.warning .notification-content i {
        color: #f59e0b;
    }
    
    .notification.info .notification-content i {
        color: #3b82f6;
    }
`;

document.head.appendChild(notificationStyles);