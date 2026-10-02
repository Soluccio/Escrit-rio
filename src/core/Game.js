/**
 * Game.js — o coracao: loop de 60 FPS com delta fixo, maquina de estados
 * (MENU, PLAY, PAUSE, BLESSING, SHOP, TRANSITION, GAMEOVER, WIN), sistema de
 * salas, spawn de entidades, efeitos e o render de tudo.
 */
import { VIEW_W, VIEW_H, TUNING, S, FLOORS, floorScale, SOLID_TILES } from '../data/constants.js';
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
import { rollDrops } from '../entities/Pickup.js';
import { HazardSystem } from '../world/Hazard.js';
import { spawnEnemy, spawnBoss, spawnPickup, scaledEnemyDef } from './Spawner.js';
import { dist } from './Physics.js';
import {
  meleeSwing, beamAttack, chainAttack, addInkTrail,
  damageSecretWall, nearestProp, nearestExecutable, findInteractable,
} from './Weapons.js';
import { drawGame } from './WorldRenderer.js';

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
  // ---- fabricas de entidades (implementacao em Spawner.js)
  spawnEnemy(key, x, y, opts) { return spawnEnemy(this, key, x, y, opts); }
  scaledEnemyDef(key) { return scaledEnemyDef(this, key); }
  spawnProjectile(o) { return this.projectiles.spawn(o); }
  spawnHazard(kind, x, y, opts) { return this.hazards.spawn(kind, x, y, opts); }
  spawnPickup(kind, x, y, opts) { return spawnPickup(this, kind, x, y, opts); }
  dropLoot(enemy, coinBonus = 0) { return rollDrops(this, enemy, coinBonus); }
  spawnBoss(type, player) { return spawnBoss(this, type, player); }

  /** Golpe corpo a corpo em arco (regua). */
  /** Desenha um frame (delega ao WorldRenderer). */
  draw() { drawGame(this, this.ctx); }

  // --- API publica usada por entidades/itens (implementacao em Weapons.js) ---
  meleeSwing(s, x, y, len, arc, dmg, ang, kb) { return meleeSwing(this, s, x, y, len, arc, dmg, ang, kb); }
  beamAttack(s, ang, len, w, dmg) { return beamAttack(this, s, ang, len, w, dmg); }
  chainAttack(s, range, jumps, dmg, stun, ang) { return chainAttack(this, s, range, jumps, dmg, stun, ang); }
  addInkTrail(x, y) { return addInkTrail(this, x, y); }
  damageSecretWall(x, y, d) { return damageSecretWall(this, x, y, d); }
  nearestProp(x, y, maxD) { return nearestProp(this, x, y, maxD); }
  nearestExecutable(x, y, maxD) { return nearestExecutable(this, x, y, maxD); }
  findInteractable(x, y) { return findInteractable(this, x, y); }

  /** Usa um interativo (bau, cafeteira, elevador...). */
  useInteractable(inter) {
    if (!inter || inter.used) return false;
    inter.interact(this);
    return true;
  }

}


export { SOLID_TILES, TUNING };
