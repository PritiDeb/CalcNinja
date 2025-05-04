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
    highScores: {
        square: JSON.parse(localStorage.getItem("squareHighScores")) || [],
        cube: JSON.parse(localStorage.getItem("cubeHighScores")) || [],
    },
};

// Wait until DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll('input[name="tabs"]');
    const contents = document.querySelectorAll(".tab-content");

    function updateTab() {
        contents.forEach((content) => content.classList.remove("active"));
        if (tabs[0].checked) {
            document.getElementById("destination-content").classList.add("active");
        } else {
            document.getElementById("route-content").classList.add("active");
        }
    }

    tabs.forEach((tab) => tab.addEventListener("change", updateTab));
    updateTab();

    setupEventListeners();
    loadHighScores();
});

function setupEventListeners() {
    document.getElementById("tab1").addEventListener("change", () => switchTab("destination-content"));
    document.getElementById("tab2").addEventListener("change", () => switchTab("route-content"));

    document.getElementById("square-start").addEventListener("click", () => startGame("square"));
    document.getElementById("cube-start").addEventListener("click", () => startGame("cube"));

    setupKeypad("square");
    setupKeypad("cube");
}

function setupKeypad(gameType) {
    const container = document.querySelector(`#${gameType}-question`).closest(".game-screen");
    const input = document.getElementById(`${gameType}-answer`);
    const keypad = container.querySelector(".keypad");

    keypad.querySelectorAll(".key:not(.clear):not(.back)").forEach((btn) => {
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
    document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
}

function startGame(gameType) {
    gameState.activeGame = gameType;
    gameState.score = 0;

    const mode = document.getElementById(`${gameType}-mode`).value;
    const level = document.getElementById(`${gameType}-level`).value;
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
    generateQuestion(gameType, mode, level);
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
    let maxNumber = { easy: 30, medium: 50, hard: 100 }[level];
    if (gameType === "cube") {
        maxNumber = { easy: 20, medium: 30, hard: 50 }[level];
    }
    const num = Math.floor(Math.random() * maxNumber) + 1;

    const questionObj = mode === "direct"
        ? { question: `${num}${gameType === "square" ? "²" : "³"}`, answer: gameType === "square" ? num ** 2 : num ** 3 }
        : { question: `${gameType === "square" ? "√" : "∛"}${gameType === "square" ? num ** 2 : num ** 3}`, answer: num };

    gameState.currentQuestion = questionObj;
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

    gameState.score += 10;
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
    alert(`Game Over! Your score: ${gameState.score}`);

    const entry = {
        score: gameState.score,
        mode: document.getElementById(`${gameType}-mode`).value,
        level: document.getElementById(`${gameType}-level`).value,
        time: document.getElementById(`${gameType}-time`).value,
        date: new Date().toLocaleDateString(),
    };

    gameState.highScores[gameType].push(entry);
    gameState.highScores[gameType].sort((a, b) => b.score - a.score);
    gameState.highScores[gameType] = gameState.highScores[gameType].slice(0, 5);
    localStorage.setItem(`${gameType}HighScores`, JSON.stringify(gameState.highScores[gameType]));

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

