/* =========================================================
   Diwali Ramayana Trivia — Game Logic
   ========================================================= */
(function () {
    'use strict';

    // -------- Data --------
    const DATA = window.DIWALI_TRIVIA_DATA;
    if (!DATA) {
        console.error('DIWALI_TRIVIA_DATA not loaded. Check data/diwali_trivia.js');
        return;
    }
    const QUESTIONS = DATA.questions;
    const INTERLUDES = DATA.interludes;

    // -------- Constants --------
    const PENDING_DELAY = 3000;      // yellow pause
    const REVEAL_PAUSE = 900;        // pause after colors show, before modal
    const LETTERS = ['A', 'B', 'C', 'D'];

    // -------- State --------
    const state = {
        screen: 'intro',
        questionIndex: 0,
        shuffledOptions: [],
        selectedPosition: null,
        answerState: null,       // null | 'pending' | 'revealed'
        focusedPosition: null,
        currentInterlude: null,
        pendingTimer: null,
        revealTimer: null
    };

    // -------- DOM refs --------
    const els = {
        introScreen: document.getElementById('screen-intro'),
        questionScreen: document.getElementById('screen-question'),
        interludeScreen: document.getElementById('screen-interlude'),
        finalScreen: document.getElementById('screen-final'),
        startBtn: document.getElementById('start-btn'),
        questionProgress: document.getElementById('question-progress'),
        exitBtn: document.getElementById('exit-btn'),
        questionText: document.getElementById('question-text'),
        optionsContainer: document.getElementById('options'),
        interludeTitle: document.getElementById('interlude-title'),
        interludeBody: document.getElementById('interlude-body'),
        interludeContinue: document.getElementById('interlude-continue'),
        interludeExitBtn: document.getElementById('interlude-exit-btn'),
        playAgainBtn: document.getElementById('play-again-btn'),
        homeBtn: document.getElementById('home-btn'),
        descModal: document.getElementById('description-modal'),
        descText: document.getElementById('description-text'),
        descNextBtn: document.getElementById('description-next-btn'),
        exitModal: document.getElementById('exit-modal'),
        stayBtn: document.getElementById('stay-btn'),
        exitConfirmBtn: document.getElementById('exit-confirm-btn')
    };

    // -------- Helpers --------
    function shuffle(arr) {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    function shuffleOptionsFor(q) {
        const mapped = q.options.map((text, i) => ({
            text: text,
            isCorrect: i === q.correctIndex
        }));
        return shuffle(mapped);
    }

    function findInterludeAfter(questionId) {
        return INTERLUDES.find((it) => it.afterQuestionId === questionId) || null;
    }

    function showScreen(name) {
        state.screen = name;
        els.introScreen.hidden = name !== 'intro';
        els.questionScreen.hidden = name !== 'question';
        els.interludeScreen.hidden = name !== 'interlude';
        els.finalScreen.hidden = name !== 'final';
    }

    function openModal(el) {
        el.hidden = false;
        document.body.classList.add('modal-open');
    }

    function closeModal(el) {
        el.hidden = true;
        if (els.descModal.hidden && els.exitModal.hidden) {
            document.body.classList.remove('modal-open');
        }
    }

    function clearTimers() {
        if (state.pendingTimer) clearTimeout(state.pendingTimer);
        if (state.revealTimer) clearTimeout(state.revealTimer);
        state.pendingTimer = null;
        state.revealTimer = null;
    }

    function setGradient(index) {
        // Remove existing gradient-* classes
        for (let i = 0; i < 8; i++) {
            els.questionScreen.classList.remove('gradient-' + i);
        }
        els.questionScreen.classList.add('gradient-' + (index % 8));
    }

    // -------- Flow: Intro --------
    function startQuiz() {
        clearTimers();
        state.questionIndex = 0;
        showScreen('question');
        loadQuestion();
    }

    // -------- Flow: Question --------
    function loadQuestion() {
        const q = QUESTIONS[state.questionIndex];
        if (!q) {
            goToFinal();
            return;
        }
        state.shuffledOptions = shuffleOptionsFor(q);
        state.selectedPosition = null;
        state.answerState = null;
        state.focusedPosition = null;

        setGradient(state.questionIndex);
        els.questionProgress.textContent =
            (state.questionIndex + 1) + ' / ' + QUESTIONS.length;
        els.questionText.textContent = q.question;
        renderOptions();
        showScreen('question');
        closeModal(els.descModal);
        closeModal(els.exitModal);
    }

    function renderOptions() {
        const q = QUESTIONS[state.questionIndex];
        els.optionsContainer.innerHTML = '';
        els.optionsContainer.classList.toggle(
            'answered',
            state.answerState === 'revealed'
        );

        state.shuffledOptions.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'option';
            btn.dataset.position = i;

            const letter = document.createElement('span');
            letter.className = 'option-letter';
            letter.textContent = LETTERS[i];

            const text = document.createElement('span');
            text.className = 'option-text';
            text.textContent = opt.text;

            btn.appendChild(letter);
            btn.appendChild(text);

            // Apply state classes
            if (state.answerState === 'pending') {
                if (i === state.selectedPosition) btn.classList.add('pending');
                else btn.classList.add('dimmed');
            } else if (state.answerState === 'revealed') {
                if (opt.isCorrect) btn.classList.add('correct');
                else if (i === state.selectedPosition) btn.classList.add('wrong');
                else btn.classList.add('dimmed');
            } else if (state.focusedPosition === i) {
                btn.classList.add('focused');
            }

            btn.addEventListener('click', () => handleOptionClick(i));
            els.optionsContainer.appendChild(btn);
        });
    }

    function handleOptionClick(position) {
        if (state.answerState !== null) return; // already answered
        state.selectedPosition = position;
        state.answerState = 'pending';
        renderOptions();

        state.pendingTimer = setTimeout(() => {
            state.answerState = 'revealed';
            renderOptions();
            state.revealTimer = setTimeout(() => {
                showDescriptionModal();
            }, REVEAL_PAUSE);
        }, PENDING_DELAY);
    }

    // -------- Flow: Description Modal --------
    function showDescriptionModal() {
        const q = QUESTIONS[state.questionIndex];
        els.descText.textContent = q.description;
        const isLast = state.questionIndex === QUESTIONS.length - 1;
        els.descNextBtn.textContent = isLast ? 'Finish 🎆' : 'Next →';
        openModal(els.descModal);
    }

    function advanceAfterDescription() {
        closeModal(els.descModal);
        const q = QUESTIONS[state.questionIndex];
        const interlude = findInterludeAfter(q.id);

        if (interlude) {
            state.currentInterlude = interlude;
            loadInterlude(interlude);
        } else if (state.questionIndex === QUESTIONS.length - 1) {
            goToFinal();
        } else {
            state.questionIndex += 1;
            loadQuestion();
        }
    }

    // -------- Flow: Interlude --------
    function loadInterlude(interlude) {
        els.interludeTitle.textContent = interlude.title;
        els.interludeBody.textContent = interlude.body;
        showScreen('interlude');
    }

    function continueFromInterlude() {
        state.questionIndex += 1;
        state.currentInterlude = null;
        loadQuestion();
    }

    // -------- Flow: Final --------
    function goToFinal() {
        clearTimers();
        showScreen('final');
    }

    // -------- Flow: Exit --------
    function openExitModal() {
        openModal(els.exitModal);
    }

    function closeExitModal() {
        closeModal(els.exitModal);
    }

    function confirmExit() {
        clearTimers();
        closeModal(els.descModal);
        closeModal(els.exitModal);
        state.questionIndex = 0;
        state.selectedPosition = null;
        state.answerState = null;
        state.currentInterlude = null;
        showScreen('intro');
    }

    // -------- Keyboard --------
    document.addEventListener('keydown', (e) => {
        // Exit modal open
        if (!els.exitModal.hidden) {
            if (e.key === 'Escape' || e.key === 'Enter') {
                e.preventDefault();
                closeExitModal();
            }
            return;
        }

        // Description modal open
        if (!els.descModal.hidden) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                advanceAfterDescription();
            }
            return;
        }

        // Question screen, no modal
        if (state.screen === 'question' && state.answerState === null) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const count = state.shuffledOptions.length;
                if (state.focusedPosition === null) {
                    state.focusedPosition = 0;
                } else {
                    const dir = e.key === 'ArrowDown' ? 1 : -1;
                    state.focusedPosition =
                        (state.focusedPosition + dir + count) % count;
                }
                renderOptions();
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (state.focusedPosition !== null) {
                    handleOptionClick(state.focusedPosition);
                } else {
                    state.focusedPosition = 0;
                    renderOptions();
                }
                return;
            }
            // 1-4 or A-D shortcut
            const keyUpper = e.key.toUpperCase();
            let idx = -1;
            if (['1', '2', '3', '4'].includes(e.key)) idx = parseInt(e.key, 10) - 1;
            else if (['A', 'B', 'C', 'D'].includes(keyUpper))
                idx = ['A', 'B', 'C', 'D'].indexOf(keyUpper);
            if (idx >= 0 && idx < state.shuffledOptions.length) {
                e.preventDefault();
                handleOptionClick(idx);
                return;
            }
        }

        // Escape → exit confirmation (from question or interlude)
        if (
            e.key === 'Escape' &&
            (state.screen === 'question' || state.screen === 'interlude')
        ) {
            e.preventDefault();
            openExitModal();
        }

        // Enter on interlude screen → continue
        if (state.screen === 'interlude' && e.key === 'Enter') {
            e.preventDefault();
            continueFromInterlude();
        }
    });

    // -------- Wiring --------
    els.startBtn.addEventListener('click', startQuiz);
    els.exitBtn.addEventListener('click', openExitModal);
    els.interludeExitBtn.addEventListener('click', openExitModal);
    els.stayBtn.addEventListener('click', closeExitModal);
    els.exitConfirmBtn.addEventListener('click', confirmExit);
    els.descNextBtn.addEventListener('click', advanceAfterDescription);
    els.interludeContinue.addEventListener('click', continueFromInterlude);
    els.playAgainBtn.addEventListener('click', startQuiz);
    els.homeBtn.addEventListener('click', () => {
        state.questionIndex = 0;
        state.selectedPosition = null;
        state.answerState = null;
        state.currentInterlude = null;
        showScreen('intro');
    });

    // Close exit modal on overlay click
    els.exitModal.addEventListener('click', (e) => {
        if (e.target === els.exitModal) closeExitModal();
    });

    // -------- Initial --------
    showScreen('intro');
})();