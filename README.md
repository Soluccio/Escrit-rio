# Pilha de Papel — Roguelike Corporativo

Roguelike top-down em **HTML5 Canvas 2D puro**, com pixel art 100% procedural,
audio 100% procedural (Web Audio API) e **zero dependencias**. Voce e o **Max**,
estagiario em um predio que virou um escritorio vivo: seis andares, cinco
mini-chefes e um CEO que quer te efetivar — para sempre.

```
Recepcao (竹)  -> Vendas (商)  -> RH (書)  -> Reunioes (会)  -> TI (技)  -> Diretoria (終)
```

## Como jogar

Nao precisa instalar nada (nem `npm install`):

```bash
node tools/server.mjs          # abra http://localhost:5173
```

O servidor e um `node:http` de ~70 linhas com o MIME correto para **ES Modules**
(`text/javascript`), o que importa: o navegador recusa modulos servidos como
`text/plain`.

Qualquer servidor estatico funciona (`npx serve`, `python3 -m http.server`...).
Se preferir Vite:

```bash
npx vite                        # opcional, o projeto nao depende disso
```

### Controles

> **Controles de toque:** o overlay so aparece em celular/tablet de verdade
> (`pointer: coarse` **e** `hover: none` **e** userAgent movel). No menu, a opcao
> **CONTROLES: AUTO / TOUCH / TECLADO** força o modo desejado (salvo em
> `localStorage`, chave `touchPref`).

| Acao | Teclado / Mouse | Toque |
|------|-----------------|-------|
| Mover | `WASD` ou setas | joystick esquerdo |
| Mirar | mouse | joystick direito (auto-mira se soltar) |
| Atirar clipes | clique esquerdo (segure) — **atira na direcao do cursor** | botao A |
| Item ativo | `Espaco` / botao direito | botao B |
| Dash (0,3 s invulneravel) | `Shift` | botao DASH |
| Interagir / **executar** | `E` | botao E |
| Pausar | `Esc` / `P` | botao de pausa |

## O que tem no jogo

- **6 andares** com bioma, paleta, kanji, pool de inimigos e mini-chefe proprios.
- **11 inimigos** com FSM completa (IDLE/PATROL/ALERT/CHASE/TELEGRAPH/ATTACK/
  RETREAT/HURT/DEAD), linha de visao, pathfinding BFS (flow field), telegrafia
  obrigatoria, separacao suave e divisao de papeis quando ha 3+ inimigos.
- **Postura + execucao**: encha a barra de postura do inimigo e aperte `E` para
  executar (dano massivo + freeze frame).
- **Salas procedurais** em grade 9x9 com seed do dia: caminho principal,
  ramificacoes, tesouro, loja, descanso, evento e sala secreta atras de parede
  destrutivel. O minimapa revela apenas o que voce visitou.
- **Bencaos**: 3 cartas apos cada sala limpa, com raridades (comum/rara/lendaria),
  ~24 bencaos e meta-progressao de **Selos de Estagio** desbloqueando 6
  personagens (Max, Bia, Tonho, Kiko, Duda, Seu Ze).
- **CEO com 3 fases** — na fase 3 ele **espelha as suas bencaos** e luta com o seu
  proprio kit. Final com escolha: aceitar a proposta (loop) ou quebrar o ciclo.
- **Juice**: screen shake, hit stop de 40 ms, freeze frame, numeros de dano
  coloridos por tipo, combo `x3 COMBO!` com bonus de moedas, camera com deadzone
  e zoom 0.85 nas arenas de chefe.
- **Audio procedural**: musica generativa por andar (intensidade sobe com o
  combate) e todos os SFX gerados por osciladores/ruido.

## Estrutura

```
index.html            canvas 480x270 + overlay de toque
src/
  main.js             boot, resize, desbloqueio de audio, auto-pause
  data/               constants.js (TODO o tuning), enemies, bosses, blessings,
                      items, characters, rooms, audio-map
  core/               Game, GameLoop, Director, Input, Combat, Physics, Camera,
                      FX, Pathfinding, Audio, Music, Save, RNG,
                      Weapons (armas/itens), WorldRenderer (desenho do frame)
  entities/           Entity, Player (+PlayerAttacks), Enemy (+EnemyAI/EnemyState),
                      Projectile, Pickup, Blessing, Interactable, enemies/, bosses/
  sprites/            Pixel art procedural: Palette, pxutil, drawPlayer,
                      drawEnemies, drawBosses, drawItems, drawTiles, drawProps,
                      SpriteFactory (pre-render + cache)
  world/              TileMap, Prop, Room, RoomTypes, RoomGenerator, Hazard
  ui/                 PixelFont, HUD, Minimap, Menu, Pause, Shop, BlessingPicker,
                      Dialogue, GameOver, Victory, TouchControls, Transitions
tools/                server.mjs (preview), smoke.mjs, duel.mjs, screenshot.mjs,
                      artsheet.mjs, headless.mjs, softcanvas.mjs, png.mjs
tests/                node:test — salas, inimigos, combate, bencaos, sistemas
```

Nenhum arquivo passa de 400 linhas; todo sistema esta comentado em portugues e
**todo valor de tuning vive em `src/data/constants.js`**.

## Ferramentas de desenvolvimento

```bash
npm test                                  # 57 testes (node:test), 100% headless
node tools/smoke.mjs 6000 4242            # bot joga 100 s; falha se houver erro
node tools/smoke.mjs 26000 4242 --fast    # run inteira ate o CEO (player buffado)
node tools/playtest.mjs                   # capturas de validacao (playtest 1)
node tools/duel.mjs 8 1                   # medidor de dificuldade por andar
node tools/duel.mjs 4 5 --build=mid       # curva de dificuldade (ver docs/BALANCE.md)
node tools/screenshot.mjs                 # gera shots/cena-*.png (960x540)
node tools/artsheet.mjs shots             # folhas de sprite para inspecao
node tools/browser-smoke.mjs              # boota o jogo com DOM falso
```

O jogo roda **headless** de verdade: `tools/softcanvas.mjs` implementa um Canvas
2D em memoria (fillRect, paths, compositing, drawImage, gradientes) e
`tools/domstub.mjs` um DOM minimo com `requestAnimationFrame` controlado. E o que
permite testar gameplay — e nao so funcoes puras — no CI, sem navegador.

## Decisoes tecnicas

- **Delta fixo de 1/60** com acumulador (`GameLoop`), clamp de 0,1 s e no maximo
  5 passos por frame: o mesmo comportamento em 60 Hz, 144 Hz ou headless.
- **Sprites pre-renderizados** (`SpriteFactory`): 163 animacoes / 457 frames
  gerados uma vez em canvases fora de tela, desenhados com
  `imageSmoothingEnabled = false`.
- **Object pooling** para particulas (limite de 120 ativas) e projeteis (160).
- **Tudo procedural**: nenhum asset externo, nenhuma fonte, nenhum audio baixado.
- **Seed deterministica** por dia + hora (`RNG` xorshift): o predio do dia e o
  mesmo para todo mundo, e o snapshot da run guarda a seed para continuar.

## Balanceamento

Os numeros de dificuldade (dano por sala, mortes, escala por andar, velocidades
de cada inimigo, vida dos chefes) estao medidos e documentados em
[`docs/BALANCE.md`](docs/BALANCE.md), gerados por um bot que joga de verdade.

## Correcoes do playtest 1

| Bug | Correcao |
|-----|----------|
| Movimentacao com delay | `accel` 760 -> **1600 px/s²** (17x a velocidade maxima), `friction` 900 -> **1900**, `turnBoost` 1.6 na inversao e o "coyote" deixou de empurrar o player depois de soltar a tecla. Teste: `tests/movement.test.js`. |
| Salas grandes demais | Salas de combate 40x30 -> **28x16 tiles** (448x256 px), arenas 46x32 -> **32x18** (512x288) e zoom da camera **1.4** (chefe: **1.15**). Agora ve-se ~77% da largura e ~75% da altura da sala. |
| Inimigos pequenos e passivos | Sprites 16x16 -> **24x24** (burocrata **36x36**), hitbox 20/28, visao 220-300 px, recarga 0.8-1.0s (rusher) e 1.2-1.6s (ranged), e no maximo 1 inimigo de guarda a cada 3+. Testes: `tests/enemies.test.js`. |
| Botoes touch no PC | Deteccao exige as tres condicoes (ponteiro grosso + sem hover + UA movel) e ha o toggle **CONTROLES** no menu salvo em `localStorage`. Testes: `tests/touch.test.js`. |
| Mira do mouse nao funcionava | `Input.aim()` so dava a mira ao mouse depois de um **clique** (`lastInputDevice` nunca mudava no `mousemove`), entao quem andava de WASD continuava atirando na direcao do movimento. Agora o mouse assume a mira ao **mover** (o `aimAngle` vem do cursor com a conversao `/cam.zoom`), o sprite vira para o lado do movimento (feedback de recuo) e o tiro segue sempre o cursor. Cursor `crosshair` no canvas. Testes: `tests/aim.test.mjs`. |

## Progressao salva

`localStorage` (`pilha-de-papel.save.v1`): bencaos ja vistas, mini-chefes
derrotados, finais alcancados, melhor combo/tempo, selos de estagio e retomada de
run no meio do predio. O botao "continuar" no menu aparece quando existe snapshot.
