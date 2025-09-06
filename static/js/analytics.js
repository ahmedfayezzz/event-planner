// ثلوثية الأعمال - Analytics JavaScript

// Chart.js configuration
Chart.defaults.font.family = 'Cairo, sans-serif';
Chart.defaults.color = '#495057';

// Global chart instances
let demographicsChart = null;
let trendsChart = null;
let performanceChart = null;

// Chart colors
const chartColors = {
    primary: '#0d6efd',
    secondary: '#6c757d',
    success: '#198754',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#0dcaf0',
    gradient: {
        primary: ['#667eea', '#764ba2'],
        secondary: ['#f093fb', '#f5576c'],
        success: ['#4facfe', '#00f2fe']
    }
};

// Initialize analytics
function initializeAnalytics() {
    loadAnalyticsData();
}

// Load all analytics data
function loadAnalyticsData() {
    Promise.all([
        loadDemographicsData(),
        loadTrendsData(),
        loadInsightsData()
    ]).then(() => {
        console.log('Analytics data loaded successfully');
    }).catch(error => {
        console.error('Failed to load analytics data:', error);
        showAnalyticsError();
    });
}

// Load demographics data
async function loadDemographicsData() {
    try {
        const response = await fetch('/api/analytics/demographics');
        const data = await response.json();
        
        if (data && data.raw_data) {
            renderDemographicsChart(data.raw_data);
            renderDemographicsInsights(data);
        }
    } catch (error) {
        console.error('Error loading demographics:', error);
    }
}

// Load trends data
async function loadTrendsData() {
    try {
        const response = await fetch('/api/analytics/trends');
        const data = await response.json();
        
        if (data && data.raw_data) {
            renderTrendsChart(data.raw_data);
            renderTrendsInsights(data);
        }
    } catch (error) {
        console.error('Error loading trends:', error);
    }
}

// Load insights data
async function loadInsightsData() {
    try {
        const response = await fetch('/api/analytics/insights');
        const data = await response.json();
        
        if (data) {
            renderParticipantInsights(data);
            renderSessionPerformance(data);
            renderRecommendations(data);
        }
    } catch (error) {
        console.error('Error loading insights:', error);
    }
}

// Render demographics chart
function renderDemographicsChart(data) {
    const ctx = document.getElementById('demographicsChart');
    if (!ctx) return;
    
    // Clear existing chart
    if (demographicsChart) {
        demographicsChart.destroy();
    }
    
    // Prepare activity types data
    const activityTypes = data.activity_types || {};
    const labels = Object.keys(activityTypes);
    const values = Object.values(activityTypes);
    
    // Create gradient
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, chartColors.gradient.primary[0]);
    gradient.addColorStop(1, chartColors.gradient.primary[1]);
    
    demographicsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    chartColors.primary,
                    chartColors.success,
                    chartColors.warning,
                    chartColors.danger,
                    chartColors.info,
                    chartColors.secondary
                ],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render trends chart
function renderTrendsChart(data) {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    // Clear existing chart
    if (trendsChart) {
        trendsChart.destroy();
    }
    
    // Prepare sessions data
    const sessionsData = data.sessions_data || [];
    const labels = sessionsData.map(session => session.date);
    const registrations = sessionsData.map(session => session.registrations);
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'عدد المسجلين',
                data: registrations,
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primary + '20',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'التاريخ'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'عدد المسجلين'
                    },
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Render demographics insights
function renderDemographicsInsights(data) {
    const container = document.getElementById('demographicsInsights');
    if (!container || !data) return;
    
    const insights = data.key_insights || [];
    const recommendations = data.recommendations || [];
    
    let html = '<div class="insights-content">';
    
    if (insights.length > 0) {
        html += '<h6 class="text-primary mb-3">الملاحظات الرئيسية:</h6>';
        html += '<ul class="list-unstyled">';
        insights.forEach(insight => {
            html += `<li class="mb-2"><i class="fas fa-check-circle text-success me-2"></i>${insight}</li>`;
        });
        html += '</ul>';
    }
    
    if (recommendations.length > 0) {
        html += '<h6 class="text-warning mb-3 mt-4">التوصيات:</h6>';
        html += '<ul class="list-unstyled">';
        recommendations.forEach(recommendation => {
            html += `<li class="mb-2"><i class="fas fa-lightbulb text-warning me-2"></i>${recommendation}</li>`;
        });
        html += '</ul>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Render trends insights
function renderTrendsInsights(data) {
    const container = document.getElementById('trendsInsights');
    if (!container || !data) return;
    
    const summary = data.summary || '';
    const metrics = data.metrics || {};
    
    let html = '<div class="trends-content">';
    
    if (summary) {
        html += `<p class="text-muted mb-3">${summary}</p>`;
    }
    
    if (Object.keys(metrics).length > 0) {
        html += '<div class="row text-center">';
        Object.entries(metrics).forEach(([key, value]) => {
            html += `
                <div class="col-6 mb-3">
                    <h5 class="text-primary mb-1">${value}</h5>
                    <small class="text-muted">${key}</small>
                </div>
            `;
        });
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Render participant insights
function renderParticipantInsights(data) {
    const container = document.getElementById('participantInsights');
    if (!container) return;
    
    // Simulate AI insights for participants
    const insights = [
        {
            icon: 'fas fa-users',
            title: 'المشاركون النشطون',
            value: '85%',
            description: 'من المشاركين حضروا أكثر من جلسة واحدة'
        },
        {
            icon: 'fas fa-star',
            title: 'معدل الرضا',
            value: '4.7/5',
            description: 'متوسط تقييم المشاركين للجلسات'
        },
        {
            icon: 'fas fa-chart-line',
            title: 'النمو الشهري',
            value: '+23%',
            description: 'زيادة في عدد المشاركين الجدد'
        }
    ];
    
    let html = '<div class="insights-list">';
    insights.forEach(insight => {
        html += `
            <div class="insight-item mb-3 p-3 bg-light rounded">
                <div class="d-flex align-items-center">
                    <div class="insight-icon me-3">
                        <i class="${insight.icon} text-primary fa-2x"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${insight.title}</h6>
                        <h4 class="text-primary mb-1">${insight.value}</h4>
                        <small class="text-muted">${insight.description}</small>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// Render session performance
function renderSessionPerformance(data) {
    const container = document.getElementById('sessionPerformance');
    if (!container) return;
    
    // Simulate session performance data
    const performance = [
        {
            session: 'التجمع رقم 1',
            attendance: 92,
            rating: 4.8,
            color: 'success'
        },
        {
            session: 'التجمع رقم 2',
            attendance: 87,
            rating: 4.6,
            color: 'primary'
        },
        {
            session: 'التجمع رقم 3',
            attendance: 95,
            rating: 4.9,
            color: 'warning'
        }
    ];
    
    let html = '<div class="performance-list">';
    performance.forEach(item => {
        html += `
            <div class="performance-item mb-3 p-3 border rounded">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${item.session}</h6>
                    <span class="badge bg-${item.color}">${item.rating}/5</span>
                </div>
                <div class="progress mb-2" style="height: 6px;">
                    <div class="progress-bar bg-${item.color}" style="width: ${item.attendance}%"></div>
                </div>
                <small class="text-muted">معدل الحضور: ${item.attendance}%</small>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// Render AI recommendations
function renderRecommendations(data) {
    const container = document.getElementById('aiRecommendations');
    if (!container) return;
    
    // Simulate AI recommendations
    const recommendations = [
        {
            type: 'success',
            icon: 'fas fa-thumbs-up',
            title: 'جلسات تفاعلية',
            description: 'زيادة التفاعل في الجلسات يحسن من معدل الحضور بنسبة 15%'
        },
        {
            type: 'info',
            icon: 'fas fa-clock',
            title: 'التوقيت المثالي',
            description: 'أفضل وقت للجلسات هو يوم الثلاثاء في المساء (7-9 مساءً)'
        },
        {
            type: 'warning',
            icon: 'fas fa-users',
            title: 'الحد الأقصى',
            description: 'تقليل عدد المشاركين إلى 40 شخص يحسن من جودة التفاعل'
        }
    ];
    
    let html = '<div class="recommendations-list">';
    recommendations.forEach(rec => {
        html += `
            <div class="alert alert-${rec.type} border-0 mb-3">
                <div class="d-flex align-items-start">
                    <i class="${rec.icon} me-3 mt-1"></i>
                    <div>
                        <h6 class="alert-heading mb-1">${rec.title}</h6>
                        <p class="mb-0 small">${rec.description}</p>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// Show analytics error
function showAnalyticsError() {
    const containers = [
        'demographicsChart',
        'trendsChart',
        'participantInsights',
        'sessionPerformance',
        'aiRecommendations'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                    <h6 class="text-muted">فشل في تحميل البيانات</h6>
                    <button class="btn btn-sm btn-primary mt-2" onclick="loadAnalyticsData()">
                        <i class="fas fa-refresh me-1"></i>
                        إعادة المحاولة
                    </button>
                </div>
            `;
        }
    });
}

// Export analytics data
function exportAnalytics(format) {
    showLoading();
    
    const data = {
        demographics: demographicsChart ? demographicsChart.data : null,
        trends: trendsChart ? trendsChart.data : null,
        timestamp: new Date().toISOString()
    };
    
    switch (format) {
        case 'json':
            downloadJSON(data, 'analytics-data.json');
            break;
        case 'csv':
            downloadCSV(data, 'analytics-data.csv');
            break;
        case 'pdf':
            generatePDF(data);
            break;
        default:
            console.error('Unsupported export format:', format);
    }
    
    hideLoading();
}

// Download JSON data
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
}

// Download CSV data
function downloadCSV(data, filename) {
    let csv = 'Type,Label,Value\n';
    
    if (data.demographics && data.demographics.labels) {
        data.demographics.labels.forEach((label, index) => {
            csv += `Demographics,${label},${data.demographics.datasets[0].data[index]}\n`;
        });
    }
    
    if (data.trends && data.trends.labels) {
        data.trends.labels.forEach((label, index) => {
            csv += `Trends,${label},${data.trends.datasets[0].data[index]}\n`;
        });
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, filename);
}

// Generate PDF report
function generatePDF(data) {
    // This would require a PDF library like jsPDF
    // For now, we'll show a notification
    showNotification('ميزة تصدير PDF قيد التطوير', 'info');
}

// Download blob helper
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Refresh analytics
function refreshAnalytics() {
    // Clear existing charts
    if (demographicsChart) {
        demographicsChart.destroy();
        demographicsChart = null;
    }
    
    if (trendsChart) {
        trendsChart.destroy();
        trendsChart = null;
    }
    
    // Show loading indicators
    const containers = [
        'demographicsChart',
        'trendsChart',
        'participantInsights',
        'sessionPerformance',
        'aiRecommendations'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="d-flex justify-content-center align-items-center h-100">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جاري التحديث...</span>
                    </div>
                </div>
            `;
        }
    });
    
    // Reload data
    setTimeout(() => {
        loadAnalyticsData();
    }, 1000);
}

// Real-time updates
function startRealTimeUpdates() {
    // Update analytics every 5 minutes
    setInterval(() => {
        loadAnalyticsData();
    }, 5 * 60 * 1000);
}

// Initialize real-time updates when page loads
document.addEventListener('DOMContentLoaded', function() {
    startRealTimeUpdates();
});

// Export functions for global use
window.Analytics = {
    initializeAnalytics,
    loadAnalyticsData,
    refreshAnalytics,
    exportAnalytics
};
