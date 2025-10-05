// Simple Pong game
// Player controls left paddle with mouse or arrow keys. Right paddle is a basic AI.

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const playerScoreEl = document.getElementById('player-score');
  const computerScoreEl = document.getElementById('computer-score');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resetBtn = document.getElementById('reset-btn');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Game objects
  const paddle = {
    width: 10,
    height: 100,
    x: 10,
    y: (HEIGHT - 100) / 2,
    speed: 6,
  };

  const ai = {
    width: 10,
    height: 100,
    x: WIDTH - 10 - 10,
    y: (HEIGHT - 100) / 2,
    speed: 4.2, // AI max speed
  };

  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    r: 8,
    speed: 6,
    vx: 0,
    vy: 0,
  };

  let playerScore = 0;
  let computerScore = 0;

  let running = false;
  let paused = false;
  let rafId = null;

  // Input state
  const input = {
    up: false,
    down: false,
  };

  // Initialize ball to a random direction
  function resetBall(towardsRight = Math.random() > 0.5) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.speed = 6;
    const angle = (Math.random() * Math.PI / 3) - (Math.PI / 6); // -30°..30°
    ball.vx = (towardsRight ? 1 : -1) * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function startGame() {
    if (running) return;
    running = true;
    paused = false;
    resetBall();
    loop();
  }

  function pauseGame() {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if (!paused) loop(); // resume loop
    else cancelAnimationFrame(rafId);
  }

  function resetGame() {
    running = false;
    paused = false;
    playerScore = 0;
    computerScore = 0;
    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;
    paddle.y = (HEIGHT - paddle.height) / 2;
    ai.y = (HEIGHT - ai.height) / 2;
    resetBall();
    cancelAnimationFrame(rafId);
    draw(); // draw single frame
    pauseBtn.textContent = 'Pause';
  }

  // Collision helpers
  function rectCircleColliding(rect, circle) {
    // simple AABB vs circle check
    const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return (dx * dx + dy * dy) <= (circle.r * circle.r);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // Main update loop
  function update() {
    // Move player paddle by keyboard
    if (input.up) paddle.y -= paddle.speed;
    if (input.down) paddle.y += paddle.speed;

    // Constrain paddles
    paddle.y = clamp(paddle.y, 0, HEIGHT - paddle.height);
    ai.y = clamp(ai.y, 0, HEIGHT - ai.height);

    // Move AI: simple tracking with max speed; tries to follow ball's y
    const aiCenter = ai.y + ai.height / 2;
    if (ball.y < aiCenter - 4) {
      ai.y -= ai.speed;
    } else if (ball.y > aiCenter + 4) {
      ai.y += ai.speed;
    }
    // Slightly adjust AI speed depending on score (optional challenge)
    ai.speed = 4 + Math.min(4, Math.abs(playerScore - computerScore) * 0.3);

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom wall collision
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy *= -1;
    } else if (ball.y + ball.r >= HEIGHT) {
      ball.y = HEIGHT - ball.r;
      ball.vy *= -1;
    }

    // Paddle collisions
    const leftRect = { x: paddle.x, y: paddle.y, width: paddle.width, height: paddle.height };
    const rightRect = { x: ai.x, y: ai.y, width: ai.width, height: ai.height };

    // If ball hits left paddle
    if (rectCircleColliding({ ...leftRect }, ball) && ball.vx < 0) {
      // reflect
      ball.x = paddle.x + paddle.width + ball.r; // prevent sticking
      reflectBallFromPaddle(paddle);
    }

    // If ball hits right paddle
    if (rectCircleColliding({ ...rightRect }, ball) && ball.vx > 0) {
      ball.x = ai.x - ball.r; // prevent sticking
      reflectBallFromPaddle(ai);
    }

    // Scoring
    if (ball.x < -ball.r) {
      // computer scored
      computerScore++;
      computerScoreEl.textContent = computerScore;
      resetBall(true); // ball goes toward right (player will receive)
    } else if (ball.x > WIDTH + ball.r) {
      // player scored
      playerScore++;
      playerScoreEl.textContent = playerScore;
      resetBall(false); // ball goes toward left (computer will receive)
    }
  }

  // Reflect ball and adjust angle based on where it hit the paddle
  function reflectBallFromPaddle(p) {
    // compute relative intersection (from -1 at top to +1 at bottom)
    const relativeIntersectY = (p.y + p.height / 2) - ball.y;
    const normalizedRelativeIntersectionY = relativeIntersectY / (p.height / 2);
    const maxBounceAngle = (5 * Math.PI) / 12; // ~75 degrees
    const bounceAngle = normalizedRelativeIntersectionY * maxBounceAngle;

    // determine direction: ball should go toward the opponent
    const direction = (p === paddle) ? 1 : -1;

    // increase speed slightly
    ball.speed = Math.min(14, ball.speed * 1.06);

    ball.vx = direction * ball.speed * Math.cos(bounceAngle);
    ball.vy = -ball.speed * Math.sin(bounceAngle); // negative because of Y axis direction
  }

  // Draw everything
  function draw() {
    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // background court center line
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    const dashH = 14;
    const gap = 12;
    const startX = WIDTH / 2 - 1;
    ctx.fillRect(startX, 0, 2, HEIGHT); // subtle line

    // Draw paddles
    ctx.fillStyle = '#E6EEF8';
    roundRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 4, true, false);
    roundRect(ctx, ai.x, ai.y, ai.width, ai.height, 4, true, false);

    // Draw ball
    ctx.beginPath();
    ctx.fillStyle = '#60a5fa';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    // Draw scores on-canvas (optional, scoreboard already in DOM)
    ctx.fillStyle = 'rgba(230,238,248,0.06)';
    ctx.font = '20px system-ui, Arial';
  }

  // Utility: rounded rect
  function roundRect(ctx, x, y, w, h, r) {
    const radius = r || 4;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
  }

  // Game loop
  function loop() {
    if (!running || paused) return;
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // Input handlers
  // Mouse movement moves left paddle
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    // center paddle at mouse
    paddle.y = clamp(mouseY - paddle.height / 2, 0, HEIGHT - paddle.height);
  });

  // Keyboard (arrow up/down)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'Up') {
      input.up = true;
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 'Down') {
      input.down = true;
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      // space toggles start/pause
      if (!running) startGame();
      else pauseGame();
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'Up') {
      input.up = false;
    } else if (e.key === 'ArrowDown' || e.key === 'Down') {
      input.down = false;
    }
  });

  // Buttons
  startBtn.addEventListener('click', () => {
    startGame();
  });

  pauseBtn.addEventListener('click', () => {
    if (!running) return;
    pauseGame();
  });

  resetBtn.addEventListener('click', () => {
    resetGame();
  });

  // Make canvas focusable for keyboard events (helpful on some browsers)
  canvas.addEventListener('click', () => canvas.focus());

  // Start with a drawn initial state
  resetBall();
  draw();

  // Expose resetBall for debugging (not necessary)
  window.Pong = { resetBall };

})();
