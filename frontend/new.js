/**
 * VoiceBridge Main Script
 * Handles: UI interactions, Chatbot, STT, TTS, Forms, Auth, Calls
 */

// ==========================================
// BACKEND CONNECTION
// ==========================================
const API = 'http://127.0.0.1:5000';

const getToken = () => localStorage.getItem('vb_token');
const getUser  = () => JSON.parse(localStorage.getItem('vb_user') || '{}');

const saveAuth = (token, user) => {
    localStorage.setItem('vb_token', token);
    localStorage.setItem('vb_user', JSON.stringify(user));
};

const clearAuth = () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
};

const isLoggedIn = () => !!getToken();

const updateDashboardPanel = () => {
    const panel = document.getElementById('userDashboard');
    const historySection = document.getElementById('history');
    const emailEl = document.getElementById('dashboardUserEmail');
    const greetingEl = document.querySelector('.dashboard-greeting');
    const user = getUser();
    if (!panel) return;

    const transcriptCountEl = document.getElementById('recentTranscriptCount');
    if (isLoggedIn()) {
        panel.style.display = 'block';
        if (historySection) historySection.style.display = 'block';
        greetingEl.textContent = `Welcome back, ${user.name || 'VoiceBridge user'}!`;
        emailEl.textContent   = user.email || 'you@example.com';
        if (transcriptCountEl) transcriptCountEl.textContent = '0';
    } else {
        panel.style.display = 'none';
        if (historySection) historySection.style.display = 'none';
    }
};

// ==========================================
// AUTH MODAL LOGIC (outside DOMContentLoaded)
// ==========================================

let authMode = 'login';

const openAuthModal = (mode = 'login') => {
    const authModal     = document.getElementById('authModal');
    const authTitle     = document.getElementById('authTitle');
    const authError     = document.getElementById('authError');
    const authEmail     = document.getElementById('authEmail');
    const authPassword  = document.getElementById('authPassword');
    const authName      = document.getElementById('authName');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authSwitchText= document.getElementById('authSwitchText');
    const authSwitchBtn = document.getElementById('authSwitchBtn');
    const nameField     = document.getElementById('nameField');

    authMode = mode;
    authModal.setAttribute('aria-hidden', 'false');
    authModal.style.display = 'flex';
    authError.style.display = 'none';
    authEmail.value    = '';
    authPassword.value = '';
    authName.value     = '';
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = mode === 'signup' ? 'Sign Up' : 'Login';

    if (mode === 'signup') {
        authTitle.textContent      = 'Create your account';
        authSubmitBtn.textContent  = 'Sign Up';
        authSwitchText.textContent = 'Already have an account?';
        authSwitchBtn.textContent  = 'Login';
        nameField.style.display    = 'block';
    } else {
        authTitle.textContent      = 'Login to VoiceBridge';
        authSubmitBtn.textContent  = 'Login';
        authSwitchText.textContent = "Don't have an account?";
        authSwitchBtn.textContent  = 'Sign up';
        nameField.style.display    = 'none';
    }
};

const closeAuthModal = () => {
    const authModal = document.getElementById('authModal');
    authModal.setAttribute('aria-hidden', 'true');
    authModal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SET CURRENT YEAR ---
    document.getElementById('year').textContent = new Date().getFullYear();
    // Show logout button if logged in
    const navAuthBtn = document.getElementById('navAuthBtn');
    const logoutBtn  = document.getElementById('logoutBtn');

    const updateNavBar = () => {
        if (isLoggedIn()) {
            const user = getUser();
            navAuthBtn.textContent  = `Hi, ${user.name || 'User'}`;
            navAuthBtn.style.cursor = 'default';
            navAuthBtn.removeAttribute('data-open-auth');
            logoutBtn.style.display = 'inline-block';
        } else {
            navAuthBtn.textContent  = 'Login / Signup';
            navAuthBtn.style.cursor = 'pointer';
            navAuthBtn.setAttribute('data-open-auth', 'login');
            logoutBtn.style.display = 'none';
        }
        updateDashboardPanel();
    };

    updateNavBar();

    logoutBtn.addEventListener('click', () => {
        clearAuth();
        updateNavBar();
        closeAuthModal();
        closeModal();
        window.location.hash = '#home';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Logged out successfully!');
    });

    navAuthBtn.addEventListener('click', (e) => {
        if (!isLoggedIn()) {
            e.preventDefault();
            e.stopPropagation();
            openAuthModal('login');
        }
    });

    // Admin Portal Button
    const adminPortalBtn = document.getElementById('adminPortalBtn');
    adminPortalBtn.addEventListener('click', () => {
        if (isLoggedIn()) {
            window.open('admin.html', '_blank');
        } else {
            openAuthModal('login');
        }
    });

    const navHomeBtn = document.getElementById('navHomeBtn');
    if (navHomeBtn) {
        navHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const cm = document.getElementById('commModal');
            if (cm) { cm.setAttribute('aria-hidden', 'true'); cm.style.display = 'none'; }
            const am = document.getElementById('authModal');
            if (am) { am.setAttribute('aria-hidden', 'true'); am.style.display = 'none'; }
            window.location.hash = '#Home';
        });
    }

    // --- 2. MODAL CONTROLS ---
    const commModal = document.getElementById('commModal');
    const closeBtns = [document.getElementById('closeComm'), document.getElementById('xClose')];

    const openModal = () => {
        commModal.setAttribute('aria-hidden', 'false');
        commModal.style.display = 'flex';
    };

    const closeModal = () => {
        commModal.setAttribute('aria-hidden', 'true');
        commModal.style.display = 'none';
    };

    // Open auth modal when clicking Start Now buttons
    const attachAuthButtonHandlers = () => {
        document.querySelectorAll('[data-open-auth]').forEach(btn => {
            btn.removeEventListener('click', handleAuthBtnClick);
            btn.addEventListener('click', handleAuthBtnClick);
        });
    };

    const handleAuthBtnClick = (e) => {
        e.stopPropagation();
        const mode = e.currentTarget.getAttribute('data-open-auth');
        if (isLoggedIn()) {
            openModal();
        } else {
            openAuthModal(mode);
        }
    };

    attachAuthButtonHandlers();

    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));

    const handleSuiteRedirect = (e) => {
        e.stopPropagation();
        if (isLoggedIn()) {
            const homeSection = document.getElementById('Home');
            if (homeSection) {
                homeSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.location.hash = '#Home';
            }
        } else {
            openAuthModal('login');
        }
    };

    const dashboardSuiteBtn = document.getElementById('dashboardSuiteBtn');
    if (dashboardSuiteBtn) dashboardSuiteBtn.addEventListener('click', handleSuiteRedirect);

    const dashboardCallBtn = document.getElementById('dashboardCallBtn');
    if (dashboardCallBtn) {
        dashboardCallBtn.addEventListener('click', () => {
            if (isLoggedIn()) {
                openCallModal();
            } else {
                openAuthModal('login');
            }
        });
    }

    // --- AUTH MODAL EVENTS ---
    document.getElementById('xCloseAuth').addEventListener('click', closeAuthModal);
    document.getElementById('closeAuth').addEventListener('click', closeAuthModal);

    document.getElementById('authSwitchBtn').addEventListener('click', (e) => {
        e.preventDefault();
        authMode = authMode === 'login' ? 'signup' : 'login';
        openAuthModal(authMode);
    });

    document.getElementById('authSubmitBtn').addEventListener('click', async () => {
        const email     = document.getElementById('authEmail').value.trim();
        const password  = document.getElementById('authPassword').value.trim();
        const name      = document.getElementById('authName').value.trim();
        const authError = document.getElementById('authError');
        const authSubmitBtn = document.getElementById('authSubmitBtn');

        if (!email || !password) {
            authError.textContent   = 'Email and password are required';
            authError.style.display = 'block';
            return;
        }

        if (authMode === 'signup' && !name) {
            authError.textContent   = 'Name is required';
            authError.style.display = 'block';
            return;
        }

        const url  = authMode === 'login' ? `${API}/api/login` : `${API}/api/register`;
        const body = authMode === 'login'
            ? { email, password }
            : { name, email, password };

        try {
            authSubmitBtn.textContent = 'Please wait...';
            authSubmitBtn.disabled    = true;

            const res  = await fetch(url, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(body)
            });
            const data = await res.json();

            if (!res.ok) {
                authError.textContent   = data.error || 'Something went wrong';
                authError.style.display = 'block';
                authSubmitBtn.textContent = authMode === 'login' ? 'Login' : 'Sign Up';
                authSubmitBtn.disabled    = false;
                return;
            }

            saveAuth(data.token, { name: data.name, email: data.email });
            closeAuthModal();
            showToast(`Welcome, ${data.name}! 🎉`);
            updateNavBar();
            attachAuthButtonHandlers();
            loadCallHistory(1);
            setTimeout(() => {
                const dashboardSection = document.getElementById('userDashboard');
                if (dashboardSection) {
                    dashboardSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);

        } catch (err) {
            authError.textContent   = 'Cannot connect to server. Is backend running?';
            authError.style.display = 'block';
            authSubmitBtn.textContent = authMode === 'login' ? 'Login' : 'Sign Up';
            authSubmitBtn.disabled    = false;
        }
    });

    // --- 3. TABS LOGIC (STT vs TTS) ---
    const tabs    = document.querySelectorAll('.tab');
    const sttTool = document.getElementById('stttool');
    const ttsTool = document.getElementById('ttstool');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.tab === 'stt') {
                sttTool.hidden = false;
                ttsTool.hidden = true;
            } else {
                sttTool.hidden = true;
                ttsTool.hidden = false;
            }
        });
    });

    // --- 4. SPEECH-TO-TEXT (STT) ---
    const micBtn    = document.getElementById('micBtn');
    const sttOutput = document.getElementById('sttOutput');
    const sttLang   = document.getElementById('sttLang');
    let isListening = false;
    let sttSession  = null;
    let sttMonitor  = null;
    let sttLastText = '';

    const getTimestamp = () => {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatTranscript = (text) => {
        let cleaned = text.trim().replace(/\s+/g, ' ');
        cleaned = cleaned.replace(/ \,/g, ',').replace(/ \./g, '.').replace(/ \?/g, '?').replace(/ \!/g, '!').replace(/ \;/g, ';');
        cleaned = cleaned.replace(/\b(\w+)( \1\b)+/gi, '$1');
        cleaned = cleaned.replace(/\.{2,}/g, '.');
        cleaned = cleaned.replace(/\s+([,.!?;:])/g, '$1');
        if (cleaned && !/[.!?]$/.test(cleaned)) cleaned += '.';
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        return cleaned;
    };

    const setSttStatus = (message, isError = false) => {
        sttOutput.innerHTML = `<div class="placeholder-text">${message}</div>`;
        sttOutput.classList.toggle('error', isError);
    };

    const appendSttCaption = (text) => {
        sttOutput.querySelector('.placeholder-text')?.remove();
        const entry = document.createElement('div');
        entry.className = 'caption-line';
        entry.innerHTML = `
            <div class="caption-line-meta">
                <span class="caption-speaker">Live transcript</span>
                <span>${getTimestamp()}</span>
            </div>
            <p>${text}</p>
        `;
        sttOutput.appendChild(entry);
        sttOutput.scrollTop = sttOutput.scrollHeight;
    };

    const postAudioChunk = async (blob) => {
        if (!blob || blob.size < 1000) return;
        const data = new FormData();
        data.append('audio', blob, 'speech.webm');
        data.append('language', sttLang.value || 'en-IN');

        try {
            const response = await fetch(`${API}/api/transcribe`, {
                method: 'POST',
                body: data
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Transcription failed');
            const transcript = formatTranscript(result.transcript || '');
            if (transcript && transcript !== sttLastText) {
                appendSttCaption(transcript);
                sttLastText = transcript;
            }
        } catch (error) {
            setSttStatus(`Transcription failed: ${error.message}`, true);
        }
    };

    const startSttCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            const dataArray = new Float32Array(analyser.fftSize);
            let silenceFrames = 0;

            const checkSilence = () => {
                analyser.getFloatTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / dataArray.length);
                if (rms < 0.02) {
                    silenceFrames += 1;
                } else {
                    silenceFrames = 0;
                }
                if (silenceFrames > 5) {
                    setSttStatus('Listening — silence detected, speak when ready.');
                }
                sttMonitor = requestAnimationFrame(checkSilence);
            };

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            recorder.ondataavailable = async (event) => {
                if (event.data && event.data.size > 0) {
                    await postAudioChunk(event.data);
                }
            };
            recorder.onerror = (event) => {
                setSttStatus(`Recorder error: ${event.error || 'unknown'}`, true);
            };
            recorder.onstop = () => {
                cancelAnimationFrame(sttMonitor);
                audioContext.close();
            };
            recorder.start(1500);

            stream.getAudioTracks().forEach((track) => {
                track.onended = () => {
                    if (isListening) {
                        setSttStatus('Microphone disconnected. Reconnecting...');
                        stopSttCapture();
                    }
                };
            });

            sttSession = { stream, recorder, audioContext, source, analyser };
            checkSilence();
            setSttStatus(`Listening in ${sttLang.options[sttLang.selectedIndex].text}`);
            micBtn.textContent = 'Stop Listening';
            micBtn.style.background = '#ef4444';
            isListening = true;
        } catch (error) {
            setSttStatus('Microphone access denied or unsupported.', true);
        }
    };

    const stopSttCapture = () => {
        if (!sttSession) return;
        sttSession.recorder?.stop();
        sttSession.stream?.getTracks().forEach((track) => track.stop());
        sttSession.audioContext?.close();
        cancelAnimationFrame(sttMonitor);
        sttSession = null;
        sttMonitor = null;
        micBtn.textContent = 'Start Listening';
        micBtn.style.background = '';
        isListening = false;
        setSttStatus('Live transcription paused. Click the mic to resume.');
    };

    sttLang.addEventListener('change', () => {
        if (isListening) setSttStatus(`Listening in ${sttLang.options[sttLang.selectedIndex].text}`);
    });

    micBtn.addEventListener('click', () => {
        if (isListening) {
            stopSttCapture();
        } else {
            startSttCapture();
        }
    });

    // --- 5. TEXT-TO-SPEECH (TTS) ---
    const speakBtn  = document.getElementById('speakBtn');
    const ttsInput  = document.getElementById('ttsInput');
    const ttsLang   = document.getElementById('ttsLang');
    const femaleBtn = document.getElementById('femaleBtn');
    const maleBtn   = document.getElementById('maleBtn');

    let selectedGender = 'female';
    let isSpeaking     = false;

    femaleBtn.addEventListener('click', () => {
        selectedGender = 'female';
        femaleBtn.classList.add('active');
        maleBtn.classList.remove('active');
    });

    maleBtn.addEventListener('click', () => {
        selectedGender = 'male';
        maleBtn.classList.add('active');
        femaleBtn.classList.remove('active');
    });

    const langMap = {
        'en-IN': 'en-IN', 'hi-IN': 'hi-IN', 'kn-IN': 'kn-IN',
        'ta-IN': 'ta-IN', 'te-IN': 'te-IN', 'ml-IN': 'ml-IN'
    };

    function getBestVoice(langCode, gender) {
        const voices     = window.speechSynthesis.getVoices();
        const targetLang = langMap[langCode] || 'en-IN';
        let match = voices.find(v => v.lang === targetLang && v.name.toLowerCase().includes(gender));
        if (!match) match = voices.find(v => v.lang === targetLang);
        if (!match) match = voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
        return match || voices[0];
    }

    speakBtn.addEventListener('click', () => {
        const text = ttsInput.value.trim();
        if (!text) { showToast("Please enter some text first!"); return; }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            speakBtn.innerHTML = '<span class="btn-icon">📣</span><span class="btn-text">Speak Out Loud</span>';
            speakBtn.disabled  = false;
            isSpeaking = false;
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang  = langMap[ttsLang.value] || 'en-IN';

        const trySpeak = () => {
            const voice = getBestVoice(ttsLang.value, selectedGender);
            if (voice) utterance.voice = voice;
            utterance.pitch = selectedGender === 'male' ? 0.5 : 1.6;
            utterance.rate  = selectedGender === 'male' ? 0.95 : 1.05;

            utterance.onstart = () => {
                isSpeaking = true;
                speakBtn.innerHTML = '<span class="btn-icon">🔊</span><span class="btn-text">Stop Speaking</span>';
                speakBtn.disabled  = false;
            };
            utterance.onend = () => {
                isSpeaking = false;
                speakBtn.innerHTML = '<span class="btn-icon">📣</span><span class="btn-text">Speak Out Loud</span>';
                speakBtn.disabled  = false;
            };
            utterance.onerror = (e) => {
                isSpeaking = false;
                showToast("⚠️ Speech error: " + e.error);
                speakBtn.innerHTML = '<span class="btn-icon">📣</span><span class="btn-text">Speak Out Loud</span>';
                speakBtn.disabled  = false;
            };
            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = trySpeak;
        } else {
            trySpeak();
        }
    });

    // --- 6. BRIDGE AI CHATBOT ---
    const chatForm  = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatBody  = document.getElementById('chatBody');

    const addMessage = (text, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${sender}`;
        msgDiv.innerHTML = `
            <div class="m-avatar">${sender === 'bot' ? '🤖' : '👤'}</div>
            <div class="bubble-msg">${text}</div>
        `;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    addMessage("Hi! I'm Bridge 🤖 — your VoiceBridge assistant. Login and ask me anything!", 'bot');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (!query) return;

        addMessage(query, 'user');
        chatInput.value = '';

        if (!isLoggedIn()) {
            addMessage('Please login first to chat with Bridge! 🔐', 'bot');
            setTimeout(() => openAuthModal('login'), 1000);
            return;
        }

        const typingDiv = document.createElement('div');
        typingDiv.className = 'msg bot';
        typingDiv.id = 'typing';
        typingDiv.innerHTML = '<div class="m-avatar">🤖</div><div class="bubble-msg">Bridge is typing...</div>';
        chatBody.appendChild(typingDiv);
        chatBody.scrollTop = chatBody.scrollHeight;

        try {
            const res  = await fetch(`${API}/api/chat`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ message: query })
            });
            const data = await res.json();
            document.getElementById('typing')?.remove();
            addMessage(res.ok ? data.reply : 'Sorry, something went wrong. Try again!', 'bot');
        } catch (err) {
            document.getElementById('typing')?.remove();
            addMessage('Cannot connect to server. Is backend running?', 'bot');
        }
    });

    // --- 7. REPORT FORM ---
    const reportForm = document.getElementById('reportForm');

    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name    = document.getElementById('r-name').value.trim();
        const type    = document.getElementById('r-type').value.trim();
        const message = document.getElementById('r-message').value.trim();

        if (!type) { showToast('Please select an issue type'); return; }
        if (!message) { showToast('Please enter a message'); return; }

        try {
            const res = await fetch(`${API}/api/reports`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, type, message })
            });
            if (res.ok) {
                showToast("Report submitted! We'll get back to you soon.");
                reportForm.reset();
            } else {
                showToast('Failed to submit. Try again!');
            }
        } catch (err) {
            showToast('Cannot connect to server. Is backend running?');
        }
    });

    // --- 8. TOAST ---
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    const createCaptionLine = (container, text, speaker) => {
        if (!text || !container) return;
        const normalized = formatTranscript(text);
        const lastLine = container.querySelector('p:last-of-type')?.textContent?.trim();
        if (!normalized || normalized === lastLine) return;

        container.querySelector('.caption-placeholder')?.remove();
        const line = document.createElement('div');
        line.className = 'caption-line';
        line.innerHTML = `
            <div class="caption-line-meta">
                <span class="caption-speaker">${speaker}</span>
                <span>${getTimestamp()}</span>
            </div>
            <p>${normalized}</p>
        `;
        container.appendChild(line);
        container.scrollTop = container.scrollHeight;

        if (callActive) {
            callCaptions.push({
                speaker: speaker,
                caption_text: normalized,
                timestamp: new Date().toISOString(),
                sequence_number: callCaptions.length + 1
            });
        }
    };

    const formatTranscriptForExport = (captions) => {
        return captions.map(c => `[${c.timestamp}] ${c.speaker}: ${c.caption_text}`).join('\n');
    };

    // =========================================
    // PHASE 3 — LIVE CAPTION CALL
    // =========================================

    const callModal         = document.getElementById('callModal');
    const openCallModalBtn  = document.getElementById('openCallModal');
    const closeCallBtns     = [document.getElementById('closeCall'), document.getElementById('xCloseCall')];
    const myPeerIdEl        = document.getElementById('myPeerId');
    const copyPeerIdBtn     = document.getElementById('copyPeerIdBtn');
    const remotePeerIdInput = document.getElementById('remotePeerIdInput');
    const contactNameInput  = document.getElementById('contactNameInput');
    const startCallBtn      = document.getElementById('startCallBtn');
    const callStatusDot     = document.getElementById('callStatusDot');
    const callStatusText    = document.getElementById('callStatusText');
    const youCaptionEl      = document.getElementById('youCaption');
    const themCaptionEl     = document.getElementById('themCaption');
    const muteBtn           = document.getElementById('muteBtn');
    const hangUpBtn         = document.getElementById('hangUpBtn');
    const micToggleBtn      = document.getElementById('micToggleBtn');
    const remoteAudio       = document.getElementById('remoteAudio');
    const callLang          = document.getElementById('callLang');
    const historySearch     = document.getElementById('historySearch');
    const historyList       = document.getElementById('historyList');
    const historyEmpty      = document.getElementById('historyEmpty');
    const historyPrevBtn    = document.getElementById('historyPrevBtn');
    const historyNextBtn    = document.getElementById('historyNextBtn');
    const historyModal      = document.getElementById('historyModal');
    const closeHistoryBtns  = [document.getElementById('closeHistory'), document.getElementById('xCloseHistory')];
    const historyModalTitle = document.getElementById('historyModalTitle');
    const historyModalSubtitle = document.getElementById('historyModalSubtitle');
    const historyContactBadge = document.getElementById('historyContactBadge');
    const historyDurationBadge = document.getElementById('historyDurationBadge');
    const historyLanguageBadge = document.getElementById('historyLanguageBadge');
    const historyTimeBadge = document.getElementById('historyTimeBadge');
    const conversationView = document.getElementById('conversationView');
    const exportTranscriptBtn = document.getElementById('exportTranscriptBtn');
    const deleteHistoryBtn = document.getElementById('deleteHistoryBtn');

    let peer            = null;
    let currentCall     = null;
    let dataChannel     = null;
    let localStream     = null;
    let callRecognition = null;
    let isMuted         = false;
    let micOn           = true;
    let callActive      = false;
    let callStartTime   = null;
    let callStartedAt   = null;
    let callEndedAt     = null;
    let callSessionUUID = null;
    let callSaved       = false;
    let callCaptions    = [];
    let historyPage     = 1;
    let historyLimit    = 8;
    let historySearchTerm = '';
    let activeHistorySessionId = null;

    const openCallModal = () => {
        callModal.setAttribute('aria-hidden', 'false');
        callModal.style.display = 'flex';
        initPeer();
        contactNameInput.value = '';
        callCaptions = [];
        callSessionUUID = crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
        callSaved = false;
    };

    const closeCallModal = () => {
        callModal.setAttribute('aria-hidden', 'true');
        callModal.style.display = 'none';
        endCall();
        if (peer && !peer.destroyed) { peer.destroy(); peer = null; }
        myPeerIdEl.textContent = 'Generating...';
    };

    if (openCallModalBtn) {
        openCallModalBtn.addEventListener('click', () => {
            if (isLoggedIn()) {
                openCallModal();
            } else {
                openAuthModal('login');
            }
        });
    }
    closeCallBtns.forEach(btn => btn.addEventListener('click', closeCallModal));

    const setStatus = (message, type = 'ready') => {
        callStatusText.textContent = message;
        callStatusDot.className    = 'call-status-dot';
        callStatusDot.classList.add(type);
    };

    copyPeerIdBtn.addEventListener('click', () => {
        const id = myPeerIdEl.textContent;
        if (!id || id === 'Generating...') return;
        navigator.clipboard.writeText(id).then(() => {
            copyPeerIdBtn.textContent = 'Copied!';
            setTimeout(() => copyPeerIdBtn.textContent = 'Copy', 2000);
        });
    });

    const initPeer = () => {
        if (peer && !peer.destroyed) return;
        peer = new Peer();

        peer.on('open', (id) => {
            myPeerIdEl.textContent = id;
            setStatus('Ready — share your Peer ID to receive a call', 'ready');
        });

        peer.on('call', (incomingCall) => {
            setStatus('Incoming call... connecting', 'ready');
            navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                localStream  = stream;
                attachMicDisconnectHandler(stream);
                callStartTime = Date.now();
                callStartedAt = new Date();
                callSessionUUID = callSessionUUID || (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
                callCaptions = [];
                callSaved = false;
                incomingCall.answer(stream);
                currentCall  = incomingCall;
                handleCallStream(incomingCall);
                setStatus('Connected — captions are live', 'connected');
                callActive = true;
                startCaptioning();
            }).catch(() => setStatus('Microphone access denied', 'error'));
        });

        peer.on('connection', (conn) => {
            dataChannel = conn;
            dataChannel.on('data', (data) => showThemCaption(data));
        });

        peer.on('error', (err) => setStatus('Connection error: ' + err.type, 'error'));
    };

    startCallBtn.addEventListener('click', () => {
        const remotePeerId = remotePeerIdInput.value.trim();
        if (!remotePeerId) { showToast('Please enter the other person\'s Peer ID!'); return; }
        if (peer && remotePeerId === peer.id) { showToast("You can't call yourself!"); return; }

        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            localStream   = stream;
            attachMicDisconnectHandler(stream);
            callStartTime = Date.now();
            callStartedAt = new Date();
            callSessionUUID = callSessionUUID || (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
            callCaptions = [];
            callSaved = false;

            const call = peer.call(remotePeerId, stream);
            currentCall = call;
            handleCallStream(call);

            const conn  = peer.connect(remotePeerId);
            dataChannel = conn;

            conn.on('data', (data) => showThemCaption(data));

            let connectedViaOpen = false;
            const fallbackTimer  = setTimeout(() => {
                if (!connectedViaOpen && callActive) setStatus('Connected — captions are live', 'connected');
            }, 5000);

            conn.on('open', () => {
                connectedViaOpen = true;
                clearTimeout(fallbackTimer);
                setStatus('Connected — captions are live', 'connected');
                callActive = true;
                startCaptioning();
            });

            conn.on('error', (err) => {
                clearTimeout(fallbackTimer);
                setStatus('Data channel error: ' + err.type, 'error');
            });

            setStatus('Calling...', 'ready');

        }).catch(() => {
            setStatus('Microphone access denied', 'error');
            showToast('Please allow microphone access to make a call.');
        });
    });

    const handleCallStream = (call) => {
        call.on('stream', (remoteStream) => { remoteAudio.srcObject = remoteStream; });
        call.on('close',  () => endCall());
        call.on('error',  () => { setStatus('Call error occurred', 'error'); endCall(); });
    };

    const attachMicDisconnectHandler = (stream) => {
        stream.getAudioTracks().forEach((track) => {
            track.onended = () => {
                setStatus('Microphone disconnected — attempting reconnect...', 'error');
                if (callRecognition) { callRecognition.stop(); callRecognition = null; }
                navigator.mediaDevices.getUserMedia({ audio: true }).then((replacement) => {
                    localStream = replacement;
                    setStatus('Microphone reconnected — captions restoring', 'connected');
                    if (micOn) startCaptioning();
                }).catch(() => {
                    setStatus('Unable to restore microphone. Please reconnect your device.', 'error');
                });
            };
        });
    };

    const startCaptioning = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { showToast('Speech recognition not supported in this browser.'); return; }

        if (callRecognition) { callRecognition.stop(); callRecognition = null; }

        callRecognition                  = new SR();
        callRecognition.continuous       = true;
        callRecognition.interimResults   = true;
        callRecognition.lang             = callLang.value;

        callRecognition.onresult = (event) => {
            let interim = '', final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) final += t;
                else interim += t;
            }

            if (final) {
                youCaptionEl.querySelector('.caption-interim')?.remove();
                createCaptionLine(youCaptionEl, final, 'Speaker 1');
                if (dataChannel && dataChannel.open) dataChannel.send(final);
            } else if (interim) {
                let interimEl = youCaptionEl.querySelector('.caption-interim');
                if (!interimEl) {
                    interimEl           = document.createElement('span');
                    interimEl.className = 'caption-interim';
                    youCaptionEl.appendChild(interimEl);
                }
                interimEl.textContent  = formatTranscript(interim);
                youCaptionEl.scrollTop = youCaptionEl.scrollHeight;
            }
        };

        callRecognition.onend = () => {
            if (callActive && micOn) {
                setTimeout(() => {
                    if (callActive && micOn) {
                        callRecognition?.start();
                    }
                }, 500);
            }
        };

        callRecognition.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setStatus('Speech recognition blocked by browser permission.', 'error');
                return;
            }
            if (event.error !== 'no-speech' && callActive && micOn) {
                setStatus('Captions paused. Reconnecting speech recognition...', 'error');
                setTimeout(() => { if (callActive && micOn) callRecognition?.start(); }, 1200);
            }
        };

        callRecognition.start();
    };

    const showThemCaption = (text) => {
        createCaptionLine(themCaptionEl, text, 'Speaker 2');
    };

    muteBtn.addEventListener('click', () => {
        if (!localStream) return;
        isMuted = !isMuted;
        localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
        muteBtn.classList.toggle('muted-active', isMuted);
        muteBtn.querySelector('span').textContent = isMuted ? 'Unmute' : 'Mute';
    });

    micToggleBtn.addEventListener('click', () => {
        if (!callActive) return;
        micOn = !micOn;
        if (micOn) {
            micToggleBtn.querySelector('span').textContent = 'Mic On';
            micToggleBtn.classList.remove('muted-active');
            startCaptioning();
        } else {
            micToggleBtn.querySelector('span').textContent = 'Mic Off';
            micToggleBtn.classList.add('muted-active');
            if (callRecognition) { callRecognition.stop(); callRecognition = null; }
        }
    });

    const themeBtn = document.getElementById('toggleCaptionThemeBtn');
    themeBtn?.addEventListener('click', () => {
        callModal.classList.toggle('dark');
        const isDark = callModal.classList.contains('dark');
        themeBtn.querySelector('span').textContent = isDark ? 'Light mode' : 'Dark mode';
    });

    hangUpBtn.addEventListener('click', () => endCall());

    const endCall = () => {
        callEndedAt = new Date();
        
        if (isLoggedIn() && !callSaved && callStartedAt) {
            const duration = Math.floor((Date.now() - callStartTime) / 1000);
            const contactName = contactNameInput?.value?.trim() || remotePeerIdInput.value?.trim() || 'Unknown';
            
            const payload = {
                session_id: callSessionUUID,
                contact_name: contactName,
                language: callLang.value || 'en-IN',
                started_at: callStartedAt.toISOString(),
                ended_at: callEndedAt.toISOString(),
                duration: duration,
                captions: callCaptions
            };

            fetch(`${API}/api/calls`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(payload)
            }).catch(() => {});
            
            callSaved = true;
        }

        callActive    = false;
        callStartTime = null;
        callStartedAt = null;

        if (callRecognition) { callRecognition.stop(); callRecognition = null; }
        if (currentCall)     { currentCall.close();   currentCall     = null; }
        if (localStream)     { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
        if (dataChannel)     { dataChannel.close();   dataChannel     = null; }

        remoteAudio.srcObject = null;

        youCaptionEl.innerHTML  = '<span class="caption-placeholder">Your speech will appear here...</span>';
        themCaptionEl.innerHTML = '<span class="caption-placeholder">Their captions will appear here...</span>';

        if (remotePeerIdInput.value.trim()) remotePeerIdInput.value = '';
        if (contactNameInput) contactNameInput.value = '';

        isMuted = false;
        micOn   = true;
        muteBtn.classList.remove('muted-active');
        muteBtn.querySelector('span').textContent     = 'Mute';
        micToggleBtn.classList.remove('muted-active');
        micToggleBtn.querySelector('span').textContent = 'Mic On';

        setStatus('Call ended — ready for a new call', 'ready');
    };

    callLang.addEventListener('change', () => {
        if (callActive && callRecognition && micOn) {
            callRecognition.lang = callLang.value;
            callRecognition.stop();
        }
    });

    // =========================================
    // CALL HISTORY MANAGEMENT
    // =========================================

    const loadCallHistory = async (page = 1, search = '') => {
        if (!isLoggedIn()) return;

        try {
            let url = `${API}/api/call-sessions?page=${page}&limit=${historyLimit}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await res.json();

            if (!res.ok) {
                historyEmpty.style.display = 'block';
                historyList.innerHTML = '';
                return;
            }

            if (!data.sessions || data.sessions.length === 0) {
                historyEmpty.style.display = 'block';
                historyList.innerHTML = '';
                historyPrevBtn.disabled = true;
                historyNextBtn.disabled = true;
                return;
            }

            historyEmpty.style.display = 'none';
            renderHistoryCards(data.sessions);
            historyPrevBtn.disabled = page <= 1;
            historyNextBtn.disabled = page >= data.meta.pages;
        } catch (err) {
            console.error('Failed to load call history', err);
            historyEmpty.textContent = 'Error loading history. Try again.';
            historyEmpty.style.display = 'block';
        }
    };

    const renderHistoryCards = (sessions) => {
        historyList.innerHTML = '';
        sessions.forEach(session => {
            const card = document.createElement('div');
            card.className = 'history-card';
            
            const startDate = new Date(session.started_at);
            const duration = session.duration;
            const durationMin = Math.floor(duration / 60);
            const durationSec = duration % 60;

            card.innerHTML = `
                <div class="history-card-header">
                    <div>
                        <p class="history-card-title">${session.contact_name || 'Unknown'}</p>
                        <p class="history-card-subtitle">${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                    </div>
                </div>
                <div class="history-badges">
                    <span class="badge">${durationMin}m ${durationSec}s</span>
                    <span class="badge">${session.language || 'en-IN'}</span>
                    <span class="badge">${session.caption_count || 0} messages</span>
                </div>
                <div class="history-actions">
                    <button class="btn btn-soft view-history-btn" data-session-id="${session.id}">View transcript</button>
                </div>
            `;
            
            card.querySelector('.view-history-btn').addEventListener('click', () => {
                openHistoryViewer(session.id);
            });
            
            historyList.appendChild(card);
        });
    };

    const openHistoryViewer = async (sessionId) => {
        if (!isLoggedIn()) return;

        try {
            const res = await fetch(`${API}/api/call-sessions/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const session = await res.json();

            if (!res.ok) {
                showToast('Could not load transcript');
                return;
            }

            activeHistorySessionId = sessionId;
            const startDate = new Date(session.started_at);
            const endDate = new Date(session.ended_at);
            const duration = session.duration;
            const durationMin = Math.floor(duration / 60);
            const durationSec = duration % 60;

            historyModalTitle.textContent = `${session.contact_name || 'Unknown'}`;
            historyModalSubtitle.textContent = `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
            historyContactBadge.textContent = `👤 ${session.contact_name || 'Unknown'}`;
            historyDurationBadge.textContent = `⏱️ ${durationMin}m ${durationSec}s`;
            historyLanguageBadge.textContent = `🌐 ${session.language || 'en-IN'}`;
            historyTimeBadge.textContent = `📅 ${startDate.toLocaleDateString()}`;

            conversationView.innerHTML = '';
            if (session.captions && session.captions.length > 0) {
                session.captions.forEach(caption => {
                    const msgRow = document.createElement('div');
                    msgRow.className = `message-row ${caption.speaker === 'Speaker 1' ? 'you' : ''}`;
                    
                    const captionDate = new Date(caption.timestamp);
                    const timeStr = captionDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

                    msgRow.innerHTML = `
                        <div class="message-bubble ${caption.speaker === 'Speaker 1' ? 'you' : ''}">
                            <span class="message-sender">${caption.speaker}</span>
                            ${caption.caption_text}
                            <span class="message-time">${timeStr}</span>
                        </div>
                    `;
                    conversationView.appendChild(msgRow);
                });
            } else {
                conversationView.innerHTML = '<p style="color: hsl(var(--muted-foreground)); text-align: center;">No captions recorded for this session.</p>';
            }

            historyModal.setAttribute('aria-hidden', 'false');
            historyModal.style.display = 'flex';
        } catch (err) {
            console.error('Failed to load session details', err);
            showToast('Error loading transcript');
        }
    };

    const closeHistoryViewer = () => {
        historyModal.setAttribute('aria-hidden', 'true');
        historyModal.style.display = 'none';
        activeHistorySessionId = null;
    };

    const deleteHistorySession = async () => {
        if (!activeHistorySessionId || !isLoggedIn()) return;

        if (!confirm('Are you sure? This will permanently delete this call history.')) return;

        try {
            const res = await fetch(`${API}/api/call-sessions/${activeHistorySessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.ok) {
                closeHistoryViewer();
                loadCallHistory(historyPage, historySearchTerm);
                showToast('Call history deleted.');
            } else {
                showToast('Could not delete history');
            }
        } catch (err) {
            console.error('Failed to delete session', err);
            showToast('Error deleting history');
        }
    };

    const exportTranscript = () => {
        if (conversationView.children.length === 0) {
            showToast('No transcript to export');
            return;
        }

        let text = `${historyModalTitle.textContent}\n`;
        text += `${historyModalSubtitle.textContent}\n`;
        text += `Duration: ${historyDurationBadge.textContent}\n\n`;
        text += '─'.repeat(50) + '\n\n';

        conversationView.querySelectorAll('.message-row').forEach(row => {
            const sender = row.querySelector('.message-sender')?.textContent || 'Unknown';
            const msg = row.querySelector('.message-bubble')?.textContent || '';
            text += `${sender}:\n${msg.trim()}\n\n`;
        });

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Transcript exported.');
    };

    // History event listeners
    closeHistoryBtns.forEach(btn => btn.addEventListener('click', closeHistoryViewer));
    
    historySearch?.addEventListener('input', () => {
        historySearchTerm = historySearch.value.trim();
        historyPage = 1;
        loadCallHistory(1, historySearchTerm);
    });

    historyPrevBtn?.addEventListener('click', () => {
        if (historyPage > 1) {
            historyPage--;
            loadCallHistory(historyPage, historySearchTerm);
        }
    });

    historyNextBtn?.addEventListener('click', () => {
        historyPage++;
        loadCallHistory(historyPage, historySearchTerm);
    });

    exportTranscriptBtn?.addEventListener('click', exportTranscript);
    deleteHistoryBtn?.addEventListener('click', deleteHistorySession);

    // Load history on page load if logged in
    if (isLoggedIn()) {
        loadCallHistory(1);
    }

}); // end DOMContentLoaded

