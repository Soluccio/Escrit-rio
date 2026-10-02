/**
 * FX.js — juice: particulas (pool fixo, sem GC), hitstop, screen shake,
 * damage numbers flutuantes, banners de texto e rastro de dash.
 * Limite duro de 120 particulas ativas.
 */
import { TUNING, VIEW_W, VIEW_H } from '../data/constants.js';
import { PAL } from '../sprites/Palette.js';

const MAX_PARTICLES = 120;
const MAX_NUMBERS = 24;

/** Presets de particula por tipo de inimigo destruido. */
export const PARTICLE_PRESETS = {
  paper:    { colors: ['#e8e8f0', '#c3c3d4', '#ffffff'], count: 10, size: 2, speed: 70, life: 0.5, gravity: 40, shape: 'rect' },
  spark:    { colors: ['#fff3b0', '#ffd54f', '#ffffff'], count: 8, size: 1, speed: 110, life: 0.35, gravity: 0, shape: 'line' },
  coffee:   { colors: ['#5d4037', '#8d6e63', '#e8e8f0'], count: 9, size: 2, speed: 60, life: 0.6, gravity: 120, shape: 'drop' },
  digital:  { colors: ['#7fe3d4', '#00e676', '#ffffff'], count: 10, size: 1, speed: 90, life: 0.4, gravity: 0, shape: 'bit' },
  clip:     { colors: ['#b0bec5', '#cfd8dc', '#ffffff'], count: 12, size: 1, speed: 130, life: 0.45, gravity: 60, shape: 'line' },
  blood:    { colors: ['#ef5350', '#b71c1c'], count: 8, size: 2, speed: 80, life: 0.5, gravity: 90, shape: 'drop' },
  ink:      { colors: ['#3f51b5', '#7986cb'], count: 8, size: 2, speed: 60, life: 0.6, gravity: 30, shape: 'drop' },
  gold:     { colors: ['#ffd54f', '#fff3b0'], count: 10, size: 1, speed: 90, life: 0.5, gravity: 40, shape: 'rect' },
  dust:     { colors: ['#8f8fa3', '#5a5a6b'], count: 4, size: 2, speed: 40, life: 0.3, gravity: 20, shape: 'rect' },
};

export class FX {
  constructor(rng) {
    this.rng = rng;
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
      color: '#fff', size: 1, gravity: 0, shape: 'rect', rot: 0,
    }));
    this.numbers = Array.from({ length: MAX_NUMBERS }, () => ({
      active: false, x: 0, y: 0, vy: 0, life: 0, text: '', color: '#fff', scale: 1,
    }));
    this.hitstop = 0;           // congela a simulacao
    this.freeze = 0;            // congela TUDO menos particulas (morte de boss)
    this.deaths = [];           // {x,y,kind,color,alpha} para desenhar fades
    this.banners = [];          // {text,color,life,max}
    this.slashes = [];          // arcos de ataque
    this.rings = [];            // ondas de choque / telegraphs
    this.trails = [];           // rastro de dash (sprites fantasmas)
    this.t = 0;
  }

  // ------------------------------------------------------------- particulas
  /** Emite um preset de particula em (x,y). dir opcional para cone. */
  burst(x, y, presetName, opts = {}) {
    const p = PARTICLE_PRESETS[presetName] || PARTICLE_PRESETS.paper;
    const count = opts.count || p.count;
    const dir = opts.dir;
    for (let i = 0; i < count; i++) {
      const slot = this._freeParticle();
      if (!slot) return;
      const ang = dir !== undefined && dir !== null
        ? dir + (this.rng.next() - 0.5) * (opts.spread || Math.PI * 1.4)
        : this.rng.angle();
      const sp = p.speed * (0.5 + this.rng.next() * 0.8) * (opts.speedMult || 1);
      slot.active = true;
      slot.x = x; slot.y = y;
      slot.vx = Math.cos(ang) * sp; slot.vy = Math.sin(ang) * sp;
      slot.life = slot.maxLife = p.life * (0.7 + this.rng.next() * 0.6);
      slot.color = p.colors[this.rng.int(0, p.colors.length - 1)];
      slot.size = opts.size || p.size;
      slot.gravity = p.gravity;
      slot.shape = p.shape;
      slot.rot = this.rng.angle();
    }
  }

  _freeParticle() {
    for (const p of this.particles) if (!p.active) return p;
    return null;   // limite de 120: simplesmente nao emite
  }

  /** Numero de dano flutuante, pixelado. */
  damageNumber(x, y, amount, kind = 'normal') {
    const slot = this.numbers.find(n => !n.active);
    if (!slot) return;
    slot.active = true;
    slot.x = x + (this.rng.next() - 0.5) * 6;
    slot.y = y - 6;
    slot.vy = -26;
    slot.life = 0.7;
    slot.text = kind === 'exec' ? 'EXEC ' + amount : String(Math.round(amount));
    slot.color = kind === 'crit' ? PAL.damageCrit : kind === 'exec' ? PAL.damageExec : PAL.damage;
    slot.scale = kind === 'normal' ? 1 : 1.25;
  }

  text(x, y, text, color = '#ffffff') {
    const slot = this.numbers.find(n => !n.active);
    if (!slot) return;
    slot.active = true; slot.x = x; slot.y = y; slot.vy = -16; slot.life = 1.0;
    slot.text = text; slot.color = color; slot.scale = 1;
  }

  /** Faixa de texto no topo (ondas, sala limpa, chefe entrando). */
  banner(text, color = '#ffcf4d', life = 2.0, y = 34) {
    this.banners.push({ text, color, life, max: life, y });
    if (this.banners.length > 3) this.banners.shift();
  }

  /** Arco de golpe (ataque melee). */
  slash(x, y, angle, len = 22, color = '#ffffff') {
    this.slashes.push({ x, y, angle, len, color, life: 0.14, max: 0.14 });
  }

  /** Anel expansivo (onda de choque, telegraph, cura). */
  ring(x, y, r0, r1, color, life = 0.35, width = 2) {
    this.rings.push({ x, y, r0, r1, color, life, max: life, width });
  }

  /** Rastro de dash: guarda um sprite fantasma. */
  ghost(spriteKey, frame, x, y, flip = false) {
    this.trails.push({ spriteKey, frame, x, y, flip, life: 0.25, max: 0.25 });
  }

  /** Flash de impacto curto. */
  hitSpark(x, y, dir, color = '#ffffff') {
    this.burst(x, y, 'spark', { dir, spread: 1.0, count: 6, speedMult: 1.2 });
    this.slash(x, y, dir, 12, color);
  }

  // ------------------------------------------------------------- tempo
  freezeFrame(sec) { this.freeze = Math.max(this.freeze, sec); }
  hitStop(sec) { this.hitstop = Math.max(this.hitstop, sec); }

  /** Retorna true quando a simulacao deve ser congelada neste frame. */
  get frozen() { return this.hitstop > 0 || this.freeze > 0; }

  update(dt) {
    this.t += dt;
    // hitstop/ freeze contam em tempo real
    if (this.hitstop > 0) { this.hitstop -= dt; if (this.hitstop < 0) this.hitstop = 0; }
    if (this.freeze > 0) { this.freeze -= dt; if (this.freeze < 0) this.freeze = 0; }

    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.98; p.vy *= 0.98;
    }
    for (const n of this.numbers) {
      if (!n.active) continue;
      n.life -= dt;
      if (n.life <= 0) { n.active = false; continue; }
      n.y += n.vy * dt;
      n.vy += 40 * dt;
    }
    for (const b of this.banners) b.life -= dt;
    this.banners = this.banners.filter(b => b.life > 0);
    for (const s of this.slashes) s.life -= dt;
    this.slashes = this.slashes.filter(s => s.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter(r => r.life > 0);
    for (const g of this.trails) g.life -= dt;
    this.trails = this.trails.filter(g => g.life > 0);
    for (const d of this.deaths) d.life -= dt;
    this.deaths = this.deaths.filter(d => d.life > 0);
  }

  /** Morte de inimigo: rastro de sprite sumindo. */
  death(spriteKey, frame, x, y, opts = {}) {
    this.deaths.push({ spriteKey, frame, x, y, life: 0.4, max: 0.4, flip: opts.flip, alpha: 1, scale: opts.scale || 1 });
  }

  // ------------------------------------------------------------- desenho
  drawWorld(ctx, sprites) {
    // rastro de dash
    for (const g of this.trails) {
      const a = (g.life / g.max) * 0.5;
      sprites.draw(ctx, g.spriteKey, g.frame, g.x, g.y, { alpha: a, flip: g.flip });
    }
    // corpos sumindo
    for (const d of this.deaths) {
      const a = d.life / d.max;
      ctx.save();
      ctx.globalAlpha = a * 0.8;
      sprites.draw(ctx, d.spriteKey, d.frame, d.x, d.y, { scale: d.scale * (1 + (1 - a) * 0.4) });
      ctx.restore();
    }
    // particulas
    for (const p of this.particles) {
      if (!p.active) continue;
      const a = Math.min(1, p.life / (p.maxLife * 0.6));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.size;
      if (p.shape === 'rect') ctx.fillRect(p.x | 0, p.y | 0, s, s);
      else if (p.shape === 'drop') ctx.fillRect(p.x | 0, p.y | 0, s, s + 1);
      else if (p.shape === 'line') {
        const len = 3 + s;
        ctx.fillRect((p.x - Math.cos(p.rot) * len) | 0, (p.y - Math.sin(p.rot) * len) | 0, 1, 1);
        ctx.fillRect(p.x | 0, p.y | 0, 1, 1);
      } else { // bit (bug digital)
        ctx.fillRect(p.x | 0, p.y | 0, s, s);
        ctx.fillRect((p.x + 2) | 0, (p.y - 2) | 0, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    // arcos de golpe
    for (const s of this.slashes) {
      const a = s.life / s.max;
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s.len, -s.len * 0.35);
      ctx.lineTo(s.len * 0.85, s.len * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // aneis
    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      const rad = r.r0 + (r.r1 - r.r0) * t;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // numeros de dano (pixelados, desenhados pelo PixelFont via callback)
  }

  /** Damage numbers + textos — chamado com a fonte de pixel. */
  drawNumbers(ctx, font, cam = null) {
    for (const n of this.numbers) {
      if (!n.active) continue;
      const a = Math.min(1, n.life / 0.4);
      ctx.save();
      ctx.globalAlpha = a;
      font.draw(ctx, n.text, n.x, n.y, n.color, n.scale, 'center');
      ctx.restore();
    }
  }

  /** Banners em coordenadas de TELA (nao sofrem com a camera). */
  drawBanners(ctx, font) {
    this.banners.forEach((b, i) => {
      const a = Math.min(1, b.life / 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      font.draw(ctx, b.text, VIEW_W / 2, b.y + i * 14, b.color, 1, 'center');
      ctx.restore();
    });
  }

  /** Reset entre salas/andares. */
  clear() {
    for (const p of this.particles) p.active = false;
    for (const n of this.numbers) n.active = false;
    this.banners.length = 0;
    this.slashes.length = 0;
    this.rings.length = 0;
    this.trails.length = 0;
    this.deaths.length = 0;
    this.hitstop = 0; this.freeze = 0;
  }
}
