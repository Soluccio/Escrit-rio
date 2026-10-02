/**
 * Game.js — o coracao: loop de 60 FPS com delta fixo, maquina de estados
 * (MENU, PLAY, PAUSE, BLESSING, SHOP, TRANSITION, GAMEOVER, WIN), sistema de
 * salas, spawn de entidades, efeitos e o render de tudo.
 */
import { VIEW_W, VIEW_H, TUNING, S, FLOORS, floorScale, SOLID_TILES, T } from '../data/constants.js';
import { GameLoop } from './GameLoop.js';
import { Camera } from './Camera.js';
import { FX } from './FX.js';
import { Combat } from './Combat.js';
import { Audio } from './Audio.js';
import { Music } from './Music.js';
import { Save } from './Save.js';
import { Director } from './Director.js';
import { Input } from './Input.js';
import { RNG } from './RNG.js';
import { FlowField } from './Pathfinding.js';
import { SpriteFactory } from '../sprites/SpriteFactory.js';
import { setCanvasFactory } from '../sprites/pxutil.js';
import { PixelFont } from '../ui/PixelFont.js';
import { HUD } from '../ui/HUD.js';
import { Minimap } from '../ui/Minimap.js';
import { Menu } from '../ui/Menu.js';
import { Pause } from '../ui/Pause.js';
import { GameOver } from '../ui/GameOver.js';
import { Victory } from '../ui/Victory.js';
import { BlessingPicker } from '../ui/BlessingPicker.js';
import { Shop } from '../ui/Shop.js';
import { Dialogue } from '../ui/Dialogue.js';
import { Transitions } from '../ui/Transitions.js';
import { TouchControls } from '../ui/TouchControls.js';
import { Player } from '../entities/Player.js';
import { ProjectileSystem } from '../entities/Projectile.js';
import { Pickup, rollDrops } from '../entities/Pickup.js';
import { HazardSystem } from '../world/Hazard.js';
import { ENEMY_CLASSES } from '../entities/enemies/index.js';
import { BOSS_CLASSES } from '../entities/bosses/index.js';
import { scaleEnemy } from '../data/enemies.js';
import { dist } from './Physics.js';

export class Game {
  constructor(opts = {}) {
    this.canvas = opts.canvas || null;
    this.ctx = opts.ctx || (this.canvas ? this.canvas.getContext('2d') : null);
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
    this.canvasFactory = opts.canvasFactory || null;
    // ambientes headless (Node) injetam uma fabrica de canvas em software
    if (this.canvasFactory) setCanvasFactory(this.canvasFactory);

    // sistemas
    this.rng = new RNG(opts.seed ?? 12345);
    this.sprites = opts.sprites || new SpriteFactory({ canvasFactory: this.canvasFactory }).build();
    this.font = new PixelFont();
    this.camera = new Camera(VIEW_W, VIEW_H);
    this.fx = new FX(this.rng);
    this.combat = new Combat(this);
    this.audio = new Audio();
    this.music = new Music(this.audio);
    this.audio.music = name => this.music.play(name);
    this.save = new Save(opts.storage);
    this.audio.setMuted(this.save.data.muted);
    this.touch = (opts.touchContainer !== null && typeof document !== 'undefined' && opts.touch !== false)
      ? new TouchControls(opts.touchContainer || document.getElementById('touch')) : null;
    this.input = opts.input || new Input(this.canvas || { addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: VIEW_W, height: VIEW_H }), width: VIEW_W, height: VIEW_H }, this.touch);

    // UI
    this.hud = new HUD(this.font, this.sprites);
    this.minimap = new Minimap(this.font);
    this.menu = new Menu(this.font, this.sprites);
    this.pauseUI = new Pause(this.font);
    this.gameover = new GameOver(this.font, this.sprites);
    this.victory = new Victory(this.font, this.sprites);
    this.blessingPicker = new BlessingPicker(this.font, this.sprites);
    this.shop = new Shop(this.font, this.sprites);
    this.dialogue = new Dialogue(this.font);
    this.transitions = new Transitions(this.font);
    this.director = new Director(this);

    // estado da run
    this.state = S.MENU;
    this.room = null;
    this.floor = null;
    this.floorN = 1;
    this.floorData = FLOORS[0];
    this.floorScale = floorScale(1);
    this.player = null;
    this.boss = null;
    this.flow = new FlowField(1, 1);
    this.projectiles = new ProjectileSystem(this.rng, this.sprites);
    this.hazards = new HazardSystem(this.rng);
    this.pickups = [];
    this.totalTime = 0;
    this.time = 0;
    this.slowmo = 0;
    this.invertTimer = 0;
    this.rebootFlash = 0;
    this.shakeFlash = 0;
    this.pendingVictory = 0;
    this.stats = { coins: 0, coinsEarned: 0, kills: 0, time: 0, damageTaken: 0, hasKey: false, ammo: 0, minibossesKilled: 0, roomsCleared: 0, secretsFound: 0 };
    this.flowTimer = 0;
    this.debug = !!opts.debug;
    this.loop = new GameLoop(dt => this.update(dt), () => this.draw());
    this.menu.open(this);
  }

  // ================================================================ ciclo
  start() {
    this.loop.start();
    this.audio.resume();
  }

  /** Avanca a simulacao (dt em segundos, ja fixo em 1/60). */
  update(dt) {
    this.time += dt;
    // resume do audio no primeiro input
    if (this.input.anyKey && !this.audio.ctx) this.audio.resume();
    this.fx.update(dt);
    this.music.update(dt);
    this.transitions.update(dt);
    this.dialogue.update(dt);
    if (this.slowmo > 0) this.slowmo -= dt;

    switch (this.state) {
      case S.MENU:
        this.menu.update(dt, this, this.input);
        this.audio.music('menu');
        break;
      case S.PLAY:
        this.updatePlay(dt);
        break;
      case S.PAUSE:
        this.pauseUI.update(dt, this, this.input);
        break;
      case S.BLESSING:
        this.blessingPicker.update(dt, this, this.input);
        break;
      case S.SHOP:
        this.shop.update(dt, this, this.input);
        if (this.input.pressed('pause')) { this.shop.close(this); this.state = S.PLAY; }
        break;
      case S.GAMEOVER:
        this.gameover.update(dt, this, this.input);
        break;
      case S.WIN:
        this.victory.update(dt, this, this.input);
        break;
    }
    if (this.input.pressed('pause') && (this.state === S.PLAY || this.state === S.PAUSE)) this.togglePause();
    if (this.state !== S.PLAY) this.projectiles.clear();
    this.input.endFrame();
  }

  /** Um passo de gameplay (so roda no estado PLAY). */
  updatePlay(dt) {
    const player = this.player;
    const room = this.room;
    if (!room || !player) return;

    // timer global da run
    this.totalTime += dt;
    this.stats.time = this.totalTime;
    if (this.invertTimer > 0) this.invertTimer -= dt;

    // flow field de pathfinding (recalculado a cada 0.35s)
    this.flowTimer -= dt;
    if (this.flowTimer <= 0) {
      this.flowTimer = 0.35;
      this.flow.build(room.map, player.x, player.y);
    }

    // reinicio de sala (TI): congela por um instante
    if (this.rebootFlash > 0) this.rebootFlash -= dt;
    if (this.shakeFlash > 0) this.shakeFlash -= dt;

    player.update(dt, this);
    if (player.dead && player.deathTimer > 1.8) this.director.playerDied();

    // papeis de grupo entre inimigos vivos
    this.assignGroupRoles(room);

    // entidades
    for (const e of room.entities) {
      if (!e.dead) e.update(dt, this);
    }
    room.entities = room.entities.filter(e => !e.dead || e.isBoss === true && false);
    this.hazards.update(dt, this);
    this.projectiles.update(dt, this);
    for (const p of this.pickups) p.update(dt, this);
    this.pickups = this.pickups.filter(p => p.active);
    for (const inter of room.interactables || []) inter.update(dt, this);
    this.combat.update(dt);

    // contato corpo a corpo com inimigos
    this.checkContactDamage(dt);

    // props e portas
    room.update(dt, this);
    this.camera.update(dt, player.x, player.y, {
      x: Math.cos(player.aimAngle), y: Math.sin(player.aimAngle),
    });
    this.director.checkDoors();
    this.updateMusicIntensity();

    // recompensas pendentes de boss
    if (this.pendingVictory > 0) {
      this.pendingVictory -= dt;
      if (this.pendingVictory <= 0) this.director.startVictory();
    }
    // camera volta ao normal fora de arena de boss
    if (room.type !== 'miniboss' && room.type !== 'boss') this.camera.targetZoom = 1;
  }

  /** Inimigos com 3+ vivos na sala recebem papeis (perseguir, flanquear...). */
  assignGroupRoles(room) {
    const alive = room.entities.filter(e => !e.dead && e.isEnemy && !e.isBoss);
    if (alive.length < 3) {
      if (alive.length === 1) alive[0].role = 'pursue';
      return;
    }
    alive.forEach((e, i) => e.assignRole?.(i, alive.length));
  }

  /** Dano de contato: inimigos que encostam no player. */
  checkContactDamage(dt) {
    const player = this.player;
    if (player.dead) return;
    for (const e of this.room.entities) {
      if (e.dead || !e.isEnemy || !e.contactDamage) continue;
      const r = (e.radius || 6) + player.radius + 1;
      if (dist(e, player) < r) {
        const dashing = e.contactDash > 0;
        if (dashing || e.isBoss || e.def?.arch === 'swarm' || e.def?.arch === 'rusher') {
          this.combat.hitPlayer(e, e.damage || 1, {});
        }
      }
      if (e.contactDash > 0) e.contactDash -= dt;
    }
  }

  updateMusicIntensity() {
    const room = this.room;
    const enemies = room.entities.filter(e => !e.dead && e.isEnemy).length;
    let intensity = Math.min(1, enemies / 6);
    if (room.type === 'miniboss' || room.type === 'boss') intensity = Math.max(intensity, this.boss && !this.boss.dead ? 0.85 : 0.4);
    this.music.setIntensity(intensity);
    this.music.bpmScale = this.boss && !this.boss.dead ? 1.12 : 1;
  }

  /** Inverte os controles por N segundos (ataque do Estagiario de TI). */
  invertControls(sec) { this.invertTimer = sec; }

  /** Movimento do player com inversao (usado pelo Player). */
  axis() {
    const a = this.input.axis();
    if (this.invertTimer > 0) return { x: -a.x, y: -a.y, len: a.len };
    return a;
  }

  togglePause() {
    if (this.state === S.PLAY) { this.pauseUI.open(); this.state = S.PAUSE; this.audio.ui(); }
    else if (this.state === S.PAUSE) { this.state = S.PLAY; this.audio.ui(); }
  }

  toMenu() {
    this.state = S.MENU;
    this.menu.open(this);
    this.audio.music('menu');
  }

  buildReport(won) {
    const seals = Math.floor(this.stats.coinsEarned / 2) + (this.floorN - 1) * 5 + this.stats.minibossesKilled * 10;
    return {
      floor: this.floorN, kills: this.stats.kills, coins: this.stats.coins,
      time: this.stats.time, maxCombo: this.combat.maxCombo, seals, won,
      char: this.characterId, secret: this.stats.secretsFound,
    };
  }

  // ---- delegacoes para o Director (eventos de sala / run) ----
  onRoomCleared(room) { this.director.onRoomCleared(room); }
  onBossRoomCleared(room) { this.director.onBossRoomCleared(room); }
  onChestOpened(inter) { this.director.onChestOpened(inter); }
  onEventTriggered(inter) { this.director.onEventTriggered(inter); }
  onSecretFound(inter) { this.director.onSecretFound(inter); }
  openShop(inter) { this.director.openShop(inter); }
  shopPrices() { return this.director.shopPrices(); }
  nextFloor() { this.director.nextFloor(); }
  /** Morte do player: liga a animacao de morte e o fim da run. */
  onPlayerDeath() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    p.hp = 0;
    p.deathTimer = 0;
    p.vx = 0; p.vy = 0;
    p.setAnim('death');
    this.slowmo = 1.0;
    this.fx.burst(p.x, p.y, 'blood', { count: 14, speedMult: 1.2 });
    this.fx.banner('VOCE FOI DESLIGADO', '#ef5350', 2.2, 40);
    this.camera.addShake(6);
    this.audio.sfx('death');
  }
  finishRun(ending) { this.director.finishRun(ending); }

  // ================================================================ run
  startRun() { this.state = S.TRANSITION; this.transitions.floor(1, 'RECEPCAO', () => this.director.startRun()); }
  continueRun() { this.state = S.TRANSITION; this.transitions.floor(1, 'RETOMANDO EXPEDIENTE', () => this.director.continueRun()); }
  loadRun() { return this.save.data.runSnapshot || null; }
  saveRun(snap) { this.save.data.runSnapshot = snap; this.save.save(); }
  clearRunSnapshot() { this.save.data.runSnapshot = null; this.save.save(); }
  get characterId() { return this._charId || this.save.data.selectedChar; }
  set characterId(id) { this._charId = id; }

  createPlayer(characterId) {
    const p = new Player(0, 0, characterId);
    this.applyCharacter(p, characterId);
    return p;
  }

  applyCharacter(p, characterId) {
    const ch = (this.save.data.unlockedChars.includes(characterId) ? characterId : 'max');
    p.stats.character = ch;
  }

  /** Spawn de inimigo comum a partir dos dados do andar. */
  spawnEnemy(key, x, y, opts = {}) {
    const def = this.scaledEnemyDef(key);
    const Cls = ENEMY_CLASSES[key] || ENEMY_CLASSES.papel;
    let enemy;
    if (key === 'formulario') {
      // formularios passam a geracao para as copias ficarem mais fracas
      const Formulario = ENEMY_CLASSES.formulario;
      enemy = new Formulario(x, y, def, opts.generation || 0);
    } else {
      enemy = new Cls(x, y, def);
    }
    enemy.hp = enemy.maxHp = opts.hp ?? def.hp;
    this.room.entities.push(enemy);
    this.fx.ring(x, y, 2, 12, '#ff8fa3', 0.25, 1);
    return enemy;
  }

  scaledEnemyDef(key) {
    const scale = this.floorScale || floorScale(this.floorN);
    return scaleEnemy(key, scale);
  }

  spawnProjectile(o) { return this.projectiles.spawn(o); }
  spawnHazard(kind, x, y, opts) { return this.hazards.spawn(kind, x, y, opts); }
  spawnPickup(kind, x, y, opts = {}) {
    const p = new Pickup(kind, x, y, opts);
    this.pickups.push(p);
    return p;
  }
  dropLoot(enemy, coinBonus = 0) { return rollDrops(this, enemy, coinBonus); }

  spawnBoss(type, player) {
    const bossKey = type === true || type === 'boss' ? 'ceo' : (type === 'miniboss' ? undefined : type);
    const id = this.floorData.boss;
    const Cls = BOSS_CLASSES[id];
    if (!Cls) return null;
    const x = this.room.w / 2, y = this.room.h * 0.32;
    // chefes NAO usam a escala cheia do andar: o HP de cada um ja foi
    // balanceado para o proprio andar (senao o CEO virava um saco de pancadas)
    const bossScale = { hp: 1, damage: 1, speed: 1, coins: 1 };
    const boss = new Cls(x, y, bossScale);
    boss.game = this;
    this.room.entities.push(boss);
    this.room.boss = boss;
    this.boss = boss;
    boss.start(this);
    this.camera.targetZoom = 0.85;
    // props destrutiveis da arena com mais vida
    for (const prop of this.room.props) prop.hp *= 1.4;
    return boss;
  }

  // ================================================================ combate helpers
  /** Golpe corpo a corpo em arco (regua). */
  meleeSwing(source, x, y, length, arc, damage, angle, knockback = 200) {
    for (const e of this.room.entities) {
      if (e.dead || !e.isEnemy) continue;
      const d = dist({ x, y }, e);
      if (d > length + e.radius) continue;
      const a = Math.atan2(e.y - y, e.x - x);
      let diff = Math.abs(a - angle);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff <= arc) {
        this.combat.hitEnemy(e, damage, { fromX: x, fromY: y, knockback });
      }
    }
    for (const prop of this.room.props) {
      if (prop.destructible && !prop.broken && prop.hitsCircle(x, y, length * 0.6)) {
        this.combat.hitProp(prop, damage);
      }
    }
    this.audio.sfx('staple');
  }

  /** Feixe que atravessa (marca-texto). */
  beamAttack(source, angle, length, width, damage) {
    const steps = Math.ceil(length / 8);
    for (let i = 1; i <= steps; i++) {
      const x = source.x + Math.cos(angle) * (i * 8);
      const y = source.y + Math.sin(angle) * (i * 8);
      if (this.room.map.isSolidAt(x, y)) break;
      this.fx.burst(x, y, 'ink', { count: 1, size: 2, speedMult: 0.4 });
      for (const e of this.room.entities) {
        if (e.dead || !e.isEnemy) continue;
        if (Math.abs(e.x - x) < width + e.radius && Math.abs(e.y - y) < width + e.radius) {
          this.combat.hitEnemy(e, damage, { fromX: source.x, fromY: source.y, angle });
        }
      }
    }
  }

  /** Raio em cadeia (cabo HDMI). */
  chainAttack(source, range, jumps, damage, stun, angle) {
    let from = source;
    let remaining = jumps;
    const hit = new Set();
    while (remaining-- > 0) {
      let best = null, bestD = range;
      for (const e of this.room.entities) {
        if (e.dead || !e.isEnemy || hit.has(e.id)) continue;
        const d = dist(from, e);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break;
      hit.add(best.id);
      this.fx.burst(best.x, best.y, 'spark', { count: 6 });
      this.fx.ring(best.x, best.y, 2, 14, '#00e676', 0.2, 1);
      this.combat.hitEnemy(best, damage, { stun, fromX: from.x, fromY: from.y });
      from = best;
    }
    if (!hit.size) this.audio.sfx('click', { pitch: 0.5 });
  }

  /** Rastro de tinta (bencao Marca-texto). */
  addInkTrail(x, y) {
    const p = this.player;
    this.hazards.spawn('ink', x, y, {
      radius: 10, damage: p.stats.trailDamage, life: 2.5, from: null,
    });
  }

  /** Dano na parede secreta (retorna true se quebrou/atingiu). */
  damageSecretWall(x, y, damage) {
    const map = this.room.map;
    const cx = Math.floor(x / 16), cy = Math.floor(y / 16);
    if (map.get(cx, cy) !== T.SECRET) return false;
    this.room.secretHp = (this.room.secretHp || 0) + damage;
    this.fx.burst(x, y, 'dust', { count: 5 });
    this.audio.sfx('stamp', { pitch: 0.8, volume: 0.2 });
    if (this.room.secretHp >= 6) {
      this.director.breakSecretWall(this.room, cx, cy);
    }
    return true;
  }

  nearestProp(x, y, maxDist) {
    let best = null, bestD = maxDist;
    for (const p of this.room.props) {
      if (p.dead) continue;
      const d = dist({ x, y }, p);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  nearestExecutable(x, y, maxDist) {
    let best = null, bestD = maxDist;
    for (const e of this.room.entities) {
      if (e.dead || !e.isEnemy || !e.executable) continue;
      const d = dist({ x, y }, e);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  findInteractable(x, y) {
    for (const inter of this.room.interactables || []) {
      if (inter.used && inter.kind !== 'elevator' && inter.kind !== 'shop') continue;
      if (dist({ x, y }, inter) < inter.radius + 8) return inter;
    }
    return null;
  }

  useInteractable(inter) {
    if (inter.kind === 'shop') { this.director.openShop(inter); return true; }
    const ok = inter.interact(this);
    if (ok && this.player) { /* feedback */ }
    return ok;
  }

  // ================================================================ render
  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (this.state === S.MENU) {
      this.menu.draw(ctx, this);
      this.transitions.draw(ctx, this);
      return;
    }
    if (this.state === S.WIN) {
      this.victory.draw(ctx, this);
      this.transitions.draw(ctx, this);
      return;
    }
    if (this.state === S.GAMEOVER) {
      this.gameover.draw(ctx, this);
      this.transitions.draw(ctx, this);
      return;
    }
    if (!this.room || !this.player) {
      this.transitions.draw(ctx, this);
      return;
    }

    // ---- mundo
    this.camera.apply(ctx);
    const view = this.camera.view();
    this.room.draw(ctx, this.sprites, this.time, view);
    this.hazards.draw(ctx);
    for (const p of this.pickups) p.draw(ctx, this.sprites);
    for (const inter of this.room.interactables || []) {
      const near = dist(inter, this.player) < inter.radius + 14;
      inter.draw(ctx, this.sprites, this.font, near);
    }
    this.drawEntities(ctx);
    this.projectiles.draw(ctx);
    this.fx.drawWorld(ctx, this.sprites);
    this.drawExecuteHint(ctx);
    if (this.debug) this.room.map.debugDraw(ctx);
    this.camera.restore(ctx);

    // ---- flash de dano / reboot
    if (this.shakeFlash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${this.shakeFlash * 0.35})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.rebootFlash > 0) {
      ctx.fillStyle = `rgba(10,20,10,${Math.min(0.9, this.rebootFlash * 2)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      this.font.draw(ctx, 'REBOOT', VIEW_W / 2, VIEW_H / 2 - 10, '#00e676', 2, 'center');
    }
    // vinheta
    this.drawVignette(ctx);

    // ---- UI (coordenadas de tela)
    ctx.save();
    this.camera.apply(ctx);
    this.fx.drawNumbers(ctx, this.font, this.camera);
    ctx.restore();
    this.hud.draw(ctx, this, this.loop.dt || 1 / 60);
    this.minimap.draw(ctx, this);
    this.dialogue.draw(ctx);
    this.fx.drawBanners(ctx, this.font);

    if (this.state === S.BLESSING) this.blessingPicker.draw(ctx, this);
    if (this.state === S.SHOP) this.shop.draw(ctx, this);
    if (this.state === S.PAUSE) this.pauseUI.draw(ctx, this);
    this.transitions.draw(ctx, this);
  }

  /** Prompt de EXECUTAR sobre o inimigo com a postura cheia (coords de mundo). */
  drawExecuteHint(ctx) {
    const target = this.nearestExecutable(this.player.x, this.player.y, 110);
    if (!target) return;
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(this.time * 12) * 0.3;
    this.font.draw(ctx, 'EXECUTAR [E]', target.x, target.y - 26, '#ff5252', 1, 'center', '#000000');
    ctx.restore();
  }

  /** Desenha props + entidades com ordenacao por Y (profundidade). */
  drawEntities(ctx) {
    const room = this.room;
    const sortable = [];
    for (const p of room.props) if (!p.dead) sortable.push({ y: p.y, kind: 'prop', ref: p });
    for (const e of room.entities) if (!e.dead) sortable.push({ y: e.y, kind: 'entity', ref: e });
    if (this.player && !this.player.dead) sortable.push({ y: this.player.y, kind: 'player', ref: this.player });
    sortable.sort((a, b) => a.y - b.y);
    for (const item of sortable) {
      if (item.kind === 'prop') item.ref.draw(ctx, this.sprites);
      else if (item.kind === 'player') item.ref.draw(ctx, this.sprites, this);
      else item.ref.draw(ctx, this.sprites, this);
    }
  }

  drawVignette(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, VIEW_W, 3);
    ctx.fillRect(0, VIEW_H - 3, VIEW_W, 3);
    ctx.restore();
  }

  /** Redimensiona o canvas mantendo o aspecto (pixel art). */
  resize() {
    if (!this.canvas) return;
    const scale = Math.max(1, Math.floor(Math.min(
      innerWidth / VIEW_W, innerHeight / VIEW_H,
    )));
    this.canvas.style.width = VIEW_W * scale + 'px';
    this.canvas.style.height = VIEW_H * scale + 'px';
  }
}

export { SOLID_TILES, TUNING };
