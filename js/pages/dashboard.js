// js/pages/dashboard.js - Dashboard logic

(function () {
    const userId = localStorage.getItem('clerkUserId');

    const authGuard = document.getElementById('authGuard');
    const dashboardMain = document.getElementById('dashboardMain');
    const dashboardLoading = document.getElementById('dashboardLoading');
    const dashboardEmpty = document.getElementById('dashboardEmpty');
    const dashboardContent = document.getElementById('dashboardContent');

    if (!userId) {
        // Not logged in
        authGuard.style.display = 'flex';
        dashboardMain.style.display = 'none';
        return;
    }

    // Logged in - show dashboard
    authGuard.style.display = 'none';
    dashboardMain.style.display = 'block';

    let allSessions = [];
    let emotionChart = null;
    let stressChart = null;

    init();

    async function init() {
        // fetchRecentSessions returns oldest-first (it reverses). We want newest-first for display.
        const fetched = await fetchRecentSessions(userId, 100);
        // fetched is oldest-first; reverse to newest-first
        allSessions = fetched.slice().reverse();

        dashboardLoading.style.display = 'none';

        if (allSessions.length === 0) {
            dashboardEmpty.style.display = 'block';
            return;
        }

        dashboardContent.style.display = 'block';
        renderSummary();
        renderLastSession();
        renderEmotionChart(7);
        renderStressChart();
        renderKeywordCloud();
        renderHistoryTable();
        setupToggle();
    }

    // --- Summary Cards ---
    function renderSummary() {
        document.getElementById('totalSessions').textContent = allSessions.length;

        // Most frequent emotion
        const emotionCounts = {};
        allSessions.forEach(function (s) {
            if (s.emotion) {
                emotionCounts[s.emotion] = (emotionCounts[s.emotion] || 0) + 1;
            }
        });
        var topEmotion = '--';
        var topCount = 0;
        Object.keys(emotionCounts).forEach(function (e) {
            if (emotionCounts[e] > topCount) {
                topCount = emotionCounts[e];
                topEmotion = e;
            }
        });
        document.getElementById('topEmotion').textContent = capitalize(topEmotion);

        // Average stress
        var stressVals = allSessions.filter(function (s) { return s.stress_level != null; }).map(function (s) { return Number(s.stress_level); });
        if (stressVals.length > 0) {
            var avg = Math.round(stressVals.reduce(function (a, b) { return a + b; }, 0) / stressVals.length);
            document.getElementById('avgStress').textContent = avg + '%';
        }
    }

    // --- Last Session ---
    function renderLastSession() {
        var s = allSessions[0]; // newest
        document.getElementById('lastDate').textContent = formatDate(s.created_at);
        document.getElementById('lastEmotion').textContent = capitalize(s.emotion || '--');
        document.getElementById('lastBody').textContent = arrJoin(s.body_sensations);
        document.getElementById('lastThought').textContent = arrJoin(s.thoughts);
        document.getElementById('lastImpulse').textContent = arrJoin(s.impulses);
        document.getElementById('lastNeed').textContent = arrJoin(s.needs);
    }

    // --- Emotion Trend Chart ---
    function renderEmotionChart(days) {
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        // Filter sessions within range, chronological order
        var filtered = allSessions.filter(function (s) {
            return new Date(s.created_at) >= cutoff;
        }).reverse(); // oldest first for chart

        if (filtered.length === 0) {
            filtered = allSessions.slice().reverse();
        }

        // Build unique emotion labels
        var allEmotions = [];
        filtered.forEach(function (s) {
            if (s.emotion && allEmotions.indexOf(s.emotion) === -1) {
                allEmotions.push(s.emotion);
            }
        });

        var labels = filtered.map(function (s) { return formatShortDate(s.created_at); });
        var dataPoints = filtered.map(function (s) { return allEmotions.indexOf(s.emotion); });

        if (emotionChart) emotionChart.destroy();

        var ctx = document.getElementById('emotionChart').getContext('2d');
        emotionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Emotion',
                    data: dataPoints,
                    borderColor: '#E68872',
                    backgroundColor: 'rgba(230,136,114,0.15)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#E68872'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        ticks: {
                            callback: function (value) { return allEmotions[value] ? capitalize(allEmotions[value]) : ''; },
                            color: '#888'
                        },
                        grid: { color: '#e8e8e8' }
                    },
                    x: {
                        ticks: { color: '#888' },
                        grid: { color: '#e8e8e8' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) { return allEmotions[ctx.raw] ? capitalize(allEmotions[ctx.raw]) : ''; }
                        }
                    }
                }
            }
        });
    }

    // --- Stress Distribution Chart ---
    function renderStressChart() {
        var low = 0, med = 0, high = 0;
        allSessions.forEach(function (s) {
            var v = Number(s.stress_level);
            if (isNaN(v)) return;
            if (v <= 33) low++;
            else if (v <= 66) med++;
            else high++;
        });

        var ctx = document.getElementById('stressChart').getContext('2d');
        if (stressChart) stressChart.destroy();

        stressChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Low (0-33)', 'Medium (34-66)', 'High (67-100)'],
                datasets: [{
                    data: [low, med, high],
                    backgroundColor: ['#4caf50', '#ff9800', '#e53935'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#aaa', font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }

    // --- Keyword Cloud ---
    function renderKeywordCloud() {
        var wordCounts = {};
        var stopWords = ['i', 'me', 'my', 'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'is', 'it', 'that', 'was', 'for', 'on', 'are', 'with', 'this', 'be', 'not', 'but', 'have', 'had', 'do', 'at', 'by', 'from', 'they', 'we', 'he', 'she', 'so', 'if', 'just', 'like', 'feel', 'feeling', 'felt', 'want', 'need', 'about', 'been', 'would', 'could', 'should', 'will', 'can', 'get', 'got', 'has', 'more', 'some', 'very', 'really', 'what', 'when', 'how', 'all', 'there', 'their', 'them', 'then', 'than', 'no', 'yes', 'up', 'out', 'into', 'over', 'am', 'being', 'going'];

        allSessions.forEach(function (s) {
            var fields = [].concat(s.thoughts || [], s.impulses || [], s.needs || []);
            fields.forEach(function (text) {
                if (!text) return;
                text.toLowerCase().split(/\s+/).forEach(function (w) {
                    w = w.replace(/[^a-z']/g, '');
                    if (w.length > 2 && stopWords.indexOf(w) === -1) {
                        wordCounts[w] = (wordCounts[w] || 0) + 1;
                    }
                });
            });
        });

        // Sort by count, take top 15
        var sorted = Object.keys(wordCounts).sort(function (a, b) { return wordCounts[b] - wordCounts[a]; }).slice(0, 15);

        var container = document.getElementById('keywordCloud');
        container.innerHTML = '';

        if (sorted.length === 0) {
            container.innerHTML = '<span style="color:#666;">Not enough data yet</span>';
            return;
        }

        var maxCount = wordCounts[sorted[0]];
        sorted.forEach(function (word) {
            var ratio = wordCounts[word] / maxCount;
            var size = 0.8 + ratio * 1.2; // 0.8rem to 2rem
            var span = document.createElement('span');
            span.className = 'kw';
            span.textContent = word;
            span.style.fontSize = size + 'rem';
            container.appendChild(span);
        });
    }

    // --- Session History Table ---
    function renderHistoryTable() {
        var tbody = document.getElementById('historyBody');
        tbody.innerHTML = '';

        allSessions.forEach(function (s) {
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + escHtml(formatDate(s.created_at)) + '</td>' +
                '<td>' + escHtml(capitalize(s.emotion || '--')) + '</td>' +
                '<td>' + escHtml(s.stress_level != null ? s.stress_level + '%' : '--') + '</td>' +
                '<td>' + escHtml(arrJoin(s.body_sensations)) + '</td>' +
                '<td>' + escHtml(arrJoin(s.thoughts)) + '</td>' +
                '<td>' + escHtml(arrJoin(s.impulses)) + '</td>' +
                '<td>' + escHtml(arrJoin(s.needs)) + '</td>';
            tbody.appendChild(tr);
        });
    }

    // --- Chart Toggle ---
    function setupToggle() {
        var buttons = document.querySelectorAll('.chart-toggle .toggle-btn');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                buttons.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                renderEmotionChart(Number(btn.getAttribute('data-days')));
            });
        });
    }

    // --- Helpers ---
    function capitalize(str) {
        if (!str || str === '--') return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function arrJoin(arr) {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return '--';
        return arr.join(', ');
    }

    function formatDate(iso) {
        if (!iso) return '--';
        var d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatShortDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        return (d.getMonth() + 1) + '/' + d.getDate();
    }

    function escHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
