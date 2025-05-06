// Audio elements for sound effects
const keySound = document.getElementById("keySound");
const tingSound = document.getElementById("tingSound");

// Game state object
const gameState = {
    activeGame: null,
    timer: null,
    timeLeft: 0,
    score: 0,
    currentQuestion: null,
    lastNumber: null,
    startTime: null,
    attempts: [],
    highScores: {
        square: JSON.parse(localStorage.getItem("squareHighScores")) || [],
        cube: JSON.parse(localStorage.getItem("cubeHighScores")) || [],
    },
};

// DOM Ready
document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll('input[name="tabs"]');
    const contents = document.querySelectorAll(".tab-content");

    function updateTab() {
        exitGame();
        contents.forEach(content => content.classList.remove("active"));
        if (tabs[0].checked) {
            document.getElementById("destination-content").classList.add("active");
        } else {
            document.getElementById("route-content").classList.add("active");
        }
    }

    tabs.forEach(tab => tab.addEventListener("change", updateTab));
    updateTab();

    setupEventListeners();
    loadHighScores();
});

function exitGame() {
    if (gameState.activeGame) {
        clearInterval(gameState.timer);
        const gameType = gameState.activeGame;

        const container = document.getElementById(`${gameType}-question`).closest(".tab-content");
        container.querySelector(".game-settings").style.display = "block";
        container.querySelector(".game-screen").style.display = "none";
        container.querySelector(".high-scores").style.visibility = "visible";
        document.getElementById(`${gameType}-scores`).style.display = "block";

        gameState.activeGame = null;
    }
}

function setupEventListeners() {
    document.getElementById("tab1").addEventListener("change", () => switchTab("destination-content"));
    document.getElementById("tab2").addEventListener("change", () => switchTab("route-content"));

    document.getElementById("square-start").addEventListener("click", () => startGame("square"));
    document.getElementById("cube-start").addEventListener("click", () => startGame("cube"));

    setupKeypad("square");
    setupKeypad("cube");

    ["square", "cube"].forEach(gameType => {
        const levelSelect = document.getElementById(`${gameType}-level`);
        levelSelect.addEventListener("change", () => {
            if (levelSelect.value === "custom") {
                openCustomModal(gameType);
            }
        });
    });

    document.getElementById("close-modal").addEventListener("click", closeModal);
    window.addEventListener("click", (e) => {
        if (e.target.id === "score-modal") closeModal();
        if (e.target.id === "custom-level-modal") closeCustomModal();
    });
}

function setupKeypad(gameType) {
    const container = document.querySelector(`#${gameType}-question`).closest(".game-screen");
    const input = document.getElementById(`${gameType}-answer`);
    const keypad = container.querySelector(".keypad");

    keypad.querySelectorAll(".key:not(.clear):not(.back)").forEach(btn => {
        btn.addEventListener("click", () => {
            input.value += btn.textContent;
            playKeySound();
            checkAnswer(gameType);
        });
    });

    keypad.querySelector(".clear").addEventListener("click", () => {
        input.value = "";
        playKeySound();
    });

    keypad.querySelector(".back").addEventListener("click", () => {
        input.value = input.value.slice(0, -1);
        playKeySound();
    });
}

function playKeySound() {
    if (keySound) {
        keySound.currentTime = 0;
        keySound.play().catch(e => console.log("Audio play failed:", e));
    }
}

function playTingSound() {
    if (tingSound) {
        tingSound.currentTime = 0;
        tingSound.play().catch(e => console.log("Audio play failed:", e));
    }
}

function switchTab(tabId) {
    exitGame();
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
}

function startGame(gameType) {
    const level = document.getElementById(`${gameType}-level`).value;
    if (level === "custom") {
        const customRange = JSON.parse(sessionStorage.getItem(`${gameType}-customRange`));
        if (!customRange) {
            openCustomModal(gameType);
            return;
        }
    }

    gameState.activeGame = gameType;
    gameState.score = 0;
    gameState.attempts = [];
    gameState.lastNumber = null;

    const time = parseInt(document.getElementById(`${gameType}-time`).value);
    gameState.timeLeft = time * 60;
    document.getElementById(`${gameType}-score`).textContent = gameState.score;

    const container = document.getElementById(`${gameType}-question`).closest(".tab-content");
    container.querySelector(".game-settings").style.display = "none";
    container.querySelector(".game-screen").style.display = "block";
    container.querySelector(".high-scores").style.visibility = "hidden";
    document.getElementById(`${gameType}-scores`).style.display = "none";

    updateTimerDisplay(gameType);
    startTimer(gameType);
    generateQuestion(gameType, document.getElementById(`${gameType}-mode`).value, level);
}

function startTimer(gameType) {
    clearInterval(gameState.timer);
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay(gameType);
        if (gameState.timeLeft <= 0) {
            endGame(gameType);
        }
    }, 1000);
}

function updateTimerDisplay(gameType) {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    document.getElementById(`${gameType}-timer`).textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function generateQuestion(gameType, mode, level) {
    let min = 1, max = 10;
    if (level === "custom") {
        const stored = JSON.parse(sessionStorage.getItem(`${gameType}-customRange`));
        if (stored) {
            min = stored.min;
            max = stored.max;
        }
    } else {
        const defaults = {
            square: { easy: 30, medium: 50, hard: 100 },
            cube: { easy: 20, medium: 30, hard: 50 }
        };
        max = defaults[gameType][level];
    }

    let num;
    do {
        num = Math.floor(Math.random() * (max - min + 1)) + min;
    } while (num === gameState.lastNumber);
    gameState.lastNumber = num;

    const questionObj = mode === "direct"
        ? { question: `${num}${gameType === "square" ? "²" : "³"}`, answer: gameType === "square" ? num ** 2 : num ** 3, base: num }
        : { question: `${gameType === "square" ? "√" : "∛"}${gameType === "square" ? num ** 2 : num ** 3}`, answer: num, base: num };

    gameState.currentQuestion = questionObj;
    gameState.startTime = Date.now();

    document.getElementById(`${gameType}-question`).textContent = questionObj.question;
    const input = document.getElementById(`${gameType}-answer`);
    input.value = "";
    input.focus();
}

function checkAnswer(gameType) {
    const input = document.getElementById(`${gameType}-answer`);
    const val = parseInt(input.value);
    if (isNaN(val)) return;
    if (val !== gameState.currentQuestion.answer) return;

    const timeTaken = (Date.now() - gameState.startTime) / 1000;
    gameState.attempts.push({
        question: gameState.currentQuestion.question,
        answer: gameState.currentQuestion.answer,
        timeTaken: timeTaken.toFixed(2)
    });

    gameState.score++;
    document.getElementById(`${gameType}-score`).textContent = gameState.score;

    const questionDiv = document.getElementById(`${gameType}-question`);
    questionDiv.classList.add("correct");
    playTingSound();

    setTimeout(() => {
        questionDiv.classList.remove("correct");
        const mode = document.getElementById(`${gameType}-mode`).value;
        const level = document.getElementById(`${gameType}-level`).value;
        generateQuestion(gameType, mode, level);
    }, 500);
}

function endGame(gameType) {
    clearInterval(gameState.timer);

    // Group attempts by unique question
    const grouped = {};
    gameState.attempts.forEach(a => {
        const key = a.question;
        if (!grouped[key]) {
            grouped[key] = a;
        } else {
            grouped[key].timeTaken = Math.max(grouped[key].timeTaken, a.timeTaken);
        }
    });

    // Convert to array and sort descending by time
    const uniqueAttempts = Object.values(grouped).sort((a, b) => b.timeTaken - a.timeTaken);

    // Generate HTML with divs and classes
    const listHTML = uniqueAttempts.map(a => `
        <li>
            <div class="attempt-entry">
                <span class="attempt-question">${a.question}</span>
                <span class="attempt-answer">${a.answer}</span>
                <span class="attempt-time">${a.timeTaken}s</span>
            </div>
        </li>
    `).join("");

    document.getElementById("final-score-text").innerHTML = `
        <h3>Your score: ${gameState.score}</h3>
        <ul class="attempts">${listHTML}</ul>
    `;
    document.getElementById("score-modal").style.display = "block";

    const level = document.getElementById(`${gameType}-level`).value;
    if (level !== "custom") {
        const entry = {
            score: gameState.score,
            mode: document.getElementById(`${gameType}-mode`).value,
            level: level,
            time: document.getElementById(`${gameType}-time`).value,
            date: new Date().toLocaleDateString()
        };

        gameState.highScores[gameType].push(entry);
        gameState.highScores[gameType].sort((a, b) => b.score - a.score);
        gameState.highScores[gameType] = gameState.highScores[gameType].slice(0, 5);
        localStorage.setItem(`${gameType}HighScores`, JSON.stringify(gameState.highScores[gameType]));
    }

    loadHighScores();

    const container = document.getElementById(`${gameType}-question`).closest(".tab-content");
    container.querySelector(".game-settings").style.display = "block";
    container.querySelector(".game-screen").style.display = "none";
    container.querySelector(".high-scores").style.visibility = "visible";
    document.getElementById(`${gameType}-scores`).style.display = "block";
}


function loadHighScores() {
    const formatDate = (inputDate) => {
        const [day, month, year] = inputDate.split("/").map(Number);
        const date = new Date(year, month - 1, day);
        const options = { month: "short", day: "2-digit" };
        const formattedMonthDay = date.toLocaleDateString("en-US", options);
        return `${formattedMonthDay}, '${String(year).slice(-2)}`;
    };

    ["square", "cube"].forEach((gameType) => {
        const container = document.getElementById(`${gameType}-scores`);
        const scores = gameState.highScores[gameType];
        if (!scores.length) {
            container.innerHTML = "<p>No scores yet</p>";
            return;
        }
        container.innerHTML = `
            <ol class="score-list">
                ${scores.map(s => `
                    <li>
                        ${s.score}
                        <span class="${s.mode.toLowerCase()}">${capitalize(s.mode)}</span>
                        <span class="${s.level.toLowerCase()}">${capitalize(s.level)}</span>
                        <span class="time-${s.time}">${s.time} min</span>
                        <span class="date">${formatDate(s.date)}</span>
                    </li>`).join("")}
            </ol>
        `;
    });

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// MODAL HANDLERS
function openCustomModal(gameType) {
    const modal = document.getElementById("custom-level-modal");
    modal.style.display = "block";
    modal.dataset.gameType = gameType;
}

function closeModal() {
    document.getElementById("score-modal").style.display = "none";
}

function closeCustomModal() {
    document.getElementById("custom-level-modal").style.display = "none";
}

function saveCustomRange() {
    const modal = document.getElementById("custom-level-modal");
    const gameType = modal.dataset.gameType;
    const min = parseInt(document.getElementById("custom-min").value);
    const max = parseInt(document.getElementById("custom-max").value);

    if (isNaN(min) || isNaN(max) || min >= max || max - min < 5) {
        alert("Please enter a valid range with a minimum gap of 5 where min < max");
        return;
    }

    sessionStorage.setItem(`${gameType}-customRange`, JSON.stringify({ min, max }));
    closeCustomModal();
    startGame(gameType);
}




//============================================

document.addEventListener("keydown", (e) => {
    const activeType = gameState.activeGame;
    if (!activeType) return;

    const input = document.getElementById(`${activeType}-answer`);
    const key = e.key;

    if (key >= '0' && key <= '9') {
        input.value += key;
        playKeySound();
        checkAnswer(activeType);
    } else if (key === "Backspace") {
        input.value = input.value.slice(0, -1);
        playKeySound();
    } else if (key === "Escape") {
        input.value = "";
        playKeySound();
    }
});



function playKeySound() {
    const sound = document.getElementById("keySound");
    if (sound) {
        sound.currentTime = 0;
        sound.play();
    }
}
