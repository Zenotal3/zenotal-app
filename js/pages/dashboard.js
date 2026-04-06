// js/pages/dashboard.js - Dashboard logic

(function () {
    const authGuard = document.getElementById('authGuard');
    const dashboardMain = document.getElementById('dashboardMain');
    const dashboardLoading = document.getElementById('dashboardLoading');
    const dashboardEmpty = document.getElementById('dashboardEmpty');
    const dashboardContent = document.getElementById('dashboardContent');

    // Wait for auth.js to finish restoring session before checking userId
    // auth.js fires 'zenotal:authReady' once it knows the auth state
    function startDashboard() {
        const userId = localStorage.getItem('userId') || localStorage.getItem('guestId');
        if (!userId) {
            authGuard.style.display = 'flex';
            dashboardMain.style.display = 'none';
            return;
        }
        // Logged in - show dashboard
        authGuard.style.display = 'none';
        dashboardMain.style.display = 'block';
        initDashboard(userId);
    }

    // auth.js may have already fired before this script ran (if auth was cached)
    if (window.__zenotalAuthReady) {
        startDashboard();
    } else {
        document.addEventListener('zenotal:authReady', startDashboard, { once: true });
        // Fallback: if auth.js never fires (e.g. no auth.js on page), start after 2s
        setTimeout(function() {
            if (!window.__zenotalAuthReady) {
                window.__zenotalAuthReady = true;
                startDashboard();
            }
        }, 2000);
    }

    let allSessions = [];
    let emotionChart = null;
    let stressChart = null;

    // Category config for keyword cloud
    var CATEGORIES = {
        body: { label: 'Body', color: '#4a90d9' },
        thought: { label: 'Thought', color: '#9b59b6' },
        impulse: { label: 'Impulse', color: '#e07c5a' },
        need: { label: 'Need', color: '#27ae60' }
    };

    var CATEGORY_SUGGESTIONS = {
        body: 'Notice this sensation without judgment. Try a body scan.',
        thought: "Try labeling it: \"I notice I'm thinking about [word].\"",
        impulse: 'When you feel this urge, pause and take three breaths.',
        need: 'What small step could meet this need today?'
    };

    async function initDashboard(userId) {  // called by startDashboard after auth is ready
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
        renderSessionCards();
        setupToggle();
        setupAccount();
        renderHero();
    }

    // --- Hero: greeting, streak, subtitle ---
    function renderHero() {
        // Greeting by time of day
        var hour = new Date().getHours();
        var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        var greetingEl = document.getElementById('dashGreeting');
        if (greetingEl) greetingEl.textContent = greeting;

        // Subtitle: motivational based on session count
        var subEl = document.getElementById('dashHeroSub');
        if (subEl) {
            var n = allSessions.length;
            if (n === 1) subEl.textContent = 'Your first step. Keep going.';
            else if (n < 5) subEl.textContent = 'Every reset counts. You\'re building a habit.';
            else if (n < 10) subEl.textContent = 'You\'re developing real self-awareness.';
            else subEl.textContent = 'Your consistency is your superpower.';
        }

        // Streak: count consecutive days with at least one session
        var streak = computeStreak(allSessions);
        var badgeEl = document.getElementById('dashStreakBadge');
        var numEl = document.getElementById('dashStreakNum');
        if (badgeEl && numEl && streak > 1) {
            numEl.textContent = streak;
            badgeEl.style.display = 'flex';
        }
    }

    function computeStreak(sessions) {
        if (!sessions || sessions.length === 0) return 0;
        // sessions are newest-first
        var today = new Date();
        today.setHours(0,0,0,0);
        var streak = 0;
        var checkDate = new Date(today);
        var sessionDates = sessions.map(function(s) {
            var d = new Date(s.created_at);
            d.setHours(0,0,0,0);
            return d.getTime();
        });
        while (true) {
            if (sessionDates.indexOf(checkDate.getTime()) !== -1) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
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

    // --- Keyword Cloud (with categories + click popover) ---
    function renderKeywordCloud() {
        var wordData = {}; // word -> { count, categories: { body: n, thought: n, impulse: n, need: n }, sessions: Set }
        var wordExamples = {}; // word -> [example phrases]
        var stopWords = ['i', 'me', 'my', 'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'is', 'it', 'that', 'was', 'for', 'on', 'are', 'with', 'this', 'be', 'not', 'but', 'have', 'had', 'do', 'at', 'by', 'from', 'they', 'we', 'he', 'she', 'so', 'if', 'just', 'like', 'feel', 'feeling', 'felt', 'want', 'need', 'about', 'been', 'would', 'could', 'should', 'will', 'can', 'get', 'got', 'has', 'more', 'some', 'very', 'really', 'what', 'when', 'how', 'all', 'there', 'their', 'them', 'then', 'than', 'no', 'yes', 'up', 'out', 'into', 'over', 'am', 'being', 'going'];

        function processField(texts, category, sessionIdx) {
            if (!texts || !Array.isArray(texts)) return;
            texts.forEach(function (text) {
                if (!text) return;
                var words = text.toLowerCase().split(/\s+/);
                words.forEach(function (w) {
                    w = w.replace(/[^a-z']/g, '');
                    if (w.length > 2 && stopWords.indexOf(w) === -1) {
                        if (!wordData[w]) {
                            wordData[w] = { count: 0, categories: { body: 0, thought: 0, impulse: 0, need: 0 }, sessions: new Set() };
                            wordExamples[w] = [];
                        }
                        wordData[w].count++;
                        wordData[w].categories[category]++;
                        wordData[w].sessions.add(sessionIdx);
                        if (wordExamples[w].length < 3 && wordExamples[w].indexOf(text) === -1) {
                            wordExamples[w].push(text);
                        }
                    }
                });
            });
        }

        allSessions.forEach(function (s, idx) {
            processField(s.body_sensations, 'body', idx);
            processField(s.thoughts, 'thought', idx);
            processField(s.impulses, 'impulse', idx);
            processField(s.needs, 'need', idx);
        });

        // Sort by count, take top 15
        var sorted = Object.keys(wordData).sort(function (a, b) { return wordData[b].count - wordData[a].count; }).slice(0, 15);

        var container = document.getElementById('keywordCloud');
        container.innerHTML = '';

        if (sorted.length === 0) {
            container.innerHTML = '<span style="color:#666;">Not enough data yet</span>';
            document.getElementById('kwLegend').style.display = 'none';
            return;
        }

        var maxCount = wordData[sorted[0]].count;
        sorted.forEach(function (word) {
            var data = wordData[word];
            var ratio = data.count / maxCount;
            var size = 0.8 + ratio * 1.2;

            // Determine dominant category
            var dominantCat = 'thought';
            var maxCat = 0;
            Object.keys(data.categories).forEach(function (cat) {
                if (data.categories[cat] > maxCat) {
                    maxCat = data.categories[cat];
                    dominantCat = cat;
                }
            });

            var span = document.createElement('span');
            span.className = 'kw kw-cat-' + dominantCat;
            span.textContent = word;
            span.style.fontSize = size + 'rem';
            span.setAttribute('data-word', word);
            span.setAttribute('data-category', dominantCat);
            span.setAttribute('data-count', data.sessions.size);
            span.style.cursor = 'pointer';

            span.addEventListener('click', function (e) {
                e.stopPropagation();
                showKwPopover(word, dominantCat, data.sessions.size, wordExamples[word] || [], e.target);
            });

            container.appendChild(span);
        });

        // Dismiss popover on outside click
        document.addEventListener('click', function () {
            var popover = document.getElementById('kwPopover');
            if (popover) popover.style.display = 'none';
        });
    }

    function showKwPopover(word, category, sessionCount, examples, targetEl) {
        var popover = document.getElementById('kwPopover');
        var catInfo = CATEGORIES[category] || CATEGORIES.thought;
        var suggestion = CATEGORY_SUGGESTIONS[category] || '';
        if (suggestion.indexOf('[word]') !== -1) {
            suggestion = suggestion.replace('[word]', word);
        }

        var examplesHtml = '';
        if (examples.length > 0) {
            examplesHtml = '<div class="kw-pop-examples">' +
                examples.map(function (ex) { return '<div class="kw-pop-example">"' + escHtml(ex) + '"</div>'; }).join('') +
                '</div>';
        }

        popover.innerHTML =
            '<div class="kw-pop-header">' +
                '<span class="kw-pop-word">' + escHtml(word) + '</span>' +
                '<span class="kw-pop-badge" style="background:' + catInfo.color + ';">' + catInfo.label + '</span>' +
            '</div>' +
            '<div class="kw-pop-stat">Appeared in ' + sessionCount + ' session' + (sessionCount !== 1 ? 's' : '') + '</div>' +
            examplesHtml +
            '<div class="kw-pop-suggestion">' + escHtml(suggestion) + '</div>';

        // Position the popover near the clicked keyword
        var cloudCard = document.querySelector('.keyword-cloud-card');
        var cloudRect = cloudCard.getBoundingClientRect();
        var targetRect = targetEl.getBoundingClientRect();

        popover.style.display = 'block';
        var popRect = popover.getBoundingClientRect();

        var left = targetRect.left - cloudRect.left + targetRect.width / 2 - popRect.width / 2;
        var top = targetRect.bottom - cloudRect.top + 8;

        // Keep within bounds
        if (left < 0) left = 8;
        if (left + popRect.width > cloudRect.width) left = cloudRect.width - popRect.width - 8;

        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
    }

    // --- Session History Cards ---
    function renderSessionCards() {
        var container = document.getElementById('sessionCards');
        container.innerHTML = '';

        allSessions.forEach(function (s, idx) {
            var stressLabel = s.stress_level != null ? s.stress_level + '%' : '--';
            var stressClass = 'stress-na';
            if (s.stress_level != null) {
                var sv = Number(s.stress_level);
                if (sv <= 33) stressClass = 'stress-low';
                else if (sv <= 66) stressClass = 'stress-med';
                else stressClass = 'stress-high';
            }

            var summaryPreview = s.summary ? truncate(s.summary, 100) : '';
            var hasSummary = !!s.summary;

            var card = document.createElement('div');
            card.className = 'session-hist-card';
            card.setAttribute('data-idx', idx);

            // Collapsed header
            var header =
                '<div class="shc-header">' +
                    '<span class="shc-date">' + escHtml(formatDate(s.created_at)) + '</span>' +
                    '<span class="shc-emotion-pill">' + escHtml(capitalize(s.emotion || '--')) + '</span>' +
                    '<span class="shc-stress ' + stressClass + '">' + escHtml(stressLabel) + '</span>' +
                    '<span class="shc-chevron">&#9662;</span>' +
                '</div>';

            // Summary preview (only if summary exists)
            var preview = summaryPreview
                ? '<div class="shc-preview">' + escHtml(summaryPreview) + '</div>'
                : '';

            // Expanded detail
            var detail =
                '<div class="shc-detail">' +
                    (hasSummary ? '<div class="shc-summary">' + escHtml(s.summary) + '</div>' : '') +
                    '<div class="shc-fields">' +
                        '<div class="shc-field"><span class="shc-field-label">Body Sensations</span><span>' + escHtml(arrJoin(s.body_sensations)) + '</span></div>' +
                        '<div class="shc-field"><span class="shc-field-label">Thoughts</span><span>' + escHtml(arrJoin(s.thoughts)) + '</span></div>' +
                        '<div class="shc-field"><span class="shc-field-label">Impulses</span><span>' + escHtml(arrJoin(s.impulses)) + '</span></div>' +
                        '<div class="shc-field"><span class="shc-field-label">Needs</span><span>' + escHtml(arrJoin(s.needs)) + '</span></div>' +
                    '</div>' +
                '</div>';

            card.innerHTML = header + preview + detail;

            card.addEventListener('click', function () {
                card.classList.toggle('expanded');
            });

            container.appendChild(card);
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

    // --- Account & Sign Out ---
    function setupAccount() {
        var emailEl = document.getElementById('dashboardEmail');
        var signOutBtn = document.getElementById('dashboardSignOut');

        // Try to get user info from auth module (loaded async as ES module)
        function populateEmail() {
            if (typeof window.getCurrentUser === 'function') {
                var user = window.getCurrentUser();
                if (user && emailEl) {
                    emailEl.textContent = user.email || '';
                }
            }
        }

        // Auth module loads async; retry briefly
        populateEmail();
        if (!emailEl.textContent) {
            var attempts = 0;
            var interval = setInterval(function () {
                populateEmail();
                attempts++;
                if (emailEl.textContent || attempts > 20) clearInterval(interval);
            }, 200);
        }

        if (signOutBtn) {
            signOutBtn.addEventListener('click', function () {
                if (typeof window.handleSignOut === 'function') {
                    window.handleSignOut().then(function () {
                        window.location.href = 'index.html';
                    });
                } else {
                    // Fallback: clear local state and redirect
                    localStorage.removeItem('userId');
                    window.location.href = 'index.html';
                }
            });
        }
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

    function truncate(str, max) {
        if (!str || str.length <= max) return str;
        return str.substring(0, max) + '...';
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
