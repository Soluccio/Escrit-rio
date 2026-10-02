/**
 * Director.js — o "diretor de run": fluxo entre andares, entrada/saida de salas,
 * recompensas (bencaos, chave, itens), eventos de sala e o desfecho da run.
 * O Game cuida do loop e do render; o Director cuida do que acontece quando.
 */
import { FLOORS, TILE, floorScale, RARITY_COLOR, S } from '../data/constants.js';
import { RNG } from './RNG.js';
import { generateFloor } from '../world/RoomGenerator.js';
import { Interactable } from '../entities/Interactable.js';
import { Prop } from '../world/Prop.js';
import { rollBlessings, BLESSING_BY_ID } from '../data/blessings.js';
import { ITEMS } from '../data/items.js';
import { CHARACTERS, sealsFromRun } from '../data/characters.js';
import { BOSSES } from '../data/bosses.js';

export class Director {
  constructor(game) { this.game = game; }

  // ---------------------------------------------------------------- run
  startRun(seed = null, characterId = null) {
    const g = this.game;
    const save = g.save.data;
    const char = characterId || save.selectedChar || 'max';
    g.runSeed = seed ?? ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    g.rng = new RNG(g.runSeed);
    g.characterId = char;
    g.stats = {
      coins: 0, coinsEarned: 0, kills: 0, time: 0, damageTaken: 0,
      hasKey: false, ammo: 0, minibossesKilled: 0, roomsCleared: 0, secretsFound: 0,
    };
    g.combat.resetRun();
    g.player = g.createPlayer(char);
    g.player.items = [g.player.activeItem];
    g.floorN = 1;
    this.loadFloor(1);
    g.state = S.PLAY;
    g.audio.resume();
    g.audio.music(FLOORS[0].music);
    g.fx.clear();
    g.dialogue.clear();
    g.totalTime = 0;
    this.saveRunSnapshot();
  }

  /** Reconstroi a run a partir do snapshot (mesma seed = mesmo predio). */
  continueRun() {
    const g = this.game;
    const snap = g.loadRun();
    if (!snap) { this.startRun(); return false; }
    g.runSeed = snap.seed;
    g.rng = new RNG(snap.seed);
    g.characterId = snap.char;
    g.player = g.createPlayer(snap.char);
    // reaplica as bencaos na ordem em que foram pegas
    for (const id of snap.blessings || []) {
      const b = BLESSING_BY_ID[id];
      if (b) g.player.addBlessing(b);
    }
    g.player.activeItem = snap.activeItem || g.player.activeItem;
    g.player.items = snap.items || [g.player.activeItem];
    g.player.hp = Math.max(1, Math.min(g.player.maxHp, snap.hp));
    g.player.coinsCollected = snap.coinsEarned || 0;
    g.stats = {
      coins: snap.coins || 0, coinsEarned: snap.coinsEarned || 0, kills: snap.kills || 0,
      time: snap.time || 0, damageTaken: 0, hasKey: !!snap.hasKey,
      ammo: 0, minibossesKilled: snap.minibossesKilled || 0, roomsCleared: 0, secretsFound: 0,
    };
    g.floorN = snap.floorN || 1;
    this.loadFloor(g.floorN);
    g.state = S.PLAY;
    g.audio.resume();
    g.audio.music(g.floorData.music);
    g.fx.clear();
    return true;
  }

  /** Salva um snapshot leve da run (a geracao e deterministica pela seed). */
  saveRunSnapshot() {
    const g = this.game;
    if (!g.player) return;
    g.saveRun({
      seed: g.runSeed, char: g.characterId, floorN: g.floorN,
      hp: g.player.hp, maxHp: g.player.maxHp,
      coins: g.stats.coins, coinsEarned: g.stats.coinsEarned,
      blessings: g.player.stats.blessings.map(b => b.id),
      activeItem: g.player.activeItem, items: g.player.items,
      kills: g.stats.kills, time: g.stats.time, hasKey: g.stats.hasKey,
      minibossesKilled: g.stats.minibossesKilled,
    });
  }

  // ---------------------------------------------------------------- andares
  loadFloor(n) {
    const g = this.game;
    g.floorN = n;
    g.floorData = FLOORS[Math.min(FLOORS.length - 1, n - 1)];
    g.floorScale = floorScale(n);
    g.floor = generateFloor(n, (g.runSeed ^ (n * 7919)) >>> 0);
    g.floor.n = n;
    // salas marcadas como nao construidas; a sala inicial e construida agora
    const start = g.floor.start;
    this.enterRoom(start, null, true);
    g.minimap.updateReveal(g.floor, start, g.player.stats.revealAdjacent);
    g.player.onFloorStart();
    g.spawnPickup('coffee', g.player.x - 20, g.player.y, { life: Infinity });
    g.spawnPickup('coffee', g.player.x + 20, g.player.y, { life: Infinity });
    this.saveRunSnapshot();
  }

  /** Entra numa sala: constroi, posiciona o player e inicia o combate. */
  enterRoom(room, fromSide = null, instant = false) {
    const g = this.game;
    g.room = room;
    if (!room.built) room.build(g.sprites);
    room.visited = true;
    g.projectiles.clear();
    g.hazards.clear();
    g.fx.clear();
    g.boss = null;
    g.musicIntensityDirty = true;
    // portas do andar: portas visiveis conforme o grafo
    room.buildInteractables?.(g);
    this.ensureInteractables(room);
    // posiciona o player
    const doorPos = fromSide ? room.map.doorCenter(fromSide) : room.center;
    const p = g.player;
    if (fromSide) {
      const off = 14;
      if (fromSide === 'N') p.y = doorPos.y + off;
      if (fromSide === 'S') p.y = doorPos.y - off;
      if (fromSide === 'W') p.x = doorPos.x + off;
      if (fromSide === 'E') p.x = doorPos.x - off;
      // ajuste fino para nao nascer dentro de parede
      while (room.map.boxHitsSolid(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h) && off < 60) {
        p.y += fromSide === 'N' ? 2 : fromSide === 'S' ? -2 : 0;
        p.x += fromSide === 'W' ? 2 : fromSide === 'E' ? -2 : 0;
      }
    } else {
      p.x = doorPos.x; p.y = doorPos.y + 10;
    }
    p.vx = p.vy = 0;
    g.camera.setBounds(room.w, room.h);
    if (instant) g.camera.snap(p.x, p.y);
    else g.camera.snap(p.x, p.y);
    g.camera.targetZoom = 1;
    p.invuln = Math.max(p.invuln, 0.5);
    room.start(g, p);
    g.minimap.updateReveal(g.floor, room, p.stats.revealAdjacent);
    if (!instant) g.audio.sfx('elevator', { pitch: 1.4, volume: 0.15 });
    this.saveRunSnapshot();
  }

  /** Cria os interativos a partir dos props da sala (cafeteira, vending...). */
  ensureInteractables(room) {
    if (room.interactablesReady) return;
    room.interactablesReady = true;
    room.interactables = room.interactables || [];
    for (const prop of room.props) {
      if (prop.interact === 'coffee') {
        room.interactables.push(new Interactable('coffee', prop.x, prop.y + 6, { prop }));
      } else if (prop.interact === 'shop') {
        room.interactables.push(new Interactable('shop', prop.x, prop.y + 6));
      }
    }
    // arena de chefe: elevador no canto superior (recompensa da luta)
    if (room.type === 'miniboss' || room.type === 'boss') {
      const elev = new Prop('elevator', room.w / 2, TILE * 2.5);
      room.props.push(elev);
      const it = new Interactable('elevator', room.w / 2, TILE * 2.5, {
        data: { unlocked: false, final: room.type === 'boss' },
      });
      room.elevator = it;
      room.interactables.push(it);
    }
    // sala secreta: recompensa grande no centro
    if (room.type === 'secret') {
      room.interactables.push(new Interactable('secret', room.center.x, room.center.y, {
        data: { big: true },
      }));
    }
  }

  // ---------------------------------------------------------------- portas
  /** Verifica se o player atravessou uma porta e troca de sala. */
  checkDoors() {
    const g = this.game;
    const room = g.room;
    const p = g.player;
    if (!room || p.dead) return;
    const T = TILE;
    let side = null;
    if (p.y < T * 0.7 && room.doors.N) side = 'N';
    else if (p.y > room.h - T * 0.7 && room.doors.S) side = 'S';
    else if (p.x < T * 0.7 && room.doors.W) side = 'W';
    else if (p.x > room.w - T * 0.7 && room.doors.E) side = 'E';
    if (!side) return;
    // a porta esta trancada?
    const mid = room.map.doorCenter(side);
    const tileX = Math.floor(mid.x / T), tileY = Math.floor(mid.y / T);
    if (room.map.isSolidTile(tileX, tileY)) {
      p.y = Math.max(p.y, T * 1.1);
      p.x = Math.max(p.x, T * 1.1);
      return;
    }
    const dx = side === 'E' ? 1 : side === 'W' ? -1 : 0;
    const dy = side === 'S' ? 1 : side === 'N' ? -1 : 0;
    const next = g.floor.at(room.gx + dx, room.gy + dy);
    if (!next) return;
    const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' }[side];
    this.enterRoom(next, opposite);
  }

  /** Abre a parede secreta (3 acertos com o ataque). */
  breakSecretWall(room, cx, cy) {
    const g = this.game;
    if (!room.secretNeighbor) return false;
    const host = room.secretNeighbor.room;
    const side = room.secretNeighbor.side;
    // converte a parede do host em porta nos dois lados
    room.doors[side] = true;
    host.doors[room.secretNeighbor.opposite || { N: 'S', S: 'N', E: 'W', W: 'E' }[side]] = true;
    room.map.carveDoor(side, 4, false);
    host.map.carveDoor({ N: 'S', S: 'N', E: 'W', W: 'E' }[side], 4, false);
    room.map.prerender(g.sprites);
    host.map.prerender(g.sprites);
    room.map._dirty = false;
    g.stats.secretsFound++;
    g.fx.burst(room.map.doorCenter(side).x, room.map.doorCenter(side).y, 'dust', { count: 14 });
    g.fx.banner('PAREDE QUEBRADA: ARQUIVO MORTO', '#ff5252', 2, 40);
    g.audio.sfx('secret');
    g.save.data.seenSecret = true;
    const sr = host;
    sr.discovered = true;
    g.minimap.updateReveal(g.floor, g.room, true);
    return true;
  }

  // ---------------------------------------------------------------- recompensas
  onRoomCleared(room) {
    const g = this.game;
    g.stats.roomsCleared++;
    g.fx.banner('SALA LIMPA', '#7fe3d4', 1.4, 44);
    g.audio.sfx('elevator', { pitch: 1.2 });
    // chance de bencao: primeira sala do andar sempre, depois 45%
    const first = !room.blessingGiven && g.floor.list.filter(r => r.blessingGiven).length === 0;
    if (first || g.rng.chance(0.45)) {
      room.blessingGiven = true;
      this.offerBlessing('SALA LIMPA');
    }
  }

  offerBlessing(reason, pool = null) {
    const g = this.game;
    const owned = g.player.stats.blessings.map(b => b.id);
    g.blessingPicker.open(g.rng, owned, reason, (chosen) => {
      if (chosen) g.player.addBlessing(chosen);
      g.state = S.PLAY;
    }, pool);
    if (g.blessingPicker.active) g.state = S.BLESSING;
  }

  onBossRoomCleared(room) {
    const g = this.game;
    const boss = room.boss;
    if (!boss) return;
    // elevador liberado
    if (room.elevator) {
      room.elevator.data.unlocked = true;
      g.fx.banner('ELEVADOR LIBERADO', '#7fe3d4', 2, 44);
    }
    this.giveBossReward(boss);
  }

  giveBossReward(boss) {
    const g = this.game;
    const id = boss.bossId;
    const def = BOSSES[id];
    g.save.markBossKill(id);
    g.stats.minibossesKilled++;
    const reward = def?.reward || {};
    const p = g.player;
    if (reward.key) {
      g.stats.hasKey = true;
      g.spawnPickup('key', boss.x, boss.y, {});
      g.fx.banner('CHAVE DO ELEVADOR!', '#ffcf4d', 2.4, 44);
    }
    if (reward.badge) {
      g.spawnPickup('badge', boss.x, boss.y, {});
    }
    if (reward.coffees) {
      for (let i = 0; i < Math.min(8, reward.coffees); i++) {
        g.spawnPickup('coffee', boss.x + g.rng.range(-20, 20), boss.y + g.rng.range(-20, 20), { life: Infinity });
      }
    }
    if (reward.signedForm) g.spawnPickup('form', boss.x, boss.y, {});
    if (reward.legendary) g.spawnPickup('drive', boss.x, boss.y, {});
    if (reward.item) {
      p.items = p.items || [p.activeItem];
      if (p.items.length < p.stats.activeSlots) p.items.push(reward.item);
      else p.items[p.items.length - 1] = reward.item;
      p.activeItem = reward.item;
      g.fx.banner(ITEMS[reward.item].name.toUpperCase() + ' EQUIPADO', '#7fe3d4', 2, 44);
    }
    if (reward.coins) {
      for (let i = 0; i < Math.min(10, Math.round(reward.coins / 8)); i++) {
        g.spawnPickup('coin', boss.x + g.rng.range(-24, 24), boss.y + g.rng.range(-24, 24), { amount: 8, life: Infinity });
      }
    }
    // bencao garantida do mini-boss / boss
    if (reward.blessings) this.offerBlessing('RECOMPENSA DO CHEFE');
    if (reward.rareBlessing) {
      const owned = p.stats.blessings.map(b => b.id);
      const rare = rollBlessings(g.rng, 1, owned).map(b => b);
      const rarePool = rollBlessings(g.rng, 1, owned, null);
      this.offerBlessing('BENCAO RARA', rarePool);
    }
    g.fx.freezeFrame(0.5);
    g.camera.addShake(7);
    g.audio.sfx('bossHorn');
  }

  onBossDefeated(boss) {
    const g = this.game;
    g.fx.freezeFrame(0.6);
    g.fx.burst(boss.x, boss.y, boss.bossId === 'ceo' ? 'gold' : 'clip', { count: 24, speedMult: 1.6 });
    g.camera.addShake(9);
    g.audio.sfx(boss.bossId === 'ceo' ? 'ceoRoar' : 'death');
    // slow motion: congela a simulacao por 1.2s
    g.slowmo = 1.2;
    if (boss.bossId === 'ceo') {
      g.pendingVictory = 1.6;
    }
  }

  // ---------------------------------------------------------------- interacoes
  onChestOpened(inter) {
    const g = this.game;
    g.audio.sfx('secret');
    g.fx.burst(inter.x, inter.y, 'gold', { count: 16, speedMult: 1.3 });
    // item garantido: item ativo novo ou bencao
    if (g.rng.chance(0.5)) {
      const ids = Object.keys(ITEMS);
      const id = g.rng.pick(ids);
      const p = g.player;
      p.items = p.items || [p.activeItem];
      if (p.items.length < p.stats.activeSlots) p.items.push(id);
      else p.items[p.items.length - 1] = id;
      p.activeItem = id;
      g.fx.banner(ITEMS[id].name.toUpperCase() + '!', '#7fe3d4', 2.2, 44);
    } else {
      this.offerBlessing('TESOURO');
    }
    g.dropLoot({ x: inter.x, y: inter.y, def: { coins: 3 } }, 0);
  }

  onEventTriggered(inter) {
    const g = this.game;
    const events = [
      {
        text: 'Colega fofoqueiro: "Cara, pega esse cafe... vai por mim."',
        apply: () => { g.spawnPickup('coffee', inter.x, inter.y, {}); g.player.heal(1); },
      },
      {
        text: 'Cafe da copa esta gratis. Voce enche a caneca.',
        apply: () => { g.player.heal(1); },
      },
      {
        text: 'Achou um cracha no chao. Ninguem sentiu falta.',
        apply: () => { g.stats.coins += 15; g.fx.banner('+15 MOEDAS', '#ffd54f', 1.6, 44); },
      },
      {
        text: 'A impressora imprimiu 40 paginas sozinha. Ninguem sabe de nada.',
        apply: () => { this.offerBlessing('EVENTO: IMPRESSORA AMALDICOADA'); },
      },
      {
        text: 'O RH deixou um formulario em branco. Assine e veja no que da.',
        apply: () => { g.player.hp = Math.max(1, g.player.hp - 1); g.spawnPickup('heart', inter.x, inter.y + 16, {}); },
      },
    ];
    const ev = g.rng.pick(events);
    g.fx.banner('EVENTO', '#b39ddb', 1.4, 44);
    g.dialogue.show('SALA DE ESPERA', ev.text, 3.4);
    ev.apply();
  }

  onSecretFound(inter) {
    const g = this.game;
    g.fx.burst(inter.x, inter.y, 'gold', { count: 24, speedMult: 1.5 });
    g.audio.sfx('secret');
    g.stats.coins += 40;
    g.fx.banner('ARQUIVO MORTO: +40 MOEDAS', '#ffd54f', 2.2, 44);
    const owned = g.player.stats.blessings.map(b => b.id);
    const options = rollBlessings(g.rng, 3, owned);
    g.spawnPickup('heart', inter.x - 18, inter.y, {});
    g.spawnPickup('coffee', inter.x + 18, inter.y, {});
    this.offerBlessing('RECOMPENSA SECRETA');
  }

  openShop(inter) {
    const g = this.game;
    g.shop.open(g, inter);
    g.state = S.SHOP;
  }

  shopPrices() {
    const g = this.game;
    return {
      weapon: 18 + g.floorN * 4 + g.rng.int(-2, 3),
      blessing: 22 + g.floorN * 5,
      heal: 10 + g.floorN * 2,
    };
  }

  // ---------------------------------------------------------------- fim
  nextFloor() {
    const g = this.game;
    if (g.floorN >= 6) { this.startVictory(); return; }
    g.state = S.TRANSITION;
    g.transitions.floor(g.floorN + 1, g.floorData.name, () => {
      g.floorN++;
      const nextData = FLOORS[g.floorN - 1];
      g.rng = new RNG((g.runSeed ^ (g.floorN * 7919)) >>> 0);
      this.loadFloor(g.floorN);
      g.audio.music(nextData.music);
      g.player.heal(Math.max(1, Math.ceil(g.player.maxHp * 0.25)));
      g.state = S.PLAY;      // a transicao acabou: devolve o controle
    });
  }

  playerDied() {
    const g = this.game;
    g.stats.time = g.totalTime;
    const report = g.buildReport(false);
    g.save.finishRun({
      won: false, floor: g.floorN, time: g.stats.time,
      maxCombo: g.combat.maxCombo, coinsEarned: g.stats.coinsEarned,
      minibossesKilled: g.stats.minibossesKilled, seals: report.seals,
    });
    g.clearRunSnapshot();
    g.gameover.open(report);
    g.state = S.GAMEOVER;
    g.audio.music('menu');
  }

  startVictory() {
    const g = this.game;
    g.state = S.WIN;
    g.victory.open(g.buildReport(true));
    g.audio.music('victory');
  }

  finishRun(ending) {
    const g = this.game;
    g.save.markEnding(ending);
    const report = g.buildReport(true);
    g.save.finishRun({
      won: true, floor: 6, time: g.stats.time, maxCombo: g.combat.maxCombo,
      coinsEarned: g.stats.coinsEarned, minibossesKilled: g.stats.minibossesKilled,
      seals: report.seals, ending,
    });
    g.clearRunSnapshot();
  }
}
