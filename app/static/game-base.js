/**
 * Base class for trivia games with shared functionality
 */
class TriviaGame {
    constructor(gameType, containerSelector) {
        this.gameType = gameType;
        this.container = document.querySelector(containerSelector);
        this.currentQuestion = null;
        this.progressInterval = null;
        this.setupElements();
        this.bindEvents();
    }

    setupElements() {
        this.elements = {
            playBtn: this.container.querySelector('.play-btn'),
            loading: this.container.querySelector('.loading'),
            error: this.container.querySelector('.error-message'),
            game: this.container.querySelector('.game-content'),
            result: this.container.querySelector('.result')
        };
    }

    bindEvents() {
        this.elements.playBtn?.addEventListener('click', () => this.initGame());
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    cleanup() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    showLoading(message = 'Loading...') {
        this.hideAll();
        this.elements.loading.style.display = 'block';
        const loadingText = this.elements.loading.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = message;
    }

    showError(message) {
        this.hideAll();
        this.elements.error.style.display = 'block';
        this.elements.error.textContent = message;
    }

    showGame() {
        this.hideAll();
        this.elements.game.style.display = 'block';
    }

    hideAll() {
        Object.values(this.elements).forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    async fetchData(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            throw error;
        }
    }

    async initGame() {
        try {
            this.cleanup();
            this.showLoading();
            const data = await this.fetchData(`/api/trivia/${this.gameType}`);
            this.currentQuestion = data;
            await this.renderGame(data);
            this.showGame();
        } catch (error) {
            this.showError(error.message || 'Failed to load game');
        }
    }

    // Abstract method - must be implemented by subclasses
    async renderGame(data) {
        throw new Error('renderGame must be implemented by subclass');
    }

    showResult(correct, message) {
        if (this.elements.result) {
            this.elements.result.innerHTML = `
                <div class="result-content ${correct ? 'correct' : 'incorrect'}">
                    <div class="result-icon">${correct ? '✓' : '✗'}</div>
                    <div class="result-message">${message}</div>
                    <button class="play-again-btn">Play Again</button>
                </div>
            `;
            this.elements.result.style.display = 'block';
            
            const playAgainBtn = this.elements.result.querySelector('.play-again-btn');
            playAgainBtn?.addEventListener('click', () => this.initGame());
        }
    }
}