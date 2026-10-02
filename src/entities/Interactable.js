/**
 * Interactable.js — objetos com os quais o player interage com E:
 * baus, maquina de cafe, elevador, quadro de eventos e maquina de vendas.
 * Cada um tem prompt proprio, icone e efeito de "usar".
 */
import { RARITY_COLOR } from '../data/constants.js';

export const INTERACT_DEFS = {
  chest: { prompt: 'ABRIR BAU [E]', sprite: 'item:chest', radius: 16, anim: 'item:chest' },
  coffee: { prompt: 'CAFE GRATIS [E]', sprite: 'prop:coffeemaker', radius: 18, anim: 'prop:coffeemaker' },
  elevator: { prompt: 'ELEVADOR [E]', sprite: 'prop:elevator', radius: 22, anim: 'prop:elevator' },
  event: { prompt: 'FALAR COM O COLEGA [E]', sprite: 'item:badge', radius: 16, anim: 'item:badge' },
  shop: { prompt: 'COMPRAR [E]', sprite: 'prop:vending', radius: 18, anim: 'prop:vending' },
  secret: { prompt: 'PEGAR RECOMPENSA [E]', sprite: 'item:drive', radius: 14, anim: 'item:drive' },
};

export class Interactable {
  constructor(kind, x, y, opts = {}) {
    this.kind = kind;
    this.def = INTERACT_DEFS[kind] || INTERACT_DEFS.chest;
    this.x = x; this.y = y;
    this.radius = opts.radius || this.def.radius;
    this.used = false;
    this.uses = opts.uses ?? 1;
    this.time = 0;
    this.open = false;
    this.data = opts.data || {};
    this.active = true;
    this.secret = !!opts.secret;
    this.promptY = -this.def.radius - 12;
  }

  update(dt, game) {
    this.time += dt;
  }

  get prompt() {
    if (this.used && this.kind === 'chest') return null;
    if (this.kind === 'elevator' && !this.data.unlocked) return 'ELEVADOR TRANCADO';
    return this.def.prompt;
  }

  /** Retorna true quando a interacao foi consumida. */
  interact(game) {
    if (this.kind === 'elevator') {
      if (!this.data.unlocked) {
        game.fx.banner('PRECISA DA CHAVE DO ELEVADOR', '#ef5350', 1.6, 40);
        game.audio.sfx('click', { pitch: 0.6 });
        return true;
      }
      game.nextFloor();
      return true;
    }
    if (this.kind === 'chest') {
      if (this.used) return false;
      this.used = true;
      this.open = true;
      game.onChestOpened(this);
      return true;
    }
    if (this.kind === 'coffee') {
      if (this.used) {
        game.fx.banner('JA TOMOU CAFE AQUI', '#8f8fa3', 1.4, 40);
        return true;
      }
      this.used = true;
      const p = game.player;
      p.hp = p.maxHp;
      game.audio.sfx('heal');
      game.fx.banner('CAFE COMPLETO: VIDA CHEIA', '#5d4037', 1.8, 40);
      game.fx.burst(p.x, p.y, 'coffee', { count: 10 });
      return true;
    }
    if (this.kind === 'event') {
      if (this.used) return false;
      this.used = true;
      game.onEventTriggered(this);
      return true;
    }
    if (this.kind === 'secret') {
      if (this.used) return false;
      this.used = true;
      game.onSecretFound(this);
      return true;
    }
    if (this.kind === 'shop') {
      game.openShop(this);
      return true;
    }
    return false;
  }

  draw(ctx, sprites, font, isNear = false) {
    const key = this.def.anim;
    const info = sprites.info(key);
    const frame = info ? sprites.frameAt(key, this.time, true) : 0;
    if (this.used && (this.kind === 'chest' || this.kind === 'event')) {
      sprites.draw(ctx, key, info ? info.frames - 1 : 0, this.x, this.y, {});
    } else {
      sprites.draw(ctx, key, frame, this.x, this.y, {});
    }
    // brilho quando o player esta perto
    if (isNear) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(this.time * 6) * 0.2;
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      const prompt = this.prompt;
      if (prompt && font) {
        ctx.save();
        ctx.globalAlpha = 0.95;
        font.draw(ctx, prompt, this.x, this.y + this.promptY - 6, '#ffd54f', 1, 'center', '#000000');
        ctx.restore();
      }
    }
  }
}
