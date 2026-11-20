
// Safe accessor for 10 mock tests database
function getMockTests() {
    if (typeof READING_MOCK_TESTS !== 'undefined' && Array.isArray(READING_MOCK_TESTS) && READING_MOCK_TESTS.length > 0) {
        return READING_MOCK_TESTS;
    }
    if (typeof window !== 'undefined' && window.READING_MOCK_TESTS && Array.isArray(window.READING_MOCK_TESTS) && window.READING_MOCK_TESTS.length > 0) {
        return window.READING_MOCK_TESTS;
    }
    if (typeof globalThis !== 'undefined' && globalThis.READING_MOCK_TESTS && Array.isArray(globalThis.READING_MOCK_TESTS)) {
        return globalThis.READING_MOCK_TESTS;
    }
    return [];
}

/**
 * VSTEP READING MOCK TESTS - Application Controller
 * English with Miss Nguyet
 */

// Application State
const state = {
    student: {
        name: localStorage.getItem('vstep_student_name') || 'Học viên',
        class: localStorage.getItem('vstep_student_class') || 'CB210',
        isLoggedIn: localStorage.getItem('vstep_logged_in') === 'true',
        isTeacher: false
    },
    soundEnabled: localStorage.getItem('vstep_sound_enabled') !== 'false',
    darkMode: localStorage.getItem('vstep_dark_mode') === 'true',
    voiceMode: localStorage.getItem('vstep_voice_mode') || 'studio',
    selectedVoiceURI: localStorage.getItem('vstep_voice_uri') || null,
    currentView: 'home',
    
    // CBT Active Exam State
    activeExam: {
        test: null,
        isFullExam: true,
        isSubmitted: false,
        currentPassageIdx: 0,
        currentQuestionId: 1,
        answers: {}, // { [qId]: 'A'|'B'|'C'|'D' }
        flags: {},   // { [qId]: boolean }
        timeLeft: 3600,
        timerInterval: null,
        highlighterActive: false,
        fontSize: 100,
        timeElapsed: 0,
        passagesHighlights: {}, // { [partId]: html }
        tabSwitches: 0,
        _lastCheatTime: 0
    },
    
    // Results & History
    lastResult: null,
    history: JSON.parse(localStorage.getItem('vstep_reading_history') || '[]'),
    savedExam: JSON.parse(localStorage.getItem('vstep_saved_exam_progress') || 'null'),
    postReadingViewed: JSON.parse(localStorage.getItem('vstep_postreading_viewed') || '{}'),
    
    // Vocab & Flashcards
    allVocab: [],
    filteredVocab: [],
    currentFlashcardIdx: 0,
    isCardFlipped: false,

    // Pre-Test Vocabulary Warm-Up State
    preTest: {
        testNum: 1,
        passageFilter: 'all', // 'all', '0', '1', '2', '3'
        levelFilter: 'all',   // 'all', 'B1', 'B2', 'C1'
        searchQuery: '',
        mode: 'cards',        // 'cards', 'flashcards', 'quiz', 'match'
        fcIdx: 0,
        fcFlipped: false,
        masteredWords: JSON.parse(localStorage.getItem('vstep_pretest_mastered') || '{}'),
        quizState: { qIdx: 0, score: 0, answered: false, selectedOpt: null, questions: [] },
        matchState: { leftItems: [], rightItems: [], selectedLeft: null, selectedRight: null, matchedCount: 0, pairMap: {} }
    },

    // Review Hub (Trả bài Từ Vựng & Thử thách Từ Đồng Nghĩa)
    review: {
        mainTab: 'vocab',         // 'vocab' | 'synonyms'
        vocabSubMode: 'quiz',     // 'quiz' | 'flashcards' | 'cards'
        synSubMode: 'match',      // 'match' | 'quiz'
        vocabTestVal: 'all',
        synTestVal: 'all',
        vocabSearch: '',
        fcIdx: 0,
        fcFlipped: false,
        vocabQuiz: { qIdx: 0, score: 0, answered: false, selectedOpt: null, questions: [] },
        synMatch: { leftItems: [], rightItems: [], selectedLeft: null, selectedRight: null, matchedCount: 0, pairMap: {}, startTime: null, secondsElapsed: 0, timerInterval: null },
        synQuiz: { qIdx: 0, score: 0, answered: false, selectedOpt: null, questions: [] }
    },

    // Post-Reading: Từ Vựng Chủ Chốt Giúp Suy Luận Đáp Án
    postReading: {
        filter: 'all', // 'all' | 'p1' | 'p2' | 'p3' | 'p4' | 'wrong'
        mode: 'cards', // 'cards' | 'table'
        modalTestNum: 1,
        modalPassageFilter: 'all',
        modalMode: 'cards',
        modalSearch: ''
    }
};

// =========================================================================
// SYNTHETIC WEB AUDIO ENGINE (ZERO EXTERNAL DEPENDENCY)
// =========================================================================
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type) {
    if (!state.soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'correct') {
            // Cheerful ascending chord (C5 - E5 - G5)
            [523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0.12, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.25);
            });
        } else if (type === 'incorrect') {
            // Soft low double tone
            [220, 196].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.08, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.18);
            });
        } else if (type === 'fanfare') {
            // Victory celebration
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                gain.gain.setValueAtTime(0.15, now + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 0.4);
            });
        }
    } catch (e) {
        console.warn('Audio playback error:', e);
    }
}

// =========================================================================
// NATURAL FEMALE AI VOICE & STUDIO NEURAL AUDIO ENGINE
// Ported from https://englishwithmsnguyet-dev.github.io/vstepspeakingpart1b2level/
// =========================================================================
function isMaleOrUnwantedVoice(voice) {
    if (!voice) return false;
    const name = ((voice.name || '') + ' ' + (voice.voiceURI || '')).toLowerCase();
    const blacklist = [
        'guy', 'male', 'david', 'mark', 'george', 'alex', 'fred', 'daniel', 'albert',
        'evan', 'nathan', 'oliver', 'tom', 'rishi', 'eddy', 'grandpa', 'jester', 'junior',
        'ralph', 'reed', 'rocko', 'zarvox', 'wobble', 'bad news', 'bahh', 'bells',
        'boing', 'bubbles', 'cellos', 'organ', 'superstar', 'whisper', 'trinoids',
        'alva', 'diego', 'jorge', 'juan', 'carlos'
    ];
    return blacklist.some(term => name.includes(term));
}

function getBestNaturalVoice(voices) {
    if (!voices || voices.length === 0) return null;
    const enVoices = voices.filter(v => v.lang && (v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().startsWith('us')));
    if (enVoices.length === 0) return null;

    // Ưu tiên hoàn toàn các giọng Nữ trong trẻo, tự nhiên
    const femaleOnlyVoices = enVoices.filter(v => !isMaleOrUnwantedVoice(v));
    const candidateList = femaleOnlyVoices.length > 0 ? femaleOnlyVoices : enVoices;

    // 1. Ưu tiên cao nhất: Các giọng Neural / Natural / Premium / Enhanced / Siri (Chất lượng phòng thu / người thật)
    const premiumKeywords = ['natural', 'premium', 'enhanced', 'neural', 'siri'];
    for (const kw of premiumKeywords) {
        const match = candidateList.find(v => (v.name && v.name.toLowerCase().includes(kw)) || (v.voiceURI && v.voiceURI.toLowerCase().includes(kw)));
        if (match) return match;
    }

    // 2. Trên iOS / macOS: Ưu tiên các giọng hiện đại chất lượng cao của Apple
    const appleModernNames = ['ava', 'allison', 'zoe', 'serena', 'samantha'];
    for (const name of appleModernNames) {
        const match = candidateList.find(v => v.name && v.name.toLowerCase().includes(name));
        if (match) return match;
    }

    // 3. Trên PC (Microsoft Edge, Windows, Chrome Desktop)
    const pcModernNames = ['jenny', 'aria', 'ava', 'google us english', 'google uk english female'];
    for (const name of pcModernNames) {
        const match = candidateList.find(v => v.name && v.name.toLowerCase().includes(name));
        if (match) return match;
    }

    // 4. Trên Android (Google Speech Services): Ưu tiên giọng network (WaveNet)
    const networkVoice = candidateList.find(v => (v.voiceURI && v.voiceURI.includes('network')) || (v.name && v.name.toLowerCase().includes('network')));
    if (networkVoice) return networkVoice;

    // 5. Lọc bỏ các giọng tổng hợp máy móc cổ điển nếu có giọng khác
    const nonRobotic = candidateList.filter(v => {
        const n = (v.name || '').toLowerCase();
        return !n.includes('alex') && !n.includes('fred') && !n.includes('victoria');
    });
    if (nonRobotic.length > 0) {
        return nonRobotic.find(v => v.lang.includes('US') || v.lang.includes('en-US')) || nonRobotic[0];
    }

    return candidateList[0];
}

function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return;
    const defaultVoice = getBestNaturalVoice(voices);
    if (defaultVoice && !state.selectedVoiceURI) {
        state.selectedVoiceURI = defaultVoice.voiceURI;
    }
}

if ('speechSynthesis' in window) {
    populateVoices();
    window.speechSynthesis.onvoiceschanged = () => populateVoices();
    const unlockAudioSubsystem = () => {
        try {
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
            window.speechSynthesis.getVoices();
            populateVoices();
        } catch (e) {}
    };
    document.addEventListener('click', unlockAudioSubsystem, { once: true, passive: true });
    document.addEventListener('touchstart', unlockAudioSubsystem, { once: true, passive: true });
}

let studioAudioManifest = window.studioAudioManifest || {};
if (!window.studioAudioManifest || Object.keys(window.studioAudioManifest).length === 0) {
    fetch('audio/manifest.json')
        .then(r => r.json())
        .then(data => {
            studioAudioManifest = data;
            window.studioAudioManifest = data;
        })
        .catch(() => {});
}

window.prepareSpeechText = function(txt) {
    if (!txt) return '';
    let t = String(txt);
    t = t.replace(/<[^>]*>/g, ' ');
    t = t.replace(/&amp;/g, ' and ')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'")
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>');
    t = t.replace(/^[→\-\*\•\s]+/, '');
    t = t.replace(/([a-zA-Z0-9])\s*\/\s*([a-zA-Z0-9])/g, '$1, or $2');
    t = t.replace(/\s*\(([^\)]+)\)/g, ', $1');
    t = t.replace(/\.{2,}/g, '.');
    t = t.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\/g, '');
    t = t.replace(/\s+/g, ' ').trim();
    return t;
};

window._activeUtterance = null;
window._activeUtterances = window._activeUtterances || new Set();
window._currentAudio = null;

function speakClassicTTS(cleanTxt) {
    if (!('speechSynthesis' in window)) return;
    try {
        if (window._currentAudio) {
            try {
                window._currentAudio.pause();
                window._currentAudio.currentTime = 0;
            } catch (e) {}
        }
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }

        const spokenTxt = window.prepareSpeechText(cleanTxt);
        if (!spokenTxt) return;

        const utt = new SpeechSynthesisUtterance(spokenTxt);
        window._activeUtterance = utt;
        window._activeUtterances.add(utt);

        const voices = window.speechSynthesis.getVoices() || [];
        let bestVoice = null;
        if (state.selectedVoiceURI) {
            bestVoice = voices.find(v => v.voiceURI === state.selectedVoiceURI);
            if (bestVoice && isMaleOrUnwantedVoice(bestVoice)) {
                bestVoice = null;
                state.selectedVoiceURI = null;
                try { localStorage.removeItem('vstep_voice_uri'); } catch (e) {}
            }
        }
        if (!bestVoice) {
            bestVoice = getBestNaturalVoice(voices);
        }

        if (bestVoice && bestVoice.lang && bestVoice.lang.toLowerCase().startsWith('en')) {
            utt.voice = bestVoice;
            utt.lang = bestVoice.lang;
        } else {
            utt.lang = 'en-US';
        }

        const savedSpeed = parseFloat(localStorage.getItem('vstep_voice_speed') || '0.96');
        utt.rate = isNaN(savedSpeed) ? 0.96 : savedSpeed;
        utt.pitch = 1.05; // Cao độ nữ tự nhiên, ấm áp

        const cleanup = () => {
            window._activeUtterances.delete(utt);
            if (window._activeUtterance === utt) window._activeUtterance = null;
            if (window._speechKeepAlive) {
                clearInterval(window._speechKeepAlive);
                window._speechKeepAlive = null;
            }
        };
        utt.onend = cleanup;
        utt.onerror = cleanup;

        if (window._speechKeepAlive) clearInterval(window._speechKeepAlive);
        window._speechKeepAlive = setInterval(() => {
            if (!window.speechSynthesis || !window.speechSynthesis.speaking) {
                clearInterval(window._speechKeepAlive);
                window._speechKeepAlive = null;
            } else if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }, 5000);

        window.speechSynthesis.speak(utt);
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    } catch (e) {
        console.warn('Error in classic TTS:', e);
    }
}

window.speakText = function(txt, forcedMode) {
    const rawClean = (txt || '').replace(/<[^>]*>/g, '').replace(/^→\s*/, '').replace(/[\r\n]+/g, ' ').trim();
    const cleanTxt = window.prepareSpeechText(txt);
    if (!cleanTxt && !rawClean) return;

    const mode = forcedMode || state.voiceMode || 'studio';

    if (mode === 'studio') {
        const manifest = window.studioAudioManifest || studioAudioManifest || {};
        const audioPath = manifest[rawClean] || manifest[rawClean.toLowerCase()] || manifest[cleanTxt] || manifest[cleanTxt.toLowerCase()];
        if (audioPath) {
            try {
                if (window._currentAudio) {
                    try {
                        window._currentAudio.pause();
                        window._currentAudio.currentTime = 0;
                    } catch (e) {}
                }
                if ('speechSynthesis' in window) {
                    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
                    window.speechSynthesis.cancel();
                }
                const audio = new Audio(audioPath);
                window._currentAudio = audio;

                audio.onerror = () => {
                    speakClassicTTS(cleanTxt || rawClean);
                };

                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        speakClassicTTS(cleanTxt || rawClean);
                    });
                }
                return;
            } catch (e) {
                console.warn('Audio tag error:', e);
            }
        }
    }

    speakClassicTTS(cleanTxt || rawClean);
};

function speakWord(word, forcedMode) {
    window.speakText(word, forcedMode);
}

function updateVoiceUI() {
    const mode = state.voiceMode || 'studio';
    const labelEl = document.getElementById('voice-mode-label');
    if (labelEl) {
        labelEl.textContent = mode === 'studio' ? 'Giọng Nữ Studio' : 'Giọng Gốc AI';
    }
}

function toggleVoiceMode() {
    const nextMode = state.voiceMode === 'studio' ? 'classic' : 'studio';
    state.voiceMode = nextMode;
    localStorage.setItem('vstep_voice_mode', nextMode);
    updateVoiceUI();
    const sampleSentence = "Sure. I often play sports in the afternoon whenever I have free time. It allows me to relax after a busy day and stay healthy.";
    window.speakText(sampleSentence, nextMode);
}

// =========================================================================
// APPLICATION INITIALIZATION
// =========================================================================
function initApp() {
    initTheme();
    updateVoiceUI();
    initStudentInfo();
    collectAllVocab();
    initCheatingDetector();
    renderDashboardTests();
    updateSidebarProgress();
    renderResumeBanners();
    initReviewSection();
    renderHistoryView();
    // Initialize default view
    switchView(state.currentView || 'home');
}

// Google Form Cloud Logger (Thống kê Đăng nhập, Điểm thi & Số lần vi phạm chuyển tab)
// Form: https://forms.gle/pJ7MfnVbNcnKSB8i9 (READING MOCK TESTS)
const GOOGLE_FORM_ENDPOINTS = [
    {
        url: 'https://docs.google.com/forms/d/e/1FAIpQLSc3LCy8gtiDfErynjobi9wJdaeCsFw4GdNGWMozI-IPNaROPg/formResponse',
        entry: 'entry.388968236'
    }
];

function sendToGoogleForm(payloadText) {
    if (!payloadText) return;
    GOOGLE_FORM_ENDPOINTS.forEach(cfg => {
        try {
            const formData = new FormData();
            formData.append(cfg.entry, payloadText);
            fetch(cfg.url, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            }).catch(() => {});
        } catch (err) {
            console.warn('Google Form log warning:', err);
        }
    });
}

// Cheating Monitor (Chỉ cảnh báo khi THỰC SỰ chuyển Tab hoặc qua màn hình/ứng dụng khác)
let _cheatBlurTimeout = null;
let _hasLeftExamContext = false;
let _leaveExamReason = '';

function initCheatingDetector() {
    if (window._cheatDetectorInitialized) return;
    window._cheatDetectorInitialized = true;

    // 1. Chuyển Tab hoặc Thu nhỏ trình duyệt (Visibility Change)
    document.addEventListener('visibilitychange', () => {
        if (state.currentView !== 'cbt' || !state.activeExam.test || state.activeExam.isSubmitted) return;

        if (document.hidden) {
            // Học viên thực sự chuyển sang tab khác hoặc thu nhỏ cửa sổ
            _hasLeftExamContext = true;
            _leaveExamReason = 'chuyển sang tab khác của trình duyệt hoặc thu nhỏ cửa sổ';
        } else {
            // Khi học viên nhấp quay trở lại tab bài thi
            if (_hasLeftExamContext) {
                _hasLeftExamContext = false;
                triggerCheatWarning(_leaveExamReason || 'chuyển sang tab khác');
            }
        }
    });

    // 2. Chuyển qua màn hình khác hoặc mở ứng dụng khác (Window Blur)
    window.addEventListener('blur', () => {
        if (state.currentView !== 'cbt' || !state.activeExam.test || state.activeExam.isSubmitted) return;
        
        // Không kích hoạt nếu modal cảnh báo đã đang hiển thị
        const modal = document.getElementById('cheat-warning-modal');
        if (modal && !modal.classList.contains('hidden')) return;

        if (_cheatBlurTimeout) clearTimeout(_cheatBlurTimeout);

        // Bộ lọc thời gian 2000ms:
        // Nếu học viên chỉ vô tình click chuột trong trang, cuộn trang, thanh cuộn,
        // hoặc hệ điều hành hiện thông báo chớp nhoáng (< 2 giây) -> sẽ bị hủy bỏ ngay khi lấy lại focus.
        // Chỉ khi học viên THỰC SỰ chuyển qua màn hình khác/ứng dụng khác kéo dài >= 2 giây mới ghi nhận!
        _cheatBlurTimeout = setTimeout(() => {
            if (state.currentView === 'cbt' && state.activeExam.test && !state.activeExam.isSubmitted) {
                if (!document.hasFocus() || document.hidden) {
                    _hasLeftExamContext = true;
                    _leaveExamReason = 'rời khỏi cửa sổ phòng thi sang màn hình hoặc ứng dụng khác';
                }
            }
        }, 2000);
    });

    // 3. Khi học viên quay trở lại cửa sổ phòng thi (Window Focus)
    window.addEventListener('focus', () => {
        // Hủy bỏ timer nếu mất tiêu điểm chỉ là chớp nhoáng (< 2s)
        if (_cheatBlurTimeout) {
            clearTimeout(_cheatBlurTimeout);
            _cheatBlurTimeout = null;
        }

        if (state.currentView !== 'cbt' || !state.activeExam.test || state.activeExam.isSubmitted) {
            _hasLeftExamContext = false;
            return;
        }

        // Nếu học viên đã thực sự rời phòng thi trước đó (>= 2s)
        if (_hasLeftExamContext) {
            _hasLeftExamContext = false;
            triggerCheatWarning(_leaveExamReason || 'rời khỏi màn hình làm bài');
        }
    });
}

function triggerCheatWarning(reason = 'chuyển tab hoặc rời khỏi màn hình làm bài') {
    if (state.currentView !== 'cbt') return;
    if (!state.activeExam.test || state.activeExam.isSubmitted) return;
    
    const now = Date.now();
    // Debounce 2500ms để tránh trigger nhiều lần liên tiếp
    if (state.activeExam._lastCheatTime && now - state.activeExam._lastCheatTime < 2500) {
        return;
    }
    state.activeExam._lastCheatTime = now;
    state.activeExam.tabSwitches = (state.activeExam.tabSwitches || 0) + 1;

    playSound('wrong');

    const badge = document.getElementById('cbt-tab-warning-badge');
    const countEl = document.getElementById('cbt-cheat-count');
    const modal = document.getElementById('cheat-warning-modal');
    const modalCount = document.getElementById('cheat-modal-count');
    const reasonEl = document.querySelector('.cheat-warning-text');

    if (badge) badge.classList.remove('hidden');
    if (countEl) countEl.textContent = state.activeExam.tabSwitches;
    if (reasonEl && reason) {
        reasonEl.innerHTML = `Hệ thống phát hiện bạn vừa <strong>${reason}</strong>. Hành vi này đã được ghi nhận vào lịch sử làm bài thi!`;
    }
    if (modal) modal.classList.remove('hidden');
    if (modalCount) modalCount.textContent = state.activeExam.tabSwitches;

    // Tự động lưu tiến độ và gửi ghi nhận vi phạm về Google Form
    if (typeof saveActiveExamProgress === 'function') {
        saveActiveExamProgress(false);
    }
    const nowStr = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
    const sName = state.student.name || 'Học viên';
    const sClass = state.student.class || '';
    const tNum = String(state.activeExam.test.testNum).padStart(2, '0');
    sendToGoogleForm(`[READING MOCK TESTS - VI PHẠM RỜI TAB LẦN ${state.activeExam.tabSwitches}] ${sName} - Lớp ${sClass} - Đề số ${tNum} (${reason}) - Lúc ${nowStr}`);
}

function dismissCheatWarning() {
    playSound('click');
    const modal = document.getElementById('cheat-warning-modal');
    if (modal) modal.classList.add('hidden');
    window.focus();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Fallback in case scripts load slightly delayed
window.addEventListener('load', () => {
    const grid = document.getElementById('tests-grid-container');
    if (grid && grid.children.length === 0) {
        initApp();
    }
});

// Theme Management
function initTheme() {
    if (state.darkMode) {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('#btn-theme-toggle i');
        if (icon) icon.className = 'fa-solid fa-sun';
    }
    const soundIcon = document.querySelector('#btn-sound-toggle i');
    if (soundIcon) {
        soundIcon.className = state.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }
}

function toggleTheme() {
    playSound('click');
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark-mode', state.darkMode);
    localStorage.setItem('vstep_dark_mode', state.darkMode);
    const icon = document.querySelector('#btn-theme-toggle i');
    if (icon) icon.className = state.darkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('vstep_sound_enabled', state.soundEnabled);
    const soundIcon = document.querySelector('#btn-sound-toggle i');
    if (soundIcon) {
        soundIcon.className = state.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }
    if (state.soundEnabled) playSound('click');
}

// Student Authentication & Allowed Classes Management
const ALLOWED_CLASSES = [
    { code: 'CB210', label: 'Lớp CB210' },
    { code: 'CB211', label: 'Lớp CB211' },
    { code: 'CB213', label: 'Lớp CB213' },
    { code: 'ONB103', label: 'Lớp ONB103' },
    { code: 'B212', label: 'Lớp B212' },
    { code: 'Gia Tuệ (B2)', label: 'Học viên Gia Tuệ (B2)' },
    { code: 'GV', label: 'Giáo viên (PTMN - GV)' }
];

// Official Student Rosters Extracted from CLASSES folder
const OFFICIAL_CLASS_ROSTER = {
    "CB210": [
        "Nguyễn Võ Thành Đạt",
        "Lê Huỳnh Thanh Duy",
        "Nguyễn Cao Kỳ Duyên",
        "Đào Ngọc Hân",
        "Trần Văn Hữu",
        "Trần Văn Kim Khoa",
        "Nguyễn Thanh Nâng",
        "Huỳnh Kỳ Nguyên",
        "Võ Thị Kim Nguyên",
        "Võ Hùng Sanh",
        "Tiền Thị Thanh Thảo",
        "Trần Thị Thanh Thảo",
        "Đặng Thị Kim Thoa",
        "Trần Thị Tiên Tiên",
        "Lê Kim Tuyền"
    ],
    "CB211": [
        "Hồ Anh Quân",
        "Lê Thành Nghiệp",
        "Lê Khánh Lâm",
        "Huỳnh Thị Ngọc Thắm",
        "Mai Trần Xuân Mai",
        "Lê Thị Uyển Nhi",
        "Nguyễn Thụy Thanh Trúc"
    ],
    "CB213": [
        "Nguyễn Quốc Anh",
        "Hoàng Hợp Minh Châu",
        "Đặng Châu Gia Huy",
        "Trần Minh Tuệ Mẩn",
        "Trần Minh Tuệ Mẫn",
        "Đặng Thị Trúc Măng",
        "Trương Thị Kha My",
        "Ngô Diễm My",
        "Chiêm Chúc Ngân",
        "Huỳnh Thị Yến Nhi",
        "Phạm Nguyễn Tâm Như",
        "Phạm Nhựt Tiến",
        "Phạm Nhật Tiến",
        "Lê Thị Tú Trinh",
        "Trần Ngọc Vinh"
    ],
    "ONB103": [
        "Nguyễn Thị Duy",
        "Phạm Trần Mỹ Hân",
        "Trịnh Thị Thu Hiền",
        "Nguyễn Hoàng Kha",
        "Phạm Thị Út Lụa",
        "Phạm Thị Út Lua",
        "Lê Huỳnh Diễm My",
        "Nguyễn Thị Ngọc Mỹ",
        "Huỳnh Thị Kim Ngân",
        "Trần Thị Kim Ngân",
        "Nguyễn Thị Tiểu Phụng",
        "Trần Yến Phụng",
        "Phạm Ngọc Thạch",
        "Cao Thị Thu Trang",
        "Nguyễn Thị Thanh Tuyền",
        "Trần Phạm Phương Uyên",
        "Trần Ngô Mỹ Vy"
    ],
    "B212": [
        "Nguyễn Duy Hồng Anh",
        "Nguyễn Ngọc Minh Anh",
        "Nguyễn Lê Mỹ Hân",
        "Nguyễn Hồng Minh Huy",
        "Nguyễn Quốc Khải",
        "Đoàn Nguyễn Đình Khang",
        "Lê Nguyễn Gia Khánh",
        "Nguyễn Hữu Khánh",
        "Hồ Thị Ngọc Lan",
        "Trần Thị Hồng Lỉnh",
        "Trần Thị Hồng Lĩnh",
        "Võ Thị Triệu Minh",
        "Hứa Đình Nghi",
        "Võ Thị Bảo Ngọc",
        "Lê Tiến Phát",
        "Nguyễn Hoàng Thông",
        "Trần Hoàng Thông",
        "Nguyễn Kim Tiền",
        "Lê Thị Bảo Trân",
        "Võ Thị Diễm Trinh",
        "Nguyễn Tấn Trung",
        "Nguyễn Tiến Trung",
        "Trần Thị Ánh Tuyết",
        "Đặng Nguyễn Khánh Uyên",
        "Nguyễn Thị Chúc Yến"
    ],
    "B2": [
        "Gia Tuệ",
        "Trương Gia Tuệ",
        "Gia Tuê",
        "Nguyễn Gia Tuệ",
        "Trần Gia Tuệ",
        "Lê Gia Tuệ"
    ],
    "Gia Tuệ (B2)": [
        "Gia Tuệ",
        "Trương Gia Tuệ",
        "Gia Tuê",
        "Nguyễn Gia Tuệ",
        "Trần Gia Tuệ",
        "Lê Gia Tuệ"
    ],
    "GV": [
        "PTMN - GV",
        "PTMN",
        "PTMN-GV",
        "PTMN – GV",
        "Miss Nguyệt",
        "Miss Nguyet",
        "Cô Nguyệt",
        "Co Nguyet",
        "Nguyệt Phạm",
        "Nguyet Pham",
        "Phạm Thị Minh Nguyệt",
        "Pham Thi Minh Nguyet"
    ],
    "CB206": [
        "Văn Như Anh", "Nguyễn Thị Vân Anh", "Nguyễn Thị Hồng Duyên", "Nguyễn Thị Thúy Hồng",
        "Trương Ngọc Nhi", "Nguyễn Phạm Như Quỳnh", "Trần Lê Quỳnh", "Thị Mỹ Tâm", "Ông Lê Thành",
        "Trần Nguyễn Thanh Thảo", "Phan Nhật Thiện", "Nguyễn Mỹ Tiên", "Trần Thị Cẩm Tiên",
        "Võ Trần Bảo Tính", "Trương Thanh Toàn", "Phạm Ngọc Trâm", "Nguyễn Võ Bảo Trân"
    ],
    "CB219": [
        "Lưu Thị Vân Anh", "Nguyễn Tuấn Anh", "Trần Thị Huỳnh Duy", "Duy Thị Quỳnh Hân",
        "Trần Thị Xuân Hoa", "Nguyễn Phạm Khang", "Đặng Văn Khánh", "Chim Nhật Luân",
        "Lư Vĩnh Phúc", "Nguyễn Chí Thiện", "Trần Thị Ngọc Thơ", "Huỳnh Yến Trang",
        "Thị Thu Trinh", "Nguyễn Thị Mỹ Xuyên", "Nguyễn Như Ý"
    ],
    "CB220": [
        "Lý Quốc Dũng", "Phan Minh Khôi", "Huỳnh Văn My", "Mai Thúy Ngân",
        "Võ Huỳnh Thảo Nguyên", "Đặng Dũ Nguyên", "Nguyễn Gia Nguyễn", "Trương Thị Thảo Như",
        "Huỳnh Nhật Phát", "Nguyễn Huỳnh Thanh Sơn", "Thái Nhựt Thịnh", "Trần Nguyễn Huỳnh Trâm",
        "Nguyễn Thị Tường Vi", "Lê Tường Vy", "Bùi Ngọc Như Ý"
    ]
};

// Vietnamese string normalizer for intelligent case & tone-insensitive matching
function normalizeVietnamese(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/\s+/g, ' ')
        .trim();
}

function validateAllowedClass(rawClass) {
    if (!rawClass) return null;
    const norm = normalizeVietnamese(rawClass);
    const noSpace = norm.replace(/[\s\-_]/g, '');

    // 1. Tài khoản Giáo viên (PTMN - GV)
    if (noSpace === 'gv' || noSpace === 'ptmn' || noSpace === 'ptmngv' || noSpace.includes('giaovien') || norm.includes('giao vien')) {
        return 'GV';
    }

    // 2. Các lớp chính thức: CB210, CB211, CB213, ONB103, B212 và B2 (Gia Tuệ)
    if (noSpace === 'cb210' || noSpace === 'lopcb210') return 'CB210';
    if (noSpace === 'cb211' || noSpace === 'lopcb211') return 'CB211';
    if (noSpace === 'cb213' || noSpace === 'lopcb213') return 'CB213';
    if (noSpace === 'onb103' || noSpace === 'loponb103') return 'ONB103';
    if (noSpace === 'b212' || noSpace === 'lopb212') return 'B212';
    if (noSpace === 'b2' || noSpace === 'lopb2' || noSpace.includes('giatue') || norm.includes('gia tue')) return 'B2';

    return null;
}

// Find official student in a specific class
function findOfficialStudent(inputName, canonicalClass) {
    if (!inputName || !canonicalClass) return null;
    const classStudents = OFFICIAL_CLASS_ROSTER[canonicalClass] || [];
    const normInput = normalizeVietnamese(inputName);
    const noSpaceInput = normInput.replace(/[\s\-_]/g, '');

    // Teacher special matching: PTMN - GV
    if (canonicalClass === 'GV') {
        if (noSpaceInput.includes('ptmn') || noSpaceInput.includes('gv') || normInput.includes('nguyet') || normInput.includes('giao vien')) {
            return 'PTMN - GV';
        }
    }

    // 1. Exact match
    const exactMatch = classStudents.find(s => s.trim().toLowerCase() === inputName.trim().toLowerCase());
    if (exactMatch) return exactMatch;

    // 2. Normalized match (without diacritics / accents)
    const normMatch = classStudents.find(s => normalizeVietnamese(s) === normInput);
    if (normMatch) return normMatch;

    // 3. Normalized without spaces or dashes
    const noSpaceMatch = classStudents.find(s => normalizeVietnamese(s).replace(/[\s\-_]/g, '') === noSpaceInput);
    if (noSpaceMatch) return noSpaceMatch;

    // 4. Partial multi-word match (e.g. "Gia Tuệ" for "Trương Gia Tuệ")
    const inputWords = normInput.split(' ').filter(Boolean);
    if (inputWords.length >= 2) {
        const partialMatch = classStudents.find(s => {
            const normS = normalizeVietnamese(s);
            return normS.includes(normInput) || normInput.includes(normS);
        });
        if (partialMatch) return partialMatch;
    }

    return null;
}

// Find which class a student belongs to (auto-detection)
function findClassByStudentName(inputName) {
    if (!inputName || inputName.trim().length < 3) return null;
    const norm = normalizeVietnamese(inputName).replace(/[\s\-_]/g, '');
    if (norm.includes('ptmn') || norm.includes('nguyet')) {
        return { classCode: 'GV', officialName: 'PTMN - GV' };
    }
    const targetClasses = ['CB210', 'CB211', 'CB213', 'ONB103', 'B212', 'B2'];
    for (const cls of targetClasses) {
        const matched = findOfficialStudent(inputName, cls);
        if (matched) return { classCode: cls, officialName: matched };
    }
    return null;
}

function initStudentInfo() {
    const isLoggedIn = sessionStorage.getItem('vstep_logged_in') === 'true' || localStorage.getItem('vstep_logged_in') === 'true';
    const savedName = sessionStorage.getItem('vstep_student_name') || localStorage.getItem('vstep_student_name') || '';
    const savedClass = sessionStorage.getItem('vstep_student_class') || localStorage.getItem('vstep_student_class') || '';

    state.student.isLoggedIn = isLoggedIn;
    state.student.name = savedName || 'Học viên';
    state.student.class = savedClass || '';
    state.student.isTeacher = (savedClass === 'GV' || savedName.toUpperCase().includes('PTMN'));

    if (isLoggedIn && savedName) {
        sessionStorage.setItem('vstep_logged_in', 'true');
        sessionStorage.setItem('vstep_student_name', savedName);
        sessionStorage.setItem('vstep_student_class', savedClass);
    }

    updateHeaderStudentUI(state.student.name, state.student.class, state.student.isTeacher);

    // If not logged in yet, prompt modal immediately
    if (!isLoggedIn) {
        openStudentModal(true); // force login
    } else {
        closeStudentModal();
    }
}

function updateHeaderStudentUI(name = state.student.name, sClass = state.student.class, isTeacher = state.student.isTeacher) {
    const nameHeader = document.getElementById('user-name-header');
    if (nameHeader) nameHeader.textContent = name;

    const classHeader = document.getElementById('user-class-header');
    if (classHeader) {
        if (state.student.isLoggedIn && sClass) {
            classHeader.textContent = isTeacher ? 'Giáo viên (GV)' : sClass;
            classHeader.style.display = 'block';
        } else {
            classHeader.style.display = 'none';
        }
    }

    const avatarLetter = document.getElementById('user-avatar-letter');
    if (avatarLetter) {
        avatarLetter.textContent = name.charAt(0).toUpperCase() || 'H';
    }

    const modalName = document.getElementById('progress-modal-student-name');
    const modalClass = document.getElementById('progress-modal-student-class');
    if (modalName) modalName.textContent = name;
    if (modalClass) modalClass.textContent = isTeacher ? 'Giáo viên (GV)' : sClass;

    syncClassAccessRestrictions();
    if (typeof renderDashboardTests === 'function') renderDashboardTests();
}

// Kiểm tra khóa đề thi theo lớp học (Lớp B212 mở TEST 01, các đề 02 - 10 khóa)
function isTestLocked(testNum) {
    if (state.student.isTeacher || state.student.class === 'GV') return false;
    if (state.student.class === 'B212') {
        return Number(testNum) !== 1;
    }
    return false;
}

function notifyLockedTest(testNum) {
    playSound('wrong');
    const numStr = String(testNum).padStart(2, '0');
    showToast(`🔒 Đề số ${numStr} hiện đang khóa đối với lớp B212! Lớp B212 hiện mở Đề số 01.`, 'warning');
}

function syncClassAccessRestrictions() {
    const isB212 = (state.student.class === 'B212' && !state.student.isTeacher);
    const selectIds = ['post-modal-test-select', 'vocab-test-select', 'synonym-test-select'];
    selectIds.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        Array.from(sel.options).forEach(opt => {
            if (!opt.dataset.origText) opt.dataset.origText = opt.textContent;
            if (opt.value === 'all') {
                opt.textContent = isB212 ? 'Đề số 01 (Đã mở khóa cho lớp B212)' : opt.dataset.origText;
                return;
            }
            const tNum = parseInt(opt.value);
            if (!isNaN(tNum)) {
                const locked = isTestLocked(tNum);
                opt.disabled = locked;
                opt.textContent = locked ? `🔒 ${opt.dataset.origText} (Đang khóa)` : opt.dataset.origText;
            }
        });
        if (isB212 && sel.value !== 'all' && isTestLocked(sel.value)) {
            sel.value = '1';
        }
    });
}

function openStudentModal(force = false) {
    const modal = document.getElementById('student-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('login-modal-close-btn');
    if (closeBtn) {
        if (force) {
            closeBtn.classList.add('hidden');
        } else {
            closeBtn.classList.remove('hidden');
        }
    }

    // Inputs
    const nameInput = document.getElementById('login-student-name');
    const classInput = document.getElementById('login-student-class');
    const pwdInput = document.getElementById('login-password');
    const errBox = document.getElementById('login-error-msg');

    if (errBox) {
        errBox.textContent = '';
        errBox.classList.add('hidden');
    }

    if (force || !state.student.isLoggedIn) {
        // Absolutely no pre-filled values on login screen
        if (nameInput) nameInput.value = '';
        if (classInput) classInput.value = '';
        if (pwdInput) pwdInput.value = '';
    } else {
        // Only prefill if user is logged in and clicked "Đổi thông tin"
        if (nameInput) nameInput.value = state.student.name !== 'Học viên' ? state.student.name : '';
        if (classInput) classInput.value = state.student.class || '';
        if (pwdInput) pwdInput.value = '';
    }
}

function closeStudentModal() {
    const modal = document.getElementById('student-modal');
    if (modal) modal.classList.add('hidden');
}

function isValidTeacherLogin(rawName, rawClass) {
    const n = normalizeVietnamese(rawName).replace(/[\s\-_]/g, '');
    const c = normalizeVietnamese(rawClass).replace(/[\s\-_]/g, '');
    if ((n === 'ptmn' || n === 'ptmngv') && (c === 'gv' || c === 'ptmngv' || c === 'ptmn')) {
        return true;
    }
    if (n === 'ptmngv' && (!c || c === 'gv' || c === 'ptmn' || c === 'ptmngv')) {
        return true;
    }
    if (c === 'ptmngv' && (!n || n === 'ptmn' || n === 'gv' || n === 'ptmngv')) {
        return true;
    }
    return false;
}

function submitStudentLogin() {
    playSound('click');
    const nameInput = document.getElementById('login-student-name');
    const classInput = document.getElementById('login-student-class');
    const pwdInput = document.getElementById('login-password');
    const errBox = document.getElementById('login-error-msg');

    let rawName = nameInput ? nameInput.value.trim() : '';
    let rawClass = classInput ? classInput.value.trim() : '';
    const rawPwd = pwdInput ? pwdInput.value.trim() : '';

    const showError = (msg) => {
        if (errBox) {
            errBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
            errBox.classList.remove('hidden');
            errBox.style.animation = 'none';
            errBox.offsetHeight; /* trigger reflow */
            errBox.style.animation = 'shake 0.3s ease-in-out';
        } else {
            alert(msg);
        }
        playSound('wrong');
    };

    // 1. TÀI KHOẢN GIÁO VIÊN (PTMN - GV): Không yêu cầu mật khẩu
    if (isValidTeacherLogin(rawName, rawClass)) {
        state.student.name = 'PTMN - GV';
        state.student.class = 'GV';
        state.student.isTeacher = true;
        state.student.isLoggedIn = true;

        sessionStorage.setItem('vstep_logged_in', 'true');
        sessionStorage.setItem('vstep_student_name', 'PTMN - GV');
        sessionStorage.setItem('vstep_student_class', 'GV');
        localStorage.setItem('vstep_logged_in', 'true');
        localStorage.setItem('vstep_student_name', 'PTMN - GV');
        localStorage.setItem('vstep_student_class', 'GV');

        updateHeaderStudentUI('PTMN - GV', 'GV', true);
        playSound('correct');
        closeStudentModal();
        showLoginToast('Chào mừng Cô Nguyệt (PTMN - GV) đã đăng nhập vào hệ thống!');
        const nowStr = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
        sendToGoogleForm(`[READING MOCK TESTS - ĐĂNG NHẬP] Giáo viên: PTMN - GV - Lúc ${nowStr}`);
        return;
    }

    // 2. TÀI KHOẢN KHÁC (HỌC VIÊN CÁC LỚP CB210, CB211, CB213, ONB103, B212): Yêu cầu mật khẩu (không hiển thị sẵn mật khẩu)
    if (!rawName) {
        showError('Vui lòng nhập Họ và tên học viên!');
        if (nameInput) nameInput.focus();
        return;
    }

    if (!rawClass) {
        showError('Vui lòng nhập Mã lớp học!');
        if (classInput) classInput.focus();
        return;
    }

    if (!rawPwd) {
        showError('Vui lòng nhập mật khẩu truy cập!');
        if (pwdInput) pwdInput.focus();
        return;
    }

    const validPasswords = ['VSTEPREADING', 'STUDYHARD', 'VSTEPSEPTEMBER', 'PTMN2896', 'PTMN2412', 'PTMN2805'];
    if (!validPasswords.includes(rawPwd.toUpperCase())) {
        showError('Mật khẩu truy cập không chính xác! Vui lòng kiểm tra lại.');
        if (pwdInput) {
            pwdInput.value = '';
            pwdInput.focus();
        }
        return;
    }

    const canonicalClass = validateAllowedClass(rawClass);
    if (canonicalClass === 'GV') {
        showError('Mã lớp GV chỉ dành riêng cho tài khoản Giáo viên (PTMN - GV)!');
        if (nameInput) nameInput.focus();
        return;
    }

    if (!canonicalClass) {
        showError('Mã lớp học không hợp lệ. Hệ thống chỉ nhận học viên các lớp: <strong>CB210, CB211, CB213, ONB103, B212</strong>!');
        if (classInput) classInput.focus();
        return;
    }

    // YÊU CẦU NHẬP ĐÚNG TÊN VÀ MÃ LỚP (Đối chiếu danh sách gốc từ thư mục CLASSES)
    const matchedOfficialName = findOfficialStudent(rawName, canonicalClass);
    if (!matchedOfficialName) {
        const otherClass = findClassByStudentName(rawName);
        if (otherClass && otherClass.classCode !== canonicalClass && otherClass.classCode !== 'GV') {
            showError(`Học viên "<strong>${rawName}</strong>" thuộc lớp <strong>${otherClass.classCode}</strong>, không phải lớp <strong>${canonicalClass}</strong>.<br><small style="margin-top:6px; display:block; opacity:0.9;">⚠️ Vui lòng nhập đúng mã lớp <strong>${otherClass.classCode}</strong>!</small>`);
        } else {
            showError(`Họ và tên "<strong>${rawName}</strong>" không có trong danh sách của lớp <strong>${canonicalClass}</strong>.<br><small style="margin-top:6px; display:block; opacity:0.9;">⚠️ Yêu cầu nhập đúng họ tên và mã lớp (CB210, CB211, CB213, ONB103, B212)!</small>`);
        }
        if (nameInput) nameInput.focus();
        return;
    }

    // Đăng nhập thành công học viên
    state.student.name = matchedOfficialName;
    state.student.class = canonicalClass;
    state.student.isTeacher = false;
    state.student.isLoggedIn = true;

    sessionStorage.setItem('vstep_logged_in', 'true');
    sessionStorage.setItem('vstep_student_name', matchedOfficialName);
    sessionStorage.setItem('vstep_student_class', canonicalClass);
    localStorage.setItem('vstep_logged_in', 'true');
    localStorage.setItem('vstep_student_name', matchedOfficialName);
    localStorage.setItem('vstep_student_class', canonicalClass);

    updateHeaderStudentUI(matchedOfficialName, canonicalClass, false);
    playSound('correct');
    closeStudentModal();
    showLoginToast(`Chào mừng học viên ${matchedOfficialName} (Lớp ${canonicalClass}) đã vào hệ thống!`);
    const nowStr = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
    sendToGoogleForm(`[READING MOCK TESTS - ĐĂNG NHẬP] Học viên: ${matchedOfficialName} - Lớp: ${canonicalClass} - Lúc ${nowStr}`);
}

function toggleLoginPassword() {
    playSound('click');
    const pwdInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('login-pwd-eye');
    if (!pwdInput) return;

    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        if (eyeIcon) eyeIcon.className = 'fa-regular fa-eye-slash';
    } else {
        pwdInput.type = 'password';
        if (eyeIcon) eyeIcon.className = 'fa-regular fa-eye';
    }
}

function handleUserProfileClick() {
    playSound('click');
    const isLoggedIn = localStorage.getItem('vstep_logged_in') === 'true';
    if (!isLoggedIn) {
        openStudentModal(true);
        return;
    }

    // Open profile modal
    const profileModal = document.getElementById('profile-modal');
    if (!profileModal) {
        openStudentModal(false);
        return;
    }

    const name = state.student.name || 'Học viên';
    const sClass = state.student.class || 'CB210';
    const isTeacher = state.student.isTeacher || sClass === 'GV' || name.toUpperCase() === 'PTMN';

    const avatarDisplay = document.getElementById('profile-avatar-display');
    const nameDisplay = document.getElementById('profile-name-display');
    const classDisplay = document.getElementById('profile-class-display');
    const roleDisplay = document.getElementById('profile-role-display');

    if (avatarDisplay) avatarDisplay.textContent = name.charAt(0).toUpperCase();
    if (nameDisplay) nameDisplay.textContent = name;
    if (classDisplay) classDisplay.textContent = `Lớp: ${isTeacher ? 'Giáo viên (GV)' : sClass}`;
    if (roleDisplay) roleDisplay.textContent = isTeacher ? 'Giáo viên phụ trách (PTMN)' : 'Học viên chính thức';

    profileModal.classList.remove('hidden');
}

function closeProfileModal() {
    playSound('click');
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) profileModal.classList.add('hidden');
}

function reopenLoginForm() {
    closeProfileModal();
    openStudentModal(false);
}

function logoutStudent() {
    playSound('click');
    if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
        localStorage.removeItem('vstep_logged_in');
        state.student.isLoggedIn = false;
        closeProfileModal();
        openStudentModal(true);
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    let bg = 'linear-gradient(135deg, #10b981, #059669)';
    let icon = 'fa-circle-check';
    if (type === 'info') {
        bg = 'linear-gradient(135deg, #0284c7, #2563eb)';
        icon = 'fa-circle-info';
    } else if (type === 'warning') {
        bg = 'linear-gradient(135deg, #f59e0b, #d97706)';
        icon = 'fa-triangle-exclamation';
    } else if (type === 'error') {
        bg = 'linear-gradient(135deg, #ef4444, #dc2626)';
        icon = 'fa-circle-xmark';
    }

    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${bg};
        color: #ffffff;
        padding: 13px 22px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.92rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.28);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: toastIn 0.3s ease;
    `;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3200);
}

function showLoginToast(message) {
    showToast(message, 'success');
}

// Navigation View Switcher
function switchView(viewName) {
    playSound('click');
    // Normalize legacy aliases
    if (viewName === 'dashboard') viewName = 'exam';
    if (viewName === 'vocab') viewName = 'review';
    state.currentView = viewName;

    // Auto-close sidebar on mobile when switching views
    const sidebarEl = document.getElementById('app-sidebar');
    if (sidebarEl) sidebarEl.classList.remove('open');
    
    const views = ['home', 'exam', 'practice', 'pretest', 'cbt', 'results', 'review', 'history', 'dashboard', 'vocab'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
    });

    // Update Top Header Title and Sidebar Buttons
    document.querySelectorAll('.nav-link-btn').forEach(btn => btn.classList.remove('active'));
    const targetNav = document.getElementById(`nav-btn-${viewName}`);
    if (targetNav) targetNav.classList.add('active');

    const topHeader = document.getElementById('app-top-header');
    const titleEl = document.getElementById('current-view-title');

    if (viewName === 'cbt') {
        topHeader.style.display = 'none';
        document.getElementById('app-sidebar').style.display = 'none';
        const cbtEl = document.getElementById('view-cbt');
        if (cbtEl) cbtEl.classList.remove('hidden');
    } else {
        topHeader.style.display = 'flex';
        document.getElementById('app-sidebar').style.display = 'flex';
        
        const targetViewEl = document.getElementById(`view-${viewName}`);
        if (targetViewEl) targetViewEl.classList.remove('hidden');

        if (viewName === 'home') {
            titleEl.textContent = 'VSTEP READING MOCK TEST';
        } else if (viewName === 'exam') {
            titleEl.textContent = 'PHÒNG THI VSTEP READING (10 ĐỀ CHUẨN CBT)';
            renderDashboardTests();
        } else if (viewName === 'practice') {
            titleEl.textContent = 'PHÒNG LUYỆN ĐỌC THEO CHỦ ĐỀ THỰC CHIẾN';
            renderPracticeView();
        } else if (viewName === 'review') {
            titleEl.textContent = 'TRUNG TÂM ÔN TẬP VSTEP READING';
            initReviewSection();
        } else if (viewName === 'pretest') {
            titleEl.textContent = `BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (ĐỀ SỐ ${String(state.preTest.testNum).padStart(2, '0')})`;
            renderPreTestView();
        } else if (viewName === 'history') {
            titleEl.textContent = 'LỊCH SỬ THI THỬ & BẢNG THÀNH TÍCH';
            renderHistoryView();
        } else if (viewName === 'results') {
            titleEl.textContent = 'BÁO CÁO KẾT QUẢ & GIẢI THÍCH HỌC THUẬT';
        }
    }

    // Render resume banners on home or exam room
    if (typeof renderResumeBanners === 'function') {
        renderResumeBanners();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    sidebar.classList.toggle('open');
}

// =========================================================================
// DASHBOARD RENDERING & TESTS PROGRESS
// =========================================================================
function renderDashboardTests() {
    const container = document.getElementById('tests-grid-container');
    if (!container) return;

    const allTests = getMockTests();
    if (!allTests || allTests.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--surface-solid); border-radius: 16px; border: 1.5px dashed var(--border-color);">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 12px;"></i>
                <h3 style="color: var(--text-color); margin-bottom: 6px;">Đang tải dữ liệu 10 đề thi...</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Hệ thống đang chuẩn bị dữ liệu đề thi thử.</p>
            </div>
        `;
        setTimeout(() => {
            const recheck = getMockTests();
            if (recheck && recheck.length > 0) {
                renderDashboardTests();
                collectAllVocab();
                updateSidebarProgress();
            }
        }, 200);
        return;
    }

    // TÁCH BIỆT TRIỆT ĐỂ: PHÒNG THI (view-exam) CHỈ hiển thị đúng 10 ĐỀ THI GỐC (testNum <= 10)
    // Toàn bộ các bộ đề thực chiến (Đề 11 trở đi) thuộc độc quyền PHÒNG LUYỆN ĐỌC (view-practice)
    const tests = allTests.filter(t => t.testNum <= 10);

    container.innerHTML = '';
    
    tests.forEach(test => {
        const locked = isTestLocked(test.testNum);
        // Find best previous score for this test
        const savedAnsCount = (state.savedExam && state.savedExam.answers) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved = !locked && state.savedExam && state.savedExam.testNum === test.testNum && savedAnsCount > 0;
        const attempts = state.history.filter(h => h.testId === test.testId);
        let statusBadge = `<span class="test-card-status status-not-done"><i class="fa-regular fa-circle"></i> Chưa làm</span>`;
        if (locked) {
            statusBadge = `<span class="test-card-status" style="background:#fee2e2; color:#dc2626; border:1.5px solid #fecaca;"><i class="fa-solid fa-lock"></i> Đang khóa</span>`;
        } else if (isSaved) {
            statusBadge = `<span class="test-card-status" style="background:#fef3c7; color:#92400e; border:1.5px solid #fde68a;"><i class="fa-solid fa-clock-rotate-left"></i> Đang làm dở (${savedAnsCount}/40)</span>`;
        } else if (attempts.length > 0) {
            const best = attempts.reduce((max, cur) => cur.score > max.score ? cur : max, attempts[0]);
            statusBadge = `<span class="test-card-status status-completed"><i class="fa-solid fa-circle-check"></i> Đạt: ${best.score}/40 (${best.band})</span>`;
        }

        const card = document.createElement('div');
        card.className = locked ? 'test-card is-locked' : 'test-card';
        if (locked) {
            card.style.opacity = '0.78';
        }
        
        let passagesListHtml = '';
        test.passages.forEach((p, idx) => {
            passagesListHtml += `
                <div class="test-passage-item" title="${p.topic}">
                    <i class="fa-solid ${locked ? 'fa-lock' : 'fa-bookmark'}" style="${locked ? 'color:#94a3b8;' : ''}"></i>
                    <strong>P0${idx+1}:</strong> ${p.title.replace(/^Passage\s*\d+:\s*/i, '')}
                </div>
            `;
        });

        // Count total vocab & mastered vocab for this test
        let testVocabCount = 0;
        let testMasteredCount = 0;
        test.passages.forEach(p => {
            (p.vocab || []).forEach(v => {
                testVocabCount++;
                const key = `${test.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords[key]) testMasteredCount++;
            });
        });

        const actionsHtml = locked ? `
            <div class="test-card-actions">
                <button class="secondary-btn" style="background: #f1f5f9; color: #64748b; border: 1.5px dashed #cbd5e1; margin-bottom: 8px; width: 100%; justify-content: center; cursor: not-allowed;" onclick="notifyLockedTest(${test.testNum})">
                    <i class="fa-solid fa-lock" style="color: #ef4444;"></i> BƯỚC 1: PRE-READING (ĐANG KHÓA)
                </button>
                <button class="secondary-btn" style="background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; width: 100%; justify-content: center; font-weight: 800; cursor: not-allowed;" onclick="notifyLockedTest(${test.testNum})">
                    <i class="fa-solid fa-lock"></i> BƯỚC 2: WHILE-READING (ĐANG KHÓA)
                </button>
                <button class="secondary-btn" style="background: #f1f5f9; color: #64748b; border: 1.5px dashed #cbd5e1; margin-top: 8px; width: 100%; justify-content: center; cursor: not-allowed;" onclick="notifyLockedTest(${test.testNum})">
                    <i class="fa-solid fa-lock" style="color: #ef4444;"></i> BƯỚC 3: POST-READING (ĐANG KHÓA)
                </button>
            </div>
        ` : `
            <div class="test-card-actions">
                <button class="primary-btn" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); margin-bottom: 8px; width: 100%; justify-content: center;" onclick="openPreTestView(${test.testNum})">
                    <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${testMasteredCount}/${testVocabCount} từ)
                </button>
                <button class="primary-btn" style="background: ${isSaved ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #059669, #10b981)'}; width: 100%; justify-content: center;" onclick="${isSaved ? 'resumeSavedExam()' : `startFullExam(${test.testNum})`}">
                    ${isSaved ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC BÀI DỞ DANG (${savedAnsCount}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI 60 PHÚT`}
                </button>
                <button class="primary-btn" style="background: linear-gradient(135deg, #0284c7, #06b6d4); margin-top: 8px; width: 100%; justify-content: center;" onclick="openPostReadingModal(${test.testNum})">
                    <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • TỪ VỰNG SUY LUẬN
                </button>
                <div class="test-card-secondary-row">
                    <button class="secondary-btn" onclick="openPreTestView(${test.testNum}, 'passages')">
                        <i class="fa-solid fa-layer-group"></i> Luyện 1 Passage
                    </button>
                    <button class="secondary-btn" onclick="openPreTestView(${test.testNum}, 'quiz')">
                        <i class="fa-solid fa-bolt"></i> Phản xạ từ vựng
                    </button>
                </div>
            </div>
        `;

        card.innerHTML = `
            <div class="test-card-top">
                <div class="test-card-badge-row">
                    <span class="test-card-num">ĐỀ SỐ ${String(test.testNum).padStart(2, '0')}</span>
                    ${statusBadge}
                </div>
                <h3 class="test-card-title">${test.title}</h3>
                <div class="test-passages-list">
                    <div style="font-size: 0.78rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">4 Bài đọc học thuật:</div>
                    ${passagesListHtml}
                </div>
            </div>
            ${actionsHtml}
        `;
        container.appendChild(card);
    });
}

function updateSidebarProgress() {
    if (!getMockTests()) return;
    // TÁCH BIỆT TRIỆT ĐỂ: Sidebar Progress chỉ theo dõi tiến độ của 10 đề thi chuẩn
    const coreTests = (getMockTests() || []).filter(t => t.testNum <= 10);
    const completedSet = new Set(state.history.filter(h => {
        const num = parseInt(String(h.testId).replace(/\D/g, ''));
        return num <= 10;
    }).map(h => h.testId));
    const count = completedSet.size;
    const total = 10;
    const percent = Math.round((count / total) * 100);

    const fill = document.getElementById('sidebar-progress-fill');
    const text = document.getElementById('sidebar-progress-text');
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${count}/${total} Đề hoàn thành (${percent}%)`;

    const syncBadge = document.getElementById('sidebar-sync-badge');
    if (syncBadge) {
        const savedAnsCount = (state.savedExam && state.savedExam.answers) ? Object.keys(state.savedExam.answers).length : 0;
        if (state.savedExam && state.savedExam.testNum && savedAnsCount > 0) {
            syncBadge.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Có bài dở (Đề ${state.savedExam.testNum})`;
            syncBadge.style.color = '#fbbf24';
        } else {
            syncBadge.innerHTML = `<i class="fa-solid fa-shield-check"></i> Đã lưu an toàn`;
            syncBadge.style.color = '#34d399';
        }
    }
}

// =========================================================================
// PHÒNG LUYỆN ĐỌC THEO BỘ ĐỀ THỰC CHIẾN (1 TEST = 4 TOPICS CHUẨN HÓA)
// =========================================================================
state.practice = {
    filter: 'all'
};

function filterPracticeTopics(filterKey, btnEl) {
    playSound('click');
    state.practice.filter = filterKey;
    document.querySelectorAll('.practice-filter-pill').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderPracticeView();
}

function renderPracticeView() {
    const container = document.getElementById('practice-test-suites-container');
    if (!container) return;

    const tests = getMockTests() || [];
    const test11 = tests.find(t => t.testNum === 11);
    const test12 = tests.find(t => t.testNum === 12);
    const test13 = tests.find(t => t.testNum === 13);
    const test14 = tests.find(t => t.testNum === 14);
    const test15 = tests.find(t => t.testNum === 15);
    const test16 = tests.find(t => t.testNum === 16);
    const test17 = tests.find(t => t.testNum === 17);
    const test18 = tests.find(t => t.testNum === 18);
    const test19 = tests.find(t => t.testNum === 19);
    const test20 = tests.find(t => t.testNum === 20);
    const test21 = tests.find(t => t.testNum === 21);
    const test22 = tests.find(t => t.testNum === 22);
    const test23 = tests.find(t => t.testNum === 23);
    const test24 = tests.find(t => t.testNum === 24);
    const test25 = tests.find(t => t.testNum === 25);
    const test26 = tests.find(t => t.testNum === 26);
    const test27 = tests.find(t => t.testNum === 27);
    const test28 = tests.find(t => t.testNum === 28);
    const test29 = tests.find(t => t.testNum === 29);
    const test30 = tests.find(t => t.testNum === 30);
    const test31 = tests.find(t => t.testNum === 31);
    const test32 = tests.find(t => t.testNum === 32);

    const filter = (state.practice && state.practice.filter) ? state.practice.filter : 'all';

    let suitesHtml = '';

    // =========================================================================
    // 1. BỘ ĐỀ THỰC CHIẾN 01 (TEST 11) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite11') {
        const savedAnsCount11 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 11) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved11 = state.savedExam && state.savedExam.testNum === 11 && savedAnsCount11 > 0;
        const totalVocab11 = (test11 && test11.passages) ? test11.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 40;

        const passagesMeta11 = [
            {
                testNum: 11,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'social',
                categoryName: 'Xã hội học & Giai cấp',
                categoryColor: '#4f46e5',
                badgeBg: '#eef2ff',
                cefrBand: 'B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Phân định giai cấp tại Mỹ',
                icon: 'fa-users',
                title: 'Class System in the US',
                titleVi: 'Phân tầng xã hội & Yếu tố định hình giai cấp tại Hoa Kỳ',
                summary: 'Khám phá 3 trụ cột cấu thành giai cấp: sự khác biệt bản chất giữa thu nhập và của cải ròng, uy tín học vấn và nghề nghiệp, cùng vai trò của vốn văn hóa (cultural capital).'
            },
            {
                testNum: 11,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'urban',
                categoryName: 'Đô thị học & Du lịch',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2-C1',
                wordCount: '~470 từ',
                realReviewNote: 'Review đề thi thật: Chuyển dịch Hồ Tây, quán xá & du lịch',
                icon: 'fa-city',
                title: 'Tay Ho - A New Destination',
                titleVi: 'Chuyển dịch Hồ Tây: Quán xá, Điểm đến quốc tế & Thách thức bảo tồn',
                summary: 'Sự lột xác ngoạn mục từ làng quê nông nghiệp thanh bình thành trung tâm giao lưu quốc tế với hệ sinh thái ẩm thực đa dạng, nghệ thuật sáng tạo và nét đối lập độc đáo cũ - mới.'
            },
            {
                testNum: 11,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'psychology',
                categoryName: 'Tâm lý học hành vi',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~480 từ',
                realReviewNote: 'Review đề thi thật: TV Binge-watching, lý do & tác hại',
                icon: 'fa-tv',
                title: 'The Psychology of TV Binge-Watching',
                titleVi: 'Tâm lý cày phim dài tập: Sức hút Dopamine, Lợi ích xả stress & Rủi ro sức khỏe',
                summary: 'Giải mã hiện tượng cày phim liên tục: chất dẫn truyền thần kinh dopamine từ các tình tiết cliffhanger, sự giải tỏa áp lực nhận thức và các tác hại đảo lộn nhịp sinh học do ánh sáng xanh.'
            },
            {
                testNum: 11,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'thinking',
                categoryName: 'Khoa học nhận thức',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~490 từ',
                realReviewNote: 'Review đề thi thật: Critical thinkers vs. Passive thinkers',
                icon: 'fa-brain',
                title: 'Critical Thinkers vs. Passive Thinkers',
                titleVi: 'Tư duy phản biện vs. Tư duy thụ động: Sự khác biệt trong kỷ nguyên thông tin',
                summary: 'Phân tích đối chiếu sâu sắc giữa tư duy nhị phân, thiên kiến xác nhận của người thụ động với kỷ luật bóc tách tiền đề, sự hoài nghi trí tuệ và tư duy đa biến số của người phản biện.'
            }
        ];

        let pCardsHtml11 = '';
        passagesMeta11.forEach(meta => {
            const pData = (test11 && test11.passages) ? test11.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml11 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-01" id="suite-box-11">
                <div class="practice-suite-header suite-header-01">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fde047;"></i> BỘ ĐỀ THỰC CHIẾN 01 (TEST 11) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 01 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Phân tầng xã hội Mỹ (Part 1) • Chuyển dịch Hồ Tây (Part 2) • TV Binge-watching (Part 3) • Tư duy phản biện vs Thụ động (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab11} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(11)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab11} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved11 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved11 ? 'resumeSavedExam()' : 'startFullExam(11)'}">
                            ${isSaved11 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount11}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(11)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #6366f1;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml11}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 2. BỘ ĐỀ THỰC CHIẾN 02 (TEST 12) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite12') {
        const savedAnsCount12 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 12) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved12 = state.savedExam && state.savedExam.testNum === 12 && savedAnsCount12 > 0;
        const totalVocab12 = (test12 && test12.passages) ? test12.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 40;

        const passagesMeta12 = [
            {
                testNum: 12,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'social',
                categoryName: 'Xã hội học & Đời sống',
                categoryColor: '#0284c7',
                badgeBg: '#f0f9ff',
                cefrBand: 'B1-B2',
                wordCount: '~450 từ',
                realReviewNote: 'Review đề thi thật: People\'s activities during the pandemic',
                icon: 'fa-house-user',
                title: 'People\'s Activities During the Pandemic',
                titleVi: 'Sự thích ứng và các hoạt động đời sống trong thời kỳ đại dịch',
                summary: 'Khảo sát sự thay đổi thói quen sinh hoạt trong các đợt phong tỏa: làm bánh mì men tự nhiên, làm vườn ban công, tập thể dục trực tuyến và những thay đổi văn hóa việc làm lâu dài.'
            },
            {
                testNum: 12,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'psychology',
                categoryName: 'Tâm lý học nhận thức',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~465 từ',
                realReviewNote: 'Review đề thi thật: Quan niệm về may mắn và không may mắn',
                icon: 'fa-clover',
                title: 'The Psychology of Luck and Misfortune',
                titleVi: 'Tâm lý học về May mắn & Không may mắn: Cơ chế tư duy và sự kiên trì',
                summary: 'Giải mã hiện tượng may mắn dưới góc độ tâm lý thực nghiệm của Dr. Richard Wiseman: khả năng chú ý ngoại vi, tư duy phản thực tế hướng xuống và năng lực chủ động tự tạo vận may.'
            },
            {
                testNum: 12,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'social',
                categoryName: 'Lịch sử lao động Hoa Kỳ',
                categoryColor: '#b45309',
                badgeBg: '#fef3c7',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Sự phân biệt lao động châu Á ở Mỹ',
                icon: 'fa-person-digging',
                title: 'Asian Labor Discrimination in the US',
                titleVi: 'Lao động châu Á tại Mỹ: Đóng góp lịch sử & Cuộc đấu tranh chống phân biệt đối xử',
                summary: 'Lịch sử công nhân xây dựng tuyến đường sắt xuyên lục địa, Đạo luật Bài trừ 1882, các cuộc bãi công nông nghiệp và phân tích sắc bén về định kiến \"Thiểu số kiểu mẫu\" cùng rào cản \"trần tre\".'
            },
            {
                testNum: 12,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'thinking',
                categoryName: 'Xã hội học tôn giáo',
                categoryColor: '#7c3aed',
                badgeBg: '#f5f3ff',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Tôn giáo tại Mỹ & Xu hướng thế tục hóa',
                icon: 'fa-church',
                title: 'The Changing Religious Landscape in the US',
                titleVi: 'Bức tranh tôn giáo Hoa Kỳ: Tiến trình thế tục hóa & Đa nguyên hóa',
                summary: 'Phân tích sự thay đổi nhân khẩu học tôn giáo: từ tính đặc thù sùng đạo của nước Mỹ đến sự sụt giảm của các giáo phái truyền thống, sự trỗi dậy của nhóm không tôn giáo (\"Nones\") và nhập cư đa dạng.'
            }
        ];

        let pCardsHtml12 = '';
        passagesMeta12.forEach(meta => {
            const pData = (test12 && test12.passages) ? test12.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml12 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-02" id="suite-box-12">
                <div class="practice-suite-header suite-header-02">
                    <div class="suite-header-info">
                        <div class="suite-header-tag" style="background: rgba(16, 185, 129, 0.25); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.45);">
                            <i class="fa-solid fa-award"></i> BỘ ĐỀ THỰC CHIẾN 02 (TEST 12) • MỚI CẬP NHẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 02 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Hoạt động thời đại dịch (Part 1) • Quan niệm về may mắn (Part 2) • Phân biệt lao động châu Á (Part 3) • Bức tranh tôn giáo tại Mỹ (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab12} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(12)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab12} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved12 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved12 ? 'resumeSavedExam()' : 'startFullExam(12)'}">
                            ${isSaved12 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount12}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(12)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #10b981;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml12}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 3. BỘ ĐỀ THỰC CHIẾN 03 (TEST 13) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite13') {
        const savedAnsCount13 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 13) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved13 = state.savedExam && state.savedExam.testNum === 13 && savedAnsCount13 > 0;
        const totalVocab13 = (test13 && test13.passages) ? test13.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta13 = [
            {
                testNum: 13,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'behavior',
                categoryName: 'Tâm lý học động vật',
                categoryColor: '#0284c7',
                badgeBg: '#f0f9ff',
                cefrBand: 'B1-B2',
                wordCount: '~450 từ',
                realReviewNote: 'Review đề thi thật: Dog attack & prevention techniques',
                icon: 'fa-shield-dog',
                title: 'Dog Attack & Prevention Techniques',
                titleVi: 'Kỹ năng nhận diện nguy cơ & Phòng tránh chó dữ tấn công',
                summary: 'Phân tích các tín hiệu căng thẳng của loài chó, ngôn ngữ cơ thể cảnh báo xâm nhập lãnh thổ và kỹ thuật phòng thủ không bạo lực như "tư thế cái cây" khi gặp chó hung hãn.'
            },
            {
                testNum: 13,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'biology',
                categoryName: 'Sinh học & Giao tiếp loài',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~470 từ',
                realReviewNote: 'Review đề thi thật: Birdsong & acoustic communication',
                icon: 'fa-crow',
                title: 'Birdsong & Acoustic Communication',
                titleVi: 'Tiếng chim hót: Ngôn ngữ âm thanh & Khả năng thích ứng đô thị',
                summary: 'Khám phá sự phân hóa phức tạp giữa tiếng gọi cảnh báo (calls) và tiếng hót định danh lãnh thổ (songs), sự hình thành tiếng địa phương và thích ứng dải tần số trước tiếng ồn giao thông.'
            },
            {
                testNum: 13,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'technology',
                categoryName: 'Công nghệ & Xã hội',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~480 từ',
                realReviewNote: 'Review đề thi thật: Social media usage across generations',
                icon: 'fa-hashtag',
                title: 'Social Media Across Generations',
                titleVi: 'Sự phân hóa hành vi sử dụng Mạng xã hội giữa các thế hệ',
                summary: 'Đối chiếu hành vi sử dụng Facebook/mạng xã hội giữa Gen Z (ưu tiên video ngắn, tính ẩn danh) và Baby Boomers / Gen X (kết nối tin cậy), cùng tác động tâm lý sợ bỏ lỡ (FOMO).'
            },
            {
                testNum: 13,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'environment',
                categoryName: 'Khoa học Môi trường & Đại dương',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Ocean garbage patches & microplastics',
                icon: 'fa-water',
                title: 'Ocean Garbage Patches & Microplastics',
                titleVi: 'Vấn nạn vi nhựa và các bãi rác đại dương khổng lồ',
                summary: 'Nghiên cứu cơ chế các vòng hải lưu tích tụ đảo rác Great Pacific Garbage Patch, quá trình phân hủy quang học thành hạt vi nhựa dưới 5mm và độc tố xâm nhập chuỗi thức ăn sinh vật biển.'
            }
        ];

        let pCardsHtml13 = '';
        passagesMeta13.forEach(meta => {
            const pData = (test13 && test13.passages) ? test13.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml13 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-03" id="suite-box-13">
                <div class="practice-suite-header suite-header-03">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #60a5fa;"></i> BỘ ĐỀ THỰC CHIẾN 03 (TEST 13) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 03 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Phòng tránh chó cắn (Part 1) • Tiếng chim hót đô thị (Part 2) • Mạng xã hội giữa các thế hệ (Part 3) • Rác thải đại dương & Vi nhựa (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab13} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(13)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab13} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved13 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved13 ? 'resumeSavedExam()' : 'startFullExam(13)'}">
                            ${isSaved13 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount13}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(13)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #3b82f6;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml13}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 4. BỘ ĐỀ THỰC CHIẾN 04 (TEST 14) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite14') {
        const savedAnsCount14 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 14) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved14 = state.savedExam && state.savedExam.testNum === 14 && savedAnsCount14 > 0;
        const totalVocab14 = (test14 && test14.passages) ? test14.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta14 = [
            {
                testNum: 14,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'culture',
                categoryName: 'Văn hóa & Ẩm thực đường phố',
                categoryColor: '#ea580c',
                badgeBg: '#fff7ed',
                cefrBand: 'B1-B2',
                wordCount: '~450 từ',
                realReviewNote: 'Review đề thi thật: Culinary Tourism & Street Food',
                icon: 'fa-utensils',
                title: 'Culinary Tourism & Street Food',
                titleVi: 'Văn hóa ẩm thực đường phố & Du lịch trải nghiệm ẩm thực bản địa',
                summary: 'Khám phá sự chuyển mình từ món ăn bình dân thành tài sản du lịch toàn cầu, trụ cột kinh tế phi chính thức và nỗ lực quản lý vệ sinh tiến bộ của chính quyền đô thị.'
            },
            {
                testNum: 14,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'media',
                categoryName: 'Truyền thông & Đánh giá ẩm thực',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: The Rise of Food Bloggers',
                icon: 'fa-camera-retro',
                title: 'The Rise of Food Bloggers & Digital Journalism',
                titleVi: 'Sự bùng nổ của Food Blogger & Đánh giá ẩm thực thời đại số',
                summary: 'Sự dịch chuyển từ giới phê bình in ấn sang sáng tạo nội dung số, sức mạnh lan truyền giúp quán ăn nhỏ phát triển và những xung đột lợi ích giữa tài trợ quảng cáo với tính khách quan.'
            },
            {
                testNum: 14,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'health',
                categoryName: 'Nha khoa hành vi & Y tế dự phòng',
                categoryColor: '#0284c7',
                badgeBg: '#f0f9ff',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: People\'s tooth-brushing habits',
                icon: 'fa-tooth',
                title: 'People\'s Tooth-Brushing Habits',
                titleVi: 'Thói quen đánh răng của con người & Nha khoa hành vi',
                summary: 'Giải mã thiên kiến nhận thức thời gian (duration bias), tác hại mòn men răng do dùng lực quá mạnh và giải pháp công nghệ bàn chải thông minh điều chỉnh hành vi vô thức.'
            },
            {
                testNum: 14,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'neuroscience',
                categoryName: 'Khoa học Thần kinh & Sức khỏe tâm thần',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Clinical Depression & Neuroscience',
                icon: 'fa-brain',
                title: 'Depression: Neurobiology, Stigma & Public Health',
                titleVi: 'Bệnh trầm cảm: Sinh học thần kinh, Kỳ thị xã hội & Can thiệp y tế',
                summary: 'Phân tích cơ chế suy giảm tính khả biến thần kinh và teo hồi hải mã do cortisol, ảnh hưởng của di truyền biểu sinh và mô hình can thiệp đa mô thức kết hợp y dược, CBT và lối sống.'
            }
        ];

        let pCardsHtml14 = '';
        passagesMeta14.forEach(meta => {
            const pData = (test14 && test14.passages) ? test14.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml14 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-04" id="suite-box-14">
                <div class="practice-suite-header suite-header-04">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fed7aa;"></i> BỘ ĐỀ THỰC CHIẾN 04 (TEST 14) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 04 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Ẩm thực đường phố (Part 1) • Food Blogger & Thời đại số (Part 2) • Thói quen đánh răng (Part 3) • Bệnh trầm cảm & Sinh học thần kinh (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab14} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(14)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab14} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved14 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved14 ? 'resumeSavedExam()' : 'startFullExam(14)'}">
                            ${isSaved14 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount14}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(14)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #f97316;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml14}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 5. BỘ ĐỀ THỰC CHIẾN 05 (TEST 15) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite15') {
        const savedAnsCount15 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 15) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved15 = state.savedExam && state.savedExam.testNum === 15 && savedAnsCount15 > 0;
        const totalVocab15 = (test15 && test15.passages) ? test15.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta15 = [
            {
                testNum: 15,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'geography',
                categoryName: 'Địa lý & Nông nghiệp bền vững',
                categoryColor: '#0891b2',
                badgeBg: '#ecfeff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: The Mekong Delta',
                icon: 'fa-water',
                title: 'The Mekong Delta',
                titleVi: 'Đồng bằng sông Cửu Long: Vựa lúa nông nghiệp & Thích ứng biến đổi khí hậu',
                summary: 'Khám phá vai trò vựa lúa - thủy sản cốt lõi của ĐBSCL, thách thức kép từ sụt lún mặt đất, thiếu phù sa và xâm nhập mặn, cùng giải pháp luân canh lúa - tôm thuận thiên.'
            },
            {
                testNum: 15,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'education',
                categoryName: 'Giáo dục & Chuyển đổi số',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Education in 2018',
                icon: 'fa-graduation-cap',
                title: 'Education in 2018: Reform & Digital Transformation',
                titleVi: 'Giáo dục năm 2018: Đổi mới chương trình, PISA & Chuyển đổi số',
                summary: 'Phân tích bước ngoặt giáo dục 2018 qua kết quả PISA về đọc hiểu số, cải cách chương trình phát triển năng lực, học tập kết hợp thích ứng và bài toán công bằng giáo dục.'
            },
            {
                testNum: 15,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'ecology',
                categoryName: 'Sinh thái học & Khí hậu',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Chủ đề bổ khuyết chuẩn B2/C1 liền mạch: Mangroves & Coastal Defense',
                icon: 'fa-seedling',
                title: 'Mangroves & Natural Coastal Defense',
                titleVi: 'Rừng ngập mặn: Lá chắn sinh học chống xói lở & Lưu trữ Carbon xanh',
                summary: 'Giải mã cơ chế lọc mặn và rễ thở kỳ diệu, khả năng làm suy giảm sóng bão vượt trội đê bê tông và vai trò kho lưu trữ carbon xanh gấp 4 lần rừng mưa trên cạn.'
            },
            {
                testNum: 15,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'space',
                categoryName: 'Khoa học Hành tinh & Thiên văn',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: NASA\'s Data on Mars',
                icon: 'fa-rocket',
                title: 'NASA\'s Data on Mars: Paleohydrology & Astrobiology',
                titleVi: 'Dữ liệu nghiên cứu của NASA về Sao Hỏa: Cổ thủy văn & Dấu vết sự sống',
                summary: 'Tổng hợp dữ liệu từ Perseverance, Curiosity và MAVEN về quá khứ giàu nước của Sao Hỏa, cơ chế gió mặt trời tước khí quyển (sputtering) và chiến dịch thu hồi mẫu đá về Trái Đất.'
            }
        ];

        let pCardsHtml15 = '';
        passagesMeta15.forEach(meta => {
            const pData = (test15 && test15.passages) ? test15.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml15 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-05" id="suite-box-15">
                <div class="practice-suite-header suite-header-05">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #67e8f9;"></i> BỘ ĐỀ THỰC CHIẾN 05 (TEST 15) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 05 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Đồng bằng sông Cửu Long (Part 1) • Giáo dục năm 2018 (Part 2) • Rừng ngập mặn & Carbon xanh (Part 3) • Dữ liệu nghiên cứu Sao Hỏa NASA (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab15} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(15)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab15} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved15 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved15 ? 'resumeSavedExam()' : 'startFullExam(15)'}">
                            ${isSaved15 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount15}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(15)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #0891b2;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml15}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 6. BỘ ĐỀ THỰC CHIẾN 06 (TEST 16) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite16') {
        const savedAnsCount16 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 16) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved16 = state.savedExam && state.savedExam.testNum === 16 && savedAnsCount16 > 0;
        const totalVocab16 = (test16 && test16.passages) ? test16.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta16 = [
            {
                testNum: 16,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'heritage',
                categoryName: 'Lịch sử & Di sản đô thị',
                categoryColor: '#7c3aed',
                badgeBg: '#f5f3ff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: History of the Cyclo',
                icon: 'fa-bicycle',
                title: 'The History of the Cyclo',
                titleVi: 'Lịch sử xe xích lô: Từ sáng chế năm 1939 đến biểu tượng du lịch di sản',
                summary: 'Hành trình của chiếc xe xích lô từ thiết kế độc đáo khách ngồi trước của Pierre Coupeaud năm 1939, vai trò trụ cột vận tải đô thị thế kỷ 20 đến sự tái định vị thành du lịch di sản không phát thải.'
            },
            {
                testNum: 16,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'arts',
                categoryName: 'Nghệ thuật Biểu diễn & Múa',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Famous Ballet Performance & Dancer',
                icon: 'fa-masks-theater',
                title: 'Classical Ballet: Swan Lake & Legendary Ballerinas',
                titleVi: 'Lịch sử múa Ba-lê: Vở Hồ Thiên Nga kinh điển & Huyền thoại sân khấu',
                summary: 'Từ yến tiệc Phục hưng Ý đến cuộc hồi sinh kỳ diệu của Hồ Thiên Nga năm 1895, thử thách 32 vòng xoay fouetté của vai kép Odette - Odile và dấu ấn đổi mới từ Anna Pavlova đến Misty Copeland.'
            },
            {
                testNum: 16,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'urban_policy',
                categoryName: 'Giao thông & Chính sách công',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Traffic in Vietnam vs. British Policies',
                icon: 'fa-traffic-light',
                title: 'Urban Traffic in Vietnam & British Transport Policies',
                titleVi: 'Giao thông Việt Nam & Đối chiếu chính sách quy hoạch giao thông Anh',
                summary: 'Phân tích đối chiếu hệ sinh thái xe máy tại Hà Nội - TP.HCM với phí chống ùn tắc, vùng phát thải thấp ULEZ và bài học về trình tự triển khai hạ tầng công cộng đồng bộ của London.'
            },
            {
                testNum: 16,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'astronomy',
                categoryName: 'Thiên văn học & Vật lý vũ trụ',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Astronomy - Rising Stars & Planet Neptune',
                icon: 'fa-meteor',
                title: 'Astronomy: Stellar Nurseries & Planet Neptune',
                titleVi: 'Thiên văn học: Sự hình thành ngôi sao mới & Khám phá Sao Hải Vương',
                summary: 'Cơ chế nhiệt hạch khai sinh ngôi sao trong tinh vân phân tử, sự bồi tụ hành tinh băng ngoài đường băng giá, chiến thắng toán học khám phá Sao Hải Vương 1846 và những cơn gió siêu thanh 2.100 km/h.'
            }
        ];

        let pCardsHtml16 = '';
        passagesMeta16.forEach(meta => {
            const pData = (test16 && test16.passages) ? test16.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml16 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-06" id="suite-box-16">
                <div class="practice-suite-header suite-header-06">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #ddd6fe;"></i> BỘ ĐỀ THỰC CHIẾN 06 (TEST 16) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 06 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Lịch sử xe xích lô (Part 1) • Lịch sử múa Ba-lê & Hồ Thiên Nga (Part 2) • Giao thông VN vs Chính sách Anh (Part 3) • Thiên văn học: Sao mới & Sao Hải Vương (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab16} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(16)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab16} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved16 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved16 ? 'resumeSavedExam()' : 'startFullExam(16)'}">
                            ${isSaved16 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount16}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(16)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #8b5cf6;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml16}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 7. BỘ ĐỀ THỰC CHIẾN 07 (TEST 17) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite17') {
        const savedAnsCount17 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 17) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved17 = state.savedExam && state.savedExam.testNum === 17 && savedAnsCount17 > 0;
        const totalVocab17 = (test17 && test17.passages) ? test17.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta17 = [
            {
                testNum: 17,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'history',
                categoryName: 'Lịch sử & Văn hóa Nhật Bản',
                categoryColor: '#db2777',
                badgeBg: '#fdf2f8',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Samurai & Bushido',
                icon: 'fa-shield-halved',
                title: 'The Samurai & the Code of Bushido',
                titleVi: 'Võ sĩ đạo Nhật Bản: Từ chiến binh phong kiến đến triết lý Bushido',
                summary: 'Giải mã sự tiến hóa của Samurai từ cung thủ kỵ binh thời Heian, quan chức văn võ song toàn thời Edo đến 8 đức tính cốt lõi Bushido và dấu ấn trong xã hội Nhật hiện đại.'
            },
            {
                testNum: 17,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'culture',
                categoryName: 'Văn hóa & Lịch sử Á Đông',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Chinese Tea Culture & History',
                icon: 'fa-mug-hot',
                title: 'Chinese Tea Culture & Imperial Heritage',
                titleVi: 'Văn hóa trà Trung Quốc: Triều đại Đường - Tống, Trà Công Phu & Trà Mã Cổ Đạo',
                summary: 'Hành trình 5 thiên niên kỷ từ Trà Kinh của Lục Vũ, nghệ thuật đánh bột trà thời Tống khai sinh Matcha Nhật Bản, sắc lệnh trà lá thời Minh đến sức ảnh hưởng địa chính trị toàn cầu.'
            },
            {
                testNum: 17,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'geology',
                categoryName: 'Địa chất học & Phòng chống thiên tai',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Landslides & Soil Erosion',
                icon: 'fa-hill-rockslide',
                title: 'Landslides, Soil Erosion & Slope Stability',
                titleVi: 'Hiện tượng sạt lở đất & xói mòn: Cơ chế địa kỹ thuật & Giải pháp xanh',
                summary: 'Phân tích áp suất nước lỗ rỗng gây hóa lỏng đất sườn dốc, hệ lụy phá rừng và xẻ ta-luy mở đường, cùng công nghệ radar vệ tinh InSAR và kỹ thuật sinh học cỏ vetiver.'
            },
            {
                testNum: 17,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'global_issues',
                categoryName: 'Kinh tế phát triển & Lương thực',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Global Hunger & Food Security',
                icon: 'fa-wheat-awn',
                title: 'Global Hunger & Food Security Systems',
                titleVi: 'Nạn đói & An ninh lương thực toàn cầu: Nghịch lý phân phối & Chuyển đổi bền vững',
                summary: 'Bóc tách 4 trụ cột an ninh lương thực FAO, sự khác biệt giữa thất thoát đầu nguồn (food loss) và lãng phí tiêu dùng (food waste), cùng các giải pháp nông thực nuôi sống 10 tỷ người.'
            }
        ];

        let pCardsHtml17 = '';
        passagesMeta17.forEach(meta => {
            const pData = (test17 && test17.passages) ? test17.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml17 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-07" id="suite-box-17">
                <div class="practice-suite-header suite-header-07">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fbcfe8;"></i> BỘ ĐỀ THỰC CHIẾN 07 (TEST 17) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 07 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Võ sĩ đạo Nhật Bản (Part 1) • Văn hóa trà Trung Quốc (Part 2) • Hiện tượng sạt lở đất & xói mòn (Part 3) • Nạn đói & An ninh lương thực thế giới (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab17} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(17)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab17} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved17 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved17 ? 'resumeSavedExam()' : 'startFullExam(17)'}">
                            ${isSaved17 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount17}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(17)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #ec4899;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml17}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 8. BỘ ĐỀ THỰC CHIẾN 08 (TEST 18) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite18') {
        const savedAnsCount18 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 18) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved18 = state.savedExam && state.savedExam.testNum === 18 && savedAnsCount18 > 0;
        const totalVocab18 = (test18 && test18.passages) ? test18.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta18 = [
            {
                testNum: 18,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'heritage',
                categoryName: 'Địa chất & Di sản UNESCO',
                categoryColor: '#0d9488',
                badgeBg: '#f0fdfa',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Ha Long Bay',
                icon: 'fa-mountain-sun',
                title: 'Ha Long Bay: Karst Wonder & Sustainable Heritage',
                titleVi: 'Vịnh Hạ Long: Địa chất Karst 500 triệu năm & Quản trị du lịch bền vững',
                summary: 'Khám phá địa mạo karst đá vôi chìm, ranh giới mở rộng UNESCO 2023 cùng Cát Bà, hệ sinh thái tùng - áng và các biện pháp bảo tồn biển trước áp lực du lịch đại trà.'
            },
            {
                testNum: 18,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'politics',
                categoryName: 'Chính trị học & Hiến pháp Mỹ',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: US Electoral System (Trump & Biden)',
                icon: 'fa-landmark-dome',
                title: 'The US Electoral System & Modern Presidencies',
                titleVi: 'Hệ thống Đại cử tri Mỹ & Đối chiếu nhiệm kỳ Donald Trump - Joe Biden',
                summary: 'Giải mã cơ chế 538 phiếu Đại cử tri, nguyên tắc thắng lấy hết ở các bang chiến địa và đối chiếu định hướng chính sách kinh tế - đối ngoại giữa nhiệm kỳ Trump và Biden.'
            },
            {
                testNum: 18,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'economics',
                categoryName: 'Kinh tế vĩ mô & Y tế công cộng',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: The COVID-19 Pandemic Impacts',
                icon: 'fa-globe',
                title: 'Structural & Macroeconomic Impacts of COVID-19',
                titleVi: 'Tác động vĩ mô của COVID-19: Chuỗi cung ứng, Việc làm từ xa & Công bằng y tế',
                summary: 'Phân tích đứt gãy chuỗi cung ứng just-in-time, làn sóng lạm phát toàn cầu, khoảng cách giữa lao động tri thức - tuyến đầu và bài học công bằng vắc-xin.'
            },
            {
                testNum: 18,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'media',
                categoryName: 'Truyền thông & Đạo đức phát sóng',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Reality Television Shows',
                icon: 'fa-video',
                title: 'Reality Television: Manufactured Authenticity & Ethics',
                titleVi: 'Truyền hình thực tế: Kịch bản dựng sẵn, Tâm lý khán giả & Đạo đức truyền thông',
                summary: 'Bóc tách kỹ thuật tuyển vai đóng khung và cắt ghép Frankenbiting, tâm lý so sánh xã hội hướng xuống của khán giả cùng quy định chăm sóc tâm lý thí sinh sau phát sóng.'
            }
        ];

        let pCardsHtml18 = '';
        passagesMeta18.forEach(meta => {
            const pData = (test18 && test18.passages) ? test18.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml18 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-08" id="suite-box-18">
                <div class="practice-suite-header suite-header-08">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #99f6e4;"></i> BỘ ĐỀ THỰC CHIẾN 08 (TEST 18) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 08 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Vịnh Hạ Long (Part 1) • Bầu cử Mỹ & Nhiệm kỳ Tổng thống (Part 2) • Tác động vĩ mô đại dịch COVID-19 (Part 3) • Truyền hình thực tế & Đạo đức truyền thông (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab18} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(18)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab18} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved18 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved18 ? 'resumeSavedExam()' : 'startFullExam(18)'}">
                            ${isSaved18 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount18}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(18)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #14b8a6;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml18}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 9. BỘ ĐỀ THỰC CHIẾN 09 (TEST 19) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite19') {
        const savedAnsCount19 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 19) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved19 = state.savedExam && state.savedExam.testNum === 19 && savedAnsCount19 > 0;
        const totalVocab19 = (test19 && test19.passages) ? test19.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta19 = [
            {
                testNum: 19,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'linguistics',
                categoryName: 'Phương pháp học ngoại ngữ',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: English Learning - Speaking & Writing',
                icon: 'fa-comments',
                title: 'Mastering English Speaking & Writing Skills',
                titleVi: 'Phương pháp học kỹ năng Nói & Viết tiếng Anh chủ động: Shadowing & Process Writing',
                summary: 'Giải mã khoảng cách kỹ năng tiếp nhận - sản sinh, kỹ thuật Shadowing rèn ngữ điệu tự nhiên, quy trình viết 5 bước và cách học Collocations thoát dịch từng chữ.'
            },
            {
                testNum: 19,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'history',
                categoryName: 'Sử học & Danh nhân thế giới',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: World History & Historical Figures',
                icon: 'fa-landmark',
                title: 'World History: Great Figures vs. Structural Forces',
                titleVi: 'Lịch sử thế giới: Vai trò các danh nhân bước ngoặt đối chiếu động lực xã hội',
                summary: 'Đối chiếu Thuyết Vĩ Nhân của Thomas Carlyle với trường phái sử học cấu trúc Annales, qua dẫn chứng Gutenberg, Nelson Mandela, Mahatma Gandhi và vai trò của người dân bình thường.'
            },
            {
                testNum: 19,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'environment',
                categoryName: 'Bảo tồn sinh thái & Tái hoang dã',
                categoryColor: '#0284c7',
                badgeBg: '#f0f9ff',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Environmental Preservation',
                icon: 'fa-tree',
                title: 'Environmental Preservation: Corridors & Rewilding',
                titleVi: 'Bảo tồn môi trường: Hành lang sinh học, Tái hoang dã hóa & Đồng quản lý cộng đồng',
                summary: 'Vượt qua mô hình "bảo tồn pháo đài" cô lập sang hành lang động vật hoang dã, hiệu ứng tầng dinh dưỡng từ sói xám Yellowstone và quyền quản lý rừng của cộng đồng bản địa.'
            },
            {
                testNum: 19,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'culture_psych',
                categoryName: 'Tâm lý học xuyên văn hóa',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Individualism vs. Collectivism in Culture',
                icon: 'fa-people-arrows',
                title: 'Individualism vs. Collectivism in Cultural Psychology',
                titleVi: 'Chủ nghĩa cá nhân đối chiếu Chủ nghĩa tập thể trong văn hóa, giao tiếp & quản trị',
                summary: 'Phân tích trục văn hóa Hofstede, giao tiếp ngữ cảnh thấp - cao của Edward T. Hall, thí nghiệm tri giác tổng thể của Nisbett và trí tuệ văn hóa linh hoạt trong môi trường đa quốc gia.'
            }
        ];

        let pCardsHtml19 = '';
        passagesMeta19.forEach(meta => {
            const pData = (test19 && test19.passages) ? test19.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml19 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-09" id="suite-box-19">
                <div class="practice-suite-header suite-header-09">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fde68a;"></i> BỘ ĐỀ THỰC CHIẾN 09 (TEST 19) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 09 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Phương pháp học Nói & Viết tiếng Anh (Part 1) • Lịch sử thế giới & Danh nhân (Part 2) • Bảo tồn sinh thái & Tái hoang dã (Part 3) • Chủ nghĩa cá nhân vs Tập thể (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab19} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(19)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab19} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved19 ? 'background: linear-gradient(135deg, #d97706, #f59e0b) !important;' : ''}" onclick="${isSaved19 ? 'resumeSavedExam()' : 'startFullExam(19)'}">
                            ${isSaved19 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount19}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(19)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #f59e0b;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml19}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 10. BỘ ĐỀ THỰC CHIẾN 10 (TEST 20) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite20') {
        const savedAnsCount20 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 20) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved20 = state.savedExam && state.savedExam.testNum === 20 && savedAnsCount20 > 0;
        const totalVocab20 = (test20 && test20.passages) ? test20.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta20 = [
            {
                testNum: 20,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'linguistics',
                categoryName: 'Phương pháp đọc & Manh mối ngữ cảnh',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Foundational Reading - Lexical Clues',
                icon: 'fa-book-open',
                title: 'Lexical Context Clues & Reading Fluency',
                titleVi: 'Chiến lược đoán nghĩa từ vựng qua ngữ cảnh & Kỹ thuật đọc hiểu linh hoạt',
                summary: 'Khắc phục nỗi sợ từ lạ, tận dụng manh mối định nghĩa, từ đối nghĩa, bóc tách tiền tố - gốc từ - hậu tố và cách dung nạp sự mơ hồ để đạt tốc độ đọc tối ưu.'
            },
            {
                testNum: 20,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'culture_sports',
                categoryName: 'Văn hóa võ đạo & Thể thao Olympic',
                categoryColor: '#0284c7',
                badgeBg: '#f0f9ff',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Traditional Taekwondo in Korea',
                icon: 'fa-shield-halved',
                title: 'Traditional Taekwondo: Martial Art, Philosophy & Global Sport',
                titleVi: 'Môn võ cổ truyền Taekwondo tại Hàn Quốc: Lịch sử, triết lý võ đạo & Hành trình Olympic',
                summary: 'Cội nguồn từ Subak và Taekkyeon thời Tam Quốc, tinh thần võ sĩ Hwarang, sự chuẩn hóa của Viện Kukkiwon năm 1972 và hệ thống cảm biến điện tử tại Thế vận hội Olympic.'
            },
            {
                testNum: 20,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'economics_career',
                categoryName: 'Kinh tế thương mại & Nghề nghiệp',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Youth Career Shifts - Trading vs. Marketing',
                icon: 'fa-chart-line',
                title: 'Youth Career Shifts: Physical Trading vs. Modern Marketing',
                titleVi: 'Sự chuyển dịch việc làm của giới trẻ: Buôn bán truyền thống đối chiếu Tiếp thị số',
                summary: 'Sự đối lập giữa rào cản chi phí mặt bằng của cửa hàng vật lý và khả năng mở rộng của tiếp thị số, chuyển dịch kỹ năng sang SEO, A/B testing, cùng rủi ro thuật toán và kiệt sức tâm lý.'
            },
            {
                testNum: 20,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'biochemistry_health',
                categoryName: 'Hóa sinh dinh dưỡng & Y học tim mạch',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Saturated vs. Unsaturated Fats in Nutrition',
                icon: 'fa-heart-pulse',
                title: 'Saturated vs. Unsaturated Fats in Human Nutrition & Health',
                titleVi: 'Hóa sinh dinh dưỡng: Chất béo bão hòa vs Không bão hòa và Sức khỏe tim mạch',
                summary: 'Cấu trúc liên kết đôi nguyên tử, cơ chế thụ thể LDL ở gan dẫn tới mảng xơ vữa, vai trò kháng viêm của omega-3 resolvin và bước chuyển từ quy giản dưỡng chất sang chế độ ăn Địa Trung Hải.'
            }
        ];

        let pCardsHtml20 = '';
        passagesMeta20.forEach(meta => {
            const pData = (test20 && test20.passages) ? test20.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml20 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-10" id="suite-box-20">
                <div class="practice-suite-header suite-header-10">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #6ee7b7;"></i> BỘ ĐỀ THỰC CHIẾN 10 (TEST 20) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 10 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Đọc hiểu & Đoán từ vựng (Part 1) • Môn võ Taekwondo Hàn Quốc (Part 2) • Buôn bán xưa vs Marketing nay (Part 3) • Chất béo bão hòa vs Không bão hòa (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab20} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(20)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab20} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved20 ? 'background: linear-gradient(135deg, #059669, #10b981) !important;' : ''}" onclick="${isSaved20 ? 'resumeSavedExam()' : 'startFullExam(20)'}">
                            ${isSaved20 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount20}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(20)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #10b981;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml20}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 11. BỘ ĐỀ THỰC CHIẾN 11 (TEST 21) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite21') {
        const savedAnsCount21 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 21) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved21 = state.savedExam && state.savedExam.testNum === 21 && savedAnsCount21 > 0;
        const totalVocab21 = (test21 && test21.passages) ? test21.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta21 = [
            {
                testNum: 21,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'media_society',
                categoryName: 'Truyền thông & Mạng xã hội',
                categoryColor: '#2563eb',
                badgeBg: '#eff6ff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Facebook in Modern Society',
                icon: 'fa-globe',
                title: 'Facebook in Modern Society: Evolution & Social Impacts',
                titleVi: 'Tác động & Hành vi sử dụng Facebook trong đời sống hiện đại: Từ kết nối bạn bè đến hệ sinh thái tin tức & sức khỏe tinh thần',
                summary: 'Sự mở rộng từ danh bạ sinh viên 2004 thành mạng lưới 3 tỷ người, cơ chế thuật toán giữ chân, bong bóng lọc (filter bubbles) và hội chứng sợ bỏ lỡ (FOMO).'
            },
            {
                testNum: 21,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'psychology',
                categoryName: 'Tâm lý học phát triển',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: First-Born vs. Only Children',
                icon: 'fa-users',
                title: 'First-Born vs. Only Children: Parental Dynamics & Personality',
                titleVi: 'Tâm lý học thứ tự sinh: Tính cách con đầu lòng đối chiếu với con một trong gia đình',
                summary: 'Lý thuyết Alfred Adler, hiện tượng truất ngôi (dethronement), tính tận tâm của con cả, bác bỏ định kiến về con một và sự vượt trội về năng khiếu ngôn ngữ sớm.'
            },
            {
                testNum: 21,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'engineering_disaster',
                categoryName: 'Kỹ thuật kháng chấn & Ứng phó thiên tai',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Earthquakes in Japan: Resilience',
                icon: 'fa-building-shield',
                title: 'Earthquakes in Japan: Seismic Engineering & Resilience',
                titleVi: 'Động đất tại Nhật Bản: Kỹ thuật xây dựng kháng chấn & Năng lực phục hồi cộng đồng',
                summary: 'Ba cấp độ phòng vệ Taishin - Seishin - Menshin (cách ly chân đế), con lắc đối trọng Tokyo Skytree, cảnh báo sớm dựa trên sóng P-wave và văn hóa diễn tập toàn dân.'
            },
            {
                testNum: 21,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'geology_tectonics',
                categoryName: 'Địa chất học & Đới hút chìm kiến tạo',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Tectonic Geology: Pacific Ring of Fire',
                icon: 'fa-volcano',
                title: 'Tectonic Geology: The Pacific Ring of Fire & Subduction',
                titleVi: 'Địa chất học kiến tạo: Vành đai lửa Thái Bình Dương & Động lực học hút chìm',
                summary: 'Hành lang địa chấn 40.000 km, cơ chế giải phóng nước khoáng vật hạ điểm nóng chảy manti sinh magma, đứt gãy megathrust gây sóng thần và bước chuyển sang đánh giá xác suất.'
            }
        ];

        let pCardsHtml21 = '';
        passagesMeta21.forEach(meta => {
            const pData = (test21 && test21.passages) ? test21.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml21 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-11" id="suite-box-21">
                <div class="practice-suite-header suite-header-11">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #93c5fd;"></i> BỘ ĐỀ THỰC CHIẾN 11 (TEST 21) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 11 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Tác động của Facebook (Part 1) • Tâm lý con đầu lòng vs Con một (Part 2) • Động đất & Kỹ thuật kháng chấn Nhật Bản (Part 3) • Vành đai lửa Thái Bình Dương (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab21} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(21)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab21} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved21 ? 'background: linear-gradient(135deg, #1d4ed8, #3b82f6) !important;' : ''}" onclick="${isSaved21 ? 'resumeSavedExam()' : 'startFullExam(21)'}">
                            ${isSaved21 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount21}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(21)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #3b82f6;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml21}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 12. BỘ ĐỀ THỰC CHIẾN 12 (TEST 22) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite22') {
        const savedAnsCount22 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 22) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved22 = state.savedExam && state.savedExam.testNum === 22 && savedAnsCount22 > 0;
        const totalVocab22 = (test22 && test22.passages) ? test22.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta22 = [
            {
                testNum: 22,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'healthcare_suburb',
                categoryName: 'Y tế cộng đồng & Bệnh viện ngoại ô',
                categoryColor: '#8b5cf6',
                badgeBg: '#f5f3ff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Suburban Hospitals & Healthcare',
                icon: 'fa-hospital',
                title: 'Suburban Hospitals & Healthcare Access',
                titleVi: 'Bệnh viện vùng ngoại ô & Khả năng tiếp cận dịch vụ y tế công bằng',
                summary: 'Làn sóng di cư ra ngoại ô, thách thức tuyển dụng bác sĩ chuyên khoa sâu, giải pháp y tế từ xa (telemedicine) và vai trò cứu mạng trong thời gian vàng cấp cứu.'
            },
            {
                testNum: 22,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'neuroscience',
                categoryName: 'Khoa học thần kinh nhận thức',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Debunking the 10% Brain Myth',
                icon: 'fa-brain',
                title: 'Debunking the Ten-Percent Brain Myth in Modern Neuroscience',
                titleVi: 'Khoa học thần kinh: Giải mã huyền thoại con người chỉ dùng 10% não bộ',
                summary: 'Bác bỏ huyền thoại dân gian qua mức tiêu thụ 20% năng lượng trao đổi chất, bằng chứng quét fMRI/PET cho thấy toàn bộ não luôn sáng và sức mạnh của tính dẻo thần kinh (neuroplasticity).'
            },
            {
                testNum: 22,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'agriculture_cattle',
                categoryName: 'Nông nghiệp công nghệ & Chăn nuôi',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Cattle Farming & Agriculture in Iowa',
                icon: 'fa-wheat-awn',
                title: 'Cattle Farming & Agriculture in Iowa: Economy, Tech & Ecology',
                titleVi: 'Ngành chăn nuôi gia súc & Nông nghiệp công nghiệp hóa tại bang Iowa, Mỹ',
                summary: 'Mối liên kết cộng sinh ngô - thịt bò, tự động hóa cảm biến nhai lại RFID, bài toán ô nhiễm dòng chảy nitrat và giải pháp hầm biogas yếm khí kết hợp chăn thả luân canh.'
            },
            {
                testNum: 22,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'ai_ethics',
                categoryName: 'Trí tuệ nhân tạo & Đạo đức công nghệ',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Artificial Intelligence: Advances & Ethics',
                icon: 'fa-robot',
                title: 'Artificial Intelligence: Deep Learning Advances, LLMs & Societal Ethics',
                titleVi: 'Trí tuệ nhân tạo (AI): Bước tiến thần tốc của LLMs & Hệ lụy đạo đức xã hội',
                summary: 'Kiến trúc transformer, năng lực mới nảy sinh (emergent capabilities), lỗ hổng ảo giác (hallucination), bài toán điều chỉnh an toàn (alignment) và rào chắn bảo vệ nhân phẩm con người.'
            }
        ];

        let pCardsHtml22 = '';
        passagesMeta22.forEach(meta => {
            const pData = (test22 && test22.passages) ? test22.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml22 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-12" id="suite-box-22">
                <div class="practice-suite-header suite-header-12">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #c4b5fd;"></i> BỘ ĐỀ THỰC CHIẾN 12 (TEST 22) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 12 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Bệnh viện ngoại ô & Y tế (Part 1) • Huyền thoại 10% não bộ (Part 2) • Chăn nuôi gia súc Iowa (Part 3) • Trí tuệ nhân tạo AI & Đạo đức (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab22} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(22)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab22} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved22 ? 'background: linear-gradient(135deg, #6d28d9, #8b5cf6) !important;' : ''}" onclick="${isSaved22 ? 'resumeSavedExam()' : 'startFullExam(22)'}">
                            ${isSaved22 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount22}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(22)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #8b5cf6;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml22}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 13. BỘ ĐỀ THỰC CHIẾN 13 (TEST 23) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite23') {
        const savedAnsCount23 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 23) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved23 = state.savedExam && state.savedExam.testNum === 23 && savedAnsCount23 > 0;
        const totalVocab23 = (test23 && test23.passages) ? test23.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta23 = [
            {
                testNum: 23,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'linguistics_coffee',
                categoryName: 'Phương pháp học ngoại ngữ & Không gian cà phê',
                categoryColor: '#06b6d4',
                badgeBg: '#ecfeff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Learning English in Coffee Shops',
                icon: 'fa-mug-hot',
                title: 'Learning English in Coffee Shops: Ambiance, Acoustic Focus & Fluency',
                titleVi: 'Học tiếng Anh tại quán cà phê: Không gian mở, tiếng ồn trắng & Giao tiếp tự nhiên',
                summary: 'Sự chuyển dịch từ thư viện sang quán cà phê, tác động giảm âu lo, tiếng ồn trắng 50-70 dB kích thích tập trung nhận thức và giao tiếp thực tiễn với barista ngoại quốc.'
            },
            {
                testNum: 23,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'african_geography',
                categoryName: 'Địa lý & Hệ sinh thái châu Phi',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: African Geography: Sahara & The Great Lakes',
                icon: 'fa-earth-africa',
                title: 'African Geography: Sahara Desertification & The Great Lakes System',
                titleVi: 'Địa lý châu Phi: Sa mạc hóa Sahara, Vạn lý Trường thành Xanh & Hệ thống Hồ Lớn',
                summary: 'Sự phân đôi địa lý giữa hoang mạc Sahara khô cằn và Đới tách giãn Đông Phi, sáng kiến Great Green Wall chống sa mạc hóa và đa dạng sinh học độc nhất vô nhị ở Hồ Victoria, Tanganyika.'
            },
            {
                testNum: 23,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'education_pedagogy',
                categoryName: 'Phương pháp giáo dục & Xã hội học',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Traditional Schooling vs. Homeschooling',
                icon: 'fa-graduation-cap',
                title: 'Traditional Schooling vs. Homeschooling: Socialization & Academic Parity',
                titleVi: 'Trường học truyền thống đối chiếu Giáo dục tại nhà: Xã hội hóa & Năng lực học thuật',
                summary: 'Đối chiếu rèn luyện xã hội hóa trong nhóm đồng trang lứa với chương trình cá nhân hóa (bespoke curricula), hóa giải hoài nghi cô lập xã hội qua hợp tác xã và các yếu tố kinh tế xã hội nền tảng.'
            },
            {
                testNum: 23,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'neurochemistry_lipids',
                categoryName: 'Hóa sinh thần kinh & Chức năng não bộ',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Brain Lipids & Cognitive Function',
                icon: 'fa-brain',
                title: 'Brain Lipids & Cognitive Function: DHA Fluidity, Myelin & Aging Neurobiology',
                titleVi: 'Chất béo trong não bộ: Axit béo Omega-3 DHA, vỏ bao Myelin & Lão hóa thần kinh',
                summary: '60% trọng lượng khô là lipid, vai trò của 6 liên kết đôi DHA đối với tính linh hoạt màng synap, dẫn truyền nhảy cóc của myelin, và tổn thương oxy hóa lipid trong sa sút trí tuệ Alzheimer.'
            }
        ];

        let pCardsHtml23 = '';
        passagesMeta23.forEach(meta => {
            const pData = (test23 && test23.passages) ? test23.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml23 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-13" id="suite-box-23">
                <div class="practice-suite-header suite-header-13">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #67e8f9;"></i> BỘ ĐỀ THỰC CHIẾN 13 (TEST 23) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 13 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Học tiếng Anh tại quán cà phê (Part 1) • Châu Phi: Sahara & Hồ lớn (Part 2) • Trường học vs Homeschooling (Part 3) • Chất béo trong não bộ & Nhận thức (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab23} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(23)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab23} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved23 ? 'background: linear-gradient(135deg, #0e7490, #06b6d4) !important;' : ''}" onclick="${isSaved23 ? 'resumeSavedExam()' : 'startFullExam(23)'}">
                            ${isSaved23 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount23}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(23)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #06b6d4;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml23}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 14. BỘ ĐỀ THỰC CHIẾN 14 (TEST 24) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite24') {
        const savedAnsCount24 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 24) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved24 = state.savedExam && state.savedExam.testNum === 24 && savedAnsCount24 > 0;
        const totalVocab24 = (test24 && test24.passages) ? test24.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta24 = [
            {
                testNum: 24,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'public_health_infectious',
                categoryName: 'Y tế công cộng & Dịch tễ học',
                categoryColor: '#ec4899',
                badgeBg: '#fdf2f8',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Infectious Diseases & Public Health',
                icon: 'fa-virus',
                title: 'Infectious Diseases & Public Health Measures: History & Challenges',
                titleVi: 'Bệnh truyền nhiễm & Các biện pháp y tế dự phòng: Lịch sử & Thách thức',
                summary: 'Lịch sử từ bỏ quan niệm không khí ô uế sang thuyết mầm bệnh Pasteur-Koch, kỹ thuật cống ngầm, kiểm dịch cảng biển, kháng sinh, diệt trừ đậu mùa và thách thức siêu vi khuẩn kháng thuốc.'
            },
            {
                testNum: 24,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'transport_bicycle',
                categoryName: 'Lịch sử công nghệ & Giao thông đô thị',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: History & Societal Evolution of the Bicycle',
                icon: 'fa-bicycle',
                title: 'History & Societal Evolution of the Bicycle: From Novelty to Transit',
                titleVi: 'Lịch sử & Sự tiến hóa xã hội của xe đạp: Từ thú vui quý tộc đến giao thông xanh',
                summary: 'Sự tiến hóa từ Draisine thô sơ, xe penny-farthing nguy hiểm tới xe đạp an toàn Starley, phong trào trang phục hợp lý giải phóng phụ nữ của Susan B. Anthony và làn sóng giao thông sinh thái thế kỷ 21.'
            },
            {
                testNum: 24,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'architecture_ecology',
                categoryName: 'Kiến trúc đô thị & Bảo tồn sinh thái',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Bird Collisions with Glass Facades',
                icon: 'fa-building',
                title: 'Urban Architecture: Bird Collisions with Glass Facades & Safe Design',
                titleVi: 'Kiến trúc đô thị: Nguy cơ chim va chạm tòa nhà kính & Thiết kế an toàn',
                summary: 'Hàng trăm triệu cá thể chim tử nạn do kính phản chiếu bóng cây và ánh sáng ban đêm, bẫy tử thần hẻm cao ốc và các giải pháp quy tắc 2x4, kính hoa văn tia cực tím (UV) cùng chương trình Tắt Đèn.'
            },
            {
                testNum: 24,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'chronobiology_sleep',
                categoryName: 'Sinh học thời gian & Khoa học thần kinh',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Circadian Sleep Cycles & Glymphatic Clearance',
                icon: 'fa-moon',
                title: 'Chronobiology: Circadian Sleep Cycles & Neural Glymphatic Clearance',
                titleVi: 'Sinh học thời gian: Chu kỳ giấc ngủ Circadian & Hệ thống thải độc Glymphatic',
                summary: 'Mô hình Process C & S, sóng chậm delta NREM tiết hormone HGH, kênh AQP4 mở rộng 60% khoang gian bào xả sạch protein amyloid-beta và tau, cùng hệ lụy teo vỏ não khi mất ngủ mãn tính.'
            }
        ];

        let pCardsHtml24 = '';
        passagesMeta24.forEach(meta => {
            const pData = (test24 && test24.passages) ? test24.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml24 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-14" id="suite-box-24">
                <div class="practice-suite-header suite-header-14">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #f472b6;"></i> BỘ ĐỀ THỰC CHIẾN 14 (TEST 24) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 14 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Bệnh truyền nhiễm & Y tế (Part 1) • Lịch sử & Xã hội của xe đạp (Part 2) • Chim va chạm tòa nhà kính (Part 3) • Sinh học giấc ngủ & Thải độc não (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab24} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(24)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab24} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved24 ? 'background: linear-gradient(135deg, #be185d, #ec4899) !important;' : ''}" onclick="${isSaved24 ? 'resumeSavedExam()' : 'startFullExam(24)'}">
                            ${isSaved24 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount24}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(24)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #ec4899;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml24}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 15. BỘ ĐỀ THỰC CHIẾN 15 (TEST 25) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite25') {
        const savedAnsCount25 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 25) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved25 = state.savedExam && state.savedExam.testNum === 25 && savedAnsCount25 > 0;
        const totalVocab25 = (test25 && test25.passages) ? test25.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta25 = [
            {
                testNum: 25,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'nutrition_fastfood',
                categoryName: 'Dinh dưỡng học & Hành vi giới trẻ',
                categoryColor: '#f97316',
                badgeBg: '#fff7ed',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Fast Food Trends & Youth Dietary Shifts',
                icon: 'fa-burger',
                title: 'Fast Food Trends & Youth Dietary Shifts: Marketing & Health Impacts',
                titleVi: 'Xu hướng thức ăn nhanh & Sự thay đổi chế độ ăn của giới trẻ',
                summary: 'Sự bùng nổ của chuỗi thức ăn nhanh, tiếp thị thuật toán cá nhân hóa, ứng dụng giao hàng tiện lợi thay thế bữa cơm nhà và nguy cơ kháng insulin, suy giảm nhận thức thanh thiếu niên.'
            },
            {
                testNum: 25,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'traditional_music_guqin',
                categoryName: 'Âm nhạc học & Di sản văn hóa Á Đông',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Chinese Traditional Music & The Guqin',
                icon: 'fa-guitar',
                title: 'Chinese Traditional Music & The Guqin: Philosophy, Dexterity & Revival',
                titleVi: 'Âm nhạc cổ truyền Trung Hoa & Cổ cầm: Triết lý, Kỹ thuật & Sự phục hưng',
                summary: 'Đàn cổ cầm 7 dây tinh túy của Nho sĩ, tính biểu tượng vũ trụ trời tròn đất vuông, thang ngũ cung 5 nguyên tố, ký âm giản tự phổ (jianzipu) và di sản phi vật thể nhân loại UNESCO.'
            },
            {
                testNum: 25,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'social_media_algorithms',
                categoryName: 'Công nghệ thông tin & Tâm lý học truyền thông',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Social Media Algorithms & User Engagement',
                icon: 'fa-hashtag',
                title: 'Social Media Algorithms & User Engagement Metrics: Neurobiology & Reform',
                titleVi: 'Thuật toán mạng xã hội & Chỉ số tương tác người dùng: Thần kinh & Cải cách',
                summary: 'Tối ưu hóa chỉ số tương tác liên tục qua telemetry, khai thác vòng lặp dopamine cờ bạc, buồng vang thông tin (echo chambers), chứng mặc cảm ngoại hình và đạo luật DSA Châu Âu.'
            },
            {
                testNum: 25,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'environmental_accounting',
                categoryName: 'Kinh tế môi trường & Kiểm toán doanh nghiệp',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Corporate Greenwashing & Environmental Accounting',
                icon: 'fa-leaf',
                title: 'Corporate Greenwashing & Environmental Accounting: Offsets & ESG Reform',
                titleVi: 'Hành vi "Tẩy xanh" của doanh nghiệp & Kế toán môi trường theo luật định',
                summary: 'Vạch trần tín chỉ carbon tự nguyện cắt giảm ảo (phantom reductions), chọn lọc hời hợt bỏ qua Scope 3 trong xếp hạng ESG, cùng giải pháp tính trọng yếu kép (double materiality) và chuẩn CSRD.'
            }
        ];

        let pCardsHtml25 = '';
        passagesMeta25.forEach(meta => {
            const pData = (test25 && test25.passages) ? test25.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml25 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-15" id="suite-box-25">
                <div class="practice-suite-header suite-header-15">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fdba74;"></i> BỘ ĐỀ THỰC CHIẾN 15 (TEST 25) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 15 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Xu hướng thức ăn nhanh (Part 1) • Âm nhạc cổ truyền Cổ cầm (Part 2) • Thuật toán mạng xã hội (Part 3) • Tẩy xanh Greenwashing (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab25} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(25)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab25} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved25 ? 'background: linear-gradient(135deg, #c2410c, #f97316) !important;' : ''}" onclick="${isSaved25 ? 'resumeSavedExam()' : 'startFullExam(25)'}">
                            ${isSaved25 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount25}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(25)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #f97316;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml25}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 16. BỘ ĐỀ THỰC CHIẾN 16 (TEST 26) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite26') {
        const savedAnsCount26 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 26) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved26 = state.savedExam && state.savedExam.testNum === 26 && savedAnsCount26 > 0;
        const totalVocab26 = (test26 && test26.passages) ? test26.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta26 = [
            {
                testNum: 26,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'cultural_festivals',
                categoryName: 'Văn hóa & Du lịch sự kiện quốc tế',
                categoryColor: '#6366f1',
                badgeBg: '#e0e7ff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Music Festivals Around the World',
                icon: 'fa-music',
                title: 'Music Festivals Around the World: Cultural Identity & Festival Tourism',
                titleVi: 'Lễ hội âm nhạc quốc tế: Bản sắc văn hóa & Du lịch lễ hội',
                summary: 'Sự bùng nổ của các đại nhạc hội ngoài trời, tác động kinh tế tới du lịch địa phương, thách thức xả rác - ô nhiễm tiếng ồn và xu hướng chuyển đổi xanh bền vững.'
            },
            {
                testNum: 26,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'adolescent_brain_risk',
                categoryName: 'Tâm lý học thần kinh & Phát triển vị thành niên',
                categoryColor: '#059669',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Risk-Taking Behaviors & Adolescent Brain Development',
                icon: 'fa-brain',
                title: 'Risk-Taking Behaviors & Adolescent Brain Development: The Dual-Systems Model',
                titleVi: 'Hành vi mạo hiểm & Sự phát triển não bộ tuổi vị thành niên: Mô hình hệ thống kép',
                summary: 'Độ lệch pha phát triển giữa hệ viền cảm xúc và vỏ não trước trán, vai trò tiến hóa của sự liều lĩnh thích nghi và các chính sách định hướng thay vì cấm đoán đơn thuần.'
            },
            {
                testNum: 26,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'australian_parrots',
                categoryName: 'Sinh học tiến hóa & Điểu học bản địa',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: The Native Parrots of Australia',
                icon: 'fa-feather',
                title: 'The Native Parrots of Australia: Radiation, Cognition & Arid Adaptation',
                titleVi: 'Loài vẹt bản địa ở Úc: Sự phân tỏa tiến hóa, Trí khôn & Thích nghi vùng khô hạn',
                summary: 'Phân tỏa thích nghi từ rừng mưa Gondwana sang sa mạc cằn cỗi, giải phẫu mỏ và hộp sọ mở hạt cứng, tập tính du cư bầy đàn và nguy cơ biến đổi khí hậu xóa sổ sinh cảnh tổ.'
            },
            {
                testNum: 26,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'organic_food_market',
                categoryName: 'Nông nghiệp học & Kinh tế thực phẩm bền vững',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: The Benefits and Market of Organic Food',
                icon: 'fa-apple-whole',
                title: 'The Benefits and Market of Organic Food: Nutritional Agendas, Yields & Certification',
                titleVi: 'Lợi ích & Thị trường thực phẩm hữu cơ: Giá trị dinh dưỡng, Năng suất & Chứng nhận',
                summary: 'Bằng chứng khoa học về chất chống oxy hóa và giảm tồn dư hóa chất, nghịch lý năng suất và mở rộng diện tích đất, chi phí chứng nhận nghiêm ngặt và giải pháp kết hợp nông sinh thái.'
            }
        ];

        let pCardsHtml26 = '';
        passagesMeta26.forEach(meta => {
            const pData = (test26 && test26.passages) ? test26.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml26 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-16" id="suite-box-26">
                <div class="practice-suite-header suite-header-16">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #a5b4fc;"></i> BỘ ĐỀ THỰC CHIẾN 16 (TEST 26) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 16 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Lễ hội âm nhạc quốc tế (Part 1) • Hành vi mạo hiểm & Não bộ (Part 2) • Loài vẹt bản địa Úc (Part 3) • Thực phẩm hữu cơ & Thị trường (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab26} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(26)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab26} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved26 ? 'background: linear-gradient(135deg, #312e81, #6366f1) !important;' : ''}" onclick="${isSaved26 ? 'resumeSavedExam()' : 'startFullExam(26)'}">
                            ${isSaved26 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount26}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(26)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #6366f1;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml26}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 17. BỘ ĐỀ THỰC CHIẾN 17 (TEST 27) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite27') {
        const savedAnsCount27 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 27) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved27 = state.savedExam && state.savedExam.testNum === 27 && savedAnsCount27 > 0;
        const totalVocab27 = (test27 && test27.passages) ? test27.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta27 = [
            {
                testNum: 27,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'digital_detox_mindfulness',
                categoryName: 'Tâm lý học hành vi & Chánh niệm số',
                categoryColor: '#6366f1',
                badgeBg: '#e0e7ff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Digital-Detox Mindfulness Retreat in Thailand',
                icon: 'fa-spa',
                title: 'Digital-Detox Mindfulness Retreats in Thailand: Screen Fatigue & Renewal',
                titleVi: 'Khóa tu chánh niệm ngắt kết nối số tại Thái Lan: Giảm kiệt quệ màn hình',
                summary: 'Thực trạng kiệt quệ tinh thần vì màn hình, quy trình cai nghiện thiết bị tại miền bắc Thái Lan, phục hồi nhịp sinh học và thiết lập quy tắc ranh giới số bền vững.'
            },
            {
                testNum: 27,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'vietnamese_coffee_trade',
                categoryName: 'Kinh tế nông nghiệp & Di sản ẩm thực',
                categoryColor: '#10b981',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Vietnamese Coffee: Culture & Export Industry',
                icon: 'fa-mug-hot',
                title: 'Vietnamese Coffee: Culture, Cultivation & Global Robusta Trade',
                titleVi: 'Cà phê Việt Nam: Văn hóa, Canh tác & Ngành xuất khẩu Robusta toàn cầu',
                summary: 'Lịch sử du nhập từ thế kỷ 19, điều kiện thổ nhưỡng bazan Tây Nguyên, sự bùng nổ sau Đổi Mới, văn hóa cà phê phin vỉa hè và cuộc cách mạng Fine Robusta chất lượng cao.'
            },
            {
                testNum: 27,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'video_games_psychology',
                categoryName: 'Tâm lý học truyền thông & Hành vi vị thành niên',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Psychological Impacts of Violent Video Games',
                icon: 'fa-gamepad',
                title: 'Psychological Impacts of Violent Video Games: The Empirical Debate',
                titleVi: 'Tác động tâm lý của trò chơi điện tử bạo lực: Cuộc tranh luận thực nghiệm',
                summary: 'Mô hình gây hấn tổng quát (GAM) đối chiếu với các nghiên cứu dọc, vai trò của biến số gia đình/xã hội, cơ chế giải tỏa căng thẳng (catharsis) và kỹ năng hợp tác đồng đội.'
            },
            {
                testNum: 27,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'biodiversity_loss_extinction',
                categoryName: 'Sinh học bảo tồn & Sinh thái học cảnh quan',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Global Biodiversity Loss & Extinction',
                icon: 'fa-seedling',
                title: 'Global Biodiversity Loss: Habitat Fragmentation, Invasive Species & Collapse',
                titleVi: 'Mất đa dạng sinh học toàn cầu: Phân mảnh sinh cảnh & Tuyệt chủng loài',
                summary: 'Kỷ nguyên Nhân sinh và tốc độ tuyệt chủng phi tự nhiên, thoái hóa cận huyết do phân mảnh, thảm họa loài xâm lấn và giải pháp kết nối hành lang sinh thái quy mô lớn.'
            }
        ];

        let pCardsHtml27 = '';
        passagesMeta27.forEach(meta => {
            const pData = (test27 && test27.passages) ? test27.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml27 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-17" id="suite-box-27">
                <div class="practice-suite-header suite-header-17">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #6ee7b7;"></i> BỘ ĐỀ THỰC CHIẾN 17 (TEST 27) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 17 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Cai nghiện số tại Thái Lan (Part 1) • Cà phê Việt Nam (Part 2) • Tác động game bạo lực (Part 3) • Mất đa dạng sinh học (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab27} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(27)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab27} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved27 ? 'background: linear-gradient(135deg, #064e3b, #10b981) !important;' : ''}" onclick="${isSaved27 ? 'resumeSavedExam()' : 'startFullExam(27)'}">
                            ${isSaved27 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount27}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(27)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #10b981;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml27}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 18. BỘ ĐỀ THỰC CHIẾN 18 (TEST 28) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite28') {
        const savedAnsCount28 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 28) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved28 = state.savedExam && state.savedExam.testNum === 28 && savedAnsCount28 > 0;
        const totalVocab28 = (test28 && test28.passages) ? test28.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta28 = [
            {
                testNum: 28,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'family_iceskating_memoir',
                categoryName: 'Tự sự gia đình & Tâm lý học vượt khó',
                categoryColor: '#0ea5e9',
                badgeBg: '#f0f9ff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: "Review đề thi thật: A Family's First Winter Ice-Skating Trip",
                icon: 'fa-person-skating',
                title: "A Family's First Winter Ice-Skating Trip: Fear, Falling & Bonding",
                titleVi: 'Hồi ức chuyến trượt băng mùa đông đầu tiên: Nỗi sợ hãi & Tình thân',
                summary: 'Câu chuyện tự sự của chàng trai miền biển lần đầu lên vùng núi tuyết, bài học vấp ngã là cái giá để mua thăng bằng và sự gắn kết gia đình bên đống lửa sưởi ấm.'
            },
            {
                testNum: 28,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'holistic_wellness_habits',
                categoryName: 'Khoa học thần kinh & Sức khỏe lối sống',
                categoryColor: '#10b981',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Holistic Wellness & Breaking Bad Habits',
                icon: 'fa-heart-pulse',
                title: 'Holistic Wellness & Breaking Bad Habits: The Science of Sustainable Change',
                titleVi: 'Sức khỏe toàn diện & Khoa học từ bỏ thói quen xấu: Thay đổi bền vững',
                summary: 'Tam giác vàng dinh dưỡng - giấc ngủ - vận động, giải mã vòng lặp thói quen Cue - Routine - Reward của hạch nền và Quy tắc vàng thay thế hành vi thay vì đè nén ý chí.'
            },
            {
                testNum: 28,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'botany_flowering_induction',
                categoryName: 'Sinh lý học thực vật & Nông nghiệp công nghệ cao',
                categoryColor: '#d97706',
                badgeBg: '#fffbeb',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Botany: Techniques to Induce Flower Blossoming',
                icon: 'fa-seedling',
                title: 'Botany: Techniques to Induce Flower Blossoming: Photoperiodism & Vernalization',
                titleVi: 'Thực vật học: Kỹ thuật điều khiển hoa nở: Quang chu kỳ & Xuân hóa nhiệt độ',
                summary: 'Cơ chế cảm nhận độ dài đêm liên tục của sắc tố phytochrome, xuân hóa giải ức chế gen FLC, vai trò dẫn truyền của hormone florigen và công nghệ nhà kính thương mại.'
            },
            {
                testNum: 28,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'maternal_healthcare_global',
                categoryName: 'Y tế công cộng & Bất bình đẳng giới toàn cầu',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: "Review đề thi thật: Women's Healthcare in Developing Countries",
                icon: 'fa-hospital-user',
                title: "Women's Healthcare Disparities in Developing Nations: Systemic Barriers & Solutions",
                titleVi: 'Bất bình đẳng y tế phụ nữ tại các nước đang phát triển: Rào cản & Giải pháp',
                summary: 'Thảm kịch 300.000 ca tử vong mẹ hàng năm, mô hình Ba sự chậm trễ (gia trưởng, giao thông chia cắt, thiếu thuốc máu cấp cứu) và giải pháp nữ hộ sinh cắm bản.'
            }
        ];

        let pCardsHtml28 = '';
        passagesMeta28.forEach(meta => {
            const pData = (test28 && test28.passages) ? test28.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml28 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-18" id="suite-box-28">
                <div class="practice-suite-header suite-header-18">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #7dd3fc;"></i> BỘ ĐỀ THỰC CHIẾN 18 (TEST 28) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 18 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Trượt băng mùa đông (Part 1) • Sức khỏe & Bỏ thói quen xấu (Part 2) • Kỹ thuật hoa nở (Part 3) • Y tế phụ nữ nước nghèo (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab28} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(28)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab28} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved28 ? 'background: linear-gradient(135deg, #0369a1, #0ea5e9) !important;' : ''}" onclick="${isSaved28 ? 'resumeSavedExam()' : 'startFullExam(28)'}">
                            ${isSaved28 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount28}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(28)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #0ea5e9;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml28}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 19. BỘ ĐỀ THỰC CHIẾN 19 (TEST 29) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite29') {
        const savedAnsCount29 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 29) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved29 = state.savedExam && state.savedExam.testNum === 29 && savedAnsCount29 > 0;
        const totalVocab29 = (test29 && test29.passages) ? test29.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta29 = [
            {
                testNum: 29,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'korea_kangaroo_tribe',
                categoryName: 'Xã hội học & Áp lực kinh tế giới trẻ Á Đông',
                categoryColor: '#f59e0b',
                badgeBg: '#fffbeb',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: The "Kangaroo Club" in South Korea',
                icon: 'fa-house-user',
                title: 'The "Kangaroo Tribe" in South Korea: Housing Crises & Delayed Autonomy',
                titleVi: 'Hiện tượng "Bộ tộc Chuột túi" tại Hàn Quốc: Khủng hoảng nhà ở & Phụ thuộc cha mẹ',
                summary: 'Giải mã áp lực tiền đặt cọc nhà jeonse khổng lồ tại Seoul, thi tuyển công chức kéo dài và hệ lụy bào mòn quỹ hưu trí khiến người già phải lao động mưu sinh.'
            },
            {
                testNum: 29,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'cbt_insomnia_sleep',
                categoryName: 'Tâm lý học lâm sàng & Y học giấc ngủ',
                categoryColor: '#10b981',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: CBT-I for Insomnia & Sleep Disorders',
                icon: 'fa-bed',
                title: 'Cognitive Behavioral Therapy for Insomnia (CBT-I): Rewiring Sleep Architecture',
                titleVi: 'Liệu pháp Nhận thức Hành vi cho Mất ngủ (CBT-I): Tái cấu trúc giấc ngủ tự nhiên',
                summary: 'Khắc phục hạn chế lờn thuốc của thuốc ngủ an thần, kỹ thuật Kiểm soát kích thích phá phản xạ trằn trọc, Giới hạn thời gian nằm giường và Tái cấu trúc nhận thức lo âu.'
            },
            {
                testNum: 29,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'assistive_edtech_inclusive',
                categoryName: 'Công nghệ giáo dục hòa nhập & Đa dạng thần kinh',
                categoryColor: '#6366f1',
                badgeBg: '#e0e7ff',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Assistive EdTech for Special-Needs Children',
                icon: 'fa-eye',
                title: 'Assistive EdTech for Special-Needs Children: Inclusive Learning & Universal Design',
                titleVi: 'Công nghệ hỗ trợ giáo dục cho trẻ khuyết tật: Thiết kế phổ quát & Học tập hòa nhập',
                summary: 'Công nghệ điều khiển con trỏ bằng ánh mắt cho trẻ bại não, công cụ đọc chính tả cho trẻ khó viết (dysgraphia) và khung Thiết kế học tập phổ quát (UDL) bình đẳng.'
            },
            {
                testNum: 29,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'ocean_warming_heatwaves',
                categoryName: 'Hải dương học & Biến đổi khí hậu toàn cầu',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Ocean Warming & Rising Sea Temperatures',
                icon: 'fa-water',
                title: 'Ocean Warming & Marine Heatwaves: Thermal Stratification, Bleaching & AMOC',
                titleVi: 'Đại dương ấm lên & Sóng nhiệt biển: Phân tầng nhiệt, Tẩy trắng san hô & Dòng AMOC',
                summary: 'Đại dương hấp thụ 90% nhiệt dư gây giãn nở dâng mực nước biển, phân tầng nhiệt làm suy giảm thực vật phù du, sóng nhiệt tẩy trắng san hô và nguy cơ sụp đổ dòng AMOC.'
            }
        ];

        let pCardsHtml29 = '';
        passagesMeta29.forEach(meta => {
            const pData = (test29 && test29.passages) ? test29.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml29 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-19" id="suite-box-29">
                <div class="practice-suite-header suite-header-19">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fcd34d;"></i> BỘ ĐỀ THỰC CHIẾN 19 (TEST 29) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 19 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> "CLB Chuột túi" Hàn Quốc (Part 1) • Trị liệu CBT-I mất ngủ (Part 2) • Công nghệ EdTech hòa nhập (Part 3) • Đại dương ấm lên (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab29} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(29)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab29} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved29 ? 'background: linear-gradient(135deg, #78350f, #f59e0b) !important;' : ''}" onclick="${isSaved29 ? 'resumeSavedExam()' : 'startFullExam(29)'}">
                            ${isSaved29 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount29}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(29)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #f59e0b;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml29}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 20. BỘ ĐỀ THỰC CHIẾN 20 (TEST 30) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite30') {
        const savedAnsCount30 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 30) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved30 = state.savedExam && state.savedExam.testNum === 30 && savedAnsCount30 > 0;
        const totalVocab30 = (test30 && test30.passages) ? test30.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta30 = [
            {
                testNum: 30,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'umami_discovery_history',
                categoryName: 'Lịch sử ẩm thực & Hóa học vị giác',
                categoryColor: '#8b5cf6',
                badgeBg: '#f5f3ff',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: The Discovery & History of Umami',
                icon: 'fa-bowl-food',
                title: 'The Discovery & History of Umami: Unveiling the Fifth Basic Taste',
                titleVi: 'Lịch sử khám phá vị thứ 5 Umami: Đột phá của Kikunae Ikeda & Hành trình công nhận',
                summary: 'Nhà hóa học Kikunae Ikeda tách chiết glutamate từ tảo bẹ kombu năm 1908 và cuộc đấu tranh suốt gần một thế kỷ để giới khoa học phương Tây công nhận thụ thể vị giác thứ năm.'
            },
            {
                testNum: 30,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'food_miles_carbon_debate',
                categoryName: 'Kinh tế môi trường & Dấu chân sinh thái',
                categoryColor: '#10b981',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: "Food Miles" & Global Supply Chains',
                icon: 'fa-truck-plane',
                title: '"Food Miles" & Global Supply Chains: The Carbon Footprint Debate',
                titleVi: 'Dặm thực phẩm "Food Miles" & Chuỗi cung ứng toàn cầu: Tranh biện vòng đời carbon',
                summary: 'Nghịch lý vận tải hàng không đối đầu sưởi ấm nhà kính địa phương, phân tích chu trình vòng đời toàn diện LCA và sự thật về nguồn phát thải carbon trong ngành nông nghiệp.'
            },
            {
                testNum: 30,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'ww1_medical_advances',
                categoryName: 'Lịch sử y học & Phẫu thuật dã chiến',
                categoryColor: '#6366f1',
                badgeBg: '#e0e7ff',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Medical Breakthroughs in World War I',
                icon: 'fa-kit-medical',
                title: 'Medical Breakthroughs & Battlefield Surgery in World War I',
                titleVi: 'Đột phá y học & Phẫu thuật dã chiến trong Thế chiến thứ nhất',
                summary: 'Những bước tiến vượt bậc sinh ra từ khói lửa chiến hào: xe X-quang di động của Marie Curie, dung dịch sát khuẩn Dakin, lưu trữ máu sodium citrate và khởi nguồn phẫu thuật tạo hình.'
            },
            {
                testNum: 30,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'ocean_waves_fluid_dynamics',
                categoryName: 'Vật lý hải dương & Động lực học sóng biển',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Ocean Waves & Oceanographic Dynamics',
                icon: 'fa-water',
                title: 'Ocean Wave Dynamics: Fluid Mechanics, Rogue Waves & Coastal Energy',
                titleVi: 'Động lực học sóng biển: Cơ học chất lưu, Hiện tượng sóng độc & Năng lượng ven biển',
                summary: 'Cơ chế truyền động năng từ gió sang mặt nước, dao động quỹ đạo elip, hiện tượng sóng quái vật (rogue waves) do nhiễu xạ phi tuyến và tiềm năng phát điện năng lượng sóng.'
            }
        ];

        let pCardsHtml30 = '';
        passagesMeta30.forEach(meta => {
            const pData = (test30 && test30.passages) ? test30.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml30 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-20" id="suite-box-30">
                <div class="practice-suite-header suite-header-20">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fcd34d;"></i> BỘ ĐỀ THỰC CHIẾN 20 (TEST 30) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 20 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Vị Umami của Kikunae Ikeda (Part 1) • "Food Miles" & Chuỗi cung ứng (Part 2) • Y học chiến hào Thế chiến I (Part 3) • Động lực học sóng biển & Sóng độc (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab30} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(30)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab30} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved30 ? 'background: linear-gradient(135deg, #4c1d95, #8b5cf6) !important;' : ''}" onclick="${isSaved30 ? 'resumeSavedExam()' : 'startFullExam(30)'}">
                            ${isSaved30 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount30}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(30)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #8b5cf6;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml30}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 21. BỘ ĐỀ THỰC CHIẾN 21 (TEST 31) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite31') {
        const savedAnsCount31 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 31) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved31 = state.savedExam && state.savedExam.testNum === 31 && savedAnsCount31 > 0;
        const totalVocab31 = (test31 && test31.passages) ? test31.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta31 = [
            {
                testNum: 31,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'japan_monster_wolf',
                categoryName: 'Nông nghiệp công nghệ cao & Xung đột động vật hoang dã',
                categoryColor: '#ec4899',
                badgeBg: '#fdf2f8',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: The "Monster Wolf" Robot in Japan',
                icon: 'fa-robot',
                title: 'The "Monster Wolf" Robot in Japan: Deterring Wildlife & Revitalizing Rural Frontiers',
                titleVi: 'Sói robot "Monster Wolf" tại Nhật Bản: Ngăn chặn động vật hoang dã & Hồi sinh vùng biên nông thôn',
                summary: 'Cỗ máy bù nhìn sói robot cử động với mắt LED đỏ nhấp nháy, 60 âm thanh răn đe ngẫu nhiên ngăn chặn gấu, lợn rừng phá hoại mùa màng tại các ngôi làng già hóa.'
            },
            {
                testNum: 31,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'venice_mose_barriers',
                categoryName: 'Kỹ thuật thủy lợi & Song đề sinh thái biển',
                categoryColor: '#10b981',
                badgeBg: '#ecfdf5',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: Venice Flood Defenses: MOSE Barrier System',
                icon: 'fa-water',
                title: 'Venice Flood Defenses: The MOSE Barrier System & The Ecological Dilemma',
                titleVi: 'Công trình chống lũ Venice: Hệ thống đê chắn MOSE & Thế tiến thoái lưỡng nan về sinh thái',
                summary: 'Mạng lưới 78 cửa thép rỗng ngầm nâng lên bằng khí nén bảo vệ di sản Venice khỏi triều cường Acqua Alta, đối mặt với nguy cơ biến đầm phá thành bể tù đọng yếm khí.'
            },
            {
                testNum: 31,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'dynamic_pricing_psychology',
                categoryName: 'Kinh tế số & Tâm lý học hành vi người tiêu dùng',
                categoryColor: '#6366f1',
                badgeBg: '#e0e7ff',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Dynamic Pricing Algorithms in E-Commerce',
                icon: 'fa-tags',
                title: 'Dynamic Pricing Algorithms & Consumer Psychology in Modern E-Commerce',
                titleVi: 'Thuật toán định giá linh hoạt & Tâm lý người tiêu dùng trong Thương mại điện tử',
                summary: 'Cách thức các thuật toán AI theo dõi pin yếu, định vị và thiết bị để ép giá người mua cấp bách, tạo hiệu ứng FOMO và làn sóng phản đối đòi hỏi minh bạch pháp lý.'
            },
            {
                testNum: 31,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'shopping_mall_evolution',
                categoryName: 'Kiến trúc đô thị & Xã hội học bán lẻ',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Evolution of Shopping Malls: Victor Gruen',
                icon: 'fa-store',
                title: 'The Evolution of Shopping Malls: Victor Gruen & The "King of Mall" Concept',
                titleVi: 'Tiến hóa của Trung tâm thương mại: Victor Gruen & Khái niệm "King of Mall"',
                summary: 'Từ tầm nhìn quảng trường công cộng châu Âu của Victor Gruen đến "Hiệu ứng Gruen" gây mất định hướng mua sắm bốc đồng, cuộc khủng hoảng retail apocalypse và sự tái sinh thành tổ hợp lối sống.'
            }
        ];

        let pCardsHtml31 = '';
        passagesMeta31.forEach(meta => {
            const pData = (test31 && test31.passages) ? test31.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml31 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-21" id="suite-box-31">
                <div class="practice-suite-header suite-header-21">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fcd34d;"></i> BỘ ĐỀ THỰC CHIẾN 21 (TEST 31) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 21 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Sói robot "Monster Wolf" Nhật Bản (Part 1) • Đê chắn lũ Venice MOSE (Part 2) • Định giá động TMĐT (Part 3) • Tiến hóa TTTM "King of Mall" (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab31} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(31)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab31} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved31 ? 'background: linear-gradient(135deg, #831843, #ec4899) !important;' : ''}" onclick="${isSaved31 ? 'resumeSavedExam()' : 'startFullExam(31)'}">
                            ${isSaved31 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount31}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(31)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #ec4899;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml31}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 22. BỘ ĐỀ THỰC CHIẾN 22 (TEST 32) - ĐÃ PHÁT HÀNH
    // =========================================================================
    if (filter === 'all' || filter === 'suite32') {
        const savedAnsCount32 = (state.savedExam && state.savedExam.answers && state.savedExam.testNum === 32) ? Object.keys(state.savedExam.answers).length : 0;
        const isSaved32 = state.savedExam && state.savedExam.testNum === 32 && savedAnsCount32 > 0;
        const totalVocab32 = (test32 && test32.passages) ? test32.passages.reduce((sum, p) => sum + (p.vocab || []).length, 0) : 108;

        const passagesMeta32 = [
            {
                testNum: 32,
                passageIdx: 0,
                partNum: 1,
                categoryKey: 'organic_farming_crop_rotation',
                categoryName: 'Nông nghiệp hữu cơ bền vững & Hệ sinh thái đất',
                categoryColor: '#10b981',
                badgeBg: '#ecfdf5',
                cefrBand: 'B1-B2',
                wordCount: '~460 từ',
                realReviewNote: 'Review đề thi thật: Sustainable Organic Farming & Crop Rotation',
                icon: 'fa-wheat-awn',
                title: 'Sustainable Organic Farming & Systematic Crop Rotation: Rebuilding Soil Ecosystems',
                titleVi: 'Nông nghiệp hữu cơ bền vững & Luân canh có hệ thống: Tái thiết hệ sinh thái đất',
                summary: 'Cơ chế luân canh cây họ đậu cố định đạm tự nhiên, phân xanh che phủ và cắt đứt vòng đời sâu bệnh giúp hồi sinh độ phì nhiêu đất không cần hóa chất.'
            },
            {
                testNum: 32,
                passageIdx: 1,
                partNum: 2,
                categoryKey: 'okinawa_longevity_blue_zones',
                categoryName: 'Dinh dưỡng học lâm sàng & Bí quyết trường thọ',
                categoryColor: '#14b8a6',
                badgeBg: '#f0fdfa',
                cefrBand: 'B2',
                wordCount: '~475 từ',
                realReviewNote: 'Review đề thi thật: The Okinawa Longevity Diet: Hara Hachi Bu',
                icon: 'fa-heart-pulse',
                title: 'The Okinawa Longevity Diet: Hara Hachi Bu, Nutritional Synergy & Blue Zones',
                titleVi: 'Chế độ ăn trường thọ đảo Okinawa: Triết lý Hara Hachi Bu, Dinh dưỡng hiệp đồng & Vùng đất Blue Zones',
                summary: 'Khoai lang tím beni imo giàu anthocyanin, triết lý Hara Hachi Bu ăn no 8 phần phá vỡ độ trễ báo no của hormone leptin, và mạng lưới xã hội moai nâng cao tuổi thọ.'
            },
            {
                testNum: 32,
                passageIdx: 2,
                partNum: 3,
                categoryKey: 'olympic_games_commercialism',
                categoryName: 'Lịch sử thể thao & Địa chính trị toàn cầu',
                categoryColor: '#6366f1',
                badgeBg: '#e0e7ff',
                cefrBand: 'B2-C1',
                wordCount: '~485 từ',
                realReviewNote: 'Review đề thi thật: Modern Olympic Games: Pierre de Coubertin',
                icon: 'fa-medal',
                title: 'The Modern Olympic Games: Pierre de Coubertin, Geopolitics & The Rise of Commercialism',
                titleVi: 'Thế vận hội Olympic hiện đại: Pierre de Coubertin, Địa chính trị & Sự trỗi dậy của Thương mại hóa',
                summary: 'Từ lý tưởng nghiệp dư của Coubertin, các cuộc tẩy chay thời Chiến tranh Lạnh đến cuộc cách mạng thương mại hóa kỷ nguyên Los Angeles 1984 và bài toán di sản sân vận động.'
            },
            {
                testNum: 32,
                passageIdx: 3,
                partNum: 4,
                categoryKey: 'hoi_an_architectural_heritage',
                categoryName: 'Di sản kiến trúc đô thị & Thích ứng khí hậu',
                categoryColor: '#dc2626',
                badgeBg: '#fef2f2',
                cefrBand: 'C1',
                wordCount: '~500 từ',
                realReviewNote: 'Review đề thi thật: Hoi An Ancient Town & Maritime Heritage',
                icon: 'fa-archway',
                title: 'The Architectural & Commercial Legacy of Hoi An Ancient Town: Trade, Floods & Heritage'
                ,titleVi: 'Di sản kiến trúc & Thương mại Cảng thị cổ Hội An: Giao thương, Thích ứng lũ lụt & Bảo tồn di sản',
                summary: 'Cấu trúc nhà ống gỗ lim hai mặt sông - phố, giải pháp kiến trúc gác lửng ròng rọc sống chung với lũ lụt sông Thu Bồn, và bài toán bảo tồn trước áp lực Disneyfication du lịch.'
            }
        ];

        let pCardsHtml32 = '';
        passagesMeta32.forEach(meta => {
            const pData = (test32 && test32.passages) ? test32.passages[meta.passageIdx] : null;
            const vocabList = pData ? (pData.vocab || []) : [];
            const qList = pData ? (pData.questions || []) : [];

            let masteredVocab = 0;
            vocabList.forEach(v => {
                const key = `${meta.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords && state.preTest.masteredWords[key]) masteredVocab++;
            });

            pCardsHtml32 += `
                <div class="practice-card">
                    <div class="practice-card-top">
                        <div class="practice-card-badge" style="background: ${meta.badgeBg}; color: ${meta.categoryColor}; border: 1px solid ${meta.categoryColor}33;">
                            <i class="fa-solid ${meta.icon}"></i> ${meta.categoryName}
                        </div>
                        <div class="practice-level-tag">
                            <span class="cefr-badge">${meta.cefrBand}</span>
                            <span class="part-badge">Part ${meta.partNum}</span>
                        </div>
                    </div>

                    <div class="practice-review-alert">
                        <i class="fa-solid fa-sparkles"></i> ${meta.realReviewNote}
                    </div>

                    <h3 class="practice-card-title">${meta.title}</h3>
                    <h4 class="practice-card-subtitle">${meta.titleVi}</h4>
                    <p class="practice-card-summary">${meta.summary}</p>

                    <div class="practice-card-meta-row">
                        <span title="Thời gian làm bài quy định"><i class="fa-solid fa-clock"></i> 15 phút</span>
                        <span title="Số lượng câu hỏi trắc nghiệm"><i class="fa-solid fa-list-check"></i> ${qList.length} câu chuẩn hóa</span>
                        <span title="Từ vựng học thuật cốt lõi"><i class="fa-solid fa-spell-check"></i> ${masteredVocab}/${vocabList.length} từ</span>
                        <span title="Độ dài bài đọc"><i class="fa-solid fa-file-lines"></i> ${meta.wordCount}</span>
                    </div>

                    <div class="practice-card-actions">
                        <button class="secondary-btn btn-practice-pre" onclick="openPreTestView(${meta.testNum}, 'cards', ${meta.passageIdx})">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: NẠP TỪ (${vocabList.length} TỪ)
                        </button>
                        <button class="primary-btn btn-practice-cbt" onclick="startSinglePassageExam(${meta.testNum}, ${meta.passageIdx})">
                            <i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING (LUYỆN 15 PHÚT)
                        </button>
                        <button class="secondary-btn btn-practice-post" onclick="openPostReadingModal(${meta.testNum}, '${meta.passageIdx}')">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: PARAPHRASE
                        </button>
                    </div>
                </div>
            `;
        });

        suitesHtml += `
            <div class="practice-suite-box suite-22" id="suite-box-32">
                <div class="practice-suite-header suite-header-22">
                    <div class="suite-header-info">
                        <div class="suite-header-tag">
                            <i class="fa-solid fa-award" style="color: #fcd34d;"></i> BỘ ĐỀ THỰC CHIẾN 22 (TEST 32) • REVIEW THI THẬT
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 22 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Luân canh hữu cơ (Part 1) • Ăn thọ Okinawa Hara Hachi Bu (Part 2) • Lịch sử Olympic Pierre de Coubertin (Part 3) • Phố cổ Hội An thích ứng lũ (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> ${totalVocab32} từ vựng cốt lõi</span>
                            <span><i class="fa-solid fa-graduation-cap"></i> Quy đổi chuẩn B1 - B2 - C1</span>
                        </div>
                    </div>
                    <div class="suite-header-actions">
                        <button class="secondary-btn btn-suite-step-1" onclick="openPreTestView(32)">
                            <i class="fa-solid fa-book-open-reader"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (${totalVocab32} TỪ)
                        </button>
                        <button class="primary-btn btn-suite-exam" style="${isSaved32 ? 'background: linear-gradient(135deg, #134e4a, #14b8a6) !important;' : ''}" onclick="${isSaved32 ? 'resumeSavedExam()' : 'startFullExam(32)'}">
                            ${isSaved32 ? `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • TIẾP TỤC (${savedAnsCount32}/40 câu)` : `<i class="fa-solid fa-play"></i> BƯỚC 2: WHILE-READING • THI TRỌN BỘ 60 PHÚT`}
                        </button>
                        <button class="secondary-btn btn-suite-step-3" onclick="openPostReadingModal(32)">
                            <i class="fa-solid fa-lightbulb"></i> BƯỚC 3: POST-READING • GIẢI MÃ PARAPHRASE
                        </button>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #14b8a6;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (Học viên có thể bấm luyện riêng từng bài 15 phút):
                    </div>
                    <div class="practice-suite-grid">
                        ${pCardsHtml32}
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 23. BỘ ĐỀ THỰC CHIẾN 23 (TEST 33) - ĐANG BIÊN SOẠN DỮ LIỆU REVIEW
    // =========================================================================
    if (filter === 'all' || filter === 'suite33') {
        suitesHtml += `
            <div class="practice-suite-box suite-upcoming" id="suite-box-33">
                <div class="practice-suite-header suite-header-upcoming">
                    <div class="suite-header-info">
                        <div class="suite-header-tag" style="background: rgba(249, 115, 22, 0.25); color: #fdba74; border-color: rgba(249, 115, 22, 0.45);">
                            <i class="fa-solid fa-hourglass-start"></i> BỘ ĐỀ THỰC CHIẾN 23 (TEST 33) • ĐANG BIÊN SOẠN
                        </div>
                        <h3>VSTEP READING THỰC CHIẾN 23 (TRỌN BỘ 4 BÀI • 40 CÂU • 60 PHÚT)</h3>
                        <div class="suite-header-topics">
                            <strong>4 Topics:</strong> Tái chế nâng cấp nội thất cũ Upcycling (Part 1) • Văn minh Đồng bằng sông Hồng & Múa rối nước (Part 2) • Xử lý ngôn ngữ & Rối loạn thần kinh (Part 3) • Sinh lý học vị giác & Thụ thể của lưỡi (Part 4)
                        </div>
                        <div class="suite-header-meta">
                            <span><i class="fa-solid fa-stopwatch"></i> 60 phút</span>
                            <span><i class="fa-solid fa-list-check"></i> 40 câu trắc nghiệm</span>
                            <span><i class="fa-solid fa-spell-check"></i> Chuẩn 25-30 từ/bài (108 từ vựng)</span>
                            <span><i class="fa-solid fa-sparkles"></i> Review đề thi thật sát thực tế</span>
                        </div>
                    </div>
                    <div>
                        <span style="background: rgba(255,255,255,0.14); border: 1.5px dashed rgba(255,255,255,0.4); padding: 10px 18px; border-radius: 12px; font-weight: 800; font-size: 0.86rem; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-circle-notch fa-spin"></i> Đang biên soạn bài đọc & 40 câu hỏi chuẩn hóa
                        </span>
                    </div>
                </div>
                <div class="practice-suite-body">
                    <div class="suite-passages-heading">
                        <i class="fa-solid fa-layer-group" style="color: #f97316;"></i>
                        4 TOPICS BÀI ĐỌC THUỘC BỘ ĐỀ NÀY (HÀNG 1 TEST 23):
                    </div>
                    <div class="practice-suite-grid">
                        <div class="upcoming-passage-card">
                            <div>
                                <span class="part-badge" style="background:#e0e7ff; color:#4338ca; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:6px;">Part 01 • B1/B2</span>
                                <h4>Upcycling Second-Hand Furniture</h4>
                                <h5>Nghệ thuật tái chế nâng cấp (Upcycling) nội thất & đồ gia dụng cũ</h5>
                                <p>Phân biệt upcycling sáng tạo với tái chế phá hủy thông thường, xu hướng kinh tế tuần hoàn giảm rác thải bãi chôn lấp và giá trị thủ công độc bản.</p>
                            </div>
                            <div class="upcoming-tag-bar">
                                <span><i class="fa-solid fa-clock"></i> 15 phút • 10 câu</span>
                                <span style="color:#6366f1;"><i class="fa-solid fa-sparkles"></i> Sắp phát hành</span>
                            </div>
                        </div>

                        <div class="upcoming-passage-card">
                            <div>
                                <span class="part-badge" style="background:#ecfdf5; color:#065f46; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:6px;">Part 02 • B2</span>
                                <h4>Red River Delta & Water Puppetry Heritage</h4>
                                <h5>Văn minh Đồng bằng sông Hồng & Nghệ thuật Múa rối nước truyền thống</h5>
                                <p>Khám phá cái nôi văn hóa lúa nước miền Bắc Việt Nam, kỹ thuật điều khiển con rối gỗ dưới mặt ao làng và hành trình đưa di sản dân gian ra sân khấu thế giới.</p>
                            </div>
                            <div class="upcoming-tag-bar">
                                <span><i class="fa-solid fa-clock"></i> 15 phút • 10 câu</span>
                                <span style="color:#10b981;"><i class="fa-solid fa-sparkles"></i> Sắp phát hành</span>
                            </div>
                        </div>

                        <div class="upcoming-passage-card">
                            <div>
                                <span class="part-badge" style="background:#fef3c7; color:#92400e; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:6px;">Part 03 • B2/C1</span>
                                <h4>Language Processing & Neurological Disorders</h4>
                                <h5>Xử lý ngôn ngữ: Khả năng nghe - đọc & Các rối loạn thần kinh ngôn ngữ</h5>
                                <p>Nghiên cứu vai trò vùng Broca và Wernicke trong giải mã âm thanh - chữ viết, cơ chế chứng mất ngôn ngữ (aphasia), khó đọc (dyslexia) và phục hồi chức năng thần kinh.</p>
                            </div>
                            <div class="upcoming-tag-bar">
                                <span><i class="fa-solid fa-clock"></i> 15 phút • 10 câu</span>
                                <span style="color:#d97706;"><i class="fa-solid fa-sparkles"></i> Sắp phát hành</span>
                            </div>
                        </div>

                        <div class="upcoming-passage-card">
                            <div>
                                <span class="part-badge" style="background:#fee2e2; color:#991b1b; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:6px;">Part 04 • C1</span>
                                <h4>Gustatory Physiology & Tongue Taste Receptors</h4>
                                <h5>Sinh lý học vị giác: Cơ chế thụ thể thần kinh của lưỡi & Giải ảo bản đồ vị</h5>
                                <p>Phân tích cấu trúc vi mô tế bào thụ thể vị giác, kênh ion và đường dẫn truyền lên vỏ não vị giác, đồng thời bác bỏ ngộ nhận kinh điển về "bản đồ vùng vị trên lưỡi".</p>
                            </div>
                            <div class="upcoming-tag-bar">
                                <span><i class="fa-solid fa-clock"></i> 15 phút • 10 câu</span>
                                <span style="color:#ef4444;"><i class="fa-solid fa-sparkles"></i> Sắp phát hành</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = suitesHtml;
}

// =========================================================================
// PRE-TEST VOCABULARY WARM-UP & TEST LOBBY (NẠP TỪ VỰNG - PRE-TEST)
// =========================================================================
function getTestAllVocab(testNum) {
    const test = (getMockTests() || []).find(t => t.testNum === testNum);
    if (!test) return [];
    const list = [];
    test.passages.forEach((p, pIdx) => {
        (p.vocab || []).forEach(v => {
            list.push({
                ...v,
                p: v.p !== undefined ? v.p : pIdx,
                pName: v.pName || `Passage ${pIdx + 1}`,
                pTitle: v.pTitle || p.title,
                testNum: test.testNum
            });
        });
    });
    return list;
}

function getFilteredPreTestVocab() {
    const all = getTestAllVocab(state.preTest.testNum);
    const pFilter = state.preTest.passageFilter;
    const lFilter = state.preTest.levelFilter;
    const q = (state.preTest.searchQuery || '').trim().toLowerCase();

    return all.filter(item => {
        const matchP = pFilter === 'all' || String(item.p) === String(pFilter);
        const matchL = lFilter === 'all' || (item.level || 'B2') === lFilter;
        const matchQ = !q ||
            item.word.toLowerCase().includes(q) ||
            (item.mean || '').toLowerCase().includes(q) ||
            (item.syns || []).some(s => s.toLowerCase().includes(q));
        return matchP && matchL && matchQ;
    });
}

function openPreTestView(testNum, initialTarget, passageFilter) {
    if (isTestLocked(testNum || 1)) {
        notifyLockedTest(testNum || 1);
        return;
    }
    playSound('click');
    state.preTest.testNum = testNum || 1;
    state.preTest.passageFilter = (passageFilter !== undefined && passageFilter !== null) ? String(passageFilter) : 'all';
    state.preTest.levelFilter = 'all';
    state.preTest.searchQuery = '';
    state.preTest.fcIdx = 0;
    state.preTest.fcFlipped = false;

    if (initialTarget === 'quiz') {
        state.preTest.mode = 'quiz';
        initPreTestQuiz();
    } else if (initialTarget === 'match') {
        state.preTest.mode = 'match';
        initPreTestMatch();
    } else {
        state.preTest.mode = 'cards';
    }

    switchView('pretest');

    if (initialTarget === 'passages') {
        setTimeout(() => {
            const el = document.getElementById('pretest-passages-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
    }
}

function selectPreTestNum(testNum) {
    if (isTestLocked(testNum)) {
        notifyLockedTest(testNum);
        return;
    }
    playSound('click');
    state.preTest.testNum = testNum;
    state.preTest.passageFilter = 'all';
    state.preTest.fcIdx = 0;
    state.preTest.fcFlipped = false;
    if (state.preTest.mode === 'quiz') initPreTestQuiz();
    if (state.preTest.mode === 'match') initPreTestMatch();
    const titleEl = document.getElementById('current-view-title');
    if (titleEl) titleEl.textContent = `BƯỚC 1: PRE-READING • NẠP TỪ VỰNG (ĐỀ SỐ ${String(testNum).padStart(2, '0')})`;
    renderPreTestView();
}

function setPreTestPassageFilter(pVal) {
    playSound('click');
    state.preTest.passageFilter = String(pVal);
    state.preTest.fcIdx = 0;
    state.preTest.fcFlipped = false;
    if (state.preTest.mode === 'quiz') initPreTestQuiz();
    if (state.preTest.mode === 'match') initPreTestMatch();
    renderPreTestView();
}

function setPreTestLevelFilter(lVal) {
    playSound('click');
    state.preTest.levelFilter = lVal;
    state.preTest.fcIdx = 0;
    state.preTest.fcFlipped = false;
    renderPreTestActiveWorkspace();
}

function onPreTestSearch(val) {
    state.preTest.searchQuery = val;
    state.preTest.fcIdx = 0;
    renderPreTestActiveWorkspace();
}

function setPreTestMode(mode) {
    playSound('click');
    state.preTest.mode = mode;
    if (mode === 'quiz') initPreTestQuiz();
    if (mode === 'match') initPreTestMatch();
    renderPreTestView();
}

function toggleMasterPreTestWord(wordStr) {
    playSound('click');
    const key = `${state.preTest.testNum}_${wordStr.toLowerCase()}`;
    state.preTest.masteredWords[key] = !state.preTest.masteredWords[key];
    localStorage.setItem('vstep_pretest_mastered', JSON.stringify(state.preTest.masteredWords));
    renderPreTestView();
}

function markAllTestVocabMastered() {
    playSound('correct');
    const all = getTestAllVocab(state.preTest.testNum);
    all.forEach(v => {
        const key = `${state.preTest.testNum}_${v.word.toLowerCase()}`;
        state.preTest.masteredWords[key] = true;
    });
    localStorage.setItem('vstep_pretest_mastered', JSON.stringify(state.preTest.masteredWords));
    renderPreTestView();
}

function highlightTargetWordInSentence(sentence, word) {
    if (!sentence || !word) return sentence || '';
    const cleanW = word.replace(/\([^)]*\)/g, '').split('/')[0].trim();
    const stem = cleanW.split(/\s+/)[0].replace(/(?:ing|ed|s)$/i, '');
    const pattern = cleanW.length >= 4 ? cleanW.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    if (pattern) {
        const reg = new RegExp(`(${pattern}\\w*)`, 'gi');
        if (reg.test(sentence)) {
            return sentence.replace(reg, '<mark style="background: #fef08a; color: #854d0e; font-weight: 800; padding: 0 4px; border-radius: 4px; font-style: normal;">$1</mark>');
        }
    }
    if (stem && stem.length >= 4) {
        const reg2 = new RegExp(`(${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*)`, 'gi');
        if (reg2.test(sentence)) {
            return sentence.replace(reg2, '<mark style="background: #fef08a; color: #854d0e; font-weight: 800; padding: 0 4px; border-radius: 4px; font-style: normal;">$1</mark>');
        }
    }
    return sentence;
}

function renderPreTestView() {
    const container = document.getElementById('pretest-workspace-container');
    if (!container) return;

    const allTests = getMockTests() || [];
    const coreTests = allTests.filter(t => t.testNum <= 10);
    const test = allTests.find(t => t.testNum === state.preTest.testNum) || coreTests[0];
    if (!test) return;

    const allVocab = getTestAllVocab(test.testNum);
    const masteredCount = allVocab.filter(v => state.preTest.masteredWords[`${test.testNum}_${v.word.toLowerCase()}`]).length;
    const readinessPercent = allVocab.length > 0 ? Math.round((masteredCount / allVocab.length) * 100) : 0;

    // TÁCH BIỆT TRIỆT ĐỂ: 10 Selector Pills cho 10 Đề thi chuẩn
    // Nếu học viên nạp từ từ bộ đề thực chiến (testNum > 10), hiển thị thêm 1 pill riêng biệt
    let pillList = [...coreTests];
    if (test.testNum > 10 && !pillList.some(t => t.testNum === test.testNum)) {
        pillList.push(test);
    }

    const testPillsHtml = pillList.map(t => {
        const locked = isTestLocked(t.testNum);
        const isPracticeSet = t.testNum > 10;
        const label = isPracticeSet ? `Thực chiến 0${t.testNum - 10}` : `Đề ${String(t.testNum).padStart(2, '0')}`;
        const extraStyle = isPracticeSet ? 'background: #fdf4ff; border-color: #d946ef; color: #86198f; font-weight: 800;' : '';
        return `
            <button class="pretest-test-pill ${t.testNum === test.testNum ? 'active' : ''}" style="${locked ? 'opacity: 0.55; cursor: not-allowed;' : ''} ${extraStyle}" onclick="${locked ? `notifyLockedTest(${t.testNum})` : `selectPreTestNum(${t.testNum})`}">
                ${locked ? '<i class="fa-solid fa-lock" style="font-size: 0.72rem; margin-right: 3px; color: #ef4444;"></i>' : ''}${label}
            </button>
        `;
    }).join('');

    // 4 Passage Cards (Pre-Test Vocab Filter + Single Passage 15m Practice)
    const passageColors = [
        { bg: '#eff6ff', text: '#2563eb' },
        { bg: '#f0fdfa', text: '#0d9488' },
        { bg: '#fefce8', text: '#b45309' },
        { bg: '#fef2f2', text: '#b91c1c' }
    ];
    const passageCardsHtml = test.passages.map((p, idx) => {
        const col = passageColors[idx % 4];
        const pVocabCount = (p.vocab || []).length;
        const isFilterActive = String(state.preTest.passageFilter) === String(idx);
        const shortTitle = p.title.replace(/^Passage\s*\d+:\s*/i, '');
        return `
            <div class="pretest-passage-card ${isFilterActive ? 'active-filter' : ''}">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="background: ${col.bg}; color: ${col.text}; font-weight: 800; font-size: 0.78rem; padding: 3px 10px; border-radius: 9999px;">
                            PASSAGE 0${idx + 1}
                        </span>
                        <span style="font-size: 0.78rem; color: #64748b; font-weight: 700;">
                            <i class="fa-solid fa-book-bookmark" style="color: #6366f1;"></i> ${pVocabCount} từ mới
                        </span>
                    </div>
                    <h4 style="font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; line-height: 1.35;">${shortTitle}</h4>
                    <p style="font-size: 0.84rem; color: #64748b; line-height: 1.5; margin: 0 0 14px 0;">${p.topic}</p>
                </div>
                <div style="display: flex; gap: 6px; flex-direction: column;">
                    <button class="secondary-btn" style="width: 100%; justify-content: center; padding: 7px 10px; font-size: 0.8rem; ${isFilterActive ? 'border-color:#4f46e5; color:#4f46e5; background:#eef2ff;' : ''}" onclick="setPreTestPassageFilter('${idx}')">
                        <i class="fa-solid fa-filter"></i> ${isFilterActive ? 'Đang xem từ vựng bài này' : `Nạp từ vựng Bài ${idx + 1}`}
                    </button>
                    <button class="primary-btn" style="width: 100%; justify-content: center; padding: 8px 10px; font-size: 0.82rem; background: #1e293b;" onclick="startSinglePassageExam(${test.testNum}, ${idx})">
                        <i class="fa-solid fa-play"></i> Thi riêng Bài ${idx + 1} (15p)
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="pretest-container">
            <!-- Top Selector Bar for All 10 Tests -->
            <div class="pretest-test-selector-bar">
                <button class="secondary-btn" style="padding: 6px 12px; font-size: 0.8rem;" onclick="switchView('dashboard')">
                    <i class="fa-solid fa-arrow-left"></i> 10 Đề Thi
                </button>
                <span style="font-size: 0.82rem; font-weight: 800; color: #475569; margin: 0 4px;">CHỌN ĐỀ NẠP TỪ VỰNG:</span>
                ${testPillsHtml}
            </div>

            <!-- Pre-Test Hero Banner -->
            <div class="pretest-hero-card">
                <div class="pretest-hero-flex">
                    <div style="flex: 1; min-width: 280px;">
                        <span class="pretest-step-badge">
                            <i class="fa-solid fa-sparkles"></i> BƯỚC 1: PRE-READING • NẠP TỪ VỰNG TRƯỚC KHI ĐỌC
                        </span>
                        <h2 style="font-size: 1.65rem; font-weight: 900; margin: 0 0 8px 0;">
                            ${test.title}: Nạp Từ Vựng Trọng Tâm
                        </h2>
                        <p style="font-size: 0.95rem; color: #e0e7ff; margin: 0 0 18px 0; line-height: 1.6; max-width: 680px;">
                            Làm quen trước với <strong>${allVocab.length} từ vựng mới & khó</strong>, hệ thống từ đồng nghĩa (Paraphrasing) và câu ví dụ minh họa chuẩn học thuật để tăng tốc độ đọc hiểu khi bước vào phòng thi.
                        </p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button class="primary-btn" style="background: #10b981; color: #ffffff; padding: 12px 24px; font-size: 1rem; font-weight: 900; border-radius: 12px; box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);" onclick="startFullExam(${test.testNum})">
                                <i class="fa-solid fa-rocket"></i> VÀO BƯỚC 2: WHILE-READING (THI 60 PHÚT)
                            </button>
                            <button class="secondary-btn" style="background: rgba(255,255,255,0.14); color: #ffffff; border-color: rgba(255,255,255,0.3); padding: 12px 18px;" onclick="setPreTestMode('quiz')">
                                <i class="fa-solid fa-bolt"></i> Kiểm tra phản xạ nhanh trước khi thi
                            </button>
                        </div>
                    </div>

                    <!-- Readiness Progress Box -->
                    <div class="pretest-readiness-box">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8rem; font-weight: 800; color: #e0e7ff; text-transform: uppercase;">Tiến độ nạp từ vựng đề này</span>
                            <span style="font-size: 1.05rem; font-weight: 900; color: #34d399;">${masteredCount} / ${allVocab.length} từ (${readinessPercent}%)</span>
                        </div>
                        <div style="height: 10px; background: rgba(255,255,255,0.18); border-radius: 9999px; overflow: hidden; margin-bottom: 12px;">
                            <div style="width: ${readinessPercent}%; height: 100%; background: linear-gradient(90deg, #34d399, #10b981); border-radius: 9999px; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <span style="font-size: 0.78rem; color: #cbd5e1;">Đánh dấu "Đã nạp" các từ bạn đã nắm vững</span>
                            <button class="pretest-master-btn" style="background: rgba(255,255,255,0.18); color: #fff; border-color: rgba(255,255,255,0.3);" onclick="markAllTestVocabMastered()">
                                <i class="fa-solid fa-check-double"></i> Thuộc tất cả
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4 Single-Passage Cards -->
            <div id="pretest-passages-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <h3 style="font-size: 1.12rem; font-weight: 800; color: var(--text-color); margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-layer-group" style="color: #4f46e5;"></i>
                        Cấu Trúc 4 Bài Đọc Trong Đề Số ${String(test.testNum).padStart(2, '0')} (Chọn bài để lọc từ vựng hoặc thi lẻ 15 phút):
                    </h3>
                    ${state.preTest.passageFilter !== 'all' ? `
                        <button class="secondary-btn" style="padding: 5px 12px; font-size: 0.8rem;" onclick="setPreTestPassageFilter('all')">
                            <i class="fa-solid fa-rotate-left"></i> Hiển thị tất cả 4 bài (${allVocab.length} từ)
                        </button>
                    ` : ''}
                </div>
                <div class="pretest-passages-grid">
                    ${passageCardsHtml}
                </div>
            </div>

            <!-- Interactive Pre-Test Vocabulary Box -->
            <div style="background: var(--surface-solid); border: 1.5px solid var(--border-color); border-radius: 18px; padding: 24px; box-shadow: var(--shadow-sm);">
                <!-- 4 Learning Mode Sub-Tabs -->
                <div class="pretest-mode-tabs">
                    <button class="pretest-mode-btn ${state.preTest.mode === 'cards' ? 'active' : ''}" onclick="setPreTestMode('cards')">
                        <i class="fa-solid fa-address-card"></i> 1. Thẻ Từ Vựng & Ví Dụ (${allVocab.length} từ)
                    </button>
                    <button class="pretest-mode-btn ${state.preTest.mode === 'flashcards' ? 'active' : ''}" onclick="setPreTestMode('flashcards')">
                        <i class="fa-solid fa-clone"></i> 2. Lật Thẻ Flashcard 3D
                    </button>
                    <button class="pretest-mode-btn ${state.preTest.mode === 'quiz' ? 'active' : ''}" onclick="setPreTestMode('quiz')">
                        <i class="fa-solid fa-bolt"></i> 3. Trắc Nghiệm Phản Xạ Nhanh
                    </button>
                    <button class="pretest-mode-btn ${state.preTest.mode === 'match' ? 'active' : ''}" onclick="setPreTestMode('match')">
                        <i class="fa-solid fa-puzzle-piece"></i> 4. Ghép Cặp Từ Đồng Nghĩa (Paraphrase)
                    </button>
                </div>

                <!-- Passage Filter + Level Filter + Search Bar -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="filter-pill-btn ${state.preTest.passageFilter === 'all' ? 'active' : ''}" onclick="setPreTestPassageFilter('all')">
                            Tất cả 4 bài (${allVocab.length})
                        </button>
                        <button class="filter-pill-btn ${state.preTest.passageFilter === '0' ? 'active' : ''}" onclick="setPreTestPassageFilter('0')">
                            Passage 1 (${(test.passages[0]?.vocab || []).length})
                        </button>
                        <button class="filter-pill-btn ${state.preTest.passageFilter === '1' ? 'active' : ''}" onclick="setPreTestPassageFilter('1')">
                            Passage 2 (${(test.passages[1]?.vocab || []).length})
                        </button>
                        <button class="filter-pill-btn ${state.preTest.passageFilter === '2' ? 'active' : ''}" onclick="setPreTestPassageFilter('2')">
                            Passage 3 (${(test.passages[2]?.vocab || []).length})
                        </button>
                        <button class="filter-pill-btn ${state.preTest.passageFilter === '3' ? 'active' : ''}" onclick="setPreTestPassageFilter('3')">
                            Passage 4 (${(test.passages[3]?.vocab || []).length})
                        </button>
                    </div>

                    ${state.preTest.mode === 'cards' ? `
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <div style="display: flex; gap: 4px;" id="pretest-level-pills">
                            <button class="filter-pill-btn ${state.preTest.levelFilter === 'all' ? 'active' : ''}" style="padding: 4px 10px; font-size: 0.78rem;" onclick="setPreTestLevelFilter('all')">Mọi cấp độ</button>
                            <button class="filter-pill-btn ${state.preTest.levelFilter === 'B1' ? 'active' : ''}" style="padding: 4px 10px; font-size: 0.78rem;" onclick="setPreTestLevelFilter('B1')">B1</button>
                            <button class="filter-pill-btn ${state.preTest.levelFilter === 'B2' ? 'active' : ''}" style="padding: 4px 10px; font-size: 0.78rem;" onclick="setPreTestLevelFilter('B2')">B2</button>
                            <button class="filter-pill-btn ${state.preTest.levelFilter === 'C1' ? 'active' : ''}" style="padding: 4px 10px; font-size: 0.78rem;" onclick="setPreTestLevelFilter('C1')">C1</button>
                        </div>
                        <input type="text" class="vocab-search-input" style="min-width: 220px; padding: 7px 14px; font-size: 0.85rem;" placeholder="Tìm từ vựng, nghĩa, đồng nghĩa..." value="${state.preTest.searchQuery}" oninput="onPreTestSearch(this.value)">
                    </div>
                    ` : ''}
                </div>

                <!-- Dynamic Body for Active Mode -->
                <div id="pretest-active-mode-body"></div>
            </div>
        </div>
    `;

    renderPreTestActiveWorkspace();
}

function renderPreTestActiveWorkspace() {
    const bodyEl = document.getElementById('pretest-active-mode-body');
    if (!bodyEl) return;

    const mode = state.preTest.mode;
    if (mode === 'cards') {
        renderPreTestCardsMode(bodyEl);
    } else if (mode === 'flashcards') {
        renderPreTestFlashcardsMode(bodyEl);
    } else if (mode === 'quiz') {
        renderPreTestQuizMode(bodyEl);
    } else if (mode === 'match') {
        renderPreTestMatchMode(bodyEl);
    }
}

function renderPreTestCardsMode(bodyEl) {
    const list = getFilteredPreTestVocab();
    if (list.length === 0) {
        bodyEl.innerHTML = `
            <div style="text-align: center; padding: 36px; color: #64748b;">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; color: #94a3b8; margin-bottom: 8px;"></i>
                <p style="margin: 0;">Không tìm thấy từ vựng nào phù hợp với bộ lọc hiện tại.</p>
            </div>
        `;
        return;
    }

    const cardsHtml = list.map(v => {
        const key = `${state.preTest.testNum}_${v.word.toLowerCase()}`;
        const isMastered = !!state.preTest.masteredWords[key];
        const safeWordAttr = v.word.replace(/'/g, "\\'");
        const synsHtml = (v.syns || []).map(s => {
            const safeSyn = s.replace(/'/g, "\\'");
            return `<span class="pretest-syn-pill" onclick="speakWord('${safeSyn}')" title="Nhấn để nghe phát âm">${s} <i class="fa-solid fa-volume-low" style="font-size: 0.7rem; opacity: 0.7;"></i></span>`;
        }).join('');
        const hlContext = highlightTargetWordInSentence(v.ex || '', v.word);
        const safeExAttr = (v.ex || '').replace(/'/g, "\\'");

        return `
            <div class="pretest-vocab-card ${isMastered ? 'is-mastered' : ''}">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <span class="pretest-word-title">${v.word}</span>
                            <button class="cbt-tool-btn" style="padding: 3px 9px; font-size: 0.8rem; background: #eef2ff; color: #4f46e5; border-color: #c7d2fe;" onclick="speakWord('${safeWordAttr}')" title="Nghe phát âm chuẩn Studio">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                            <span class="pretest-ipa-tag">${v.ipa || ''}</span>
                            <span class="pretest-pos-badge">${v.pos || 'n'}</span>
                            <span class="pretest-level-badge pretest-level-${v.level || 'B2'}">${v.level || 'B2'}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                            <span style="background: #f1f5f9; color: #475569; font-weight: 800; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px;">${v.pName}</span>
                            <button class="pretest-master-btn ${isMastered ? 'active' : ''}" onclick="toggleMasterPreTestWord('${safeWordAttr}')">
                                <i class="fa-solid ${isMastered ? 'fa-circle-check' : 'fa-regular fa-circle'}"></i>
                                ${isMastered ? 'Đã nạp' : 'Đánh dấu'}
                            </button>
                        </div>
                    </div>

                    <div class="pretest-mean-box">
                        <i class="fa-solid fa-lightbulb" style="color: #f59e0b; margin-right: 5px;"></i> ${v.mean}
                    </div>

                    ${synsHtml ? `
                    <div class="pretest-syns-row" style="margin-top: 8px;">
                        <strong style="color: #4338ca;"><i class="fa-solid fa-retweet"></i> Đồng nghĩa (Paraphrase):</strong>
                        ${synsHtml}
                    </div>` : ''}
                </div>

                ${hlContext ? `
                <div class="pretest-context-box">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <strong style="font-style: normal; color: #1d4ed8; font-size: 0.76rem; text-transform: uppercase;">
                            <i class="fa-solid fa-quote-left"></i> Ví dụ minh họa (Example):
                        </strong>
                        <button class="cbt-tool-btn" style="padding: 2px 8px; font-size: 0.72rem; background: #eff6ff; color: #2563eb; border-color: #bfdbfe;" onclick="speakWord('${safeExAttr}')" title="Nghe câu ví dụ">
                            <i class="fa-solid fa-volume-high"></i> Nghe câu
                        </button>
                    </div>
                    "${hlContext}"
                </div>` : ''}
            </div>
        `;
    }).join('');

    bodyEl.innerHTML = `<div class="pretest-vocab-grid">${cardsHtml}</div>`;
}

function renderPreTestFlashcardsMode(bodyEl) {
    const list = getFilteredPreTestVocab();
    if (list.length === 0) {
        bodyEl.innerHTML = `<div style="text-align: center; padding: 36px; color: #64748b;">Không có từ vựng nào trong bộ lọc này.</div>`;
        return;
    }

    const idx = Math.max(0, Math.min(state.preTest.fcIdx, list.length - 1));
    state.preTest.fcIdx = idx;
    const v = list[idx];
    const safeWordAttr = v.word.replace(/'/g, "\\'");
    const key = `${state.preTest.testNum}_${v.word.toLowerCase()}`;
    const isMastered = !!state.preTest.masteredWords[key];
    const hlContext = highlightTargetWordInSentence(v.ex || '', v.word);

    bodyEl.innerHTML = `
        <div class="flashcard-game-box" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; max-width: 560px; margin: 0 auto 10px auto;">
                <span style="font-size: 0.85rem; font-weight: 800; color: #475569;">
                    Thẻ ${idx + 1} / ${list.length} • <span style="color: #4f46e5;">${v.pName}</span> (${v.level || 'B2'})
                </span>
                <button class="pretest-master-btn ${isMastered ? 'active' : ''}" onclick="toggleMasterPreTestWord('${safeWordAttr}')">
                    <i class="fa-solid fa-check"></i> ${isMastered ? 'Đã nạp từ này' : 'Đánh dấu Đã nạp'}
                </button>
            </div>

            <div class="flashcard-stage" style="max-width: 560px; height: 290px;" onclick="flipPreTestCard()">
                <div class="flashcard-inner ${state.preTest.fcFlipped ? 'flipped' : ''}" id="pretest-fc-inner">
                    <div class="flashcard-face flashcard-front" style="padding: 24px;">
                        <span class="pretest-pos-badge" style="margin-bottom: 6px;">${v.pos} • ${v.level || 'B2'}</span>
                        <div class="card-word" style="font-size: 2rem;">${v.word}</div>
                        <div class="card-ipa">${v.ipa || ''}</div>
                        <button class="cbt-tool-btn" onclick="event.stopPropagation(); speakWord('${safeWordAttr}');" style="font-size: 0.88rem; padding: 6px 14px; margin-bottom: 10px;">
                            <i class="fa-solid fa-volume-high"></i> Nghe phát âm
                        </button>
                        ${hlContext ? `<div style="font-size: 0.84rem; color: #475569; font-style: italic; max-width: 460px; line-height: 1.45;">"${hlContext}"</div>` : ''}
                        <span class="card-hint">Nhấn vào thẻ để lật xem nghĩa & từ đồng nghĩa</span>
                    </div>
                    <div class="flashcard-face flashcard-back" style="padding: 24px;">
                        <div class="card-word" style="font-size: 1.5rem; margin-bottom: 6px;">${v.word}</div>
                        <div class="card-mean" style="font-size: 1.2rem; margin-bottom: 10px;">💡 ${v.mean}</div>
                        ${(v.syns && v.syns.length) ? `<div style="font-size: 0.88rem; background: rgba(255,255,255,0.18); padding: 6px 14px; border-radius: 9999px;">🔄 Đồng nghĩa: <strong>${v.syns.join(', ')}</strong></div>` : ''}
                        <span class="card-hint">Nhấn để lật lại mặt trước</span>
                    </div>
                </div>
            </div>

            <div class="flashcard-controls">
                <button class="secondary-btn" onclick="navPreTestFlashcard(-1)"><i class="fa-solid fa-chevron-left"></i> Từ trước</button>
                <button class="primary-btn" onclick="navPreTestFlashcard(1)">Từ tiếp theo <i class="fa-solid fa-chevron-right"></i></button>
            </div>
        </div>
    `;
}

function flipPreTestCard() {
    playSound('click');
    state.preTest.fcFlipped = !state.preTest.fcFlipped;
    const inner = document.getElementById('pretest-fc-inner');
    if (inner) inner.classList.toggle('flipped', state.preTest.fcFlipped);
}

function navPreTestFlashcard(dir) {
    playSound('click');
    const list = getFilteredPreTestVocab();
    if (!list.length) return;
    state.preTest.fcFlipped = false;
    state.preTest.fcIdx = (state.preTest.fcIdx + dir + list.length) % list.length;
    renderPreTestActiveWorkspace();
}

function initPreTestQuiz() {
    const pool = getFilteredPreTestVocab();
    const allTestPool = getTestAllVocab(state.preTest.testNum);
    const source = pool.length >= 4 ? pool : allTestPool;
    const shuffled = [...source].sort(() => Math.random() - 0.5);

    const questions = shuffled.map(target => {
        const distractors = allTestPool
            .filter(w => w.word !== target.word)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(w => w.mean);
        const options = [target.mean, ...distractors].sort(() => Math.random() - 0.5);
        return {
            item: target,
            options: options,
            correctMean: target.mean
        };
    });

    state.preTest.quizState = {
        qIdx: 0,
        score: 0,
        answered: false,
        selectedOpt: null,
        questions: questions
    };
}

function renderPreTestQuizMode(bodyEl) {
    const qs = state.preTest.quizState;
    if (!qs.questions || qs.questions.length === 0) {
        initPreTestQuiz();
    }
    const questions = state.preTest.quizState.questions;
    if (qs.qIdx >= questions.length) {
        const pct = Math.round((qs.score / questions.length) * 100);
        bodyEl.innerHTML = `
            <div style="text-align: center; padding: 32px 20px; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 16px;">
                <div style="font-size: 3rem; margin-bottom: 8px;">🎉</div>
                <h3 style="font-size: 1.4rem; font-weight: 900; color: #065f46; margin-bottom: 6px;">
                    Hoàn thành Kiểm tra Phản xạ Từ vựng Pre-Test!
                </h3>
                <p style="font-size: 1.05rem; color: #047857; font-weight: 700; margin-bottom: 18px;">
                    Kết quả: Đúng <strong>${qs.score} / ${questions.length}</strong> từ (${pct}%)
                </p>
                <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                    <button class="secondary-btn" onclick="initPreTestQuiz(); renderPreTestActiveWorkspace();">
                        <i class="fa-solid fa-rotate-left"></i> Luyện lại lượt mới
                    </button>
                    <button class="primary-btn" style="background: #10b981;" onclick="startFullExam(${state.preTest.testNum})">
                        <i class="fa-solid fa-play"></i> BẮT ĐẦU LÀM BÀI THI NGAY (60 PHÚT)
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const cur = questions[qs.qIdx];
    const v = cur.item;
    const safeWordAttr = v.word.replace(/'/g, "\\'");
    const hlContext = highlightTargetWordInSentence(v.ex || '', v.word);

    const optsHtml = cur.options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        let style = 'border: 1.5px solid #cbd5e1; background: #ffffff; color: #1e293b;';
        if (qs.answered) {
            if (opt === cur.correctMean) {
                style = 'border: 2px solid #10b981; background: #ecfdf5; color: #065f46; font-weight: 800;';
            } else if (opt === qs.selectedOpt) {
                style = 'border: 2px solid #ef4444; background: #fef2f2; color: #991b1b;';
            }
        }
        return `
            <button style="${style} padding: 14px 16px; border-radius: 12px; text-align: left; font-size: 0.94rem; font-weight: 700; cursor: ${qs.answered ? 'default' : 'pointer'}; display: flex; align-items: center; gap: 10px; transition: all 0.15s ease;" onclick="answerPreTestQuiz(${i})">
                <span style="width: 28px; height: 28px; border-radius: 50%; background: #eef2ff; color: #4f46e5; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0;">${letter}</span>
                <span>${opt}</span>
            </button>
        `;
    }).join('');

    bodyEl.innerHTML = `
        <div style="max-width: 760px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 0.85rem; font-weight: 800; color: #4f46e5;">
                    CÂU HỎI TỪ VỰNG ${qs.qIdx + 1} / ${questions.length} • ${v.pName}
                </span>
                <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-size: 0.82rem; font-weight: 800;">
                    Điểm phản xạ: ${qs.score} / ${questions.length}
                </span>
            </div>

            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 16px; text-align: center;">
                <div style="display: inline-flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                    <span style="font-size: 1.65rem; font-weight: 900; color: #1e1b4b;">${v.word}</span>
                    <span class="pretest-pos-badge">${v.pos}</span>
                    <button class="cbt-tool-btn" onclick="speakWord('${safeWordAttr}')"><i class="fa-solid fa-volume-high"></i></button>
                </div>
                <div style="color: #64748b; font-size: 0.9rem; margin-bottom: 10px;">${v.ipa || ''} ${(v.syns && v.syns.length) ? `• Đồng nghĩa: <strong>${v.syns.join(', ')}</strong>` : ''}</div>
                ${hlContext ? `<div style="font-size: 0.9rem; color: #334155; font-style: italic; background: #fff; padding: 10px 14px; border-radius: 10px; border: 1px dashed #cbd5e1;">"${hlContext}"</div>` : ''}
            </div>

            <div class="review-opts-grid">
                ${optsHtml}
            </div>

            ${qs.answered ? `
                <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
                    <button class="primary-btn" onclick="nextPreTestQuizQuestion()">
                        ${qs.qIdx + 1 < questions.length ? 'Từ tiếp theo <i class="fa-solid fa-arrow-right"></i>' : 'Xem kết quả <i class="fa-solid fa-flag-checkered"></i>'}
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function answerPreTestQuiz(optIdx) {
    const qs = state.preTest.quizState;
    if (qs.answered) return;
    const cur = qs.questions[qs.qIdx];
    const picked = cur.options[optIdx];
    qs.answered = true;
    qs.selectedOpt = picked;

    if (picked === cur.correctMean) {
        qs.score++;
        playSound('correct');
        const key = `${state.preTest.testNum}_${cur.item.word.toLowerCase()}`;
        state.preTest.masteredWords[key] = true;
        localStorage.setItem('vstep_pretest_mastered', JSON.stringify(state.preTest.masteredWords));
    } else {
        playSound('wrong');
    }
    renderPreTestActiveWorkspace();
}

function nextPreTestQuizQuestion() {
    playSound('click');
    state.preTest.quizState.qIdx++;
    state.preTest.quizState.answered = false;
    state.preTest.quizState.selectedOpt = null;
    renderPreTestActiveWorkspace();
}

function initPreTestMatch() {
    const pool = getFilteredPreTestVocab();
    const allPool = getTestAllVocab(state.preTest.testNum);
    const source = (pool.length >= 6 ? pool : allPool).sort(() => Math.random() - 0.5).slice(0, 6);

    const leftItems = source.map((v, idx) => ({
        id: idx,
        word: v.word,
        ipa: v.ipa,
        pos: v.pos
    })).sort(() => Math.random() - 0.5);

    const rightItems = source.map((v, idx) => ({
        id: idx,
        text: `${(v.syns && v.syns.length) ? v.syns.slice(0, 2).join(', ') + ' — ' : ''}${v.mean}`
    })).sort(() => Math.random() - 0.5);

    state.preTest.matchState = {
        leftItems,
        rightItems,
        selectedLeft: null,
        selectedRight: null,
        matchedCount: 0,
        pairMap: {}
    };
}

function renderPreTestMatchMode(bodyEl) {
    const ms = state.preTest.matchState;
    if (!ms.leftItems || ms.leftItems.length === 0) {
        initPreTestMatch();
    }
    const { leftItems, rightItems, selectedLeft, selectedRight, matchedCount, pairMap } = state.preTest.matchState;

    const leftHtml = leftItems.map(item => {
        const pairColorIdx = pairMap[item.id];
        const isMatched = pairColorIdx !== undefined;
        const isSel = selectedLeft === item.id;
        return `
            <div class="pretest-match-item ${isMatched ? `matched-pair-${pairColorIdx}` : (isSel ? 'selected' : '')}" onclick="selectPreTestMatch('left', ${item.id})">
                <div>
                    <strong>${item.word}</strong>
                    <span style="font-size: 0.78rem; color: #64748b; margin-left: 6px;">${item.ipa || ''} (${item.pos})</span>
                </div>
                <i class="fa-solid ${isMatched ? 'fa-circle-check' : 'fa-link'}"></i>
            </div>
        `;
    }).join('');

    const rightHtml = rightItems.map(item => {
        const pairColorIdx = pairMap[item.id];
        const isMatched = pairColorIdx !== undefined;
        const isSel = selectedRight === item.id;
        return `
            <div class="pretest-match-item ${isMatched ? `matched-pair-${pairColorIdx}` : (isSel ? 'selected' : '')}" onclick="selectPreTestMatch('right', ${item.id})">
                <span>${item.text}</span>
                <i class="fa-solid ${isMatched ? 'fa-circle-check' : 'fa-bullseye'}"></i>
            </div>
        `;
    }).join('');

    bodyEl.innerHTML = `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                <div style="font-size: 0.92rem; color: #334155; font-weight: 700;">
                    <i class="fa-solid fa-wand-magic-sparkles" style="color: #4f46e5;"></i>
                    Nhấn chọn 1 Từ vựng tiếng Anh ở cột trái và ghép với Cụm đồng nghĩa / Nghĩa tiếng Việt tương ứng ở cột phải (${matchedCount} / ${leftItems.length} cặp)
                </div>
                <button class="secondary-btn" style="padding: 6px 14px; font-size: 0.82rem;" onclick="initPreTestMatch(); renderPreTestActiveWorkspace();">
                    <i class="fa-solid fa-shuffle"></i> Đổi bộ 6 từ khác
                </button>
            </div>
            <div class="pretest-match-grid">
                <div style="display: flex; flex-direction: column; gap: 10px;">${leftHtml}</div>
                <div style="display: flex; flex-direction: column; gap: 10px;">${rightHtml}</div>
            </div>
            ${matchedCount === leftItems.length ? `
                <div style="margin-top: 18px; padding: 16px; background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div style="color: #065f46; font-weight: 800;">
                        🎉 Tuyệt vời! Bạn đã ghép chính xác cả 6 cặp từ đồng nghĩa & nghĩa học thuật!
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="secondary-btn" onclick="initPreTestMatch(); renderPreTestActiveWorkspace();">Chơi tiếp 6 từ mới</button>
                        <button class="primary-btn" style="background: #10b981;" onclick="startFullExam(${state.preTest.testNum})">Vào Thi Ngay (60 Phút)</button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function selectPreTestMatch(side, id) {
    const ms = state.preTest.matchState;
    if (ms.pairMap[id] !== undefined) return;
    playSound('click');

    if (side === 'left') {
        ms.selectedLeft = ms.selectedLeft === id ? null : id;
    } else {
        ms.selectedRight = ms.selectedRight === id ? null : id;
    }

    if (ms.selectedLeft !== null && ms.selectedRight !== null) {
        if (ms.selectedLeft === ms.selectedRight) {
            playSound('correct');
            ms.pairMap[ms.selectedLeft] = ms.matchedCount % 6;
            ms.matchedCount++;
            const matchedWordObj = ms.leftItems.find(x => x.id === ms.selectedLeft);
            if (matchedWordObj) {
                const key = `${state.preTest.testNum}_${matchedWordObj.word.toLowerCase()}`;
                state.preTest.masteredWords[key] = true;
                localStorage.setItem('vstep_pretest_mastered', JSON.stringify(state.preTest.masteredWords));
            }
        } else {
            playSound('wrong');
        }
        ms.selectedLeft = null;
        ms.selectedRight = null;
    }
    renderPreTestActiveWorkspace();
}

function openSinglePassageModal(testNum) {
    openPreTestView(testNum, 'passages');
}

function showVocabPreviewModal(testNum) {
    openPreTestView(testNum);
}

function closeVocabPreview() {
    playSound('click');
    const modal = document.getElementById('vocab-preview-modal');
    if (modal) modal.classList.add('hidden');
}

// =========================================================================
// CBT EXAM SIMULATOR CONTROLLER
// =========================================================================
function startFullExam(testNum) {
    if (typeof VstepExamRoom !== 'undefined' && !VstepExamRoom.canStudentStartExam('reading')) {
        alert("⛔ PHÒNG THI ĐỌC (READING) HIỆN ĐANG ĐÓNG!\n\nVui lòng chờ Giáo viên (Cô Nguyệt) mở phòng để vào làm bài.");
        return;
    }
    if (isTestLocked(testNum)) {
        notifyLockedTest(testNum);
        return;
    }
    playSound('click');
    const savedAnsCount = (state.savedExam && state.savedExam.answers) ? Object.keys(state.savedExam.answers).length : 0;
    if (state.savedExam && state.savedExam.testNum === testNum && savedAnsCount > 0) {
        const minsLeft = Math.floor((state.savedExam.timeLeft || 3600) / 60);
        const confirmResume = confirm(`Bạn đang có bài thi Đề số ${String(testNum).padStart(2, '0')} làm dở dang:\n• Đã làm: ${savedAnsCount}/40 câu\n• Thời gian còn lại: ~${minsLeft} phút\n\nBấm [OK] để TIẾP TỤC làm bài cũ.\nBấm [Cancel / Hủy] để LÀM LẠI TỪ ĐẦU (bài cũ sẽ bị ghi đè).`);
        if (confirmResume) {
            resumeSavedExam();
            return;
        }
    }

    const test = getMockTests().find(t => t.testNum === testNum);
    if (!test) return;

    state.activeExam.test = test;
    state.activeExam.isFullExam = true;
    state.activeExam.isSubmitted = false;
    state.activeExam.currentPassageIdx = 0;
    state.activeExam.currentQuestionId = 1;
    state.activeExam.answers = {};
    state.activeExam.flags = {};
    state.activeExam.timeLeft = 3600; // 60 mins
    state.activeExam.timeElapsed = 0;
    state.activeExam.fontSize = 100;
    state.activeExam.highlighterActive = false;
    state.activeExam.passagesHighlights = {};
    state.activeExam.tabSwitches = 0;
    state.activeExam._lastCheatTime = 0;

    resetCheatUI();
    initCBTWorkspace();
}

function startSinglePassageExam(testNum, passageIdx) {
    if (typeof VstepExamRoom !== 'undefined' && !VstepExamRoom.canStudentStartExam('reading')) {
        alert("⛔ PHÒNG THI ĐỌC (READING) HIỆN ĐANG ĐÓNG!\n\nVui lòng chờ Giáo viên (Cô Nguyệt) mở phòng để vào làm bài.");
        return;
    }
    if (isTestLocked(testNum)) {
        notifyLockedTest(testNum);
        return;
    }
    playSound('click');
    const test = getMockTests().find(t => t.testNum === testNum);
    if (!test) return;

    state.activeExam.test = test;
    state.activeExam.isFullExam = false;
    state.activeExam.isSubmitted = false;
    state.activeExam.currentPassageIdx = passageIdx;
    state.activeExam.currentQuestionId = test.passages[passageIdx].questions[0].id;
    state.activeExam.answers = {};
    state.activeExam.flags = {};
    state.activeExam.timeLeft = 900; // 15 mins
    state.activeExam.timeElapsed = 0;
    state.activeExam.fontSize = 100;
    state.activeExam.highlighterActive = false;
    state.activeExam.passagesHighlights = {};
    state.activeExam.tabSwitches = 0;
    state.activeExam._lastCheatTime = 0;

    resetCheatUI();
    initCBTWorkspace();
}

function resetCheatUI() {
    const badge = document.getElementById('cbt-tab-warning-badge');
    const countEl = document.getElementById('cbt-cheat-count');
    const modal = document.getElementById('cheat-warning-modal');
    const modalCount = document.getElementById('cheat-modal-count');
    if (badge) badge.classList.add('hidden');
    if (countEl) countEl.textContent = '0';
    if (modal) modal.classList.add('hidden');
    if (modalCount) modalCount.textContent = '0';
}

function initCBTWorkspace() {
    switchView('cbt');
    updateCBTSubmissionUI();
    renderCBTPassageTabs();
    renderCBTPassage();
    renderCBTActiveQuestion();
    renderCBTPalette();
    startCBTTimer();
}

function updateCBTSubmissionUI() {
    const isSub = !!state.activeExam.isSubmitted;
    const scorePill = document.getElementById('cbt-review-score-pill');
    const scoreText = document.getElementById('cbt-review-score-text');
    const topSubmitBtn = document.getElementById('btn-top-submit');
    const paletteSubmitBtn = document.getElementById('btn-palette-submit');

    if (isSub && state.lastResult) {
        if (scorePill) scorePill.classList.remove('hidden');
        if (scoreText) scoreText.textContent = `Điểm: ${state.lastResult.score}/40 (${state.lastResult.band})`;
        if (topSubmitBtn) {
            topSubmitBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> LÀM LẠI ĐỀ`;
            topSubmitBtn.style.background = '#2563eb';
            topSubmitBtn.onclick = () => retakeCurrentExam();
        }
        if (paletteSubmitBtn) {
            paletteSubmitBtn.innerHTML = `<i class="fa-solid fa-chart-pie"></i> XEM BẢNG ĐIỂM TỔNG HỢP & CHỨNG NHẬN (${state.lastResult.score}/40)`;
            paletteSubmitBtn.onclick = () => switchView('results');
        }
    } else {
        if (scorePill) scorePill.classList.add('hidden');
        if (topSubmitBtn) {
            topSubmitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> NỘP BÀI & KIỂM TRA ĐÁP ÁN`;
            topSubmitBtn.style.background = '#ef4444';
            topSubmitBtn.onclick = () => confirmSubmitExam();
        }
        if (paletteSubmitBtn) {
            const totalAnswered = Object.keys(state.activeExam.answers || {}).length;
            paletteSubmitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> NỘP BÀI & KIỂM TRA ĐÁP ÁN (<span id="palette-answered-count">${totalAnswered}</span>/40)`;
            paletteSubmitBtn.onclick = () => confirmSubmitExam();
        }
    }
}

function renderCBTPassageTabs() {
    const tabsContainer = document.getElementById('cbt-passage-tabs');
    tabsContainer.innerHTML = '';
    const test = state.activeExam.test;

    test.passages.forEach((p, idx) => {
        let answered = 0;
        let correctInP = 0;
        p.questions.forEach(q => {
            if (state.activeExam.answers[q.id]) answered++;
            if (state.activeExam.answers[q.id] === q.correctAnswer) correctInP++;
        });

        const tagLabel = state.activeExam.isSubmitted ? `${correctInP}/10` : `${answered}/10`;
        const tabBtn = document.createElement('button');
        tabBtn.className = `cbt-part-tab-btn ${idx === state.activeExam.currentPassageIdx ? 'active' : ''}`;
        tabBtn.innerHTML = `
            <span>Bài ${idx + 1}</span>
            <span class="tab-count-tag">${tagLabel}</span>
        `;
        
        tabBtn.addEventListener('click', () => {
            if (idx === state.activeExam.currentPassageIdx) return;
            playSound('click');
            state.activeExam.currentPassageIdx = idx;
            state.activeExam.currentQuestionId = p.questions[0].id;
            renderCBTPassageTabs();
            renderCBTPassage();
            renderCBTActiveQuestion();
            renderCBTPalette();
        });

        tabsContainer.appendChild(tabBtn);
    });
}

function highlightPassageWithEvidence(pHtml, passage, activeQId) {
    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const htmlKeywords = new Set(['span', 'class', 'strong', 'style', 'mark', 'font', 'passage', 'subheading', 'target', 'word', 'cbt', 'badge']);

    passage.questions.forEach(q => {
        const isActive = q.id === activeQId;
        const activeCls = isActive ? ' active-ev' : '';
        const ql = q.question.toLowerCase();
        let replaced = false;

        // 1. Sentence insertion marker [A], [B], [C], [D]
        if (ql.includes('in which space') || ql.includes('which space')) {
            const markerRegex = new RegExp(`(<strong>\\[${escapeRegExp(q.correctAnswer)}\\]<\\/strong>|\\[${escapeRegExp(q.correctAnswer)}\\])`, 'i');
            if (markerRegex.test(pHtml)) {
                pHtml = pHtml.replace(markerRegex, `<span class="cbt-ev-hl${activeCls}" id="passage-ev-${q.id}" onclick="jumpToQuestion(${q.id})"><span class="ev-badge">(${q.id})</span> $1</span>`);
                replaced = true;
            }
        }

        // 2. Vocabulary or Reference target word
        if (!replaced) {
            const mWord = q.question.match(/(?:word|phrase)\s*['"]([^'"]+)['"]/i) || q.question.match(/word\s+['"]?([A-Za-z\-]+)['"]?\s+(?:in\s+paragraph|is\s+closest|could\s+be|refers|mean)/i);
            if (mWord && mWord[1]) {
                const target = mWord[1].trim();
                if (target.length >= 2 && !htmlKeywords.has(target.toLowerCase())) {
                    const mPara = q.question.match(/paragraph\s+(\d+)/i);
                    const wordPattern = new RegExp(`(?:<strong>|<b>)?\\b(${escapeRegExp(target)}(?:s|es|ed|ing)?)\\b(?:<\\/strong>|<\\/b>)?(?![^<]*>)`, 'i');
                    if (mPara) {
                        const targetParaNum = parseInt(mPara[1], 10);
                        let realParaCounter = 0;
                        pHtml = pHtml.replace(/<p(\s+[^>]*)?>([\s\S]*?)<\/p>/gi, (fullMatch, attrs, inner) => {
                            const attrStr = attrs || '';
                            if (attrStr.includes('passage-subheading')) return fullMatch;
                            realParaCounter++;
                            if (!replaced && realParaCounter === targetParaNum && wordPattern.test(inner)) {
                                replaced = true;
                                const newInner = inner.replace(wordPattern, `<span class="cbt-ev-hl${activeCls}" id="passage-ev-${q.id}" onclick="jumpToQuestion(${q.id})"><span class="ev-badge">(${q.id})</span> $1</span>`);
                                return `<p${attrStr}>${newInner}</p>`;
                            }
                            return fullMatch;
                        });
                    }
                    if (!replaced && wordPattern.test(pHtml)) {
                        pHtml = pHtml.replace(wordPattern, `<span class="cbt-ev-hl${activeCls}" id="passage-ev-${q.id}" onclick="jumpToQuestion(${q.id})"><span class="ev-badge">(${q.id})</span> $1</span>`);
                        replaced = true;
                    }
                }
            }
        }

        // 3. Evidence sentence / clause from q.evidence
        if (!replaced && q.evidence) {
            let evClean = q.evidence.replace(/\[(?:Paragraph|Đoạn)\s*\d+\]/gi, '').replace(/^["“”']+/, '').replace(/["“”']+$/, '').trim();
            const firstPart = evClean.split('...')[0].trim();
            if (firstPart.length >= 15) {
                // Build a flexible regex from the words of firstPart (allowing HTML tags or punctuation between words)
                const words = firstPart.match(/[A-Za-z0-9]+/g) || [];
                if (words.length >= 4) {
                    const sliceWords = words.slice(0, Math.min(words.length, 16));
                    const flexPatternStr = sliceWords.map(w => escapeRegExp(w)).join('(?:\\s|<[^>]+>|[^A-Za-z0-9<]){1,12}');
                    try {
                        const flexRegex = new RegExp(`(${flexPatternStr}[^.<]*\\.?)(?![^<]*>)`, 'i');
                        if (flexRegex.test(pHtml)) {
                            pHtml = pHtml.replace(flexRegex, `<span class="cbt-ev-hl${activeCls}" id="passage-ev-${q.id}" onclick="jumpToQuestion(${q.id})"><span class="ev-badge">(${q.id})</span> $1</span>`);
                            replaced = true;
                        }
                    } catch (e) {}
                }
            }
        }
    });

    return pHtml;
}

function scrollToPassageEvidence(qId) {
    const col = document.getElementById('cbt-passage-column');
    const evEl = document.getElementById(`passage-ev-${qId}`);
    if (col && evEl) {
        const colRect = col.getBoundingClientRect();
        const evRect = evEl.getBoundingClientRect();
        const targetScroll = col.scrollTop + (evRect.top - colRect.top) - (colRect.height * 0.32);
        col.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
}

function updateActiveEvidenceInPassage(activeQId) {
    document.querySelectorAll('#active-passage-body .cbt-ev-hl').forEach(el => {
        if (el.id === `passage-ev-${activeQId}`) {
            el.classList.add('active-ev');
        } else {
            el.classList.remove('active-ev');
        }
    });
    scrollToPassageEvidence(activeQId);
}

function renderCBTPassage() {
    const passage = state.activeExam.test.passages[state.activeExam.currentPassageIdx];
    const pNum = String(passage.partId).padStart(2, '0');
    const pCleanTitle = passage.title.replace(/^Passage\s*\d+:\s*/i, '');
    document.getElementById('active-passage-title').innerHTML = `<i class="fa-solid fa-book-open" style="color: #2563eb; margin-right: 8px;"></i>PASSAGE ${pNum}: ${pCleanTitle}`;
    
    const bodyEl = document.getElementById('active-passage-body');

    if (state.activeExam.isSubmitted) {
        const pHtmlWithEv = highlightPassageWithEvidence(passage.passage, passage, state.activeExam.currentQuestionId);
        bodyEl.innerHTML = pHtmlWithEv;
        bodyEl.style.fontSize = `${state.activeExam.fontSize}%`;
        setTimeout(() => scrollToPassageEvidence(state.activeExam.currentQuestionId), 60);
        return;
    }

    const savedHtml = state.activeExam.passagesHighlights[passage.partId];
    if (savedHtml) {
        bodyEl.innerHTML = savedHtml;
    } else {
        let pHtml = passage.passage;
        const stopPronouns = new Set(['it', 'its', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'more', 'other', 'others', 'one', 'ones', 'there', 'here', 'such', 'some', 'many', 'most', 'which', 'what', 'where', 'when', 'who', 'whom']);
        const htmlKeywords = new Set(['span', 'class', 'strong', 'style', 'mark', 'font', 'passage', 'subheading', 'target', 'word']);

        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const highlightOutsideTags = (htmlStr, word, firstOnly = false) => {
            if (!word || htmlKeywords.has(word.toLowerCase())) return htmlStr;
            const flags = firstOnly ? 'i' : 'gi';
            const regex = new RegExp(`\\b(${escapeRegExp(word)})\\b(?![^<]*>)`, flags);
            return htmlStr.replace(regex, '<span class="target-word">$1</span>');
        };

        (passage.vocab || []).forEach(v => {
            const w = (v.word || '').trim();
            if (w.length >= 4 && !stopPronouns.has(w.toLowerCase())) {
                pHtml = highlightOutsideTags(pHtml, w, true);
            }
        });

        passage.questions.forEach(q => {
            const m = q.question.match(/The (?:word|phrase)\s*['"]([^'"]+)['"]/i);
            if (!m || !m[1]) return;
            const target = m[1].trim();
            if (!target || htmlKeywords.has(target.toLowerCase())) return;

            const mPara = q.question.match(/paragraph\s+(\d+)/i);
            if (mPara) {
                const targetParaNum = parseInt(mPara[1], 10);
                let realParaCounter = 0;
                pHtml = pHtml.replace(/<p(\s+[^>]*)?>([\s\S]*?)<\/p>/gi, (fullMatch, attrs, inner) => {
                    const attrStr = attrs || '';
                    if (attrStr.includes('passage-subheading')) return fullMatch;
                    realParaCounter++;
                    if (realParaCounter === targetParaNum && !inner.includes(`>${target}<`)) {
                        return `<p${attrStr}>${highlightOutsideTags(inner, target, true)}</p>`;
                    }
                    return fullMatch;
                });
            } else if (target.length >= 4 && !stopPronouns.has(target.toLowerCase())) {
                pHtml = highlightOutsideTags(pHtml, target, true);
            }
        });

        bodyEl.innerHTML = pHtml;
    }

    bodyEl.style.fontSize = `${state.activeExam.fontSize}%`;
    document.getElementById('cbt-passage-column').scrollTop = 0;
}

function renderCBTActiveQuestion() {
    const test = state.activeExam.test;
    const passage = test.passages[state.activeExam.currentPassageIdx];
    const q = passage.questions.find(item => item.id === state.activeExam.currentQuestionId);
    if (!q) return;

    const isSubmitted = !!state.activeExam.isSubmitted;
    const userSelected = state.activeExam.answers[q.id];
    const isCorrect = userSelected === q.correctAnswer;

    // Header badge matching reference screenshot
    document.getElementById('cbt-q-badge').textContent = `CÂU HỎI ${q.id}`;
    document.getElementById('q-counter-text').textContent = `Câu ${q.id} / 40`;

    const flagBtn = document.getElementById('cbt-btn-flag');
    const statusTag = document.getElementById('cbt-q-status-tag');

    if (isSubmitted) {
        if (flagBtn) flagBtn.classList.add('hidden');
        if (statusTag) {
            statusTag.classList.remove('hidden');
            if (isCorrect) {
                statusTag.className = 'cbt-q-status-tag status-correct';
                statusTag.innerHTML = `<i class="fa-solid fa-circle-check"></i> ĐÚNG`;
            } else if (userSelected) {
                statusTag.className = 'cbt-q-status-tag status-wrong';
                statusTag.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> SAI`;
            } else {
                statusTag.className = 'cbt-q-status-tag status-skipped';
                statusTag.innerHTML = `<i class="fa-solid fa-circle-Minus"></i> CHƯA LÀM`;
            }
        }
    } else {
        if (statusTag) statusTag.classList.add('hidden');
        if (flagBtn) {
            flagBtn.classList.remove('hidden');
            const isFlagged = !!state.activeExam.flags[q.id];
            flagBtn.className = `cbt-btn-flag ${isFlagged ? 'flagged' : ''}`;
            flagBtn.innerHTML = isFlagged ? `<i class="fa-solid fa-star"></i> Đã đánh dấu xem lại` : `<i class="fa-regular fa-star"></i> Đánh dấu xem lại`;
        }
    }

    // Prompt: English question
    const cleanPrompt = q.question.replace(/^(?:[A-Za-z\s]*PASSAGE\s*\d+|GIẢI THÍCH ĐÁP ÁN|\d+[\.\s]*)+/gi, '').trim();
    const promptEl = document.getElementById('cbt-q-prompt');
    const quoteMatch = cleanPrompt.match(/^([\s\S]+?\?)\s*"([^"]+)"\s*$/);
    if (quoteMatch) {
        promptEl.innerHTML = '';
        const mainText = document.createElement('div');
        mainText.textContent = quoteMatch[1].trim();
        const quoteBox = document.createElement('div');
        quoteBox.className = 'cbt-q-target-sentence';
        quoteBox.textContent = `"${quoteMatch[2].trim()}"`;
        promptEl.appendChild(mainText);
        promptEl.appendChild(quoteBox);
    } else {
        promptEl.textContent = cleanPrompt;
    }

    // Options
    const optContainer = document.getElementById('cbt-options-group');
    optContainer.innerHTML = '';

    q.options.forEach((optText, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const item = document.createElement('div');
        const isSelected = userSelected === letter;
        const isRightOption = q.correctAnswer === letter;

        let cls = 'cbt-option-item';
        if (isSubmitted) {
            if (isRightOption) cls += ' rev-correct';
            else if (isSelected && !isRightOption) cls += ' rev-wrong';
        } else if (isSelected) {
            cls += ' selected';
        }
        item.className = cls;

        const cleanOpt = optText.replace(/^[A-D][\.\)]\s*/, '').trim();

        item.innerHTML = `
            <div class="cbt-option-letter">${letter}</div>
            <div class="cbt-option-text">${cleanOpt}</div>
        `;

        if (!isSubmitted) {
            item.addEventListener('click', () => {
                selectOption(q.id, letter);
            });
        }

        optContainer.appendChild(item);
    });

    // Split-Screen Review Panel (Status Banner + Evidence Box + Detailed Explanation Box)
    const revPanel = document.getElementById('cbt-review-panel');
    if (revPanel) {
        if (!isSubmitted) {
            revPanel.classList.add('hidden');
            revPanel.innerHTML = '';
        } else {
            revPanel.classList.remove('hidden');

            let bannerHtml = '';
            if (isCorrect) {
                bannerHtml = `<div class="cbt-rev-banner correct"><i class="fa-solid fa-circle-check"></i> CHÍNH XÁC! Bạn đã chọn đáp án đúng: ${q.correctAnswer}</div>`;
            } else if (userSelected) {
                bannerHtml = `<div class="cbt-rev-banner wrong"><i class="fa-solid fa-circle-xmark"></i> CHƯA CHÍNH XÁC! Bạn chọn ${userSelected} — Đáp án đúng là: ${q.correctAnswer}</div>`;
            } else {
                bannerHtml = `<div class="cbt-rev-banner skipped"><i class="fa-solid fa-circle-exclamation"></i> BẠN CHƯA CHỌN ĐÁP ÁN — Đáp án đúng là: ${q.correctAnswer}</div>`;
            }

            const cleanEvEn = (q.evidence || '').replace(/\[(?:Paragraph|Đoạn)\s*\d+\]/gi, '').trim();
            const evidenceBoxHtml = cleanEvEn ? `
                <div class="cbt-rev-evidence-box" onclick="scrollToPassageEvidence(${q.id})" title="Nhấn để cuộn bài đọc bên trái tới vị trí dẫn chứng (${q.id})">
                    <div class="cbt-rev-ev-header">
                        <span class="cbt-rev-ev-title"><i class="fa-solid fa-quote-left"></i> TRÍCH DẪN ĐOẠN VĂN</span>
                        <span class="cbt-rev-ev-pos">Vị trí (${q.id})</span>
                    </div>
                    <div class="cbt-rev-ev-quote">"${cleanEvEn}"</div>
                </div>
            ` : '';

            // Vietnamese options breakdown
            let optsViListHtml = '';
            if (q.optionsVi && q.optionsVi.some(v => v && v.trim())) {
                const rows = q.optionsVi.map((v, i) => {
                    if (!v || !v.trim()) return '';
                    const letChar = String.fromCharCode(65 + i);
                    const isAns = letChar === q.correctAnswer;
                    return `<div style="margin-bottom: 3px; ${isAns ? 'color: #15803d; font-weight: 700;' : 'color: #475569;'}"><strong>${letChar}.</strong> ${v.replace(/^[A-D][\.\)]\s*/, '')}</div>`;
                }).filter(Boolean).join('');
                if (rows) {
                    optsViListHtml = `<div class="cbt-rev-opts-vi"><div style="font-weight: 800; color: #7e22ce; margin-bottom: 4px; font-size: 0.8rem; text-transform: uppercase;">Dịch các phương án & Đối chiếu:</div>${rows}</div>`;
                }
            }

            const rawDetailVi = (q.evidenceVi || '').trim() || `Đối chiếu dẫn chứng tại vị trí (${q.id}) trong bài đọc, đáp án chính xác là ${q.correctAnswer}.`;
            const detailViText = rawDetailVi.replace(/\[Đoạn\s*(\d+)\]/gi, '<span style="display: inline-block; background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.76rem; padding: 1px 7px; border-radius: 9999px; margin: 0 3px;">Đoạn $1</span>');

            let postReadingBoxHtml = '';
            if (q.postReading) {
                const pr = q.postReading;
                postReadingBoxHtml = `
                    <div class="post-reading-q-box" style="margin-top: 10px;">
                        <div class="post-reading-q-header">
                            <span style="display: inline-flex; align-items: center; gap: 6px;">
                                <i class="fa-solid fa-lightbulb" style="color: #0284c7;"></i> TỪ VỰNG SUY LUẬN (POST-READING)
                            </span>
                            <span class="post-reading-type-tag">${pr.typeLabel || 'Suy luận'}</span>
                        </div>
                        <div class="post-reading-pair-row">
                            <div class="post-pair-item passage-side">
                                <div class="post-pair-tag">Từ trong bài đọc (Clue)</div>
                                <div class="post-pair-text">${pr.cluePassage || pr.keyPassage}</div>
                            </div>
                            <div class="post-pair-arrow"><i class="fa-solid fa-right-left"></i></div>
                            <div class="post-pair-item answer-side">
                                <div class="post-pair-tag">Từ trong đáp án (${q.correctAnswer})</div>
                                <div class="post-pair-text">${pr.clueAnswer || pr.keyAnswer}</div>
                            </div>
                        </div>
                        ${pr.meaningVi ? `
                        <div style="font-size: 0.82rem; color: #475569; margin-top: 4px;">
                            <i class="fa-solid fa-language" style="color: #4f46e5;"></i> <strong>Đối chiếu nghĩa:</strong> ${pr.meaningVi}
                        </div>` : ''}
                        <div class="post-pair-logic" style="margin-top: 4px;">
                            <strong><i class="fa-solid fa-brain"></i> Logic loại suy:</strong> ${pr.deductionLogic}
                        </div>
                    </div>
                `;
            }

            revPanel.innerHTML = `
                ${bannerHtml}
                ${evidenceBoxHtml}
                ${postReadingBoxHtml}
                <div class="cbt-rev-exp-box">
                    <div class="cbt-rev-exp-header">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> GIẢI THÍCH LÝ DO CHỌN
                    </div>
                    <div class="cbt-rev-exp-inner">
                        <div class="cbt-rev-qtype">
                            <i class="fa-solid fa-compass"></i> ${q.questionType || 'DẠNG CÂU HỎI ĐỌC HIỂU VSTEP'}
                        </div>
                        ${q.questionVi ? `<div class="cbt-rev-qvi"><i class="fa-solid fa-language" style="color: #4f46e5;"></i> <strong>Dịch câu hỏi:</strong> ${q.questionVi}</div>` : ''}
                        ${optsViListHtml}
                        ${detailViText ? `<div style="margin-top: 6px; color: #1e293b; line-height: 1.55;"><strong><i class="fa-regular fa-lightbulb" style="color: #d97706;"></i> Phân tích dẫn chứng:</strong> ${detailViText}</div>` : ''}
                    </div>
                </div>
            `;
        }
    }

    // Prev / Next button state
    document.getElementById('btn-prev-q').disabled = q.id === 1;
    document.getElementById('btn-next-q').disabled = q.id === 40;
}

function selectOption(qId, letter) {
    if (state.activeExam.isSubmitted) return;
    playSound('click');
    state.activeExam.answers[qId] = letter;
    renderCBTActiveQuestion();
    renderCBTPageTabs ? renderCBTPassageTabs() : renderCBTPassageTabs();
    renderCBTPalette();
    if (typeof saveActiveExamProgress === 'function') {
        saveActiveExamProgress(false);
    }
}

function toggleFlagCurrentQuestion() {
    if (state.activeExam.isSubmitted) return;
    playSound('click');
    const qId = state.activeExam.currentQuestionId;
    state.activeExam.flags[qId] = !state.activeExam.flags[qId];
    renderCBTActiveQuestion();
    renderCBTPalette();
    if (typeof saveActiveExamProgress === 'function') {
        saveActiveExamProgress(false);
    }
}

function navQuestion(dir) {
    playSound('click');
    const nextQId = state.activeExam.currentQuestionId + dir;
    if (nextQId < 1 || nextQId > 40) return;

    jumpToQuestion(nextQId);
}

function jumpToQuestion(targetQId) {
    state.activeExam.currentQuestionId = targetQId;
    const targetPassageIdx = Math.floor((targetQId - 1) / 10);
    const needPassageSwitch = targetPassageIdx !== state.activeExam.currentPassageIdx;
    
    state.activeExam.currentPassageIdx = targetPassageIdx;
    if (needPassageSwitch) {
        renderCBTPassageTabs();
        renderCBTPassage();
    } else if (state.activeExam.isSubmitted) {
        updateActiveEvidenceInPassage(targetQId);
    }
    renderCBTActiveQuestion();
    renderCBTPalette();
}

function renderCBTPalette() {
    const grid = document.getElementById('cbt-palette-grid');
    grid.innerHTML = '';
    const currentQId = state.activeExam.currentQuestionId;
    const isSubmitted = !!state.activeExam.isSubmitted;
    const passage = state.activeExam.test.passages[state.activeExam.currentPassageIdx];

    const pStart = state.activeExam.currentPassageIdx * 10 + 1;
    const pEnd = pStart + 9;

    for (let qId = pStart; qId <= pEnd; qId++) {
        const btn = document.createElement('button');
        const userAns = state.activeExam.answers[qId];
        const isAnswered = !!userAns;
        const isFlagged = !!state.activeExam.flags[qId];
        const isActive = qId === currentQId;
        const qObj = passage.questions.find(item => item.id === qId);

        let classes = ['palette-btn'];
        if (isActive) classes.push('active');
        if (isSubmitted && qObj) {
            if (userAns === qObj.correctAnswer) {
                classes.push('rev-correct');
            } else {
                classes.push('rev-wrong');
            }
        } else {
            if (isAnswered) classes.push('answered');
            if (isFlagged) classes.push('flagged');
        }

        btn.className = classes.join(' ');
        btn.textContent = qId;
        btn.title = isSubmitted && qObj
            ? `Câu ${qId}: Bạn chọn ${userAns || 'Trống'} | Đáp án: ${qObj.correctAnswer}`
            : `Câu ${qId}${isAnswered ? ': ' + userAns : ' (Chưa làm)'}`;

        btn.addEventListener('click', () => {
            playSound('click');
            jumpToQuestion(qId);
        });

        grid.appendChild(btn);
    }

    if (!isSubmitted) {
        const totalAnswered = Object.keys(state.activeExam.answers).length;
        const answeredCountEl = document.getElementById('palette-answered-count');
        if (answeredCountEl) answeredCountEl.textContent = totalAnswered;
        const paletteSubmitBtn = document.getElementById('btn-palette-submit');
        if (paletteSubmitBtn) {
            if (totalAnswered > 0) {
                paletteSubmitBtn.classList.add('has-answers');
            } else {
                paletteSubmitBtn.classList.remove('has-answers');
            }
        }
    }
}

// Timer Controller
function startCBTTimer() {
    clearInterval(state.activeExam.timerInterval);
    updateTimerDisplay();

    state.activeExam.timerInterval = setInterval(() => {
        state.activeExam.timeLeft--;
        state.activeExam.timeElapsed++;
        updateTimerDisplay();

        // Định kỳ tự động lưu tiến độ làm bài mỗi 15 giây
        if (state.activeExam.timeElapsed % 15 === 0) {
            if (typeof saveActiveExamProgress === 'function') {
                saveActiveExamProgress(false);
            }
        }

        if (state.activeExam.timeLeft <= 0) {
            clearInterval(state.activeExam.timerInterval);
            alert("⏰ HẾT GIỜ LÀM BÀI! Hệ thống sẽ tự động nộp bài và chấm điểm.");
            submitExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(state.activeExam.timeLeft / 60);
    const secs = state.activeExam.timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const timerDisplay = document.getElementById('cbt-timer-display');
    const badge = document.getElementById('cbt-timer-badge');
    if (timerDisplay) timerDisplay.textContent = timeStr;

    // Warning when under 5 minutes
    if (state.activeExam.timeLeft <= 300) {
        if (badge) badge.classList.add('warning');
    } else {
        if (badge) badge.classList.remove('warning');
    }
}

// Font Zoom Controls
function zoomPassageText(delta) {
    playSound('click');
    state.activeExam.fontSize = Math.min(150, Math.max(80, state.activeExam.fontSize + delta * 10));
    const bodyEl = document.getElementById('active-passage-body');
    if (bodyEl) bodyEl.style.fontSize = `${state.activeExam.fontSize}%`;
}

function resetPassageZoom() {
    playSound('click');
    state.activeExam.fontSize = 100;
    const bodyEl = document.getElementById('active-passage-body');
    if (bodyEl) bodyEl.style.fontSize = '100%';
}

// Text Highlighter Tool
function toggleHighlightTool() {
    playSound('click');
    state.activeExam.highlighterActive = !state.activeExam.highlighterActive;
    const btn = document.getElementById('btn-highlight-tool');
    btn.classList.toggle('active', state.activeExam.highlighterActive);

    const bodyEl = document.getElementById('active-passage-body');
    if (state.activeExam.highlighterActive) {
        bodyEl.addEventListener('mouseup', applyHighlightSelection);
    } else {
        bodyEl.removeEventListener('mouseup', applyHighlightSelection);
    }
}

function applyHighlightSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'user-highlight';
    
    try {
        range.surroundContents(span);
        selection.removeAllRanges();
        // save html
        const passage = state.activeExam.test.passages[state.activeExam.currentPassageIdx];
        state.activeExam.passagesHighlights[passage.partId] = document.getElementById('active-passage-body').innerHTML;
    } catch (e) {
        console.warn('Highlight failed across node boundaries:', e);
    }
}

function clearHighlights() {
    playSound('click');
    const passage = state.activeExam.test.passages[state.activeExam.currentPassageIdx];
    delete state.activeExam.passagesHighlights[passage.partId];
    document.getElementById('active-passage-body').innerHTML = passage.passage;
}

// Exit & Submit
function exitExamPrompt() {
    playSound('click');
    if (state.activeExam.isSubmitted) {
        clearInterval(state.activeExam.timerInterval);
        switchView('dashboard');
        return;
    }
    const ansCount = Object.keys(state.activeExam.answers || {}).length;
    const choice = confirm(`BẠN CÓ MUỐN TẠM DỪNG VÀ LƯU TIẾN ĐỘ THI?\n\n• Bấm [OK] để TẠM DỪNG & LƯU TIẾN ĐỘ (Đã trả lời ${ansCount}/40 câu - bạn có thể làm tiếp bất cứ khi nào).\n• Bấm [Cancel / Hủy] để tiếp tục làm bài thi.`);
    if (choice) {
        if (typeof saveActiveExamProgress === 'function') {
            saveActiveExamProgress(true);
        }
        clearInterval(state.activeExam.timerInterval);
        switchView('dashboard');
    }
}

function confirmSubmitExam() {
    if (state.activeExam.isSubmitted) {
        switchView('results');
        return;
    }
    playSound('click');
    const totalAnswered = Object.keys(state.activeExam.answers).length;
    const totalQ = 40;
    const unAnswered = totalQ - totalAnswered;

    let msg = `Bạn có chắc chắn muốn NỘP BÀI & KIỂM TRA ĐÁP ÁN ngay bây giờ?\n\n`;
    msg += `• Đã hoàn thành: ${totalAnswered} / ${totalQ} câu\n`;
    if (unAnswered > 0) {
        msg += `• Còn ${unAnswered} câu CHƯA CHỌN ĐÁP ÁN!\n`;
    }
    msg += `\nHệ thống sẽ chấm điểm và hiển thị đáp án + dẫn chứng trực tiếp bên cạnh bài đọc!`;

    if (confirm(msg)) {
        submitExam();
    }
}

function submitExam() {
    clearInterval(state.activeExam.timerInterval);
    state.activeExam.isSubmitted = true;
    const test = state.activeExam.test;

    let correctCount = 0;
    const reviewDetails = [];
    const passageScores = [0, 0, 0, 0];

    test.passages.forEach((p, pIdx) => {
        p.questions.forEach(q => {
            const userPick = state.activeExam.answers[q.id] || null;
            const isCorrect = userPick === q.correctAnswer;
            if (isCorrect) {
                correctCount++;
                passageScores[pIdx]++;
            }

            reviewDetails.push({
                qId: q.id,
                passageIdx: pIdx,
                question: q.question,
                questionVi: q.questionVi,
                questionType: q.questionType,
                options: q.options,
                optionsVi: q.optionsVi,
                userPick: userPick,
                correctAnswer: q.correctAnswer,
                isCorrect: isCorrect,
                evidence: q.evidence,
                evidenceVi: q.evidenceVi,
                explanation: q.explanation,
                postReading: q.postReading
            });
        });
    });

    const accuracy = Math.round((correctCount / 40) * 100);
    
    // Determine CEFR Band
    let band = "CHƯA ĐẠT";
    let bandClass = "band-fail";
    let feedback = "Bạn cần tăng cường luyện tập thêm kỹ năng Skimming, Scanning và mở rộng vốn từ vựng học thuật.";

    if (correctCount >= 35) {
        band = "BẬC 5 (C1)";
        bandClass = "band-c1";
        feedback = "Xuất sắc! Năng lực đọc hiểu của bạn đạt chuẩn C1 quốc tế với độ chính xác và tư duy phản biện vượt trội.";
    } else if (correctCount >= 26) {
        band = "BẬC 4 (B2)";
        bandClass = "band-b2";
        feedback = "Chúc mừng bạn! Kết quả xuất sắc vượt qua yêu cầu B2 (Bậc 4). Tốc độ đọc và khả năng suy luận rất vững vàng.";
    } else if (correctCount >= 20) {
        band = "BẬC 3 (B1)";
        bandClass = "band-b1";
        feedback = "Chúc mừng! Bạn đã đạt chuẩn B1 (Bậc 3) theo khung năng lực ngoại ngữ Bộ GD&ĐT.";
    }

    const mins = Math.floor(state.activeExam.timeElapsed / 60);
    const secs = state.activeExam.timeElapsed % 60;
    const timeSpentStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    state.lastResult = {
        testId: test.testId,
        testTitle: test.title,
        date: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}),
        score: correctCount,
        accuracy: accuracy,
        band: band,
        bandClass: bandClass,
        feedback: feedback,
        timeSpent: timeSpentStr,
        passageScores: passageScores,
        tabSwitches: state.activeExam.tabSwitches || 0,
        reviewDetails: reviewDetails
    };

    // Save to history
    state.history.unshift(state.lastResult);
    if (state.history.length > 30) state.history.pop();
    localStorage.setItem('vstep_reading_history', JSON.stringify(state.history));

    // Gửi thống kê Kết quả thi + Số lần vi phạm chuyển tab về Google Form
    const sName = state.student.name || 'Học viên';
    const sClass = state.student.class || '';
    const tNum = String(test.testNum).padStart(2, '0');
    const violationCount = state.activeExam.tabSwitches || 0;
    const pScoresSummary = passageScores.map(ps => `P${ps.part}:${ps.correct}/${ps.total}`).join(', ');
    sendToGoogleForm(
        `[READING MOCK TESTS - KẾT QUẢ THI] ${sName} - Lớp ${sClass} - Đề số ${tNum} | Điểm: ${correctCount}/40 (${accuracy}% - ${band}) [${pScoresSummary}] | Thời gian làm bài: ${timeSpentStr} | Số lần vi phạm rời tab: ${violationCount} lần | Lúc ${state.lastResult.date}`
    );

    // Clear saved progress for this completed test
    localStorage.removeItem('vstep_saved_exam_progress');
    state.savedExam = null;
    if (typeof renderResumeBanners === 'function') renderResumeBanners();

    updateSidebarProgress();

    // Sound effect
    if (correctCount >= 26) {
        playSound('fanfare');
    } else {
        playSound('correct');
    }

    // Prepare the full scorecard view in background (accessible via "Bảng điểm" / "Chi tiết")
    renderResultsView();

    // Stay in Split-Screen CBT View and render side-by-side Passage + Answer Review!
    switchView('cbt');
    updateCBTSubmissionUI();
    renderCBTPassageTabs();
    renderCBTPassage();
    renderCBTActiveQuestion();
    renderCBTPalette();
}

// =========================================================================
// ACADEMIC RESULTS & EXPLANATION REPORT VIEW
// =========================================================================
function renderResultsView() {
    const res = state.lastResult;
    if (!res) return;

    if (res.testId) {
        const tNum = parseInt(res.testId.replace(/\D/g, '')) || 1;
        state.postReadingViewed[tNum] = true;
        localStorage.setItem('vstep_postreading_viewed', JSON.stringify(state.postReadingViewed));
    }

    document.getElementById('results-test-title').textContent = res.testTitle;
    document.getElementById('results-score-num').textContent = res.score;
    
    const bandTag = document.getElementById('results-band-tag');
    bandTag.textContent = res.band;
    bandTag.className = `results-band-tag ${res.bandClass}`;

    document.getElementById('results-feedback-text').textContent = res.feedback;
    document.getElementById('results-accuracy').textContent = `${res.accuracy}%`;
    document.getElementById('results-time-spent').textContent = res.timeSpent;
    document.getElementById('results-correct-count').textContent = res.score;
    document.getElementById('results-wrong-count').textContent = 40 - res.score;

    const disciplineEl = document.getElementById('results-tab-discipline');
    if (disciplineEl) {
        const switches = res.tabSwitches || 0;
        if (switches === 0) {
            disciplineEl.style.color = '#10b981';
            disciplineEl.innerHTML = '<i class="fa-solid fa-shield-check"></i> 100% Trung thực (0 lần rời tab)';
        } else {
            disciplineEl.style.color = '#ef4444';
            disciplineEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Rời tab: ${switches} lần`;
        }
    }

    // Passage Breakdown
    const breakdownEl = document.getElementById('results-passage-breakdown');
    breakdownEl.innerHTML = '';
    const test = getMockTests().find(t => t.testId === res.testId) || state.activeExam.test;

    res.passageScores.forEach((pScore, idx) => {
        const item = document.createElement('div');
        item.className = 'passage-score-item';
        const pPercent = Math.round((pScore / 10) * 100);
        const pName = test && test.passages[idx] ? test.passages[idx].title : `Passage ${idx + 1}`;

        item.innerHTML = `
            <div class="passage-score-title">${pName}</div>
            <div class="passage-score-bar-bg">
                <div class="passage-score-bar-fill" style="width: ${pPercent}%; background: ${pPercent >= 70 ? '#10b981' : (pPercent >= 50 ? '#3b82f6' : '#ef4444')};"></div>
            </div>
            <div class="passage-score-fraction">${pScore} / 10 (${pPercent}%)</div>
        `;
        breakdownEl.appendChild(item);
    });

    // Populate All Review Questions
    renderFilteredReviewCards('all');

    // Populate Step 3 Post-Reading Section
    renderPostReadingSection(state.postReading.filter || 'all', state.postReading.mode || 'cards');
}

function filterReviewQuestions(filter, btn) {
    playSound('click');
    document.querySelectorAll('.filter-pill-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderFilteredReviewCards(filter);
}

function jumpToQuestionFromResults(targetQId, optionalTestNum) {
    playSound('click');
    const res = state.lastResult;
    const testNum = optionalTestNum || (res ? parseInt(res.testId.replace('TEST', '')) : (state.postReading.modalTestNum || 1));
    const testId = `TEST${String(testNum).padStart(2, '0')}`;

    // Ensure activeExam is loaded with this test in submitted review mode
    if (!state.activeExam.test || state.activeExam.test.testId !== testId) {
        const testObj = getMockTests().find(t => t.testId === testId);
        if (testObj) {
            state.activeExam.test = testObj;
            state.activeExam.isSubmitted = true;
            state.activeExam.answers = {};
            if (res && res.reviewDetails && res.testId === testId) {
                res.reviewDetails.forEach(d => {
                    if (d.userPick) state.activeExam.answers[d.qId] = d.userPick;
                });
            }
        }
    }
    state.activeExam.isSubmitted = true;
    closePostReadingModal();
    switchView('cbt');
    updateCBTSubmissionUI();
    jumpToQuestion(targetQId);
    renderCBTPassageTabs();
    renderCBTPassage();
    renderCBTActiveQuestion();
    renderCBTPalette();
    setTimeout(() => scrollToPassageEvidence(targetQId), 120);
}

function renderFilteredReviewCards(filter) {
    const res = state.lastResult;
    if (!res) return;

    const listEl = document.getElementById('results-questions-list');
    listEl.innerHTML = '';

    const questionsToRender = res.reviewDetails.filter(q => {
        if (filter === 'correct') return q.isCorrect;
        if (filter === 'wrong') return !q.isCorrect;
        return true;
    });

    if (questionsToRender.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; padding: 40px; color: #64748b;">Không có câu hỏi nào trong mục này.</div>`;
        return;
    }

    const liveTest = (getMockTests() || []).find(t => t.testId === res.testId);

    questionsToRender.forEach(rawQ => {
        // Hydrate with latest clean fields from READING_MOCK_TESTS in case result came from localStorage
        let liveQ = null;
        if (liveTest && liveTest.passages[rawQ.passageIdx]) {
            liveQ = (liveTest.passages[rawQ.passageIdx].questions || []).find(item => item.id === rawQ.qId);
        }
        const q = liveQ ? {
            ...rawQ,
            question: liveQ.question || rawQ.question,
            questionVi: liveQ.questionVi || rawQ.questionVi,
            questionType: liveQ.questionType || rawQ.questionType,
            options: liveQ.options || rawQ.options,
            optionsVi: liveQ.optionsVi || rawQ.optionsVi,
            evidence: liveQ.evidence || rawQ.evidence,
            evidenceVi: liveQ.evidenceVi || rawQ.evidenceVi,
            correctAnswer: liveQ.correctAnswer || rawQ.correctAnswer,
            postReading: liveQ.postReading || rawQ.postReading
        } : rawQ;

        const card = document.createElement('div');
        card.className = `review-q-card ${q.isCorrect ? 'is-correct' : 'is-wrong'}`;

        // Format prompt (separate target sentence if sentence insertion / paraphrasing)
        const cleanPrompt = (q.question || '').replace(/^(?:[A-Za-z\s]*PASSAGE\s*\d+|GIẢI THÍCH ĐÁP ÁN|\d+[\.\s]*)+/gi, '').trim();
        const quoteMatch = cleanPrompt.match(/^([\s\S]+?\?)\s*"([^"]+)"\s*$/);
        const promptHtml = quoteMatch
            ? `<div>${quoteMatch[1].trim()}</div><div class="cbt-q-target-sentence" style="margin-top: 8px;">"${quoteMatch[2].trim()}"</div>`
            : cleanPrompt;

        let optsHtml = '';
        let correctOptEn = '';
        let correctOptViClean = '';

        q.options.forEach((optText, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const isUserPick = q.userPick === letter;
            const isCorrectAnswer = q.correctAnswer === letter;
            const rawOptVi = (q.optionsVi && q.optionsVi[optIdx]) ? q.optionsVi[optIdx].replace(/^[A-D][\.\)]\s*/, '').trim() : '';

            // Separate optional "→ Được đề cập..." note from Vietnamese option translation
            let optViMain = rawOptVi;
            let optViNote = '';
            if (rawOptVi.includes('→')) {
                const parts = rawOptVi.split('→');
                optViMain = parts[0].trim();
                optViNote = parts.slice(1).join('→').trim();
            }

            const cleanOpt = optText.replace(/^[A-D][\.\)]\s*/, '').trim();
            if (isCorrectAnswer) {
                correctOptEn = cleanOpt;
                correctOptViClean = optViMain;
            }

            let extraClass = '';
            let markIcon = '';
            if (isCorrectAnswer) {
                extraClass = 'is-correct-ans';
                markIcon = '<span style="background: #10b981; color: white; border-radius: 9999px; padding: 3px 9px; display: inline-flex; align-items: center; gap: 4px; margin-left: auto; font-size: 0.72rem; font-weight: 800; flex-shrink: 0;"><i class="fa-solid fa-check"></i> Đúng</span>';
            } else if (isUserPick) {
                extraClass = 'is-user-pick';
                markIcon = '<span style="background: #ef4444; color: white; border-radius: 9999px; padding: 3px 9px; display: inline-flex; align-items: center; gap: 4px; margin-left: auto; font-size: 0.72rem; font-weight: 800; flex-shrink: 0;"><i class="fa-solid fa-xmark"></i> Bạn chọn</span>';
            }

            optsHtml += `
                <div class="review-opt-box ${extraClass}">
                    <div class="review-opt-letter">${letter}</div>
                    <div class="review-opt-content">
                        <div class="review-opt-en">${cleanOpt}</div>
                        ${optViMain && optViMain !== cleanOpt ? `<div class="review-opt-vi"><i class="fa-solid fa-language" style="color: #4f46e5; margin-right: 3px;"></i> Dịch: ${optViMain}</div>` : ''}
                        ${optViNote ? `<span class="review-opt-note-pill"><i class="fa-solid fa-circle-info"></i> ${optViNote}</span>` : ''}
                    </div>
                    ${markIcon}
                </div>
            `;
        });

        // Extract paragraph numbers from evidence if present
        const rawEvEn = q.evidence || '';
        const paraMatches = [...rawEvEn.matchAll(/\[(?:Paragraph|Đoạn)\s*(\d+)\]/gi)].map(m => m[1]);
        const uniqueParas = [...new Set(paraMatches)];
        const paraBadgeText = uniqueParas.length > 0 ? `Paragraph ${uniqueParas.join(', ')}` : `Passage ${q.passageIdx + 1}`;
        const cleanEvEn = rawEvEn.replace(/\[(?:Paragraph|Đoạn)\s*\d+\]/gi, '').replace(/\s+/g, ' ').trim();

        // Clean Vietnamese evidence translation / explanation
        let analysisVi = (q.evidenceVi || '').trim();
        if (!analysisVi) {
            analysisVi = `Đối chiếu trực tiếp dẫn chứng câu (${q.qId}) trong bài đọc, phương án chính xác là ${q.correctAnswer}.`;
        }
        // Format [Đoạn N] tags inside analysisVi nicely
        const formattedAnalysisVi = analysisVi.replace(/\[Đoạn\s*(\d+)\]/gi, '<span style="display: inline-block; background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.78rem; padding: 1px 8px; border-radius: 9999px; margin: 0 4px;">Đoạn $1</span>');

        const shortQType = (q.questionType || 'DẠNG CÂU HỎI ĐỌC HIỂU').replace(/^DẠNG\s*\d+:\s*/i, '');

        card.innerHTML = `
            <div class="review-q-header">
                <div class="review-q-badge">
                    <span class="review-q-num-pill">CÂU ${q.qId}</span>
                    <span class="review-q-passage-pill">Passage ${q.passageIdx + 1}</span>
                    <span class="review-q-type-pill"><i class="fa-solid fa-compass"></i> ${shortQType}</span>
                </div>
                <div class="review-header-actions">
                    <button class="btn-jump-passage" onclick="jumpToQuestionFromResults(${q.qId})" title="Mở bài đọc và cuộn tới vị trí dẫn chứng (${q.qId})">
                        <i class="fa-solid fa-magnifying-glass-location"></i> Đối chiếu bài đọc (${q.qId})
                    </button>
                    <span class="review-status-tag ${q.isCorrect ? 'tag-correct' : 'tag-wrong'}">
                        ${q.isCorrect
                            ? `<i class="fa-solid fa-circle-check"></i> ĐÚNG (Chọn: ${q.userPick})`
                            : `<i class="fa-solid fa-circle-xmark"></i> SAI (Bạn chọn: ${q.userPick || 'Bỏ trống'})`}
                    </span>
                </div>
            </div>

            <div class="review-q-prompt">
                ${promptHtml}
            </div>
            ${q.questionVi ? `
            <div class="review-q-vi">
                <i class="fa-solid fa-language"></i> <strong>Dịch câu hỏi:</strong> ${q.questionVi}
            </div>` : ''}

            <div class="review-opts-grid">
                ${optsHtml}
            </div>

            <div class="academic-exp-box">
                <div class="exp-box-header">
                    <div class="exp-box-title">
                        <i class="fa-solid fa-lightbulb" style="color: #f59e0b; font-size: 1.05rem;"></i>
                        PHÂN TÍCH & GIẢI THÍCH CHI TIẾT
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 700; color: #475569;">
                        Đáp án đúng: <span class="exp-ans-badge">${q.correctAnswer}</span>
                    </div>
                </div>

                ${cleanEvEn ? `
                <div class="evidence-quote-card">
                    <div class="evidence-quote-header">
                        <span class="evidence-quote-label">
                            <i class="fa-solid fa-quote-left"></i> Dẫn chứng trong bài đọc (Evidence)
                        </span>
                        <span class="evidence-para-badge"><i class="fa-regular fa-bookmark"></i> ${paraBadgeText} • Vị trí (${q.qId})</span>
                    </div>
                    <div class="evidence-quote-text">"${cleanEvEn}"</div>
                </div>` : ''}

                <div class="explanation-analysis-card">
                    <div class="explanation-analysis-label">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Dịch nghĩa dẫn chứng & Lý giải đáp án
                    </div>
                    <div class="explanation-text">
                        ${formattedAnalysisVi}
                    </div>
                    <div class="explanation-conclusion-line">
                        <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                        Kết luận: Chọn đáp án <strong>${q.correctAnswer}</strong> — <em>"${correctOptEn}"</em>${correctOptViClean && correctOptViClean !== correctOptEn ? ` (${correctOptViClean})` : ''}.
                    </div>
                </div>

                ${q.postReading ? `
                <div class="post-reading-q-box">
                    <div class="post-reading-q-header">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-lightbulb" style="color: #0284c7;"></i> TỪ VỰNG SUY LUẬN (POST-READING)
                        </span>
                        <span class="post-reading-type-tag">${q.postReading.typeLabel || 'Suy luận'}</span>
                    </div>
                    <div class="post-reading-pair-row">
                        <div class="post-pair-item passage-side">
                            <div class="post-pair-tag">Từ trong bài đọc (Clue)</div>
                            <div class="post-pair-text">${q.postReading.cluePassage || q.postReading.keyPassage}</div>
                        </div>
                        <div class="post-pair-arrow"><i class="fa-solid fa-right-left"></i></div>
                        <div class="post-pair-item answer-side">
                            <div class="post-pair-tag">Từ trong đáp án (${q.correctAnswer})</div>
                            <div class="post-pair-text">${q.postReading.clueAnswer || q.postReading.keyAnswer}</div>
                        </div>
                    </div>
                    ${q.postReading.meaningVi ? `
                    <div style="font-size: 0.83rem; color: #475569; margin-top: 3px;">
                        <i class="fa-solid fa-language" style="color: #4f46e5;"></i> <strong>Đối chiếu nghĩa:</strong> ${q.postReading.meaningVi}
                    </div>` : ''}
                    <div class="post-pair-logic" style="margin-top: 3px;">
                        <strong><i class="fa-solid fa-brain"></i> Logic loại suy:</strong> ${q.postReading.deductionLogic}
                    </div>
                </div>` : ''}
            </div>
        `;
        listEl.appendChild(card);
    });
}

function retakeCurrentExam() {
    playSound('click');
    if (state.lastResult) {
        const testNum = parseInt(state.lastResult.testId.replace('TEST', ''));
        startFullExam(testNum);
    }
}

// Celebration Certificate Modal
function openCertModal() {
    playSound('click');
    const res = state.lastResult;
    if (!res) return;

    document.getElementById('cert-name-display').textContent = state.student.name;
    document.getElementById('cert-class-display').textContent = `Lớp: ${state.student.class}`;
    document.getElementById('cert-score-display').textContent = `${res.score} / 40 (${res.accuracy}%) - ${res.band}`;

    document.getElementById('cert-modal').classList.remove('hidden');
}

function closeCertModal() {
    playSound('click');
    document.getElementById('cert-modal').classList.add('hidden');
}

// =========================================================================
// BƯỚC 3: TỪ VỰNG CHỦ CHỐT GIÚP SUY LUẬN ĐÁP ÁN (POST-READING)
// =========================================================================

function scrollToPostReading() {
    playSound('click');
    const el = document.getElementById('results-post-reading-section');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function filterPostReadingSection(filter, btn) {
    playSound('click');
    state.postReading.filter = filter;
    document.querySelectorAll('#post-reading-filter-pills .filter-pill-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderPostReadingSection(filter, state.postReading.mode);
}

function setPostReadingMode(mode) {
    playSound('click');
    state.postReading.mode = mode;
    const btnCards = document.getElementById('btn-post-mode-cards');
    const btnTable = document.getElementById('btn-post-mode-table');
    if (btnCards) btnCards.classList.toggle('active', mode === 'cards');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');
    renderPostReadingSection(state.postReading.filter, mode);
}

function renderPostReadingSection(filter = 'all', mode = 'cards') {
    const container = document.getElementById('results-post-reading-container');
    if (!container) return;

    const res = state.lastResult;
    const liveTest = res ? (getMockTests() || []).find(t => t.testId === res.testId) : (getMockTests() ? getMockTests()[0] : null);

    let allQuestions = [];
    if (res && res.reviewDetails && res.reviewDetails.length > 0) {
        allQuestions = res.reviewDetails.map(rawQ => {
            let liveQ = null;
            if (liveTest && liveTest.passages[rawQ.passageIdx]) {
                liveQ = (liveTest.passages[rawQ.passageIdx].questions || []).find(item => item.id === rawQ.qId);
            }
            return {
                ...rawQ,
                question: (liveQ && liveQ.question) || rawQ.question,
                questionVi: (liveQ && liveQ.questionVi) || rawQ.questionVi,
                questionType: (liveQ && liveQ.questionType) || rawQ.questionType,
                correctAnswer: (liveQ && liveQ.correctAnswer) || rawQ.correctAnswer,
                postReading: (liveQ && liveQ.postReading) ? liveQ.postReading : rawQ.postReading
            };
        });
    } else if (liveTest && liveTest.passages) {
        liveTest.passages.forEach((p, pIdx) => {
            (p.questions || []).forEach(q => {
                allQuestions.push({
                    qId: q.id,
                    passageIdx: pIdx,
                    question: q.question,
                    questionVi: q.questionVi,
                    questionType: q.questionType,
                    correctAnswer: q.correctAnswer,
                    userPick: null,
                    isCorrect: null,
                    postReading: q.postReading
                });
            });
        });
    }

    // Update wrong count badge
    const wrongCount = allQuestions.filter(q => q.isCorrect === false).length;
    const wrongBadge = document.getElementById('post-reading-wrong-badge');
    if (wrongBadge) wrongBadge.textContent = wrongCount;

    // Filter questions
    const filteredQuestions = allQuestions.filter(q => {
        if (filter === 'p1') return q.passageIdx === 0;
        if (filter === 'p2') return q.passageIdx === 1;
        if (filter === 'p3') return q.passageIdx === 2;
        if (filter === 'p4') return q.passageIdx === 3;
        if (filter === 'wrong') return q.isCorrect === false;
        return true;
    });

    if (filteredQuestions.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px 20px; background: var(--bg-color); border-radius: 14px; border: 1.5px dashed var(--border-color);">
                <i class="fa-solid fa-circle-check" style="font-size: 2.2rem; color: #10b981; margin-bottom: 12px;"></i>
                <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-color); margin-bottom: 6px;">Không có câu hỏi nào trong mục này</h4>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0;">Chúc mừng bạn! Nếu bạn chọn "Chỉ câu làm sai", bạn đã làm đúng toàn bộ phần này.</p>
            </div>
        `;
        return;
    }

    if (mode === 'cards') {
        let cardsHtml = '';
        filteredQuestions.forEach(q => {
            const pr = q.postReading || {};
            const cleanCluePassage = (pr.cluePassage || pr.keyPassage || '').replace(/^"|"$/g, '').trim();
            const cleanClueAnswer = (pr.clueAnswer || pr.keyAnswer || '').replace(/^"|"$/g, '').trim();
            const typeLabel = pr.typeLabel || q.questionType || 'Suy luận chi tiết';

            let statusTagHtml = '';
            if (q.isCorrect === true) {
                statusTagHtml = `<span class="review-status-tag tag-correct"><i class="fa-solid fa-circle-check"></i> ĐÚNG (Chọn: ${q.userPick})</span>`;
            } else if (q.isCorrect === false) {
                statusTagHtml = `<span class="review-status-tag tag-wrong"><i class="fa-solid fa-circle-xmark"></i> SAI (Chọn: ${q.userPick || 'Trống'} • Đúng: ${q.correctAnswer})</span>`;
            } else {
                statusTagHtml = `<span class="review-status-tag" style="background:#e0f2fe; color:#0369a1;"><i class="fa-solid fa-check"></i> Đáp án: ${q.correctAnswer}</span>`;
            }

            cardsHtml += `
                <div class="post-card ${q.isCorrect === false ? 'is-wrong-post' : ''}">
                    <div class="post-card-header">
                        <div class="post-card-badges">
                            <span class="post-q-num-pill">CÂU ${q.qId}</span>
                            <span class="post-q-passage-pill">Passage ${q.passageIdx + 1}</span>
                            <span class="post-q-type-pill"><i class="fa-solid fa-compass"></i> ${typeLabel}</span>
                        </div>
                        <div>
                            ${statusTagHtml}
                        </div>
                    </div>

                    <!-- 2-Column Comparison Layout -->
                    <div class="post-comparison-grid">
                        <div class="post-clue-col passage-side">
                            <div class="post-clue-label">
                                <i class="fa-solid fa-quote-left"></i> Từ khóa / Ngữ cảnh trong bài đọc (Clue)
                            </div>
                            <div class="post-clue-text">"${cleanCluePassage || 'Dẫn chứng tại vị trí câu hỏi trong bài đọc'}"</div>
                        </div>

                        <div class="post-arrow-col">
                            <div class="post-arrow-badge">
                                <i class="fa-solid fa-arrow-right-arrow-left"></i>
                            </div>
                            <span class="post-arrow-label">Paraphrase</span>
                        </div>

                        <div class="post-clue-col answer-side">
                            <div class="post-clue-label">
                                <i class="fa-solid fa-circle-check"></i> Tương đương trong Đáp án (${q.correctAnswer})
                            </div>
                            <div class="post-clue-text">"${cleanClueAnswer || q.correctAnswer}"</div>
                        </div>
                    </div>

                    ${pr.meaningVi ? `
                    <div class="post-pair-strip">
                        <i class="fa-solid fa-language"></i>
                        <div><strong>Đối chiếu ngữ nghĩa tiếng Việt:</strong> ${pr.meaningVi}</div>
                    </div>` : ''}

                    <div class="post-logic-box">
                        <strong><i class="fa-solid fa-brain"></i> Tư duy loại suy & Quy luật chọn:</strong>
                        ${pr.deductionLogic || `Dẫn chứng trong bài đọc dùng các từ ngữ tương đương để diễn đạt cùng một thông điệp với phương án đúng ${q.correctAnswer}.`}
                    </div>

                    <div class="post-card-footer">
                        <button class="btn-jump-passage" onclick="jumpToQuestionFromResults(${q.qId})" title="Mở bài đọc và cuộn tới vị trí dẫn chứng (${q.qId})">
                            <i class="fa-solid fa-magnifying-glass-location"></i> Đối chiếu bài đọc (Câu ${q.qId})
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = cardsHtml;
    } else {
        // Table mode
        let rowsHtml = '';
        filteredQuestions.forEach(q => {
            const pr = q.postReading || {};
            const cleanCluePassage = (pr.cluePassage || pr.keyPassage || '').replace(/^"|"$/g, '').trim();
            const cleanClueAnswer = (pr.clueAnswer || pr.keyAnswer || '').replace(/^"|"$/g, '').trim();
            const typeLabel = pr.typeLabel || q.questionType || 'Suy luận';

            let statusPill = '';
            if (q.isCorrect === true) {
                statusPill = `<span style="display: inline-block; background: #dcfce7; color: #166534; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 9999px;">✓ Đúng</span>`;
            } else if (q.isCorrect === false) {
                statusPill = `<span style="display: inline-block; background: #fee2e2; color: #991b1b; font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 9999px;">✗ Sai</span>`;
            }

            rowsHtml += `
                <tr>
                    <td style="text-align: center; vertical-align: middle;">
                        <span class="post-q-num-pill" style="padding: 3px 9px; font-size: 0.78rem;">#${q.qId}</span>
                        <div style="margin-top: 4px;">${statusPill}</div>
                    </td>
                    <td>
                        <div style="font-weight: 800; font-size: 0.84rem; color: #0284c7;">${typeLabel}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Passage ${q.passageIdx + 1}</div>
                    </td>
                    <td>
                        <div class="post-table-clue-passage">"${cleanCluePassage}"</div>
                    </td>
                    <td>
                        <div class="post-table-clue-answer">
                            <span class="exp-ans-badge" style="padding: 1px 7px; font-size: 0.75rem; margin-right: 4px;">${q.correctAnswer}</span>
                            "${cleanClueAnswer}"
                        </div>
                    </td>
                    <td>
                        <div class="post-table-logic">
                            <strong><i class="fa-solid fa-brain"></i> Suy luận:</strong> ${pr.deductionLogic || 'Đối chiếu ngữ nghĩa tương đương.'}
                        </div>
                        ${pr.meaningVi ? `
                        <div style="font-size: 0.78rem; color: #475569; margin-top: 3px;">
                            <i class="fa-solid fa-language" style="color: #4f46e5;"></i> ${pr.meaningVi}
                        </div>` : ''}
                    </td>
                    <td style="text-align: center; vertical-align: middle;">
                        <button class="btn-jump-passage" style="padding: 4px 9px; font-size: 0.74rem;" onclick="jumpToQuestionFromResults(${q.qId})" title="Xem trong bài đọc">
                            <i class="fa-solid fa-magnifying-glass-location"></i> Xem
                        </button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="post-table-container">
                <table class="post-reading-table">
                    <thead>
                        <tr>
                            <th style="width: 70px; text-align: center;">Câu</th>
                            <th style="width: 170px;">Dạng suy luận</th>
                            <th style="min-width: 200px;">Dẫn chứng bài đọc (Clue)</th>
                            <th style="min-width: 180px;">Tương đương đáp án</th>
                            <th>Logic suy luận & Đối chiếu nghĩa</th>
                            <th style="width: 85px; text-align: center;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// Standalone Post-Reading Modal Logic
function openPostReadingModal(testNum = 1, passageFilter = 'all') {
    if (isTestLocked(testNum)) {
        notifyLockedTest(testNum);
        return;
    }
    playSound('click');
    syncClassAccessRestrictions();
    state.postReading.modalTestNum = parseInt(testNum) || 1;
    state.postReading.modalPassageFilter = (passageFilter !== undefined && passageFilter !== null) ? String(passageFilter) : 'all';
    state.postReading.modalSearch = '';

    // Mark as learned for progress tracking
    state.postReadingViewed[state.postReading.modalTestNum] = true;
    localStorage.setItem('vstep_postreading_viewed', JSON.stringify(state.postReadingViewed));

    const selectEl = document.getElementById('post-modal-test-select');
    if (selectEl) {
        let opt = selectEl.querySelector(`option[value="${state.postReading.modalTestNum}"]`);
        if (!opt && state.postReading.modalTestNum > 10) {
            opt = document.createElement('option');
            opt.value = String(state.postReading.modalTestNum);
            opt.textContent = `Thực chiến 0${state.postReading.modalTestNum - 10}: Đề cập nhật review`;
            selectEl.appendChild(opt);
        }
        selectEl.value = String(state.postReading.modalTestNum);
    }

    const searchEl = document.getElementById('post-modal-search');
    if (searchEl) searchEl.value = '';

    document.querySelectorAll('.post-modal-filter-pills .filter-pill-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-modal-p-all')?.classList.add('active');

    const modal = document.getElementById('post-reading-modal');
    if (modal) modal.classList.remove('hidden');

    renderPostReadingModal();
}

function closePostReadingModal() {
    playSound('click');
    const modal = document.getElementById('post-reading-modal');
    if (modal) modal.classList.add('hidden');
}

function onPostModalTestChange(val) {
    if (isTestLocked(val)) {
        notifyLockedTest(val);
        const selectEl = document.getElementById('post-modal-test-select');
        if (selectEl) selectEl.value = '1';
        return;
    }
    playSound('click');
    state.postReading.modalTestNum = parseInt(val) || 1;
    renderPostReadingModal();
}

function onPostModalSearch(val) {
    state.postReading.modalSearch = (val || '').toLowerCase().trim();
    renderPostReadingModal();
}

function filterPostModalPassage(pIdx, btn) {
    playSound('click');
    state.postReading.modalPassageFilter = pIdx;
    document.querySelectorAll('.post-modal-filter-pills .filter-pill-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderPostReadingModal();
}

function setPostModalMode(mode) {
    playSound('click');
    state.postReading.modalMode = mode;
    document.getElementById('btn-post-modal-cards')?.classList.toggle('active', mode === 'cards');
    document.getElementById('btn-post-modal-table')?.classList.toggle('active', mode === 'table');
    renderPostReadingModal();
}

function renderPostReadingModal() {
    const container = document.getElementById('post-reading-modal-body');
    if (!container) return;

    const testId = `TEST${String(state.postReading.modalTestNum).padStart(2, '0')}`;
    const test = (getMockTests() || []).find(t => t.testId === testId) || (getMockTests() ? getMockTests()[0] : null);
    if (!test) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Không tìm thấy dữ liệu đề thi.</div>`;
        return;
    }

    const testNameEl = document.getElementById('post-reading-modal-test-name');
    if (testNameEl) testNameEl.textContent = `${test.title} — Trọn bộ 40 câu hỏi & cách suy luận đáp án`;

    let allQuestions = [];
    test.passages.forEach((p, pIdx) => {
        (p.questions || []).forEach(q => {
            allQuestions.push({
                ...q,
                passageIdx: pIdx
            });
        });
    });

    const filter = state.postReading.modalPassageFilter;
    const query = state.postReading.modalSearch;

    const filtered = allQuestions.filter(q => {
        if (filter !== 'all' && q.passageIdx !== parseInt(filter)) return false;
        if (query) {
            const pr = q.postReading || {};
            const textMatch = (
                (q.question || '') + ' ' +
                (q.correctAnswer || '') + ' ' +
                (pr.cluePassage || '') + ' ' +
                (pr.clueAnswer || '') + ' ' +
                (pr.keyPassage || '') + ' ' +
                (pr.keyAnswer || '') + ' ' +
                (pr.meaningVi || '') + ' ' +
                (pr.deductionLogic || '')
            ).toLowerCase();
            if (!textMatch.includes(query)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; color: #94a3b8; margin-bottom: 10px;"></i>
                <p>Không tìm thấy từ khóa hoặc câu hỏi phù hợp với tìm kiếm của bạn.</p>
            </div>
        `;
        return;
    }

    const mode = state.postReading.modalMode || 'cards';

    if (mode === 'cards') {
        let cardsHtml = '';
        filtered.forEach(q => {
            const pr = q.postReading || {};
            const cleanCluePassage = (pr.cluePassage || pr.keyPassage || '').replace(/^"|"$/g, '').trim();
            const cleanClueAnswer = (pr.clueAnswer || pr.keyAnswer || '').replace(/^"|"$/g, '').trim();
            const typeLabel = pr.typeLabel || q.questionType || 'Suy luận chi tiết';

            cardsHtml += `
                <div class="post-card">
                    <div class="post-card-header">
                        <div class="post-card-badges">
                            <span class="post-q-num-pill">CÂU ${q.id}</span>
                            <span class="post-q-passage-pill">Passage ${q.passageIdx + 1}</span>
                            <span class="post-q-type-pill"><i class="fa-solid fa-compass"></i> ${typeLabel}</span>
                        </div>
                        <div>
                            <span class="review-status-tag" style="background:#e0f2fe; color:#0369a1;"><i class="fa-solid fa-check"></i> Đáp án đúng: ${q.correctAnswer}</span>
                        </div>
                    </div>

                    <!-- 2-Column Comparison Layout -->
                    <div class="post-comparison-grid">
                        <div class="post-clue-col passage-side">
                            <div class="post-clue-label">
                                <i class="fa-solid fa-quote-left"></i> Từ khóa / Ngữ cảnh trong bài đọc (Clue)
                            </div>
                            <div class="post-clue-text">"${cleanCluePassage || 'Dẫn chứng tại vị trí câu hỏi'}"</div>
                        </div>

                        <div class="post-arrow-col">
                            <div class="post-arrow-badge">
                                <i class="fa-solid fa-arrow-right-arrow-left"></i>
                            </div>
                            <span class="post-arrow-label">Paraphrase</span>
                        </div>

                        <div class="post-clue-col answer-side">
                            <div class="post-clue-label">
                                <i class="fa-solid fa-circle-check"></i> Tương đương trong Đáp án (${q.correctAnswer})
                            </div>
                            <div class="post-clue-text">"${cleanClueAnswer || q.correctAnswer}"</div>
                        </div>
                    </div>

                    ${pr.meaningVi ? `
                    <div class="post-pair-strip">
                        <i class="fa-solid fa-language"></i>
                        <div><strong>Đối chiếu ngữ nghĩa tiếng Việt:</strong> ${pr.meaningVi}</div>
                    </div>` : ''}

                    <div class="post-logic-box">
                        <strong><i class="fa-solid fa-brain"></i> Tư duy loại suy & Quy luật chọn:</strong>
                        ${pr.deductionLogic || `Dẫn chứng trong bài đọc dùng các từ ngữ tương đương để diễn đạt cùng một thông điệp với phương án đúng ${q.correctAnswer}.`}
                    </div>

                    <div class="post-card-footer">
                        <button class="btn-jump-passage" onclick="jumpToQuestionFromResults(${q.id}, ${state.postReading.modalTestNum})" title="Mở phòng thi xem bài đọc & dẫn chứng">
                            <i class="fa-solid fa-magnifying-glass-location"></i> Xem bài đọc (Câu ${q.id})
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = cardsHtml;
    } else {
        // Table mode
        let rowsHtml = '';
        filtered.forEach(q => {
            const pr = q.postReading || {};
            const cleanCluePassage = (pr.cluePassage || pr.keyPassage || '').replace(/^"|"$/g, '').trim();
            const cleanClueAnswer = (pr.clueAnswer || pr.keyAnswer || '').replace(/^"|"$/g, '').trim();
            const typeLabel = pr.typeLabel || q.questionType || 'Suy luận';

            rowsHtml += `
                <tr>
                    <td style="text-align: center; vertical-align: middle;">
                        <span class="post-q-num-pill" style="padding: 3px 9px; font-size: 0.78rem;">#${q.id}</span>
                    </td>
                    <td>
                        <div style="font-weight: 800; font-size: 0.84rem; color: #0284c7;">${typeLabel}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Passage ${q.passageIdx + 1}</div>
                    </td>
                    <td>
                        <div class="post-table-clue-passage">"${cleanCluePassage}"</div>
                    </td>
                    <td>
                        <div class="post-table-clue-answer">
                            <span class="exp-ans-badge" style="padding: 1px 7px; font-size: 0.75rem; margin-right: 4px;">${q.correctAnswer}</span>
                            "${cleanClueAnswer}"
                        </div>
                    </td>
                    <td>
                        <div class="post-table-logic">
                            <strong><i class="fa-solid fa-brain"></i> Suy luận:</strong> ${pr.deductionLogic || 'Đối chiếu ngữ nghĩa tương đương.'}
                        </div>
                        ${pr.meaningVi ? `
                        <div style="font-size: 0.78rem; color: #475569; margin-top: 3px;">
                            <i class="fa-solid fa-language" style="color: #4f46e5;"></i> ${pr.meaningVi}
                        </div>` : ''}
                    </td>
                    <td style="text-align: center; vertical-align: middle;">
                        <button class="btn-jump-passage" style="padding: 4px 9px; font-size: 0.74rem;" onclick="jumpToQuestionFromResults(${q.id}, ${state.postReading.modalTestNum})" title="Xem bài đọc">
                            <i class="fa-solid fa-magnifying-glass-location"></i> Xem
                        </button>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="post-table-container">
                <table class="post-reading-table">
                    <thead>
                        <tr>
                            <th style="width: 70px; text-align: center;">Câu</th>
                            <th style="width: 170px;">Dạng suy luận</th>
                            <th style="min-width: 200px;">Dẫn chứng bài đọc (Clue)</th>
                            <th style="min-width: 180px;">Tương đương đáp án</th>
                            <th>Logic suy luận & Đối chiếu nghĩa</th>
                            <th style="width: 85px; text-align: center;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// =========================================================================
// LƯU TIẾN ĐỘ HỌC TẬP & AUTO-SAVE ENGINE
// =========================================================================

function saveActiveExamProgress(showToastNotify = false) {
    if (!state.activeExam.test || state.activeExam.isSubmitted) return;
    const ansCount = Object.keys(state.activeExam.answers || {}).length;
    // Không tự động lưu thành bài dở dang nếu học viên chưa trả lời câu nào
    if (ansCount === 0 && !showToastNotify) return;

    const savedData = {
        testNum: state.activeExam.test.testNum,
        testId: state.activeExam.test.testId,
        testTitle: state.activeExam.test.title,
        answers: { ...state.activeExam.answers },
        flags: { ...state.activeExam.flags },
        timeLeft: state.activeExam.timeLeft,
        timeElapsed: state.activeExam.timeElapsed,
        currentQuestionId: state.activeExam.currentQuestionId,
        currentPassageIdx: state.activeExam.currentPassageIdx,
        passagesHighlights: { ...state.activeExam.passagesHighlights },
        tabSwitches: state.activeExam.tabSwitches || 0,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('vstep_saved_exam_progress', JSON.stringify(savedData));
    state.savedExam = savedData;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const autosaveEl = document.getElementById('cbt-autosave-text');
    if (autosaveEl) autosaveEl.textContent = `Đã tự lưu (${timeStr})`;

    updateSidebarProgress();
    renderResumeBanners();

    if (showToastNotify) {
        playSound('correct');
        const ansCount = Object.keys(savedData.answers).length;
        showToast(`Đã lưu tiến độ làm bài thành công! (Đã làm: ${ansCount}/40 câu). Bạn có thể tiếp tục bất cứ lúc nào.`, 'success');
    }
}

function resumeSavedExam() {
    playSound('click');
    const saved = JSON.parse(localStorage.getItem('vstep_saved_exam_progress') || 'null');
    if (!saved || !saved.testNum) {
        showToast("Không tìm thấy dữ liệu bài thi dở dang.", "warning");
        return;
    }

    const test = getMockTests().find(t => t.testNum === saved.testNum);
    if (!test) {
        showToast("Không tìm thấy dữ liệu đề thi.", "error");
        return;
    }

    state.activeExam.test = test;
    state.activeExam.isFullExam = true;
    state.activeExam.isSubmitted = false;
    state.activeExam.currentPassageIdx = saved.currentPassageIdx || 0;
    state.activeExam.currentQuestionId = saved.currentQuestionId || 1;
    state.activeExam.answers = saved.answers || {};
    state.activeExam.flags = saved.flags || {};
    state.activeExam.timeLeft = typeof saved.timeLeft === 'number' ? saved.timeLeft : 3600;
    state.activeExam.timeElapsed = saved.timeElapsed || 0;
    state.activeExam.fontSize = 100;
    state.activeExam.highlighterActive = false;
    state.activeExam.passagesHighlights = saved.passagesHighlights || {};
    state.activeExam.tabSwitches = saved.tabSwitches || 0;
    state.activeExam._lastCheatTime = 0;

    resetCheatUI();
    closeLearningProgressModal();
    initCBTWorkspace();

    const ansCount = Object.keys(state.activeExam.answers).length;
    showToast(`Đã khôi phục bài thi Đề số ${saved.testNum}! (Đã làm: ${ansCount}/40 câu). Tiếp tục hoàn thành tốt nhé!`, "info");
}

function discardSavedExam(askConfirm = true) {
    if (askConfirm) {
        playSound('click');
        const confirmed = confirm("Bạn có chắc chắn muốn HỦY bài thi đang làm dở dang này không? Dữ liệu câu trả lời chưa nộp sẽ bị xóa vĩnh viễn.");
        if (!confirmed) return;
    }

    localStorage.removeItem('vstep_saved_exam_progress');
    state.savedExam = null;
    updateSidebarProgress();
    renderResumeBanners();
    renderDashboardTests();
    showToast("Đã hủy bài thi dở dang thành công.", "info");
}

function discardSavedExamPrompt() {
    discardSavedExam(true);
}

function renderResumeBanners() {
    state.savedExam = JSON.parse(localStorage.getItem('vstep_saved_exam_progress') || 'null');
    const homeContainer = document.getElementById('home-resume-banner-container');
    const examContainer = document.getElementById('exam-resume-banner-container');

    const saved = state.savedExam;
    const ansCount = (saved && saved.answers) ? Object.keys(saved.answers).length : 0;
    if (!saved || !saved.testNum || ansCount === 0) {
        if (homeContainer) homeContainer.innerHTML = '';
        if (examContainer) examContainer.innerHTML = '';
        return;
    }
    const mins = Math.floor(saved.timeLeft / 60);
    const secs = saved.timeLeft % 60;
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const dateFormatted = saved.savedAt ? new Date(saved.savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

    const bannerHtml = `
        <div class="resume-exam-banner">
            <div class="resume-banner-left">
                <div class="resume-banner-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
                <div>
                    <h4 style="margin: 0; font-size: 1rem; font-weight: 900;">BẠN ĐANG CÓ BÀI THI DỞ DANG ĐƯỢC LƯU:</h4>
                    <p style="margin: 3px 0 0 0; font-size: 0.88rem; opacity: 0.95;">
                        <strong>Đề số ${String(saved.testNum).padStart(2, '0')}</strong> • Đã trả lời: <span style="color: #6ee7b7; font-weight: 800;">${ansCount}/40 câu</span> • Còn lại: <span style="color: #fde047; font-weight: 800;">${timeFormatted}</span> ${dateFormatted ? `• Lưu lúc: ${dateFormatted}` : ''}
                    </p>
                </div>
            </div>
            <div class="resume-banner-actions">
                <button class="primary-btn" onclick="resumeSavedExam()" style="background: #10b981; padding: 8px 18px; font-size: 0.88rem; font-weight: 800; border-radius: 10px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                    <i class="fa-solid fa-play"></i> Tiếp tục làm bài ngay
                </button>
                <button class="secondary-btn" onclick="discardSavedExamPrompt()" style="background: rgba(255,255,255,0.15); color: #fff; padding: 8px 14px; font-size: 0.85rem; border-color: rgba(255,255,255,0.3); border-radius: 10px;">
                    <i class="fa-solid fa-trash-can"></i> Hủy bài dở
                </button>
            </div>
        </div>
    `;

    if (homeContainer) homeContainer.innerHTML = bannerHtml;
    if (examContainer) examContainer.innerHTML = bannerHtml;
}

function openLearningProgressModal() {
    playSound('click');
    const modal = document.getElementById('learning-progress-modal');
    if (!modal) return;

    document.getElementById('progress-modal-student-name').textContent = state.student.name;
    document.getElementById('progress-modal-student-class').textContent = state.student.class;

    renderLearningProgressModal();
    modal.classList.remove('hidden');
}

function closeLearningProgressModal() {
    playSound('click');
    const modal = document.getElementById('learning-progress-modal');
    if (modal) modal.classList.add('hidden');
}

function renderLearningProgressModal() {
    const allTests = getMockTests() || [];
    const coreTests = allTests.filter(t => t.testNum <= 10);
    const practiceTests = allTests.filter(t => t.testNum > 10);
    
    // 1. Pre-Reading calculation: 400 total words (TÁCH BIỆT: chỉ tính 10 đề thi chuẩn)
    let totalVocab = 0;
    let masteredVocab = 0;
    coreTests.forEach(t => {
        t.passages.forEach(p => {
            (p.vocab || []).forEach(v => {
                totalVocab++;
                const key = `${t.testNum}_${v.word.toLowerCase()}`;
                if (state.preTest.masteredWords[key]) masteredVocab++;
            });
        });
    });
    totalVocab = totalVocab || 400;
    const prePct = Math.round((masteredVocab / totalVocab) * 100);

    const preCountEl = document.getElementById('prog-stat-pre-count');
    const prePctEl = document.getElementById('prog-stat-pre-pct');
    const preFillEl = document.getElementById('prog-stat-pre-fill');
    if (preCountEl) preCountEl.textContent = `${masteredVocab} / ${totalVocab}`;
    if (prePctEl) prePctEl.textContent = `${prePct}%`;
    if (preFillEl) preFillEl.style.width = `${prePct}%`;

    // 2. While-Reading calculation: 10 đề thi chuẩn
    const completedSet = new Set(state.history.filter(h => {
        const num = parseInt(String(h.testId).replace(/\D/g, ''));
        return num <= 10;
    }).map(h => h.testId));
    const completedCount = completedSet.size;
    const whilePct = Math.round((completedCount / 10) * 100);
    const bestScore = state.history.reduce((max, cur) => cur.score > max ? cur.score : max, 0);

    const whileCountEl = document.getElementById('prog-stat-while-count');
    const whileBestEl = document.getElementById('prog-stat-while-best');
    const whileFillEl = document.getElementById('prog-stat-while-fill');
    if (whileCountEl) whileCountEl.textContent = `${completedCount} / 10`;
    if (whileBestEl) whileBestEl.textContent = `${bestScore}/40`;
    if (whileFillEl) whileFillEl.style.width = `${whilePct}%`;

    // 3. Post-Reading calculation: 10 đề thi chuẩn
    const postCount = Object.keys(state.postReadingViewed || {}).filter(k => parseInt(k) <= 10).length;
    const postPct = Math.round((postCount / 10) * 100);

    const postCountEl = document.getElementById('prog-stat-post-count');
    const postFillEl = document.getElementById('prog-stat-post-fill');
    if (postCountEl) postCountEl.textContent = `${postCount} / 10`;
    if (postFillEl) postFillEl.style.width = `${postPct}%`;

    // 4. Band estimation
    const bandEl = document.getElementById('prog-stat-current-band');
    const subEl = document.getElementById('prog-stat-grade-sub');
    if (bandEl && subEl) {
        if (bestScore >= 35) {
            bandEl.textContent = 'BẬC 5 (C1)';
            bandEl.style.color = '#b45309';
            subEl.textContent = `Điểm cao nhất: ${bestScore}/40 (Xuất sắc)`;
        } else if (bestScore >= 26) {
            bandEl.textContent = 'BẬC 4 (B2)';
            bandEl.style.color = '#15803d';
            subEl.textContent = `Điểm cao nhất: ${bestScore}/40 (Vững vàng)`;
        } else if (bestScore >= 20) {
            bandEl.textContent = 'BẬC 3 (B1)';
            bandEl.style.color = '#0369a1';
            subEl.textContent = `Điểm cao nhất: ${bestScore}/40 (Đạt chuẩn)`;
        } else if (state.history.length > 0) {
            bandEl.textContent = 'CHƯA ĐẠT (Luyện thêm)';
            bandEl.style.color = '#dc2626';
            subEl.textContent = `Điểm cao nhất: ${bestScore}/40`;
        } else {
            bandEl.textContent = 'CHƯA THI BÀI NÀO';
            bandEl.style.color = 'var(--text-muted)';
            subEl.textContent = 'Hãy bắt đầu với Đề số 01';
        }
    }

    // 5. Active exam box inside modal
    const activeBox = document.getElementById('prog-modal-active-exam-box');
    if (activeBox) {
        const savedAnsCount = (state.savedExam && state.savedExam.answers) ? Object.keys(state.savedExam.answers).length : 0;
        if (state.savedExam && state.savedExam.testNum && savedAnsCount > 0) {
            const mins = Math.floor(state.savedExam.timeLeft / 60);
            activeBox.innerHTML = `
                <div style="background: #fef3c7; border: 1.5px solid #fde68a; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-clock-rotate-left" style="color: #b45309; font-size: 1.2rem;"></i>
                        <div>
                            <strong style="color: #92400e; font-size: 0.92rem;">BÀI THI ĐỀ SỐ ${state.savedExam.testNum} ĐANG LÀM DỞ DANG:</strong>
                            <div style="color: #b45309; font-size: 0.84rem;">Đã hoàn thành ${savedAnsCount}/40 câu • Còn ${mins} phút. Dữ liệu được bảo toàn an toàn.</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="primary-btn" style="padding: 6px 14px; font-size: 0.82rem; background: #059669;" onclick="resumeSavedExam()">
                            <i class="fa-solid fa-play"></i> Làm tiếp ngay
                        </button>
                        <button class="secondary-btn" style="padding: 6px 10px; font-size: 0.82rem; color: #dc2626; border-color: #fca5a5;" onclick="discardSavedExamPrompt()">
                            <i class="fa-solid fa-trash-can"></i> Hủy
                        </button>
                    </div>
                </div>
            `;
        } else {
            activeBox.innerHTML = '';
        }
    }

    // 6. Populate 10 Tests Matrix Table (TÁCH BIỆT: CHỈ HIỂN THỊ ĐÚNG 10 ĐỀ THI GỐC)
    const tbody = document.getElementById('progress-matrix-tbody');
    if (tbody) {
        let rowsHtml = '';
        coreTests.forEach(test => {
            // Pre-Reading vocab count
            let tVocab = 0;
            let tMastered = 0;
            test.passages.forEach(p => {
                (p.vocab || []).forEach(v => {
                    tVocab++;
                    const key = `${test.testNum}_${v.word.toLowerCase()}`;
                    if (state.preTest.masteredWords[key]) tMastered++;
                });
            });
            tVocab = tVocab || 40;

            let preBadge = '';
            if (tMastered >= tVocab) {
                preBadge = `<span class="matrix-badge-done"><i class="fa-solid fa-circle-check"></i> ${tMastered}/${tVocab} từ</span>`;
            } else if (tMastered > 0) {
                preBadge = `<span class="matrix-badge-partial"><i class="fa-solid fa-clock"></i> ${tMastered}/${tVocab} từ</span>`;
            } else {
                preBadge = `<span class="matrix-badge-not-done"><i class="fa-regular fa-circle"></i> 0/${tVocab} từ</span>`;
            }

            // While-Reading status
            const savedAnsCount = (state.savedExam && state.savedExam.answers) ? Object.keys(state.savedExam.answers).length : 0;
            const isSaved = state.savedExam && state.savedExam.testNum === test.testNum && savedAnsCount > 0;
            const attempts = state.history.filter(h => h.testId === test.testId);
            let whileBadge = '';
            if (isSaved) {
                whileBadge = `<span class="matrix-badge-partial" style="background:#fef3c7; color:#b45309; border: 1px solid #fde68a;"><i class="fa-solid fa-clock-rotate-left"></i> Làm dở (${savedAnsCount}/40)</span>`;
            } else if (attempts.length > 0) {
                const best = attempts.reduce((max, cur) => cur.score > max.score ? cur : max, attempts[0]);
                whileBadge = `<span class="matrix-badge-done"><i class="fa-solid fa-circle-check"></i> ${best.score}/40 (${best.band})</span>`;
            } else {
                whileBadge = `<span class="matrix-badge-not-done"><i class="fa-regular fa-circle"></i> Chưa thi</span>`;
            }

            // Post-Reading status
            const isPostViewed = !!state.postReadingViewed[test.testNum];
            let postBadge = isPostViewed
                ? `<span class="matrix-badge-done"><i class="fa-solid fa-circle-check"></i> Đã học</span>`
                : `<span class="matrix-badge-not-done"><i class="fa-regular fa-circle"></i> Chưa học</span>`;

            const locked = isTestLocked(test.testNum);
            rowsHtml += `
                <tr style="${locked ? 'opacity: 0.65;' : ''}">
                    <td style="text-align: center;">
                        <span class="post-q-num-pill" style="padding: 3px 8px; font-size: 0.76rem;">ĐỀ ${String(test.testNum).padStart(2, '0')}</span>
                    </td>
                    <td>
                        <strong style="color: var(--text-color); font-size: 0.88rem;">${test.title}</strong>
                        <div style="font-size: 0.76rem; color: var(--text-muted);">${test.passages.length} Bài đọc • 40 Câu hỏi</div>
                    </td>
                    <td style="text-align: center;">${locked ? '<span class="matrix-badge-not-done" style="color:#dc2626;"><i class="fa-solid fa-lock"></i> Khóa</span>' : preBadge}</td>
                    <td style="text-align: center;">${locked ? '<span class="matrix-badge-not-done" style="color:#dc2626;"><i class="fa-solid fa-lock"></i> Khóa</span>' : whileBadge}</td>
                    <td style="text-align: center;">${locked ? '<span class="matrix-badge-not-done" style="color:#dc2626;"><i class="fa-solid fa-lock"></i> Khóa</span>' : postBadge}</td>
                    <td style="text-align: center;">
                        ${locked ? `
                            <button class="btn-jump-passage" style="padding: 4px 10px; font-size: 0.75rem; background: #fee2e2; color: #dc2626; border-color: #fecaca; cursor: not-allowed;" onclick="notifyLockedTest(${test.testNum})">
                                <i class="fa-solid fa-lock"></i> Đang khóa
                            </button>
                        ` : `
                            <button class="btn-jump-passage" style="padding: 4px 10px; font-size: 0.75rem;" onclick="closeLearningProgressModal(); ${isSaved ? 'resumeSavedExam()' : `openPreTestView(${test.testNum})`}">
                                ${isSaved ? '<i class="fa-solid fa-play"></i> Tiếp tục' : '<i class="fa-solid fa-arrow-right"></i> Học đề này'}
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = rowsHtml;
    }

    // 7. Populate Practice Review Sets Matrix Table (PHÒNG LUYỆN ĐỌC)
    const practiceTbody = document.getElementById('progress-practice-matrix-tbody');
    if (practiceTbody) {
        let practiceRowsHtml = '';
        practiceTests.forEach(test => {
            let tVocab = 0;
            let tMastered = 0;
            test.passages.forEach(p => {
                (p.vocab || []).forEach(v => {
                    tVocab++;
                    const key = `${test.testNum}_${v.word.toLowerCase()}`;
                    if (state.preTest.masteredWords[key]) tMastered++;
                });
            });
            tVocab = tVocab || 40;

            let preBadge = '';
            if (tMastered >= tVocab) {
                preBadge = `<span class="matrix-badge-done"><i class="fa-solid fa-circle-check"></i> ${tMastered}/${tVocab} từ</span>`;
            } else if (tMastered > 0) {
                preBadge = `<span class="matrix-badge-partial"><i class="fa-solid fa-clock"></i> ${tMastered}/${tVocab} từ</span>`;
            } else {
                preBadge = `<span class="matrix-badge-not-done"><i class="fa-regular fa-circle"></i> 0/${tVocab} từ</span>`;
            }

            const attempts = state.history.filter(h => h.testId === test.testId);
            let whileBadge = '';
            if (attempts.length > 0) {
                const best = attempts.reduce((max, cur) => cur.score > max.score ? cur : max, attempts[0]);
                whileBadge = `<span class="matrix-badge-done"><i class="fa-solid fa-circle-check"></i> ${best.score}/40 (${best.band})</span>`;
            } else {
                whileBadge = `<span class="matrix-badge-not-done"><i class="fa-regular fa-circle"></i> Chưa thi</span>`;
            }

            const isPostViewed = !!state.postReadingViewed[test.testNum];
            let postBadge = isPostViewed
                ? `<span class="matrix-badge-done"><i class="fa-solid fa-circle-check"></i> Đã học</span>`
                : `<span class="matrix-badge-not-done"><i class="fa-regular fa-circle"></i> Chưa học</span>`;

            practiceRowsHtml += `
                <tr>
                    <td style="text-align: center;">
                        <span class="post-q-num-pill" style="padding: 3px 8px; font-size: 0.76rem; background: #e0e7ff; color: #4338ca;">THỰC CHIẾN 0${test.testNum - 10}</span>
                    </td>
                    <td>
                        <strong style="color: var(--text-color); font-size: 0.88rem;">${test.title}</strong>
                        <div style="font-size: 0.76rem; color: var(--text-muted);">${test.passages.length} Bài đọc • 40 Câu hỏi • Review đề thi thật</div>
                    </td>
                    <td style="text-align: center;">${preBadge}</td>
                    <td style="text-align: center;">${whileBadge}</td>
                    <td style="text-align: center;">${postBadge}</td>
                    <td style="text-align: center;">
                        <button class="btn-jump-passage" style="padding: 4px 10px; font-size: 0.75rem; background: #6366f1; color: #fff; border-color: #4f46e5;" onclick="closeLearningProgressModal(); switchView('practice');">
                            <i class="fa-solid fa-feather-pointed"></i> Luyện tập
                        </button>
                    </td>
                </tr>
            `;
        });
        practiceTbody.innerHTML = practiceRowsHtml;
    }
}

function manualSyncProgress() {
    playSound('correct');
    localStorage.setItem('vstep_reading_history', JSON.stringify(state.history));
    localStorage.setItem('vstep_pretest_mastered', JSON.stringify(state.preTest.masteredWords));
    localStorage.setItem('vstep_postreading_viewed', JSON.stringify(state.postReadingViewed));
    localStorage.setItem('vstep_student_name', state.student.name);
    localStorage.setItem('vstep_student_class', state.student.class);

    updateSidebarProgress();
    renderResumeBanners();
    renderLearningProgressModal();

    showToast("Toàn bộ tiến độ học tập đã được lưu trữ an toàn trên thiết bị!", "success");
}

function exportProgressJSON() {
    playSound('click');
    const backupData = {
        app: "VSTEP READING MOCK TESTS - English with Miss Nguyet",
        version: "2026.11",
        exportedAt: new Date().toISOString(),
        student: state.student,
        history: state.history,
        masteredWords: state.preTest.masteredWords,
        postReadingViewed: state.postReadingViewed,
        savedExam: state.savedExam
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanName = (state.student.name || 'hoc_vien').toLowerCase().replace(/\s+/g, '_');
    link.href = url;
    link.download = `tiendo_vstep_reading_${cleanName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Đã tải xuống file sao lưu tiến độ (.json) thành công!", "success");
}

function importProgressJSON(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.history && !data.masteredWords && !data.student) {
                showToast("File không hợp lệ hoặc không đúng định dạng sao lưu.", "error");
                return;
            }

            if (data.history && Array.isArray(data.history)) {
                state.history = data.history;
                localStorage.setItem('vstep_reading_history', JSON.stringify(state.history));
            }

            if (data.masteredWords && typeof data.masteredWords === 'object') {
                state.preTest.masteredWords = { ...state.preTest.masteredWords, ...data.masteredWords };
                localStorage.setItem('vstep_pretest_mastered', JSON.stringify(state.preTest.masteredWords));
            }

            if (data.postReadingViewed && typeof data.postReadingViewed === 'object') {
                state.postReadingViewed = { ...state.postReadingViewed, ...data.postReadingViewed };
                localStorage.setItem('vstep_postreading_viewed', JSON.stringify(state.postReadingViewed));
            }

            if (data.savedExam) {
                state.savedExam = data.savedExam;
                localStorage.setItem('vstep_saved_exam_progress', JSON.stringify(state.savedExam));
            }

            if (data.student && data.student.name) {
                state.student.name = data.student.name;
                state.student.class = data.student.class || state.student.class;
                localStorage.setItem('vstep_student_name', state.student.name);
                localStorage.setItem('vstep_student_class', state.student.class);
            }

            playSound('fanfare');
            updateSidebarProgress();
            renderResumeBanners();
            renderDashboardTests();
            renderLearningProgressModal();

            showToast("Đã khôi phục toàn bộ tiến độ học tập thành công!", "success");
        } catch (err) {
            console.error("Import progress error:", err);
            showToast("Lỗi khi đọc file sao lưu. Vui lòng kiểm tra lại.", "error");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// =========================================================================
// REVIEW HUB: TRẢ BÀI TỪ VỰNG & THỬ THÁCH TỪ ĐỒNG NGHĨA
// =========================================================================
function collectAllVocab() {
    if (!getMockTests()) return;
    const allItems = [];

    getMockTests().forEach(test => {
        test.passages.forEach((p, pIdx) => {
            (p.vocab || []).forEach(v => {
                allItems.push({
                    ...v,
                    p: typeof v.p === 'number' ? v.p : pIdx,
                    pName: v.pName || `Passage ${pIdx + 1}`,
                    pTitle: v.pTitle || p.title,
                    testNum: test.testNum,
                    testTitle: test.title
                });
            });
        });
    });

    state.allVocab = allItems;
    state.filteredVocab = [...state.allVocab];

    const pill = document.getElementById('review-vocab-pill');
    if (pill) pill.textContent = `${state.allVocab.length} từ`;
}

function getWordSynonyms(v) {
    if (!v || !v.syns) return [];
    if (Array.isArray(v.syns)) return v.syns.filter(s => s && s.trim());
    if (typeof v.syns === 'string') return v.syns.split(',').map(s => s.trim()).filter(Boolean);
    return [];
}

function getFilteredReviewVocab() {
    let list = (state.allVocab || []).filter(v => !isTestLocked(v.testNum));
    if (state.review.vocabTestVal && state.review.vocabTestVal !== 'all') {
        const tNum = parseInt(state.review.vocabTestVal);
        list = list.filter(v => v.testNum === tNum);
    }
    if (state.review.vocabSearch) {
        const q = state.review.vocabSearch.trim().toLowerCase();
        list = list.filter(v => {
            const synsStr = getWordSynonyms(v).join(' ').toLowerCase();
            return v.word.toLowerCase().includes(q) ||
                   (v.mean || '').toLowerCase().includes(q) ||
                   synsStr.includes(q);
        });
    }
    return list;
}

function initReviewSection() {
    syncClassAccessRestrictions();
    collectAllVocab();
    switchReviewMainTab(state.review.mainTab || 'vocab');
}

// -------------------------------------------------------------------------
// Review Main Tabs (1. Trả bài Từ Vựng | 2. Thử thách Từ Đồng Nghĩa)
// -------------------------------------------------------------------------
function switchReviewMainTab(tab) {
    playSound('click');
    state.review.mainTab = tab;

    const btnVocab = document.getElementById('btn-review-tab-vocab');
    const btnSyn = document.getElementById('btn-review-tab-synonyms');
    const containerVocab = document.getElementById('review-vocab-container');
    const containerSyn = document.getElementById('review-synonyms-container');

    if (tab === 'vocab') {
        if (btnVocab) btnVocab.classList.add('active');
        if (btnSyn) btnSyn.classList.remove('active');
        if (containerVocab) containerVocab.classList.remove('hidden');
        if (containerSyn) containerSyn.classList.add('hidden');
        renderReviewVocabActiveSubMode();
    } else {
        if (btnVocab) btnVocab.classList.remove('active');
        if (btnSyn) btnSyn.classList.add('active');
        if (containerVocab) containerVocab.classList.add('hidden');
        if (containerSyn) containerSyn.classList.remove('hidden');
        renderReviewSynonymActiveSubMode();
    }
}

// -------------------------------------------------------------------------
// TAB 1: TRẢ BÀI TỪ VỰNG
// -------------------------------------------------------------------------
function setVocabReviewSubMode(submode) {
    playSound('click');
    state.review.vocabSubMode = submode;

    const btnQuiz = document.getElementById('btn-vocab-submode-quiz');
    const btnFc = document.getElementById('btn-vocab-submode-flashcards');
    const btnCards = document.getElementById('btn-vocab-submode-cards');

    if (btnQuiz) btnQuiz.classList.toggle('active', submode === 'quiz');
    if (btnFc) btnFc.classList.toggle('active', submode === 'flashcards');
    if (btnCards) btnCards.classList.toggle('active', submode === 'cards');

    renderReviewVocabActiveSubMode();
}

function onVocabSearch(query) {
    state.review.vocabSearch = query;
    if (state.review.vocabSubMode === 'cards') {
        renderReviewVocabCards();
    }
}

function onVocabTestFilter(testVal) {
    if (testVal !== 'all' && isTestLocked(testVal)) {
        notifyLockedTest(testVal);
        const sel = document.getElementById('vocab-test-select');
        if (sel) sel.value = '1';
        return;
    }
    playSound('click');
    state.review.vocabTestVal = testVal;
    initReviewVocabQuiz();
    state.review.fcIdx = 0;
    renderReviewVocabActiveSubMode();
}

function renderReviewVocabActiveSubMode() {
    const stage = document.getElementById('review-vocab-active-stage');
    if (!stage) return;

    if (state.review.vocabSubMode === 'quiz') {
        renderReviewVocabQuiz(stage);
    } else if (state.review.vocabSubMode === 'flashcards') {
        renderReviewVocabFlashcards(stage);
    } else {
        renderReviewVocabCards(stage);
    }
}

// Submode 1A: Trắc Nghiệm Trả Bài (Vocab Quiz)
function initReviewVocabQuiz() {
    const pool = getFilteredReviewVocab();
    const allMeans = state.allVocab.map(v => v.mean).filter(Boolean);

    // Take random 10-20 words for the quiz session
    const sampleWords = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(20, Math.max(8, pool.length)));

    const questions = sampleWords.map(w => {
        const correctMean = w.mean;
        const otherMeans = [...new Set(allMeans.filter(m => m !== correctMean))].sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [correctMean, ...otherMeans].sort(() => Math.random() - 0.5);
        return {
            item: w,
            correctMean: correctMean,
            options: options
        };
    });

    state.review.vocabQuiz = {
        qIdx: 0,
        score: 0,
        answered: false,
        selectedOpt: null,
        questions: questions
    };
}

function renderReviewVocabQuiz(stage) {
    const qs = state.review.vocabQuiz;
    if (!qs.questions || qs.questions.length === 0) {
        initReviewVocabQuiz();
    }
    const questions = state.review.vocabQuiz.questions;
    if (!questions || questions.length === 0) {
        stage.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Không tìm thấy từ vựng nào theo bộ lọc đã chọn.</div>`;
        return;
    }

    if (qs.qIdx >= questions.length) {
        const pct = Math.round((qs.score / questions.length) * 100);
        stage.innerHTML = `
            <div style="text-align: center; padding: 36px 20px; background: var(--surface-solid); border: 2px solid #10b981; border-radius: 20px; box-shadow: var(--shadow-md);">
                <div style="font-size: 3.5rem; margin-bottom: 10px;">🎉</div>
                <h3 style="font-size: 1.45rem; font-weight: 900; color: #065f46; margin-bottom: 6px;">
                    Xuất Sắc Hoàn Thành Trả Bài Từ Vựng!
                </h3>
                <p style="font-size: 1.05rem; color: #047857; font-weight: 700; margin-bottom: 20px;">
                    Điểm số phản xạ: <strong>${qs.score} / ${questions.length}</strong> từ (${pct}%)
                </p>
                <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                    <button class="secondary-btn" onclick="initReviewVocabQuiz(); renderReviewVocabActiveSubMode();">
                        <i class="fa-solid fa-rotate-left"></i> Trả bài lượt mới
                    </button>
                    <button class="primary-btn" onclick="switchReviewMainTab('synonyms')">
                        <i class="fa-solid fa-bolt"></i> Thử Thách Từ Đồng Nghĩa <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const cur = questions[qs.qIdx];
    const v = cur.item;
    const safeWord = v.word.replace(/'/g, "\\'");
    const safeEx = (v.ex || '').replace(/'/g, "\\'");
    const syns = getWordSynonyms(v);
    const hlEx = highlightTargetWordInSentence(v.ex || '', v.word);

    const optsHtml = cur.options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        let style = 'border: 1.5px solid var(--border-color); background: var(--surface-solid); color: var(--text-color);';
        if (qs.answered) {
            if (opt === cur.correctMean) {
                style = 'border: 2px solid #10b981; background: #ecfdf5; color: #065f46; font-weight: 800;';
            } else if (opt === qs.selectedOpt) {
                style = 'border: 2px solid #ef4444; background: #fef2f2; color: #991b1b;';
            }
        }
        return `
            <button style="${style} padding: 14px 18px; border-radius: 12px; text-align: left; font-size: 0.95rem; font-weight: 700; cursor: ${qs.answered ? 'default' : 'pointer'}; display: flex; align-items: center; gap: 12px; transition: all 0.15s ease;" onclick="answerReviewVocabQuiz(${i})">
                <span style="width: 30px; height: 30px; border-radius: 50%; background: #eef2ff; color: #4f46e5; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0;">${letter}</span>
                <span>${opt}</span>
            </button>
        `;
    }).join('');

    stage.innerHTML = `
        <div style="max-width: 780px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                <span style="font-size: 0.88rem; font-weight: 800; color: #4f46e5;">
                    <i class="fa-solid fa-graduation-cap"></i> CÂU HỎI TRẢ BÀI ${qs.qIdx + 1} / ${questions.length} • Đề ${v.testNum} (${v.pName || 'Passage'})
                </span>
                <span style="background: #dcfce7; color: #166534; padding: 4px 14px; border-radius: 9999px; font-size: 0.84rem; font-weight: 800;">
                    Chính xác: ${qs.score} / ${questions.length}
                </span>
            </div>

            <div style="background: var(--surface-solid); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 22px; margin-bottom: 18px; text-align: center; box-shadow: var(--shadow-sm);">
                <div style="display: inline-flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="font-size: 1.85rem; font-weight: 900; color: var(--text-color);">${v.word}</span>
                    <span class="pretest-pos-badge">${v.pos || 'n'}</span>
                    <span class="pretest-level-badge pretest-level-${v.level || 'B2'}">${v.level || 'B2'}</span>
                    <button class="cbt-tool-btn" onclick="speakWord('${safeWord}')" title="Phát âm từ vựng (Giọng Nữ Studio)"><i class="fa-solid fa-volume-high"></i></button>
                </div>
                <div style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 12px;">${v.ipa || ''}</div>
                ${hlEx ? `
                <div style="font-size: 0.92rem; color: var(--text-color); font-style: italic; background: var(--bg-color); padding: 12px 16px; border-radius: 10px; border: 1px dashed var(--border-color); text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                    <div><i class="fa-solid fa-quote-left" style="color: #6366f1; margin-right: 6px;"></i>"${hlEx}"</div>
                    ${v.ex ? `<button class="cbt-tool-btn" onclick="speakWord('${safeEx}')" title="Nghe câu ví dụ" style="flex-shrink: 0;"><i class="fa-solid fa-volume-high"></i></button>` : ''}
                </div>` : ''}
            </div>

            <div class="review-opts-grid" style="margin-bottom: 16px;">
                ${optsHtml}
            </div>

            ${qs.answered ? `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 10px;">
                    <div style="font-size: 0.88rem; color: #334155;">
                        ${syns.length > 0 ? `<strong>Từ đồng nghĩa:</strong> = ${syns.join(', ')}` : ''}
                    </div>
                    <button class="primary-btn" onclick="nextReviewVocabQuizQuestion()">
                        ${qs.qIdx + 1 < questions.length ? 'Từ tiếp theo <i class="fa-solid fa-arrow-right"></i>' : 'Xem kết quả <i class="fa-solid fa-flag-checkered"></i>'}
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function answerReviewVocabQuiz(optIdx) {
    const qs = state.review.vocabQuiz;
    if (qs.answered) return;
    const cur = qs.questions[qs.qIdx];
    const picked = cur.options[optIdx];
    qs.answered = true;
    qs.selectedOpt = picked;

    if (picked === cur.correctMean) {
        qs.score++;
        playSound('correct');
    } else {
        playSound('wrong');
    }
    renderReviewVocabActiveSubMode();
}

function nextReviewVocabQuizQuestion() {
    playSound('click');
    state.review.vocabQuiz.qIdx++;
    state.review.vocabQuiz.answered = false;
    state.review.vocabQuiz.selectedOpt = null;
    renderReviewVocabActiveSubMode();
}

// Submode 1B: Lật Thẻ Flashcards 3D (Vocab Flashcards)
function renderReviewVocabFlashcards(stage) {
    const pool = getFilteredReviewVocab();
    if (!pool || pool.length === 0) {
        stage.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Không có từ vựng nào phù hợp để hiển thị thẻ.</div>`;
        return;
    }

    state.review.fcIdx = Math.max(0, Math.min(state.review.fcIdx, pool.length - 1));
    const v = pool[state.review.fcIdx];
    const safeWord = v.word.replace(/'/g, "\\'");
    const safeEx = (v.ex || '').replace(/'/g, "\\'");
    const syns = getWordSynonyms(v);
    const hlEx = highlightTargetWordInSentence(v.ex || '', v.word);

    stage.innerHTML = `
        <div style="max-width: 680px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <span style="font-size: 0.88rem; font-weight: 800; color: #4f46e5;">
                    <i class="fa-solid fa-clone"></i> THẺ FLASHCARD ${state.review.fcIdx + 1} / ${pool.length}
                </span>
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">
                    Đề ${v.testNum} • ${v.pName || 'Passage'}
                </span>
            </div>

            <!-- 3D Card Stage -->
            <div class="flashcard-container" onclick="flipReviewFlashcard()" style="height: 300px; cursor: pointer; perspective: 1000px; margin-bottom: 20px;">
                <div class="flashcard-inner ${state.review.fcFlipped ? 'flipped' : ''}" id="review-fc-inner" style="position: relative; width: 100%; height: 100%; text-align: center; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d;">
                    
                    <!-- Front Side -->
                    <div class="flashcard-front" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: var(--surface-solid); border: 2px solid var(--border-color); border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; padding: 28px; box-shadow: var(--shadow-md);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="pretest-pos-badge">${v.pos || 'n'}</span>
                            <span class="pretest-level-badge pretest-level-${v.level || 'B2'}">${v.level || 'B2'}</span>
                        </div>
                        <div style="margin: auto 0;">
                            <h2 style="font-size: 2.2rem; font-weight: 900; color: var(--text-color); margin-bottom: 6px;">${v.word}</h2>
                            <p style="font-size: 1.05rem; color: var(--text-muted); margin: 0;">${v.ipa || ''}</p>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <button class="cbt-tool-btn" onclick="event.stopPropagation(); speakWord('${safeWord}')" title="Nghe phát âm">
                                <i class="fa-solid fa-volume-high"></i> Nghe từ
                            </button>
                            <span style="font-size: 0.8rem; color: #6366f1; font-weight: 700;">
                                <i class="fa-solid fa-rotate"></i> Nhấn để xem nghĩa
                            </span>
                        </div>
                    </div>

                    <!-- Back Side -->
                    <div class="flashcard-back" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; transform: rotateY(180deg); background: linear-gradient(135deg, #f8fafc, #eef2ff); border: 2px solid #6366f1; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; padding: 24px; box-shadow: var(--shadow-md);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="color: #4f46e5; font-size: 1.15rem;">${v.word}</strong>
                            <span class="pretest-pos-badge">${v.pos || 'n'}</span>
                        </div>
                        <div style="margin: auto 0; text-align: left;">
                            <div style="font-size: 1.25rem; font-weight: 900; color: #065f46; margin-bottom: 8px;">
                                ${v.mean}
                            </div>
                            ${syns.length > 0 ? `
                            <div style="font-size: 0.88rem; color: #047857; margin-bottom: 8px; font-weight: 700;">
                                <i class="fa-solid fa-bolt"></i> Đồng nghĩa: = ${syns.join(', ')}
                            </div>` : ''}
                            ${hlEx ? `
                            <div style="font-size: 0.85rem; color: #334155; font-style: italic; background: rgba(255,255,255,0.85); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #6366f1;">
                                "${hlEx}"
                            </div>` : ''}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            ${v.ex ? `<button class="cbt-tool-btn" onclick="event.stopPropagation(); speakWord('${safeEx}')" title="Nghe câu ví dụ"><i class="fa-solid fa-volume-high"></i> Nghe câu</button>` : '<span></span>'}
                            <span style="font-size: 0.8rem; color: #64748b; font-weight: 700;"><i class="fa-solid fa-rotate"></i> Lật lại</span>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Controls -->
            <div style="display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap;">
                <button class="secondary-btn" onclick="prevReviewFlashcard()"><i class="fa-solid fa-chevron-left"></i> Thẻ trước</button>
                <button class="primary-btn" onclick="flipReviewFlashcard()"><i class="fa-solid fa-rotate"></i> Lật Thẻ</button>
                <button class="secondary-btn" onclick="nextReviewFlashcard()">Thẻ sau <i class="fa-solid fa-chevron-right"></i></button>
                <button class="secondary-btn" onclick="shuffleReviewFlashcards()" title="Xáo trộn ngẫu nhiên"><i class="fa-solid fa-shuffle"></i></button>
            </div>
        </div>
    `;
}

function flipReviewFlashcard() {
    playSound('click');
    state.review.fcFlipped = !state.review.fcFlipped;
    const inner = document.getElementById('review-fc-inner');
    if (inner) inner.classList.toggle('flipped', state.review.fcFlipped);
}

function nextReviewFlashcard() {
    playSound('click');
    const pool = getFilteredReviewVocab();
    if (state.review.fcIdx < pool.length - 1) {
        state.review.fcIdx++;
    } else {
        state.review.fcIdx = 0;
    }
    state.review.fcFlipped = false;
    renderReviewVocabActiveSubMode();
}

function prevReviewFlashcard() {
    playSound('click');
    const pool = getFilteredReviewVocab();
    if (state.review.fcIdx > 0) {
        state.review.fcIdx--;
    } else {
        state.review.fcIdx = pool.length - 1;
    }
    state.review.fcFlipped = false;
    renderReviewVocabActiveSubMode();
}

function shuffleReviewFlashcards() {
    playSound('click');
    const pool = getFilteredReviewVocab();
    state.review.fcIdx = Math.floor(Math.random() * pool.length);
    state.review.fcFlipped = false;
    renderReviewVocabActiveSubMode();
}

// Submode 1C: Danh Sách Tra Cứu (Vocab Cards Grid)
function renderReviewVocabCards(stage) {
    if (!stage) stage = document.getElementById('review-vocab-active-stage');
    if (!stage) return;

    const list = getFilteredReviewVocab();
    if (list.length === 0) {
        stage.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Không tìm thấy từ vựng nào khớp với từ khóa tìm kiếm.</div>`;
        return;
    }

    let cardsHtml = '';
    list.forEach(v => {
        const safeWord = v.word.replace(/'/g, "\\'");
        const safeEx = (v.ex || '').replace(/'/g, "\\'");
        const syns = getWordSynonyms(v);
        const hlEx = highlightTargetWordInSentence(v.ex || '', v.word);

        cardsHtml += `
            <div class="pretest-vocab-card">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.74rem; font-weight: 800; color: #4f46e5; background: #eef2ff; padding: 2px 8px; border-radius: 9999px;">
                            Đề ${v.testNum} • ${v.pName || 'Passage'}
                        </span>
                        <span class="pretest-level-badge pretest-level-${v.level || 'B2'}">${v.level || 'B2'}</span>
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px;">
                        <span class="pretest-word-title">${v.word}</span>
                        <span class="pretest-pos-badge">${v.pos || 'n'}</span>
                        <span class="pretest-ipa-tag">${v.ipa || ''}</span>
                    </div>
                    <div class="pretest-mean-box" style="margin-bottom: 8px;">
                        ${v.mean}
                    </div>
                    ${syns.length > 0 ? `
                    <div class="pretest-syns-row" style="margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #047857;">= Đồng nghĩa:</span>
                        ${syns.map(s => `<span class="pretest-syn-pill">${s}</span>`).join('')}
                    </div>` : ''}
                    ${hlEx ? `
                    <div class="pretest-context-box" style="margin-bottom: 10px;">
                        "${hlEx}"
                    </div>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                    <button class="cbt-tool-btn" onclick="openPreTestView(${v.testNum})" style="font-size: 0.78rem; color: #4f46e5; background: #eef2ff; border-color: #c7d2fe;">
                        <i class="fa-solid fa-book-open-reader"></i> Nạp Đề ${v.testNum}
                    </button>
                    <div style="display: flex; gap: 6px;">
                        ${v.ex ? `<button class="cbt-tool-btn" onclick="speakWord('${safeEx}')" title="Nghe câu ví dụ"><i class="fa-solid fa-quote-left"></i> Câu</button>` : ''}
                        <button class="cbt-tool-btn" onclick="speakWord('${safeWord}')" title="Phát âm từ vựng"><i class="fa-solid fa-volume-high"></i> Nghe</button>
                    </div>
                </div>
            </div>
        `;
    });

    stage.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <span style="font-size: 0.88rem; font-weight: 800; color: var(--text-color);">
                Hiển thị: <strong>${list.length}</strong> từ vựng
            </span>
        </div>
        <div class="pretest-vocab-grid">
            ${cardsHtml}
        </div>
    `;
}

// -------------------------------------------------------------------------
// TAB 2: THỬ THÁCH TỪ ĐỒNG NGHĨA (PARAPHRASING CHALLENGE)
// -------------------------------------------------------------------------
function setSynonymReviewSubMode(submode) {
    playSound('click');
    state.review.synSubMode = submode;

    const btnMatch = document.getElementById('btn-syn-submode-match');
    const btnQuiz = document.getElementById('btn-syn-submode-quiz');

    if (btnMatch) btnMatch.classList.toggle('active', submode === 'match');
    if (btnQuiz) btnQuiz.classList.toggle('active', submode === 'quiz');

    renderReviewSynonymActiveSubMode();
}

function onSynonymTestFilter(testVal) {
    if (testVal !== 'all' && isTestLocked(testVal)) {
        notifyLockedTest(testVal);
        const sel = document.getElementById('synonym-test-select');
        if (sel) sel.value = '1';
        return;
    }
    playSound('click');
    state.review.synTestVal = testVal;
    initReviewSynonymMatch();
    initReviewSynonymQuiz();
    renderReviewSynonymActiveSubMode();
}

function renderReviewSynonymActiveSubMode() {
    const stage = document.getElementById('review-synonyms-active-stage');
    if (!stage) return;

    if (state.review.synSubMode === 'match') {
        renderReviewSynonymMatch(stage);
    } else {
        renderReviewSynonymQuiz(stage);
    }
}

// Submode 2A: Ghép Cặp Từ Đồng Nghĩa (Matching Game)
function initReviewSynonymMatch() {
    let pool = state.allVocab.filter(v => !isTestLocked(v.testNum) && getWordSynonyms(v).length > 0);
    if (state.review.synTestVal && state.review.synTestVal !== 'all') {
        const tNum = parseInt(state.review.synTestVal);
        pool = pool.filter(v => v.testNum === tNum);
    }

    const selectedSix = [...pool].sort(() => Math.random() - 0.5).slice(0, 6);

    const leftItems = selectedSix.map((v, idx) => ({
        id: idx,
        word: v.word,
        ipa: v.ipa,
        pos: v.pos,
        testNum: v.testNum
    })).sort(() => Math.random() - 0.5);

    const rightItems = selectedSix.map((v, idx) => {
        const syns = getWordSynonyms(v);
        const synText = syns.slice(0, 2).join(' / ');
        return {
            id: idx,
            text: synText,
            meanHint: v.mean
        };
    }).sort(() => Math.random() - 0.5);

    clearInterval(state.review.synMatch.timerInterval);
    state.review.synMatch = {
        leftItems,
        rightItems,
        selectedLeft: null,
        selectedRight: null,
        matchedCount: 0,
        pairMap: {},
        secondsElapsed: 0,
        timerInterval: setInterval(() => {
            if (state.review.synMatch && state.review.synMatch.matchedCount < 6) {
                state.review.synMatch.secondsElapsed++;
                const timerEl = document.getElementById('syn-match-timer');
                if (timerEl) {
                    const m = Math.floor(state.review.synMatch.secondsElapsed / 60);
                    const s = state.review.synMatch.secondsElapsed % 60;
                    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                }
            }
        }, 1000)
    };
}

function renderReviewSynonymMatch(stage) {
    const sm = state.review.synMatch;
    if (!sm.leftItems || sm.leftItems.length === 0) {
        initReviewSynonymMatch();
    }
    const { leftItems, rightItems, selectedLeft, selectedRight, matchedCount, pairMap, secondsElapsed } = state.review.synMatch;

    const m = Math.floor(secondsElapsed / 60);
    const s = secondsElapsed % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const leftHtml = leftItems.map(item => {
        const pairColorIdx = pairMap[item.id];
        const isMatched = pairColorIdx !== undefined;
        const isSel = selectedLeft === item.id;
        return `
            <div class="pretest-match-item ${isMatched ? `matched-pair-${pairColorIdx}` : (isSel ? 'selected' : '')}" onclick="selectReviewSynonymMatch('left', ${item.id})">
                <div>
                    <strong>${item.word}</strong>
                    <span style="font-size: 0.78rem; color: #64748b; margin-left: 6px;">(${item.pos || 'n'})</span>
                </div>
                <i class="fa-solid ${isMatched ? 'fa-circle-check' : 'fa-link'}"></i>
            </div>
        `;
    }).join('');

    const rightHtml = rightItems.map(item => {
        const pairColorIdx = pairMap[item.id];
        const isMatched = pairColorIdx !== undefined;
        const isSel = selectedRight === item.id;
        return `
            <div class="pretest-match-item ${isMatched ? `matched-pair-${pairColorIdx}` : (isSel ? 'selected' : '')}" onclick="selectReviewSynonymMatch('right', ${item.id})">
                <div>
                    <strong>= ${item.text}</strong>
                    ${isMatched ? `<div style="font-size: 0.76rem; color: #047857;">(${item.meanHint})</div>` : ''}
                </div>
                <i class="fa-solid ${isMatched ? 'fa-circle-check' : 'fa-bullseye'}"></i>
            </div>
        `;
    }).join('');

    stage.innerHTML = `
        <div style="max-width: 820px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                <div style="font-size: 0.92rem; color: var(--text-color); font-weight: 700;">
                    <i class="fa-solid fa-puzzle-piece" style="color: #4f46e5;"></i>
                    Ghép Từ vựng tiếng Anh (Trái) với Cụm Từ Đồng Nghĩa tương ứng (Phải)
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="background: #eef2ff; color: #4f46e5; padding: 4px 12px; border-radius: 9999px; font-weight: 800; font-size: 0.85rem;">
                        <i class="fa-regular fa-clock"></i> <span id="syn-match-timer">${timeStr}</span>
                    </span>
                    <button class="secondary-btn" style="padding: 6px 14px; font-size: 0.82rem;" onclick="initReviewSynonymMatch(); renderReviewSynonymActiveSubMode();">
                        <i class="fa-solid fa-shuffle"></i> 6 cặp mới
                    </button>
                </div>
            </div>

            <div class="pretest-match-grid">
                <div style="display: flex; flex-direction: column; gap: 10px;">${leftHtml}</div>
                <div style="display: flex; flex-direction: column; gap: 10px;">${rightHtml}</div>
            </div>

            ${matchedCount === 6 ? `
                <div style="margin-top: 20px; padding: 20px; background: #ecfdf5; border: 2px solid #10b981; border-radius: 16px; text-align: center; box-shadow: var(--shadow-md);">
                    <div style="font-size: 2.5rem; margin-bottom: 8px;">🏆</div>
                    <h3 style="color: #065f46; font-weight: 900; margin-bottom: 6px; font-size: 1.35rem;">
                        XUẤT SẮC! Hoàn thành 6 cặp Từ Đồng Nghĩa trong ${timeStr}!
                    </h3>
                    <p style="color: #047857; font-size: 0.95rem; margin-bottom: 16px;">
                        Kỹ năng nhận diện Paraphrasing của bạn đang tiến bộ vượt bậc, sẵn sàng chinh phục các câu hỏi từ vựng trong đề thi VSTEP Reading.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 12px;">
                        <button class="primary-btn" style="background: #10b981;" onclick="initReviewSynonymMatch(); renderReviewSynonymActiveSubMode();">
                            <i class="fa-solid fa-rotate-left"></i> Chơi Ván Tiếp Theo (6 Cặp Mới)
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function selectReviewSynonymMatch(side, id) {
    const sm = state.review.synMatch;
    if (sm.pairMap[id] !== undefined) return;
    playSound('click');

    if (side === 'left') {
        sm.selectedLeft = sm.selectedLeft === id ? null : id;
    } else {
        sm.selectedRight = sm.selectedRight === id ? null : id;
    }

    if (sm.selectedLeft !== null && sm.selectedRight !== null) {
        if (sm.selectedLeft === sm.selectedRight) {
            playSound('correct');
            sm.pairMap[sm.selectedLeft] = sm.matchedCount % 6;
            sm.matchedCount++;
            if (sm.matchedCount === 6) {
                clearInterval(sm.timerInterval);
                playSound('fanfare');
            }
        } else {
            playSound('wrong');
        }
        sm.selectedLeft = null;
        sm.selectedRight = null;
    }
    renderReviewSynonymActiveSubMode();
}

// Submode 2B: Trắc Nghiệm Paraphrase ("Closest in meaning")
function initReviewSynonymQuiz() {
    let pool = state.allVocab.filter(v => !isTestLocked(v.testNum) && getWordSynonyms(v).length > 0);
    if (state.review.synTestVal && state.review.synTestVal !== 'all') {
        const tNum = parseInt(state.review.synTestVal);
        pool = pool.filter(v => v.testNum === tNum);
    }

    const sampleWords = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(15, pool.length));
    const allSynonyms = pool.flatMap(v => getWordSynonyms(v));

    const questions = sampleWords.map(w => {
        const validSyns = getWordSynonyms(w);
        const correctSyn = validSyns[0];
        const distractors = [...new Set(allSynonyms.filter(s => !validSyns.includes(s)))].sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [correctSyn, ...distractors].sort(() => Math.random() - 0.5);
        return {
            item: w,
            correctSyn: correctSyn,
            allSyns: validSyns,
            options: options
        };
    });

    state.review.synQuiz = {
        qIdx: 0,
        score: 0,
        answered: false,
        selectedOpt: null,
        questions: questions
    };
}

function renderReviewSynonymQuiz(stage) {
    const sq = state.review.synQuiz;
    if (!sq.questions || sq.questions.length === 0) {
        initReviewSynonymQuiz();
    }
    const questions = sq.questions;
    if (!questions || questions.length === 0) {
        stage.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Không đủ dữ liệu câu hỏi đồng nghĩa theo bộ lọc.</div>`;
        return;
    }

    if (sq.qIdx >= questions.length) {
        const pct = Math.round((sq.score / questions.length) * 100);
        stage.innerHTML = `
            <div style="text-align: center; padding: 36px 20px; background: var(--surface-solid); border: 2px solid #8b5cf6; border-radius: 20px; box-shadow: var(--shadow-md);">
                <div style="font-size: 3.5rem; margin-bottom: 10px;">🌟</div>
                <h3 style="font-size: 1.45rem; font-weight: 900; color: #5b21b6; margin-bottom: 6px;">
                    Hoàn Thành Thử Thách Paraphrasing ("Closest in Meaning")!
                </h3>
                <p style="font-size: 1.05rem; color: #6d28d9; font-weight: 700; margin-bottom: 20px;">
                    Kết quả: Đúng <strong>${sq.score} / ${questions.length}</strong> câu (${pct}%)
                </p>
                <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                    <button class="secondary-btn" onclick="initReviewSynonymQuiz(); renderReviewSynonymActiveSubMode();">
                        <i class="fa-solid fa-rotate-left"></i> Làm lại lượt mới
                    </button>
                    <button class="primary-btn" onclick="switchView('exam')">
                        <i class="fa-solid fa-play"></i> Vào Phòng Thi (10 Đề)
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const cur = questions[sq.qIdx];
    const v = cur.item;
    const safeWord = v.word.replace(/'/g, "\\'");
    const safeEx = (v.ex || '').replace(/'/g, "\\'");
    const hlEx = highlightTargetWordInSentence(v.ex || '', v.word);

    const optsHtml = cur.options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        let style = 'border: 1.5px solid var(--border-color); background: var(--surface-solid); color: var(--text-color);';
        if (sq.answered) {
            if (opt === cur.correctSyn) {
                style = 'border: 2px solid #10b981; background: #ecfdf5; color: #065f46; font-weight: 800;';
            } else if (opt === sq.selectedOpt) {
                style = 'border: 2px solid #ef4444; background: #fef2f2; color: #991b1b;';
            }
        }
        return `
            <button style="${style} padding: 14px 18px; border-radius: 12px; text-align: left; font-size: 0.95rem; font-weight: 700; cursor: ${sq.answered ? 'default' : 'pointer'}; display: flex; align-items: center; gap: 12px; transition: all 0.15s ease;" onclick="answerReviewSynonymQuiz(${i})">
                <span style="width: 30px; height: 30px; border-radius: 50%; background: #f5f3ff; color: #7c3aed; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0;">${letter}</span>
                <span>${opt}</span>
            </button>
        `;
    }).join('');

    stage.innerHTML = `
        <div style="max-width: 780px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                <span style="font-size: 0.88rem; font-weight: 800; color: #7c3aed;">
                    <i class="fa-solid fa-crosshairs"></i> VSTEP PARAPHRASE ${sq.qIdx + 1} / ${questions.length} • Đề ${v.testNum} (${v.pName || 'Passage'})
                </span>
                <span style="background: #ede9fe; color: #5b21b6; padding: 4px 14px; border-radius: 9999px; font-size: 0.84rem; font-weight: 800;">
                    Chính xác: ${sq.score} / ${questions.length}
                </span>
            </div>

            <div style="background: var(--surface-solid); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 22px; margin-bottom: 18px; box-shadow: var(--shadow-sm);">
                <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-color); margin-bottom: 10px;">
                    Which word or phrase is CLOSEST in meaning to:
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 1.8rem; font-weight: 900; color: #4f46e5;">"${v.word}"</span>
                    <span class="pretest-pos-badge">${v.pos || 'n'}</span>
                    <button class="cbt-tool-btn" onclick="speakWord('${safeWord}')" title="Nghe từ vựng"><i class="fa-solid fa-volume-high"></i></button>
                </div>
                ${hlEx ? `
                <div style="font-size: 0.92rem; color: var(--text-color); font-style: italic; background: var(--bg-color); padding: 12px 16px; border-radius: 10px; border: 1px dashed var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                    <div><i class="fa-solid fa-quote-left" style="color: #8b5cf6; margin-right: 6px;"></i>"${hlEx}"</div>
                    ${v.ex ? `<button class="cbt-tool-btn" onclick="speakWord('${safeEx}')" title="Nghe câu ví dụ" style="flex-shrink: 0;"><i class="fa-solid fa-volume-high"></i></button>` : ''}
                </div>` : ''}
            </div>

            <div class="review-opts-grid" style="margin-bottom: 16px;">
                ${optsHtml}
            </div>

            ${sq.answered ? `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 14px 18px; background: #faf5ff; border-radius: 12px; border: 1.5px solid #d8b4fe; flex-wrap: wrap; gap: 10px;">
                    <div style="font-size: 0.9rem; color: #581c87;">
                        <i class="fa-solid fa-circle-info"></i> <strong>Giải thích:</strong> <em>"${v.word}"</em> có nghĩa là <strong>${v.mean}</strong>. Các từ đồng nghĩa tương đương: <strong>${cur.allSyns.join(', ')}</strong>.
                    </div>
                    <button class="primary-btn" style="background: #7c3aed;" onclick="nextReviewSynonymQuizQuestion()">
                        ${sq.qIdx + 1 < questions.length ? 'Câu tiếp theo <i class="fa-solid fa-arrow-right"></i>' : 'Xem kết quả <i class="fa-solid fa-flag-checkered"></i>'}
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function answerReviewSynonymQuiz(optIdx) {
    const sq = state.review.synQuiz;
    if (sq.answered) return;
    const cur = sq.questions[sq.qIdx];
    const picked = cur.options[optIdx];
    sq.answered = true;
    sq.selectedOpt = picked;

    if (picked === cur.correctSyn) {
        sq.score++;
        playSound('correct');
    } else {
        playSound('wrong');
    }
    renderReviewSynonymActiveSubMode();
}

function nextReviewSynonymQuizQuestion() {
    playSound('click');
    state.review.synQuiz.qIdx++;
    state.review.synQuiz.answered = false;
    state.review.synQuiz.selectedOpt = null;
    renderReviewSynonymActiveSubMode();
}

// =========================================================================
// HISTORY & PERFORMANCE
// =========================================================================
function renderHistoryView() {
    const container = document.getElementById('history-list-container');
    if (!container) return;

    if (state.history.length === 0) {
        container.innerHTML = `
            <div class="glass-panel" style="padding: 40px; text-align: center; border-radius: 16px;">
                <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: #94a3b8; margin-bottom: 12px;"></i>
                <h3 style="color: var(--text-color); margin-bottom: 6px;">Chưa có lịch sử làm bài</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 18px;">
                    Hãy bắt đầu làm một đề thi thử Đọc hiểu để hệ thống lưu lại điểm số và lộ trình tiến bộ của bạn!
                </p>
                <button class="primary-btn" onclick="switchView('dashboard')">
                    <i class="fa-solid fa-play"></i> BẮT ĐẦU THI NGAY
                </button>
            </div>
        `;
        return;
    }

    let listHtml = '';
    state.history.forEach((h, idx) => {
        listHtml += `
            <div class="glass-panel" style="padding: 20px; border-radius: 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <span class="results-band-tag ${h.bandClass}" style="margin: 0; font-size: 0.85rem; padding: 2px 10px;">${h.band}</span>
                        <strong style="font-size: 1.1rem; color: var(--text-color);">${h.testTitle}</strong>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 14px; flex-wrap: wrap;">
                        <span><i class="fa-regular fa-calendar"></i> ${h.date}</span>
                        <span><i class="fa-regular fa-clock"></i> Thời gian: ${h.timeSpent}</span>
                        <span><i class="fa-solid fa-bullseye"></i> Chính xác: ${h.accuracy}%</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="text-align: right;">
                        <span style="font-size: 1.6rem; font-weight: 900; color: #10b981;">${h.score}</span>
                        <span style="color: #94a3b8; font-weight: 700;">/ 40</span>
                    </div>
                    <button class="secondary-btn" style="padding: 8px 14px; font-size: 0.85rem;" onclick="viewPastResult(${idx})">
                        <i class="fa-solid fa-eye"></i> Xem lại
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = listHtml;
}

function viewPastResult(historyIndex) {
    playSound('click');
    const past = state.history[historyIndex];
    if (!past) return;
    state.lastResult = past;
    renderResultsView();
    switchView('results');
}

function clearHistoryData() {
    playSound('click');
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử làm bài? Hành động này không thể hoàn tác.")) {
        state.history = [];
        localStorage.removeItem('vstep_reading_history');
        updateSidebarProgress();
        renderHistoryView();
    }
}
