/**
 * 우리 반 자리 뽑기 웹앱 (Random Classroom Seat Assignment)
 * 4분단 × 6줄 = 총 24석
 */

// Sound Synthesizer using Web Audio API (Offline & zero-dependency)
class SoundEffects {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400 + Math.random() * 250, this.audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }

  playPop(pitchMultiplier = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      const baseFreq = 523.25 * pitchMultiplier; // C5 base
      osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.15);
    } catch (e) {
      // ignore
    }
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    // Arpeggio C-E-G-C with celebratory chords
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        try {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

          gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.35);
        } catch (e) {}
      }, idx * 110);
    });
  }
}

// Lightweight Confetti Particle System
class ConfettiCannon {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  fire() {
    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f97316'];
    const count = 120;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.4,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.7) * 20,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        alpha: 1,
        life: 1
      });
    }

    if (!this.animationId) {
      this.animate();
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.vx *= 0.98; // drag
      p.rotation += p.rotSpeed;
      p.life -= 0.012;
      p.alpha = Math.max(0, p.life);

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();

      if (p.life <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// Seat App State & Logic
class SeatPickerApp {
  constructor() {
    this.TOTAL_SEATS = 24; // 4 분단 × 6줄
    this.COLUMNS = 4;
    this.ROWS_PER_COL = 6;

    this.seats = []; // Array of 24 seat objects { id, col, row, element, assignedNumber }
    this.isDrawing = false;
    this.hasDrawnOnce = false;

    this.sfx = new SoundEffects();
    this.confetti = new ConfettiCannon(document.getElementById('confettiCanvas'));

    this.initElements();
    this.bindEvents();
    this.buildSeatGrid();
  }

  initElements() {
    this.studentCountInput = document.getElementById('studentCount');
    this.btnMinus = document.getElementById('btnMinus');
    this.btnPlus = document.getElementById('btnPlus');
    this.btnDraw = document.getElementById('btnDraw');
    this.btnDrawIcon = document.getElementById('btnDrawIcon');
    this.btnDrawLabel = document.getElementById('btnDrawLabel');
    this.btnPrint = document.getElementById('btnPrint');
    this.btnFullscreen = document.getElementById('btnFullscreen');
    this.fullscreenIcon = document.getElementById('fullscreenIcon');
    this.sequentialToggle = document.getElementById('sequentialToggle');
    this.soundToggle = document.getElementById('soundToggle');
    this.liveStatus = document.getElementById('liveStatus');
  }

  bindEvents() {
    // Stepper
    this.btnMinus.addEventListener('click', () => {
      let val = parseInt(this.studentCountInput.value, 10) || 1;
      if (val > 1) {
        this.studentCountInput.value = val - 1;
        this.updateEmptySeatPreview();
      }
    });

    this.btnPlus.addEventListener('click', () => {
      let val = parseInt(this.studentCountInput.value, 10) || 1;
      if (val < this.TOTAL_SEATS) {
        this.studentCountInput.value = val + 1;
        this.updateEmptySeatPreview();
      }
    });

    this.studentCountInput.addEventListener('change', () => {
      let val = parseInt(this.studentCountInput.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > this.TOTAL_SEATS) val = this.TOTAL_SEATS;
      this.studentCountInput.value = val;
      this.updateEmptySeatPreview();
    });

    // Sound toggle
    this.soundToggle.addEventListener('change', (e) => {
      this.sfx.enabled = e.target.checked;
      if (this.sfx.enabled) this.sfx.init();
    });

    // Draw button
    this.btnDraw.addEventListener('click', () => this.startDraw());

    // Print
    this.btnPrint.addEventListener('click', () => {
      window.print();
    });

    // Fullscreen
    this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        this.fullscreenIcon.textContent = '✕';
        this.btnFullscreen.title = '전체화면 종료';
      } else {
        this.fullscreenIcon.textContent = '⛶';
        this.btnFullscreen.title = '전체화면 전환';
      }
    });
  }

  buildSeatGrid() {
    this.seats = [];

    for (let c = 1; c <= this.COLUMNS; c++) {
      const colContainer = document.getElementById(`col${c}`);
      colContainer.innerHTML = '';

      for (let r = 1; r <= this.ROWS_PER_COL; r++) {
        const seatIndex = (c - 1) * this.ROWS_PER_COL + (r - 1);

        const card = document.createElement('div');
        card.className = 'seat-card';
        card.id = `seat-${c}-${r}`;
        card.setAttribute('role', 'region');
        card.setAttribute('aria-label', `${c}분단 ${r}째 줄`);

        card.innerHTML = `
          <div class="seat-row-tag">${r}줄</div>
          <div class="seat-number-box">
            <span class="seat-number">?</span>
            <span class="seat-suffix"></span>
          </div>
        `;

        colContainer.appendChild(card);

        this.seats.push({
          index: seatIndex,
          col: c,
          row: r,
          element: card,
          numElement: card.querySelector('.seat-number'),
          suffixElement: card.querySelector('.seat-suffix'),
          assignedValue: null
        });
      }
    }
  }

  updateEmptySeatPreview() {
    if (this.isDrawing) return;
    const count = parseInt(this.studentCountInput.value, 10);
    const emptyCount = this.TOTAL_SEATS - count;
    if (emptyCount > 0) {
      this.liveStatus.innerHTML = `학생 <strong>${count}명</strong> (빈자리 <strong>${emptyCount}개</strong>)로 배치됩니다.`;
    } else {
      this.liveStatus.innerHTML = `전체 <strong>${count}석</strong> 모두 배치됩니다.`;
    }
  }

  startDraw() {
    if (this.isDrawing) return;

    this.sfx.init();
    this.isDrawing = true;
    this.btnDraw.disabled = true;
    this.btnDraw.classList.remove('pulse-btn');
    if (this.btnDrawLabel) this.btnDrawLabel.textContent = '뽑는 중...';

    const studentCount = parseInt(this.studentCountInput.value, 10) || 24;
    const isSequential = this.sequentialToggle.checked;

    this.liveStatus.innerHTML = `🎲 <strong>두근두근 자리를 뽑는 중입니다...!</strong>`;

    // 1. Prepare numbers: 1 to studentCount, and rest are null (empty seats)
    const numbers = [];
    for (let i = 1; i <= studentCount; i++) {
      numbers.push(i);
    }
    while (numbers.length < this.TOTAL_SEATS) {
      numbers.push(null); // empty seat marker
    }

    // 2. Fisher-Yates Shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // Assign final target numbers to seats
    this.seats.forEach((seat, idx) => {
      seat.assignedValue = numbers[idx];
      seat.element.classList.remove('revealed', 'empty-seat');
      seat.element.classList.add('rolling');
      seat.suffixElement.textContent = '번';
    });

    // 3. Fast rolling animation (Number cycling effect)
    const rollInterval = 45; // ms
    const rollTimer = setInterval(() => {
      this.seats.forEach((seat) => {
        if (seat.element.classList.contains('rolling')) {
          const randNum = Math.floor(Math.random() * studentCount) + 1;
          seat.numElement.textContent = randNum;
        }
      });
      this.sfx.playTick();
    }, rollInterval);

    // 4. Reveal strategy
    if (isSequential) {
      // Reveal row by row across columns or seat by seat
      // Let's reveal in a fun order: front to back, zigzagging or random order
      // Ordering from front (Row 1) to back (Row 6) is very natural and dramatic!
      const revealOrder = [...this.seats];
      // Sort by row first (1줄 to 6줄), then 분단 (1 to 4)
      revealOrder.sort((a, b) => a.row - b.row || a.col - b.col);

      const delayBetweenSeats = 130; // ms per seat
      const initialSpinDuration = 900; // spin before first reveal

      setTimeout(() => {
        revealOrder.forEach((seat, step) => {
          setTimeout(() => {
            this.revealSeat(seat);

            // If this was the last seat
            if (step === revealOrder.length - 1) {
              clearInterval(rollTimer);
              this.finishDraw();
            }
          }, step * delayBetweenSeats);
        });
      }, initialSpinDuration);

    } else {
      // Instant / Simultaneous reveal after exciting 2.2 seconds spin
      setTimeout(() => {
        clearInterval(rollTimer);
        this.seats.forEach(seat => this.revealSeat(seat, false));
        this.finishDraw();
      }, 2200);
    }
  }

  revealSeat(seat, playSound = true) {
    seat.element.classList.remove('rolling');
    seat.element.classList.add('revealed');

    if (seat.assignedValue === null) {
      seat.element.classList.add('empty-seat');
      seat.numElement.textContent = '빈자리';
      seat.suffixElement.textContent = '';
      if (playSound) this.sfx.playPop(0.8);
    } else {
      seat.numElement.textContent = seat.assignedValue;
      seat.suffixElement.textContent = '번';
      if (playSound) {
        // Subtle pitch rise as seats reveal
        const pitch = 0.9 + (seat.row / this.ROWS_PER_COL) * 0.4;
        this.sfx.playPop(pitch);
      }
    }
  }

  finishDraw() {
    this.sfx.playFanfare();
    this.confetti.fire();

    this.isDrawing = false;
    this.hasDrawnOnce = true;
    this.btnDraw.disabled = false;

    // Change primary button label and icon to '다시 뽑기'
    if (this.btnDrawIcon) this.btnDrawIcon.textContent = '🔄';
    if (this.btnDrawLabel) this.btnDrawLabel.textContent = '다시 뽑기';
    this.btnDraw.classList.add('pulse-btn');

    const count = parseInt(this.studentCountInput.value, 10);
    this.liveStatus.innerHTML = `🎉 <strong>자리 뽑기가 완료되었습니다!</strong> 모두 자신의 자리를 확인해 보세요!`;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new SeatPickerApp();
});
