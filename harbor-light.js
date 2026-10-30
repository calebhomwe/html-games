/* Harbor Light: deterministic game rules. The renderer supplies time and input. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HarborLight = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DANGER = 0.69, SHORE = 0.93, MAX_DT = 0.1;
  class Harbor {
    constructor(random = Math.random) { this.random = random; this.reset(); }
    reset() {
      this.state = 'ready'; this.wave = 0; this.lives = 3; this.score = 0;
      this.streak = 0; this.rescued = 0; this.missed = 0; this.lane = 1;
      this.boats = []; this.remaining = 0; this.spawnTimer = 0; this.breakTimer = 0;
      this.nextId = 1; this.events = [];
    }
    start() { this.reset(); this.state = 'playing'; this.startWave(); }
    startWave() {
      this.wave++; this.remaining = Math.min(5 + this.wave, 12); this.spawnTimer = 0;
      this.state = 'playing'; this.events.push({ type: 'wave', wave: this.wave });
    }
    selectLane(lane) {
      if (this.state === 'playing' && Number.isInteger(lane) && lane >= 0 && lane < 3) this.lane = lane;
    }
    pause() { if (this.state === 'playing' || this.state === 'break') { this.beforePause = this.state; this.state = 'paused'; } }
    resume() { if (this.state === 'paused') this.state = this.beforePause; }
    spawn() {
      const sample = Number(this.random());
      const lane = Number.isFinite(sample) ? Math.min(2, Math.max(0, Math.floor(sample * 3))) : 1;
      this.boats.push({ id: this.nextId++, lane, y: 0.05 });
      this.remaining--;
    }
    update(delta) {
      if (!Number.isFinite(delta) || delta <= 0) return;
      const dt = Math.min(delta, MAX_DT);
      if (this.state === 'break') {
        this.breakTimer -= dt;
        if (this.breakTimer <= 0) this.startWave();
        return;
      }
      if (this.state !== 'playing') return;
      this.spawnTimer -= dt;
      if (this.remaining > 0 && this.spawnTimer <= 0) {
        this.spawn();
        this.spawnTimer = Math.max(1.05, 2.05 - (this.wave - 1) * 0.09);
      }
      const speed = Math.min(0.23, 0.12 + (this.wave - 1) * 0.008);
      const survivors = [];
      for (const boat of this.boats) {
        const previousY = boat.y;
        boat.y += speed * dt;
        // The beam was active over this entire step. Do not punish a player
        // for selecting a boat in the last frame before it crosses the shore.
        if (boat.y >= DANGER && previousY < SHORE && boat.lane === this.lane) {
          this.rescued++; this.streak++; const points = 10 + Math.min(this.streak - 1, 5) * 2;
          this.score += points; this.events.push({ type: 'rescue', lane: boat.lane, points });
        } else if (boat.y >= SHORE) {
          this.missed++; this.lives--; this.streak = 0; this.events.push({ type: 'miss', lane: boat.lane });
          if (this.lives <= 0) { this.lives = 0; this.state = 'gameover'; this.events.push({ type: 'gameover' }); break; }
        } else {
          if (previousY < DANGER && boat.y >= DANGER) {
            this.events.push({ type: 'warning', lane: boat.lane });
          }
          survivors.push(boat);
        }
      }
      this.boats = survivors;
      if (this.state === 'playing' && this.remaining === 0 && this.boats.length === 0) {
        this.state = 'break'; this.breakTimer = 2; this.events.push({ type: 'clear', wave: this.wave });
      }
    }
    takeEvents() { const events = this.events; this.events = []; return events; }
  }
  return { Harbor, DANGER, SHORE };
});
