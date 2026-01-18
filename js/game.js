// Configuración del juego
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajustar tamaño del canvas
function resizeCanvas() {
    const container = document.querySelector('.game-board');
    const size = Math.min(container.offsetWidth, container.offsetHeight);
    canvas.width = size;
    canvas.height = size;
    tileCount = Math.floor(canvas.width / gridSize);
}

window.addEventListener('resize', resizeCanvas);

// Variables del juego
const gridSize = 20;
let tileCount = 20; // Valor inicial, se ajusta en resizeCanvas

let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let foods = [];
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameSpeed = 150;
let gameRunning = false;
let gamePaused = false;
let gameOverState = false;
let lastRenderTime = 0;
let startTime = 0;
let elapsedTime = 0;
let timerInterval;
let combo = 0;
let comboTimeout;
let immortal = false;
let immortalEndTime = 0;
let rainbowEffect = false;
let rainbowEndTime = 0;
let currentColorIndex = 0;
let colorCycleInterval;

// Poderes activos
let activePower = null;
let powerEndTime = 0;

// Tipos de bayas
const berryTypes = {
    normal: {
        color: '#ff4757',
        points: 1,
        grow: 1,
        chance: 0.5
    },
    golden: {
        color: '#ffa502',
        points: 2,
        grow: 2,
        chance: 0.3
    },
    speed: {
        color: '#00d2d3',
        points: 3,
        grow: 1,
        speed: 0.8,
        chance: 0.3
    },
    special: {
        color: '#ff6b81',
        points: 5,
        grow: 1,
        power: true,
        chance: 0.2
    },
    rainbow: {
        color: '#9b59b6',
        points: 4,
        grow: 1,
        rainbow: true,
        chance: 0.2
    }
};

// Poderes especiales
const powers = {
    shield: {
        name: 'Escudo',
        color: '#00ffff',
        duration: 8000,
        effect: 'Eres invencible por 8 segundos'
    },
    double: {
        name: 'Doble Puntos',
        color: '#ffff00',
        duration: 10000,
        effect: 'Puntos dobles por 10 segundos'
    },
    slow: {
        name: 'Ralentizar',
        color: '#00ff00',
        duration: 6000,
        effect: 'Velocidad reducida por 6 segundos'
    },
};

// Colores para efecto arcoíris
const rainbowColors = [
    '#ff0000', '#ff9900', '#ffff00', '#00ff00',
    '#00ffff', '#0000ff', '#9900ff', '#ff00ff'
];

// Inicializar juego
function initGame() {
    resizeCanvas(); // Asegurar que el canvas tenga el tamaño correcto

    highScore = localStorage.getItem('snakeHighScore') || 0;
    document.getElementById('highScore').textContent = highScore;
    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = `x${combo}`;

    generateFoods();
    setupEventListeners();
    requestAnimationFrame(gameLoop);

    showGameStatus('¡SNAKE EXTREME!', 'Usa las flechas o WASD para moverte<br>Presiona ENTER o START para comenzar', 'game-start');

    // Enfocar el documento para capturar eventos de teclado
    document.body.focus();
}

function setupEventListeners() {
    // Botones del juego - FIJAR EL EVENTO CLICK
    document.getElementById('startBtn').addEventListener('click', function (e) {
        console.log('START button clicked');
        e.stopPropagation();
        if (gameOverState) {
            resetGame();
            setTimeout(startGame, 100);
        } else {
            startGame();
        }
    });

    document.getElementById('pauseBtn').addEventListener('click', function (e) {
        console.log('PAUSE button clicked');
        e.stopPropagation();
        if (gameOverState) {
            resetGame();
            setTimeout(startGame, 100);
        } else {
            togglePause();
        }
    });

    document.getElementById('resetBtn').addEventListener('click', function (e) {
        console.log('RESET button clicked');
        e.stopPropagation();
        resetGame();
    });

    // Slider de velocidad
    document.getElementById('speedSlider').addEventListener('input', handleSpeedChange);

    // Controles de teclado para escritorio
    document.addEventListener('keydown', handleKeyDown);

    // Asegurar que se pueda hacer clic en cualquier parte para enfocar
    document.addEventListener('click', function () {
        document.body.focus();
    });

    // Enfocar automáticamente al cargar
    window.addEventListener('load', function () {
        document.body.focus();
    });
}

function handleKeyDown(e) {
    console.log('Key pressed:', e.key);

    // Si estamos en Game Over, ENTER o ESPACIO reinician el juego
    if (gameOverState) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            resetGame();
            setTimeout(startGame, 100);
        }
        return;
    }

    // Si no está corriendo, ENTER o ESPACIO inician el juego
    if (!gameRunning && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
        return;
    }

    // Si el juego está pausado, ESPACIO o P reanudan
    if (gamePaused && (e.key === ' ' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        togglePause();
        return;
    }

    // Si no está corriendo o está pausado, ignorar controles de movimiento
    if (!gameRunning || gamePaused) return;

    // Prevenir comportamiento por defecto para las teclas de juego
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' ', 'p', 'r'].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            if (direction.y === 0) direction = { x: 0, y: -1 };
            break;
        case 'arrowdown':
        case 's':
            if (direction.y === 0) direction = { x: 0, y: 1 };
            break;
        case 'arrowleft':
        case 'a':
            if (direction.x === 0) direction = { x: -1, y: 0 };
            break;
        case 'arrowright':
        case 'd':
            if (direction.x === 0) direction = { x: 1, y: 0 };
            break;
        case ' ':
        case 'p':
            togglePause();
            break;
        case 'r':
            resetGame();
            break;
    }
}

function handleSpeedChange(e) {
    const value = parseInt(e.target.value);
    gameSpeed = 300 - value;

    let speedText;
    if (value < 100) speedText = 'Lenta';
    else if (value < 200) speedText = 'Media';
    else speedText = 'Rápida';

    document.getElementById('speedValue').textContent = `Velocidad: ${speedText}`;
}

function generateFoods() {
    foods = [];

    // Determinar cuántas bayas generar
    let berryCount = 1;
    if (score >= 50) {
        berryCount = 2 + Math.floor(Math.random() * 3);
    }

    for (let i = 0; i < berryCount; i++) {
        generateSingleFood();
    }
}

function generateSingleFood() {
    // Calcular tipo de baya basado en probabilidades
    const rand = Math.random();
    let cumulative = 0;
    let berryType = 'normal';

    for (const [type, props] of Object.entries(berryTypes)) {
        cumulative += props.chance;
        if (rand <= cumulative) {
            berryType = type;
            break;
        }
    }

    // Posición aleatoria que no esté en la serpiente ni en otras bayas
    let validPosition = false;
    let food;

    while (!validPosition) {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount),
            type: berryType
        };

        validPosition = true;

        // Verificar colisión con serpiente
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                validPosition = false;
                break;
            }
        }

        // Verificar colisión con otras bayas
        if (validPosition) {
            for (let otherFood of foods) {
                if (otherFood.x === food.x && otherFood.y === food.y) {
                    validPosition = false;
                    break;
                }
            }
        }
    }

    foods.push(food);
}

function startGame() {
    console.log('startGame called');
    if (gameRunning) return;


    gameRunning = true;
    gameOverState = false;
    gamePaused = false;
    hideGameStatus();

    // Iniciar movimiento automático a la derecha
    direction = { x: 1, y: 0 };

    // Activar inmunidad por 3 segundos al inicio
    activateImmortality(3000);

    // Iniciar temporizador
    startTime = Date.now();
    startTimer();

    // Restaurar texto del botón de pausa
    document.getElementById('pauseBtn').innerHTML = '<i class="fas fa-pause"></i> PAUSA';

    // Enfocar para capturar teclas
    document.body.focus();
}

function togglePause() {
    console.log('togglePause called, gameRunning:', gameRunning, 'gameOverState:', gameOverState);
    if (!gameRunning || gameOverState) return;

    gamePaused = !gamePaused;

    if (gamePaused) {
        showGameStatus('JUEGO PAUSADO', 'Presiona ESPACIO, P o PAUSA para continuar', 'game-paused');
        document.getElementById('enterHint').style.display = 'none';
        stopTimer();
    } else {
        hideGameStatus();
        startTimer();
    }
}

function resetGame() {
    console.log('resetGame called, gameOverState:', gameOverState);

    if (gameOverState) {
        console.log('Game Over detectado, recargando página...');
        location.reload();
        return;
    }

    snake = [{ x: 10, y: 10 }];
    direction = { x: 0, y: 0 };
    score = 0;
    combo = 0;
    gameRunning = false;
    gameOverState = false;
    gamePaused = false;
    immortal = false;
    rainbowEffect = false;
    activePower = null;

    if (colorCycleInterval) clearInterval(colorCycleInterval);

    stopTimer();
    elapsedTime = 0;
    document.getElementById('gameTime').textContent = '00:00';

    generateFoods();

    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = `x${combo}`;
    document.getElementById('powerActiveIndicator').style.opacity = '0';
    document.getElementById('immortalIndicator').style.opacity = '0';

    // Restaurar texto del botón de pausa
    document.getElementById('pauseBtn').innerHTML = '<i class="fas fa-pause"></i> PAUSA';

    showGameStatus('¡SNAKE EXTREME!', 'Usa las flechas o WASD para moverte<br>Presiona ENTER o START para comenzar', 'game-start');
    document.getElementById('enterHint').style.display = 'block';

    // Enfocar para capturar teclas
    document.body.focus();
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer() {
    if (gameRunning && !gamePaused && !gameOverState) {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        document.getElementById('gameTime').textContent = `${minutes}:${seconds}`;
    }
}

function activateImmortality(duration) {
    immortal = true;
    immortalEndTime = Date.now() + duration;

    const indicator = document.getElementById('immortalIndicator');
    indicator.style.opacity = '1';
    indicator.classList.add('pulse');

    setTimeout(() => {
        immortal = false;
        indicator.style.opacity = '0';
        indicator.classList.remove('pulse');
    }, duration);
}

function activateRainbowEffect(duration) {
    if (rainbowEffect) return;

    rainbowEffect = true;
    rainbowEndTime = Date.now() + duration;
    currentColorIndex = 0;

    colorCycleInterval = setInterval(() => {
        currentColorIndex = (currentColorIndex + 1) % rainbowColors.length;
    }, 200);

    showPowerActive('Arcoíris', '#9b59b6', duration);

    setTimeout(() => {
        rainbowEffect = false;
        if (colorCycleInterval) {
            clearInterval(colorCycleInterval);
            colorCycleInterval = null;
        }
        document.getElementById('powerActiveIndicator').style.opacity = '0';
    }, duration);
}

function activatePower(powerName) {
    if (activePower) return;

    const power = powers[powerName];
    if (!power) return;

    activePower = powerName;
    powerEndTime = Date.now() + power.duration;

    showPowerActive(power.name, power.color, power.duration);

    switch (powerName) {
        case 'shield':
            activateImmortality(power.duration);
            break;
        case 'double':
            break;
        case 'slow':
            const originalSpeed = gameSpeed;
            gameSpeed = Math.min(250, gameSpeed * 1.5);
            setTimeout(() => {
                if (activePower === 'slow') {
                    gameSpeed = originalSpeed;
                }
            }, power.duration);
            break;
        case 'magnet':
            break;
    }

    setTimeout(() => {
        if (activePower === powerName) {
            activePower = null;
            document.getElementById('powerActiveIndicator').style.opacity = '0';
        }
    }, power.duration);
}

function showPowerActive(name, color, duration) {
    const indicator = document.getElementById('powerActiveIndicator');
    const textElement = document.getElementById('powerActiveText');

    textElement.textContent = name;
    indicator.style.borderColor = color;
    indicator.style.color = color;
    indicator.style.opacity = '1';
}

function update() {
    if (!gameRunning || gamePaused || gameOverState) return;

    if (immortal && Date.now() > immortalEndTime) {
        immortal = false;
        document.getElementById('immortalIndicator').style.opacity = '0';
    }

    if (rainbowEffect && Date.now() > rainbowEndTime) {
        rainbowEffect = false;
        if (colorCycleInterval) {
            clearInterval(colorCycleInterval);
            colorCycleInterval = null;
        }
    }

    if (activePower && Date.now() > powerEndTime) {
        activePower = null;
        document.getElementById('powerActiveIndicator').style.opacity = '0';
    }

    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;

    if (head.x < 0) head.x = tileCount - 1;
    if (head.x >= tileCount) head.x = 0;
    if (head.y < 0) head.y = tileCount - 1;
    if (head.y >= tileCount) head.y = 0;

    if (!immortal && activePower !== 'shield') {
        for (let segment of snake) {
            if (head.x === segment.x && head.y === segment.y) {
                gameOver();
                return;
            }
        }
    }

    snake.unshift(head);

    let ateBerry = false;
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        if (head.x === food.x && head.y === food.y) {
            const berryType = berryTypes[food.type];

            let points = berryType.points;
            if (activePower === 'double') points *= 2;


            score += points;

            combo++;
            clearTimeout(comboTimeout);
            comboTimeout = setTimeout(() => {
                combo = Math.max(1, combo - 1);
                document.getElementById('combo').textContent = `x${combo}`;
            }, 3000);

            // Crecimiento basado en los puntos reales
            let growAmount = Math.max(points - 1, 0);


            for (let j = 0; j < growAmount; j++) {
                snake.push({ ...snake[snake.length - 1] });
            }

            if (berryType.speed) {
                gameSpeed = Math.max(50, gameSpeed * berryType.speed);
            }

            if (berryType.power) {
                const powerKeys = Object.keys(powers);
                const randomPower = powerKeys[Math.floor(Math.random() * powerKeys.length)];
                activatePower(randomPower);
            }

            if (berryType.rainbow) {
                activateRainbowEffect(10000);
            }

            foods.splice(i, 1);
            generateSingleFood();

            ateBerry = true;
            break;
        }
    }

    if (!ateBerry) {
        snake.pop();

        clearTimeout(comboTimeout);
        comboTimeout = setTimeout(() => {
            combo = Math.max(1, combo - 1);
            document.getElementById('combo').textContent = `x${combo}`;
        }, 3000);
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
    }

    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = `x${combo}`;

    if (score >= 50 && foods.length < 2) {
        generateFoods();
    }
}

function draw() {
    ctx.fillStyle = '#0f1525';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawSnake();
    drawFoods();

    if (immortal) {
        drawImmortalEffect();
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;

        let color;
        if (rainbowEffect) {
            color = rainbowColors[currentColorIndex];
        } else if (index === 0) {
            color = activePower === 'shield' ? '#00ffff' :
                activePower === 'double' ? '#ffff00' :
                    activePower === 'slow' ? '#00ff00' :
                        activePower === 'magnet' ? '#ff00ff' : '#00ffaa';
        } else {
            const intensity = 255 - (index / snake.length) * 200;
            color = `rgb(0, ${intensity}, 150)`;
        }

        if (index === 0) {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 1, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            const eyeSize = gridSize / 6;

            let leftEyeX, leftEyeY, rightEyeX, rightEyeY;

            if (direction.x === 1) {
                leftEyeX = x + gridSize - eyeSize * 3;
                leftEyeY = y + eyeSize * 2;
                rightEyeX = x + gridSize - eyeSize * 3;
                rightEyeY = y + gridSize - eyeSize * 2;
            } else if (direction.x === -1) {
                leftEyeX = x + eyeSize * 3;
                leftEyeY = y + eyeSize * 2;
                rightEyeX = x + eyeSize * 3;
                rightEyeY = y + gridSize - eyeSize * 2;
            } else if (direction.y === -1) {
                leftEyeX = x + eyeSize * 2;
                leftEyeY = y + eyeSize * 3;
                rightEyeX = x + gridSize - eyeSize * 2;
                rightEyeY = y + eyeSize * 3;
            } else {
                leftEyeX = x + eyeSize * 2;
                leftEyeY = y + gridSize - eyeSize * 3;
                rightEyeX = x + gridSize - eyeSize * 2;
                rightEyeY = y + gridSize - eyeSize * 3;
            }

            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 5;

            const radius = gridSize / 4;
            ctx.beginPath();
            ctx.roundRect(x, y, gridSize, gridSize, radius);
            ctx.fill();
        }
    });

    ctx.shadowBlur = 0;
}

function drawFoods() {
    foods.forEach(food => {
        const berryType = berryTypes[food.type];
        const x = food.x * gridSize;
        const y = food.y * gridSize;
        const centerX = x + gridSize / 2;
        const centerY = y + gridSize / 2;

        const pulse = Math.sin(Date.now() / 200) * 3;
        const size = gridSize - 4;

        ctx.shadowColor = berryType.color;
        ctx.shadowBlur = food.type === 'special' || food.type === 'rainbow' ? 20 : 10;

        if (food.type === 'special' || food.type === 'rainbow') {
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, size / 2
            );

            if (food.type === 'rainbow') {
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, berryType.color);
                gradient.addColorStop(1, '#663399');
            } else {
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, berryType.color);
                gradient.addColorStop(1, '#990033');
            }

            ctx.fillStyle = gradient;
        } else if (food.type === 'golden') {
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, size / 2
            );
            gradient.addColorStop(0, '#ffffcc');
            gradient.addColorStop(0.5, '#ffcc00');
            gradient.addColorStop(1, '#cc9900');

            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = berryType.color;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.fill();

        if (food.type === 'special') {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0;
            ctx.fillText('?', centerX, centerY);
        } else if (food.type === 'rainbow') {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0;
            ctx.fillText('★', centerX, centerY);
        }

        ctx.shadowBlur = 0;
    });
}

function drawImmortalEffect() {
    const head = snake[0];
    const x = head.x * gridSize + gridSize / 2;
    const y = head.y * gridSize + gridSize / 2;
    const size = gridSize * 1.5;

    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = 15;

    const pulse = Math.sin(Date.now() / 200) * 5;

    ctx.beginPath();
    ctx.arc(x, y, size / 2 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
}

function gameLoop(currentTime) {
    if (lastRenderTime === 0) lastRenderTime = currentTime;
    const deltaTime = currentTime - lastRenderTime;

    if (deltaTime > gameSpeed) {
        update();
        lastRenderTime = currentTime;
    }

    draw();
    requestAnimationFrame(gameLoop);
}

function showGameStatus(title, message, type = 'game-start') {
    const statusTitle = document.getElementById('statusTitle');
    const statusMessage = document.getElementById('statusMessage');
    const gameStatus = document.getElementById('gameStatus');

    statusTitle.textContent = title;
    statusTitle.className = `status-title ${type}`;
    statusMessage.innerHTML = message;
    gameStatus.style.opacity = '1';
    gameStatus.style.pointerEvents = 'auto';

    // Mostrar botones adecuados según el estado
    const startBtn = document.getElementById('startBtn');
    const enterHint = document.getElementById('enterHint');

    if (type === 'game-over') {
        startBtn.innerHTML = '<i class="fas fa-redo"></i> REINICIAR';
        startBtn.style.display = 'block';
        enterHint.style.display = 'block';
        enterHint.textContent = 'Presiona ENTER para reiniciar';
    } else if (type === 'game-paused') {
        startBtn.style.display = 'none';
        enterHint.style.display = 'none';
    } else {
        startBtn.innerHTML = '<i class="fas fa-play"></i> START';
        startBtn.style.display = 'block';
        enterHint.style.display = 'block';
        enterHint.textContent = 'Presiona ENTER para jugar';
    }
}

function hideGameStatus() {
    document.getElementById('gameStatus').style.opacity = '0';
    document.getElementById('gameStatus').style.pointerEvents = 'none';
}

function gameOver() {
    gameRunning = false;
    gameOverState = true;
    stopTimer();

    const totalTime = elapsedTime;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;

    showGameStatus(
        'GAME OVER',
        `Puntuación: ${score}<br>`
        + `Tiempo: ${minutes}:${seconds.toString().padStart(2, '0')}<br>`
        + `Longitud: ${snake.length}<br>`
        + `Combo Máximo: x${combo}`,
        'game-over'
    );

    // Cambiar el texto del botón de pausa para que reinicie
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.innerHTML = '<i class="fas fa-redo"></i> REINICIAR';
}

// Inicializar juego cuando se carga la página
window.addEventListener('load', function () {
    console.log('Page loaded, initializing game...');
    initGame();
});

// Polyfill para roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;

        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
    };
}