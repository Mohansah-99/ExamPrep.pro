// ===== DOM Elements =====
// Pages
const pages = {
    welcome: document.getElementById('welcomePage'),
    config: document.getElementById('configPage'),
    quiz: document.getElementById('quizPage'),
    results: document.getElementById('resultsPage')
};

// Header
const appHeader = document.getElementById('appHeader');
const themeToggle = document.getElementById('themeToggle');

// Buttons
const startBtn = document.getElementById('startBtn');
const beginTestBtn = document.getElementById('beginTestBtn');
const skipBtn = document.getElementById('skipBtn');
const nextBtn = document.getElementById('nextBtn');
const reviewBtn = document.getElementById('reviewBtn');
const newTestBtn = document.getElementById('newTestBtn');

// Quiz Elements
const questionText = document.getElementById('questionText');
const optionsGrid = document.getElementById('optionsGrid');
const currentQuestionCount = document.getElementById('currentQuestionCount');
const totalQuestions = document.getElementById('totalQuestions');
const currentScore = document.getElementById('currentScore');
const timeRemaining = document.getElementById('timeRemaining');
const timer = document.getElementById('timer');

// Results Elements
const finalScore = document.getElementById('finalScore');
const maxScore = document.getElementById('maxScore');
const meterFill = document.getElementById('meterFill');
const performanceText = document.getElementById('performanceText');
const correctAnswersEl = document.getElementById('correctAnswers');
const incorrectAnswersEl = document.getElementById('incorrectAnswers');
const skippedQuestionsEl = document.getElementById('skippedQuestions');

// Audio
const correctSound = document.getElementById('correctSound');
const wrongSound = document.getElementById('wrongSound');
const completeSound = document.getElementById('completeSound');

// ===== Quiz Variables =====
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;
let skippedQuestions = 0;
let timerInterval;
let timeLeft = 30;
let selectedAnswer = null;
let quizConfig = {};

// ===== Initialize App =====
init();

function init() {
    loadTheme();
    setupEventListeners();
    
    // Hide header on welcome page
    appHeader.style.display = 'none';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function setupEventListeners() {
    // Navigation
    startBtn.addEventListener('click', () => navigateTo('config'));
    beginTestBtn.addEventListener('click', startQuiz);
    newTestBtn.addEventListener('click', () => navigateTo('config'));

    // Quiz Controls
    skipBtn.addEventListener('click', skipQuestion);
    nextBtn.addEventListener('click', showNextQuestion);
    reviewBtn.addEventListener('click', reviewAnswers);

    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Auto-submit when option is clicked
    optionsGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('option-btn')) {
            selectAnswer(e.target);
            submitAnswer();
        }
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// ===== Navigation Functions =====
function navigateTo(pageName) {
    // Hide all pages
    Object.values(pages).forEach(page => {
        page.classList.remove('active');
    });

    // Show requested page
    pages[pageName].classList.add('active');

    // Toggle header visibility
    appHeader.style.display = pageName === 'welcome' ? 'none' : 'flex';

    // Special actions for certain pages
    if (pageName === 'quiz') {
        loadQuestion();
    } else if (pageName === 'results') {
        showResults();
    }
}

// ===== Quiz Functions =====
async function startQuiz() {
    // Get configuration from form
    quizConfig = {
        examType: document.getElementById('examType').value,
        category: document.getElementById('category').value,
        difficulty: document.getElementById('difficulty').value,
        questionCount: parseInt(document.getElementById('questionCount').value),
        timePerQuestion: parseInt(document.getElementById('timePerQuestion').value)
    };

    // Reset quiz variables
    currentQuestionIndex = 0;
    score = 0;
    correctAnswers = 0;
    incorrectAnswers = 0;
    skippedQuestions = 0;

    // Update UI
    totalQuestions.textContent = quizConfig.questionCount;
    currentScore.textContent = '0';

    try {
        beginTestBtn.disabled = true;
        beginTestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Questions...';

        // Load questions from API
        await loadQuestions();

        navigateTo('quiz');
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions. Please try again.');
    } finally {
        beginTestBtn.disabled = false;
        beginTestBtn.innerHTML = '<i class="fas fa-hourglass-start"></i> Start Test';
    }
}

async function loadQuestions() {
    // In a real app, you would fetch questions based on the exam type
    const apiUrl = `https://opentdb.com/api.php?amount=${quizConfig.questionCount}&category=${quizConfig.category}&difficulty=${quizConfig.difficulty}&type=multiple`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.response_code === 0) {
        questions = data.results;
    } else {
        throw new Error('Failed to load questions');
    }
}

function loadQuestion() {
    resetQuestionState();
    const currentQuestion = questions[currentQuestionIndex];

    // Update UI
    currentQuestionCount.textContent = currentQuestionIndex + 1;
    questionText.textContent = decodeHtmlEntities(currentQuestion.question);

    // Combine and shuffle answers
    const allAnswers = [
        ...currentQuestion.incorrect_answers,
        currentQuestion.correct_answer
    ];
    const shuffledAnswers = shuffleArray(allAnswers);

    // Create answer buttons
    optionsGrid.innerHTML = '';
    shuffledAnswers.forEach(answer => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = decodeHtmlEntities(answer);
        optionsGrid.appendChild(button);
    });

    // Start timer
    startTimer();
}

function startTimer() {
    timeLeft = quizConfig.timePerQuestion;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitAnswer();
        }
    }, 1000);
}

function updateTimerDisplay() {
    timeRemaining.textContent = timeLeft;

    // Change timer color based on remaining time
    if (timeLeft <= 5) {
        timer.classList.remove('warning');
        timer.classList.add('critical');
    } else if (timeLeft <= quizConfig.timePerQuestion / 3) {
        timer.classList.add('warning');
        timer.classList.remove('critical');
    } else {
        timer.classList.remove('warning');
        timer.classList.remove('critical');
    }
}

function selectAnswer(selectedButton) {
    // Deselect previous answer
    optionsGrid.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Select new answer
    selectedButton.classList.add('selected');
    selectedAnswer = selectedButton.textContent;
}

function submitAnswer() {
    clearInterval(timerInterval);

    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = decodeHtmlEntities(currentQuestion.correct_answer);

    // If no answer selected (time ran out)
    if (!selectedAnswer) {
        skippedQuestions++;
        showNextQuestion();
        return;
    }

    // Check if answer is correct
    const isCorrect = selectedAnswer === correctAnswer;

    // Update score and stats
    if (isCorrect) {
        score += 10;
        correctAnswers++;
        currentScore.textContent = score;
        correctSound.play();
    } else {
        incorrectAnswers++;
        wrongSound.play();
    }

    // Disable all options
    optionsGrid.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;

        // Highlight correct/incorrect answers
        if (btn.textContent === correctAnswer) {
            btn.classList.add('correct');
        } else if (btn.classList.contains('selected') && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });

    // Show next button
    nextBtn.style.display = 'inline-flex';
}

function skipQuestion() {
    clearInterval(timerInterval);
    skippedQuestions++;
    showNextQuestion();
}

function showNextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
        loadQuestion();
        nextBtn.style.display = 'none';
    } else {
        navigateTo('results');
    }
}

function resetQuestionState() {
    selectedAnswer = null;
    clearInterval(timerInterval);
    nextBtn.style.display = 'none';
    timeLeft = quizConfig.timePerQuestion;
    updateTimerDisplay();
}

// ===== Results Functions =====
function showResults() {
    completeSound.play();

    // Calculate final score
    const maxPossibleScore = questions.length * 10;
    const percentage = (score / maxPossibleScore) * 100;

    // Update UI
    finalScore.textContent = score;
    maxScore.textContent = maxPossibleScore;
    correctAnswersEl.textContent = correctAnswers;
    incorrectAnswersEl.textContent = incorrectAnswers;
    skippedQuestionsEl.textContent = skippedQuestions;

    // Animate performance meter
    setTimeout(() => {
        meterFill.style.width = `${percentage}%`;
    }, 100);

    // Set performance text
    if (percentage >= 90) {
        performanceText.textContent = "Outstanding! You're exam ready! 🎉";
    } else if (percentage >= 70) {
        performanceText.textContent = "Excellent performance! Keep it up! 👍";
    } else if (percentage >= 50) {
        performanceText.textContent = "Good attempt! Review your weak areas 📚";
    } else {
        performanceText.textContent = "Keep practicing! You'll improve! 💪";
    }
}

function reviewAnswers() {
    // In a full implementation, this would show all questions with correct answers
    alert("Review mode would show all questions with your answers and explanations.");
}

// ===== Utility Functions =====
function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
