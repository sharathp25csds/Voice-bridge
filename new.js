/**
 * VoiceBridge Main Script
 * Handles: UI interactions, Chatbot, STT, TTS, and Forms
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SET CURRENT YEAR ---
    document.getElementById('year').textContent = new Date().getFullYear();

    // --- 2. MODAL CONTROLS ---
    const commModal = document.getElementById('commModal');
    const closeBtns = [document.getElementById('closeComm'), document.getElementById('xClose')];
    const openAuthBtns = document.querySelectorAll('[data-open-auth]');
    const startNowBtn = document.querySelector('[data-open-auth="signup"]');

    const openModal = () => {
        commModal.setAttribute('aria-hidden', 'false');
        commModal.style.display = 'flex';
    };

    const closeModal = () => {
        commModal.setAttribute('aria-hidden', 'true');
        commModal.style.display = 'none';
    };

    openAuthBtns.forEach(btn => btn.addEventListener('click', openModal));
    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));

    // --- 3. TABS LOGIC (STT vs TTS) ---
    const tabs = document.querySelectorAll('.tab');
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
const micBtn = document.getElementById('micBtn');
const sttOutput = document.getElementById('sttOutput');
const sttLang = document.getElementById('sttLang');
let isListening = false;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = sttLang.value;

    // Update language when dropdown changes
    sttLang.addEventListener('change', () => {
        recognition.lang = sttLang.value;
        const selectedText = sttLang.options[sttLang.selectedIndex].text;
        sttOutput.textContent = `✅ Language changed to: ${selectedText}`;
    });

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        sttOutput.textContent = transcript;
    };

    recognition.onerror = (event) => {
        sttOutput.textContent = `❌ Error: ${event.error}`;
        micBtn.textContent = 'Start Listening';
        micBtn.style.background = '';
        isListening = false;
    };

    micBtn.addEventListener('click', () => {
        if (!isListening) {
            recognition.lang = sttLang.value;
            recognition.start();
            micBtn.textContent = 'Stop Listening';
            micBtn.style.background = '#ef4444';
            sttOutput.textContent = 'Listening...';
        } else {
            recognition.stop();
            micBtn.textContent = 'Start Listening';
            micBtn.style.background = '';
        }
        isListening = !isListening;
    });

} else {
    sttOutput.textContent = "Your browser doesn't support speech recognition.";
    micBtn.disabled = true;
}











// --- 5. TEXT-TO-SPEECH (TTS) ---
const speakBtn = document.getElementById('speakBtn');
const ttsInput = document.getElementById('ttsInput');
const ttsLang = document.getElementById('ttsLang');
const femaleBtn = document.getElementById('femaleBtn');
const maleBtn = document.getElementById('maleBtn');

let selectedGender = 'female';
let isSpeaking = false;

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
    'en-IN': 'en-IN',
    'hi-IN': 'hi-IN',
    'kn-IN': 'kn-IN',
    'ta-IN': 'ta-IN',
    'te-IN': 'te-IN',
    'ml-IN': 'ml-IN'
};

function getBestVoice(langCode, gender) {
    const voices = window.speechSynthesis.getVoices();
    const targetLang = langMap[langCode] || 'en-IN';

    // Try exact lang + gender match
    let match = voices.find(v =>
        v.lang === targetLang && v.name.toLowerCase().includes(gender)
    );

    // Fallback: just lang match
    if (!match) match = voices.find(v => v.lang === targetLang);

    // Fallback: partial lang match (e.g. 'en' in 'en-US')
    if (!match) match = voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));

    // Last resort: first available voice
    return match || voices[0];
}

speakBtn.addEventListener('click', () => {
    const text = ttsInput.value.trim();
    if (!text) {
        showToast("Please enter some text first!");
        return;
    }

    // If already speaking, stop it
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        speakBtn.innerHTML = '<span class="btn-icon">📣</span><span class="btn-text">Speak Out Loud</span>';
        speakBtn.disabled = false;
        isSpeaking = false;
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMap[ttsLang.value] || 'en-IN';

    const trySpeak = () => {
        const voice = getBestVoice(ttsLang.value, selectedGender);
        if (voice) utterance.voice = voice;

        // ✅ Pitch trick to fake male/female across all languages
        if (selectedGender === 'male') {
            utterance.pitch = 0.5;   // deeper voice = male feel
            utterance.rate  = 0.95;
        } else {
            utterance.pitch = 1.6;   // higher voice = female feel
            utterance.rate  = 1.05;
        }

        utterance.onstart = () => {
            isSpeaking = true;
            speakBtn.innerHTML = '<span class="btn-icon">🔊</span><span class="btn-text">Stop Speaking</span>';
            speakBtn.disabled = false;
        };

        utterance.onend = () => {
            isSpeaking = false;
            speakBtn.innerHTML = '<span class="btn-icon">📣</span><span class="btn-text">Speak Out Loud</span>';
            speakBtn.disabled = false;
        };

        utterance.onerror = (e) => {
            isSpeaking = false;
            showToast("⚠️ Speech error: " + e.error);
            speakBtn.innerHTML = '<span class="btn-icon">📣</span><span class="btn-text">Speak Out Loud</span>';
            speakBtn.disabled = false;
        };

        window.speechSynthesis.speak(utterance);
    };

    // Voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = trySpeak;
    } else {
        trySpeak();
    }
});



    // --- 6. BRIDGE AI CHATBOT LOGIC ---
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');

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

    // --- Fixed Questions & Answers ---
    const botResponses = {
        "About": "VoiceBridge is an accessibility-focused communication platform designed to help everyone communicate clearly. We offer Speech-to-Text, Text-to-Speech, and an AI guide — making conversations easier for people of all abilities.",
        "How to use Speech-to-Text and Text-to-Speech": "To use <b>Speech-to-Text:</b> Click the 🎤 microphone button and start speaking — your voice will be converted to text instantly.<br><br>To use <b>Text-to-Speech:</b> Type your message in the text box and click the 🔊 speaker button — it will read your text aloud in your chosen language.",
        "Language": "VoiceBridge supports over only 1 languages, including English, Spanish, French, Hindi, Arabic, Chinese, and many more! You can change your language anytime from the settings menu."
    };

    // --- Render Question Buttons (always visible after every answer) ---
    const renderVerticalQuestions = () => {
        const questionsDiv = document.createElement('div');
        questionsDiv.className = 'question-btns';

        Object.keys(botResponses).forEach(question => {
            const btn = document.createElement('button');
            btn.textContent = question;
            btn.className = 'question-btn';
            btn.addEventListener('click', () => {
                addMessage(question, 'user');
                setTimeout(() => {
                    addMessage(botResponses[question], 'bot');
                    renderVerticalQuestions();
                }, 800);
            });
            questionsDiv.appendChild(btn);
        });

        chatBody.appendChild(questionsDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    // --- Bot Greeting on Load ---
    addMessage("Hi! I'm Bridge 🤖 — your VoiceBridge assistant. Please choose a question below:", 'bot');
    renderVerticalQuestions();

    // --- Handle manual text input ---
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (!query) return;
        addMessage(query, 'user');
        chatInput.value = '';
        setTimeout(() => {
            addMessage("Please use the question buttons below to ask me something!", 'bot');
            renderVerticalQuestions();
        }, 800);
    });

    // --- 7. REPORT FORM VALIDATION ---
    const reportForm = document.getElementById('reportForm');

    reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let isValid = true;
        const formData = new FormData(reportForm);

        formData.forEach((value, key) => {
            const errorElement = document.querySelector(`[data-for="${key}"]`);
            if (!value) {
                errorElement.textContent = `${key} is required.`;
                isValid = false;
            } else {
                errorElement.textContent = '';
            }
        });

        if (isValid) {
            showToast("Report submitted! We'll get back to you soon.");
            reportForm.reset();
        }
    });

    // --- 8. TOAST NOTIFICATIONS ---
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});


// =========================================
// PHASE 3 — LIVE CAPTION CALL
// =========================================

// --- ELEMENTS ---
const callModal         = document.getElementById('callModal');
const openCallModalBtn  = document.getElementById('openCallModal');
const closeCallBtns     = [document.getElementById('closeCall'), document.getElementById('xCloseCall')];
const myPeerIdEl        = document.getElementById('myPeerId');
const copyPeerIdBtn     = document.getElementById('copyPeerIdBtn');
const remotePeerIdInput = document.getElementById('remotePeerIdInput');
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

// --- STATE ---
let peer            = null;
let currentCall     = null;
let dataChannel     = null;
let localStream     = null;
let callRecognition = null;
let isMuted         = false;
let micOn           = true;
let callActive      = false;

// =========================================
// OPEN / CLOSE CALL MODAL
// =========================================

const openCallModal = () => {
    callModal.setAttribute('aria-hidden', 'false');
    callModal.style.display = 'flex';
    initPeer();
};

const closeCallModal = () => {
    callModal.setAttribute('aria-hidden', 'true');
    callModal.style.display = 'none';
    endCall();
};

openCallModalBtn.addEventListener('click', openCallModal);
closeCallBtns.forEach(btn => btn.addEventListener('click', closeCallModal));

// =========================================
// STATUS HELPER
// =========================================

const setStatus = (message, type = 'ready') => {
    callStatusText.textContent = message;
    callStatusDot.className = 'call-status-dot';
    callStatusDot.classList.add(type);
};

// =========================================
// COPY PEER ID
// =========================================

copyPeerIdBtn.addEventListener('click', () => {
    const id = myPeerIdEl.textContent;
    if (!id || id === 'Generating...') return;
    navigator.clipboard.writeText(id).then(() => {
        copyPeerIdBtn.textContent = 'Copied!';
        setTimeout(() => copyPeerIdBtn.textContent = 'Copy', 2000);
    });
});

// =========================================
// INIT PEERJS
// =========================================

const initPeer = () => {
    // Don't re-init if already running
    if (peer && !peer.destroyed) return;

    peer = new Peer();

    peer.on('open', (id) => {
        myPeerIdEl.textContent = id;
        setStatus('Ready — share your Peer ID to receive a call', 'ready');
    });

    // Someone is calling you — answer automatically
    peer.on('call', (incomingCall) => {
        setStatus('Incoming call... connecting', 'ready');
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            localStream = stream;
            incomingCall.answer(stream);
            currentCall = incomingCall;
            handleCallStream(incomingCall);
            setStatus('Connected — captions are live', 'connected');
            callActive = true;
            startCaptioning();
        }).catch(() => {
            setStatus('Microphone access denied', 'error');
        });
    });

    // Listen for incoming DataChannel (captions from the other person)
    peer.on('connection', (conn) => {
        dataChannel = conn;
        dataChannel.on('data', (data) => {
            showThemCaption(data);
        });
    });

    peer.on('error', (err) => {
        setStatus('Connection error: ' + err.type, 'error');
    });
};

// =========================================
// MAKE A CALL
// =========================================

startCallBtn.addEventListener('click', () => {
    const remotePeerId = remotePeerIdInput.value.trim();
    if (!remotePeerId) {
        showToast('Please enter the other person\'s Peer ID!');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        localStream = stream;

        // Make the audio call
        const call = peer.call(remotePeerId, stream);
        currentCall = call;
        handleCallStream(call);

        // Open DataChannel for captions
        const conn = peer.connect(remotePeerId);
        dataChannel = conn;

        conn.on('open', () => {
            setStatus('Connected — captions are live', 'connected');
            callActive = true;
            startCaptioning();
        });

        conn.on('data', (data) => {
            showThemCaption(data);
        });

        setStatus('Calling...', 'ready');

    }).catch(() => {
        setStatus('Microphone access denied', 'error');
        showToast('Please allow microphone access to make a call.');
    });
});

// =========================================
// HANDLE INCOMING AUDIO STREAM
// =========================================

const handleCallStream = (call) => {
    call.on('stream', (remoteStream) => {
        remoteAudio.srcObject = remoteStream;
    });

    call.on('close', () => {
        endCall();
    });

    call.on('error', () => {
        setStatus('Call error occurred', 'error');
        endCall();
    });
};

// =========================================
// LIVE SPEECH CAPTIONING (YOUR VOICE)
// =========================================

const startCaptioning = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast('Speech recognition not supported in this browser.');
        return;
    }

    callRecognition = new SpeechRecognition();
    callRecognition.continuous = true;
    callRecognition.interimResults = true;
    callRecognition.lang = callLang.value;

    callRecognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                final += transcript;
            } else {
                interim += transcript;
            }
        }

        // Show your caption on screen
        if (final) {
            youCaptionEl.innerHTML = final;
            // Send final caption to other person via DataChannel
            if (dataChannel && dataChannel.open) {
                dataChannel.send(final);
            }
        } else if (interim) {
            // Show interim in lighter style
            youCaptionEl.innerHTML = `<span class="caption-interim">${interim}</span>`;
        }
    };

    // Auto-restart if recognition stops (Web Speech API quirk)
    callRecognition.onend = () => {
        if (callActive && micOn) {
            callRecognition.start();
        }
    };

    callRecognition.onerror = (event) => {
        // Restart on non-fatal errors
        if (event.error !== 'no-speech' && callActive && micOn) {
            setTimeout(() => {
                if (callActive) callRecognition.start();
            }, 1000);
        }
    };

    callRecognition.start();
};

// =========================================
// SHOW THEIR CAPTIONS
// =========================================

const showThemCaption = (text) => {
    themCaptionEl.innerHTML = text;
};

// =========================================
// MUTE BUTTON
// =========================================

muteBtn.addEventListener('click', () => {
    if (!localStream) return;

    isMuted = !isMuted;

    // Mute/unmute the audio tracks
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });

    if (isMuted) {
        muteBtn.classList.add('muted-active');
        muteBtn.querySelector('span').textContent = 'Unmute';
    } else {
        muteBtn.classList.remove('muted-active');
        muteBtn.querySelector('span').textContent = 'Mute';
    }
});

// =========================================
// MIC TOGGLE (CAPTIONS ON/OFF)
// =========================================

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
        if (callRecognition) callRecognition.stop();
    }
});

// =========================================
// HANG UP
// =========================================

hangUpBtn.addEventListener('click', () => {
    endCall();
});

// =========================================
// END CALL — CLEANUP EVERYTHING
// =========================================

const endCall = () => {
    callActive = false;

    // Stop speech recognition
    if (callRecognition) {
        callRecognition.stop();
        callRecognition = null;
    }

    // Close the peer call
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }

    // Stop all microphone tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Close DataChannel
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }

    // Stop remote audio
    remoteAudio.srcObject = null;

    // Reset UI
    youCaptionEl.innerHTML = '<span class="caption-placeholder">Your speech will appear here...</span>';
    themCaptionEl.innerHTML = '<span class="caption-placeholder">Their captions will appear here...</span>';
    remotePeerIdInput.value = '';
    isMuted = false;
    micOn = true;
    muteBtn.classList.remove('muted-active');
    muteBtn.querySelector('span').textContent = 'Mute';
    micToggleBtn.classList.remove('muted-active');
    micToggleBtn.querySelector('span').textContent = 'Mic On';

    setStatus('Call ended — ready for a new call', 'ready');
};

// =========================================
// LANGUAGE CHANGE DURING CALL
// =========================================

callLang.addEventListener('change', () => {
    if (callActive && callRecognition) {
        callRecognition.stop();
        callRecognition.lang = callLang.value;
    }
});