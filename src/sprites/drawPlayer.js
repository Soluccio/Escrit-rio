/**
 * drawPlayer.js — Max, o estagiario (24x24), todas as animacoes frame a frame.
 * Animacoes: idle 4, run 6, dash 2, attack 3, hurt 2, death 4, pickup 2.
 * Direcao: sprite desenhado olhando para a DIREITA; `flip` espelha.
 */
import { PAL, shade } from './Palette.js';
import { px, rect, hLine, pxMap, pxLine } from './pxutil.js';

export const PLAYER_ANIMS = {
  idle:   { frames: 4, dur: 0.16, loop: true },
  run:    { frames: 6, dur: 0.09, loop: true },
  dash:   { frames: 2, dur: 0.09, loop: true },
  attack: { frames: 3, dur: 0.07, loop: false },
  hurt:   { frames: 2, dur: 0.10, loop: false },
  death:  { frames: 4, dur: 0.14, loop: false },
  pickup: { frames: 2, dur: 0.12, loop: false },
};

/**
 * Desenha um frame do Max.
 * @param {CanvasRenderingContext2D} ctx canvas 24x24
 * @param {number} f indice do frame
 * @param {string} anim nome da animacao
 * @param {object} o opcoes: {flip, skin, shirt, tie, ghost}
 */
export function drawPlayer(ctx, f, anim = 'idle', o = {}) {
  const skin = o.skin || PAL.skin;
  const shirt = o.shirt || PAL.shirt;
  const shirtShade = o.shirtShade || shade(shirt, -40);
  const tie = o.tie || PAL.tie;
  const eyes = o.eyes || PAL.eyes;

  let bob = 0, legSwing = 0, armFwd = 0, lean = 0, tieSwing = 0, eyesClosed = false, crouch = 0, spin = 0;
  switch (anim) {
    case 'idle':
      bob = [0, -1, 0, 1][f % 4];
      tieSwing = [0, 1, 1, 0][f % 4];
      break;
    case 'run':
      bob = [0, -1, -1, 0, -1, -1][f % 6];
      legSwing = [3, 1, -2, -3, -1, 2][f % 6];
      armFwd = [-2, -1, 0, 2, 1, 0][f % 6];
      tieSwing = [3, 3, 2, 2, 3, 3][f % 6];
      lean = 1;
      break;
    case 'dash':
      bob = -1; lean = 2; legSwing = f === 0 ? 4 : -4; tieSwing = 4; armFwd = 3;
      break;
    case 'attack':
      armFwd = [0, 4, 5][f % 3];
      lean = [0, 1, 2][f % 3];
      tieSwing = [0, 1, 2][f % 3];
      break;
    case 'hurt':
      lean = -2; eyesClosed = true; bob = f === 0 ? -1 : 1;
      break;
    case 'death':
      crouch = [2, 5, 7, 9][f % 4];
      eyesClosed = true;
      spin = f * 2;
      break;
    case 'pickup':
      crouch = f === 0 ? 2 : 4; bob = 1;
      break;
  }

  const baseY = 21 + (anim === 'death' ? 0 : 0);
  const y = baseY + bob + crouch - (anim === 'death' ? -crouch : 0);
  const flip = !!o.flip;
  const cx = 12;

  // sombra no chao
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx - 5, baseY + 1, 10, 2);

  const T = (x, yy, w, h, c) => rect(ctx, flip ? cx - (x - (cx - 8)) - w : x, yy, w, h, c);

  // ---- pernas
  const legY = y - 5;
  T(cx - 4 + legSwing * 0, legY, 3, 5, PAL.shoe);
  T(cx + 1, legY + (legSwing > 0 ? -1 : 0), 3, 5, PAL.shoe);
  T(cx - 4, legY, 3, 2, '#3f3f4a');
  T(cx + 1, legY, 3, 2, '#3f3f4a');
  if (legSwing) {
    const off = Math.round(legSwing / 2);
    T(cx - 4, legY + 3, 3, 3, PAL.shoe);
    T(cx + 1 - off, legY + 3 + off, 3, 3, PAL.shoe);
  }

  // ---- torso (camisa + gravata)
  const torsoY = y - 12 + lean * 0;
  T(cx - 4 + lean, torsoY, 9, 8, shirt);
  T(cx - 4 + lean, torsoY, 9, 2, shade(shirt, 25));
  T(cx - 4 + lean, torsoY + 6, 9, 2, shirtShade);
  // gravata pulando
  const tx = cx - 1 + lean + (anim === 'run' ? -3 - tieSwing / 2 : -tieSwing / 2);
  T(tx, torsoY + 1, 2, 5, tie);
  T(tx, torsoY + 6, 2, 1, shade(tie, -40));
  if (anim === 'run' || anim === 'dash') { T(tx - 3, torsoY + 2, 3, 1, tie); T(tx - 2, torsoY + 4, 3, 1, tie); }

  // ---- bracos
  if (armFwd > 2) {
    T(cx + 4, torsoY + 2, armFwd + 2, 3, shirtShade);       // braco esticado (ataque)
    T(cx + 4 + armFwd + 2, torsoY + 2, 2, 3, skin);
  } else {
    T(cx - 5 + armFwd, torsoY + 1, 2, 5, shirtShade);
    T(cx + 4 + armFwd, torsoY + 1, 2, 5, shirtShade);
    T(cx - 5 + armFwd, torsoY + 5, 2, 2, skin);
    T(cx + 4 + armFwd, torsoY + 5, 2, 2, skin);
  }

  // ---- cabeca
  const headY = torsoY - 7;
  T(cx - 4, headY, 9, 7, skin);
  T(cx - 4, headY, 9, 1, shade(skin, 20));
  T(cx - 4, headY + 5, 9, 2, shade(skin, -25));
  // cabelo
  T(cx - 4, headY - 1, 9, 2, PAL.hair);
  T(cx - 5, headY, 2, 3, PAL.hair);
  T(cx + 4, headY - 1, 2, 2, PAL.hair);
  // oculos/olhos amarelos
  const eyeY = headY + 3;
  if (eyesClosed) {
    hLine(ctx, cx - 2, eyeY, 2, PAL.skinShade);
    hLine(ctx, cx + 2, eyeY, 2, PAL.skinShade);
  } else {
    if (anim === 'attack') { hLine(ctx, cx - 2, eyeY, 3, eyes); hLine(ctx, cx + 2, eyeY, 3, eyes); }
    else { px(ctx, cx - 2, eyeY, eyes); px(ctx, cx - 1, eyeY, eyes); px(ctx, cx + 2, eyeY, eyes); px(ctx, cx + 3, eyeY, eyes); }
  }
  // boca
  hLine(ctx, cx + 1, eyeY + 2, 2, shade(skin, -60));

  // ---- morte: estrelinhas girando
  if (anim === 'death' && f >= 2) {
    const r = 6 + f;
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3;
      px(ctx, cx + Math.cos(a) * r, headY - 3 + Math.sin(a) * r * 0.5, PAL.coinGold);
      px(ctx, cx + Math.cos(a) * r + 1, headY - 3 + Math.sin(a) * r * 0.5, PAL.coinGold);
    }
  }
  // ---- dash: linhas de velocidade
  if (anim === 'dash') {
    for (let i = 0; i < 3; i++) pxLine(ctx, cx - 12 - i * 2, y - 12 + i * 4, cx - 6, y - 12 + i * 4, '#ffffff88');
  }
}

/** Retrato 16x16 para a tela de selecao de personagem. */
export function drawPlayerPortrait(ctx, id = 'max') {
  const tints = {
    max: { shirt: '#3f51b5', tie: '#c62828' },
    bia: { shirt: '#ec407a', tie: '#7e57c2' },
    tonho: { shirt: '#6d4c41', tie: '#43a047' },
    kiko: { shirt: '#26a69a', tie: '#ff7043' },
    duda: { shirt: '#5c6bc0', tie: '#ffd54f' },
    ze: { shirt: '#795548', tie: '#546e7a' },
  };
  const t = tints[id] || tints.max;
  ctx.save();
  ctx.translate(0, 3);
  ctx.scale(0.75, 0.75);
  drawPlayer(ctx, 0, 'idle', { shirt: t.shirt, tie: t.tie });
  ctx.restore();
}

export const PLAYER_PALETTE_TINT = {
  max: null, bia: { shirt: '#ec407a' }, tonho: { shirt: '#6d4c41' },
  kiko: { shirt: '#26a69a' }, duda: { shirt: '#5c6bc0' }, ze: { shirt: '#795548' },
};
