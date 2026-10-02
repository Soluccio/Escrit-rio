/**
 * WorldRenderer.js — desenho do mundo: um frame inteiro do jogo em coordenadas
 * de tela (menus, camera, entidades, vinheta, HUD e dica de execucao).
 * Extraido do Game.js para manter os arquivos abaixo de 400 linhas.
 */
import { VIEW_W, VIEW_H, S } from '../data/constants.js';
import { dist } from './Physics.js';

/** Desenha um frame inteiro (chamado por Game.draw). */
export function drawGame(game, ctx) {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // telas cheias (sem mundo por tras)
  if (game.state === S.MENU) {
    game.menu.draw(ctx, game);
    game.transitions.draw(ctx, game);
    return;
  }
  if (game.state === S.WIN) {
    game.victory.draw(ctx, game);
    game.transitions.draw(ctx, game);
    return;
  }
  if (game.state === S.GAMEOVER) {
    game.gameover.draw(ctx, game);
    game.transitions.draw(ctx, game);
    return;
  }
  if (!game.room || !game.player) {
    game.transitions.draw(ctx, game);
    return;
  }

  // ---- mundo (com a camera aplicada)
  game.camera.apply(ctx);
  const view = game.camera.view();
  game.room.draw(ctx, game.sprites, game.time, view);
  game.hazards.draw(ctx);
  for (const p of game.pickups) p.draw(ctx, game.sprites);
  for (const inter of game.room.interactables || []) {
    const near = dist(inter, game.player) < inter.radius + 14;
    inter.draw(ctx, game.sprites, game.font, near);
  }
  drawEntities(game, ctx);
  game.projectiles.draw(ctx);
  game.fx.drawWorld(ctx, game.sprites);
  drawExecuteHint(game, ctx);
  if (game.debug) game.room.map.debugDraw(ctx);
  game.camera.restore(ctx);

  // ---- flash de dano / reboot de sistema
  if (game.shakeFlash > 0) {
    ctx.fillStyle = `rgba(255,60,60,${game.shakeFlash * 0.35})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (game.rebootFlash > 0) {
    ctx.fillStyle = `rgba(10,20,10,${Math.min(0.9, game.rebootFlash * 2)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    game.font.draw(ctx, 'REBOOT', VIEW_W / 2, VIEW_H / 2 - 10, '#00e676', 2, 'center');
  }
  drawVignette(ctx);

  // ---- UI (coordenadas de tela)
  ctx.save();
  game.camera.apply(ctx);
  game.fx.drawNumbers(ctx, game.font, game.camera);
  ctx.restore();
  game.hud.draw(ctx, game, game.loop.dt || 1 / 60);
  game.minimap.draw(ctx, game);
  game.dialogue.draw(ctx);
  game.fx.drawBanners(ctx, game.font);

  if (game.state === S.BLESSING) game.blessingPicker.draw(ctx, game);
  if (game.state === S.SHOP) game.shop.draw(ctx, game);
  if (game.state === S.PAUSE) game.pauseUI.draw(ctx, game);
  game.transitions.draw(ctx, game);
}

/** Dica "EXECUTAR [E]" sobre o inimigo executavel mais proximo (coords de mundo). */
export function drawExecuteHint(game, ctx) {
  const target = game.nearestExecutable(game.player.x, game.player.y, 110);
  if (!target) return;
  ctx.save();
  ctx.globalAlpha = 0.7 + Math.sin(game.time * 12) * 0.3;
  game.font.draw(ctx, 'EXECUTAR [E]', target.x, target.y - 26, '#ff5252', 1, 'center', '#000000');
  ctx.restore();
}

/** Desenha props + entidades com ordenacao por Y (profundidade). */
export function drawEntities(game, ctx) {
  const room = game.room;
  const sortable = [];
  for (const p of room.props) if (!p.dead) sortable.push({ y: p.y, kind: 'prop', ref: p });
  for (const e of room.entities) if (!e.dead) sortable.push({ y: e.y, kind: 'entity', ref: e });
  if (game.player && !game.player.dead) sortable.push({ y: game.player.y, kind: 'player', ref: game.player });
  sortable.sort((a, b) => a.y - b.y);
  for (const item of sortable) {
    if (item.kind === 'prop') item.ref.draw(ctx, game.sprites);
    else item.ref.draw(ctx, game.sprites, game);
  }
}

/** Vinheta escura nas bordas superior/inferior (dá profundidade ao pixel art). */
export function drawVignette(ctx) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(0, 0, VIEW_W, 3);
  ctx.fillRect(0, VIEW_H - 3, VIEW_W, 3);
  ctx.restore();
}
