# Balanceamento — numeros medidos

Tudo aqui foi medido com `node tools/duel.mjs`, que roda um **bot competente**
(mira no inimigo mais proximo, atira sempre, mantem distancia, usa strafe e gasta
dash quando o inimigo cola ou telegrafia) em salas de combate reais. O mesmo bot
joga a run inteira em `node tools/smoke.mjs`.

## Geometria e camera (playtest 1)

| | antes | agora |
|---|---|---|
| Sala de combate | 40x30 tiles (640x480 px) | **28x16 tiles (448x256 px)** |
| Arena de chefe | 46x32 tiles (736x512 px) | **32x18 tiles (512x288 px)** |
| Zoom da camera | 1.0 (0.85 nas arenas) | **1.4 (1.15 nas arenas)** |
| Sala visivel a zoom 1.4 | — | 343x193 px = **77% da largura e 75% da altura** |

O viewport de 480x270 a zoom 1.4 mostra 343x193 px de mundo: quase a sala inteira,
com um scroll leve. Tudo (sprites, moveis, inimigos) fica 40% maior na tela.

## Player de referencia

| | valor |
|---|---|
| Coracoes | 3 (base) |
| Dano do clipe | 3 (critico x2 em 10% dos tiros) |
| Cadencia | 0.22 s (~13.6 DPS base) |
| Velocidade maxima | 92 px/s |
| **Aceleracao** | **1600 px/s² (17x a velocidade maxima)** |
| **Friccao** | **1900 px/s² (1.19x a aceleracao)** |
| Resposta medida | atinge 85% da velocidade em **0.05 s** e para em **0.05 s** |
| Dash | 330 px/s por 0.18 s, 0.30 s invulneravel, 0.8 s de recarga |
| Invulnerabilidade ao levar dano | 1.0 s |
| Postura por acerto | 12 (execucao = 60% da vida maxima) |

O "coyote" de input guarda apenas a ultima direcao (para o dash): ele nao
empurra mais o player depois de soltar a tecla — era essa a sensacao de gelo
reportada no playtest.

## Resultado por andar

`max` inicial (3 coracoes, sem bencaos) x build de meio de run (5 coracoes,
+30% dano, cadencia -20%, piercacao 1, 2 dashes).

| Andar | Build | Dano medio por sala | Salas limpas | Mortes |
|-------|-------|--------------------:|-------------:|-------:|
| 1 | inicial | 0.0 | 6/6 | 0/6 |
| 3 | meio de run | 0.3 | 4/4 | 0/4 |
| 5 | meio de run | 2.8 | 3/4 | 1/4 |
| 5 | inicial | 3.0 | 0/4 | 4/4 |

Leitura: o andar 1 e um tutorial seguro; no andar 3 o player com um kit razoavel
sai ileso se jogar direito; no andar 5 uma sala pode custar 2-3 coracoes e matar
quem entrar sem build. Ir ao andar 5 com o kit inicial e suicidio — o esperado
em um roguelike.

## Escala de dificuldade por andar (`floorScale`)

| Andar | Vida x | Dano | Velocidade x |
|-------|-------:|-----:|-------------:|
| 1 | 1.00 | base | 1.00 |
| 2 | 1.28 | base | 1.06 |
| 3 | 1.56 | base | 1.12 |
| 4 | 1.84 | +1 | 1.18 |
| 5 | 2.12 | +1 | 1.24 |
| 6 | 2.40 | +1 | 1.30 |

O dano cresce a cada 3 andares e para em **base + 1**: com 3 coracoes, um inimigo
comum dar 3 de dano significaria morte instantanea.

## Tamanho e agressao dos inimigos (playtest 1)

| | antes | agora |
|---|---|---|
| Sprite comum | 16x16 | **24x24** (arte 16x16 ampliada 1.5x) |
| Sprite do burocrata | 24x24 | **36x36** |
| Hitbox comum | 16 | **20** (menor que o sprite, para esquivar continuar justo) |
| Hitbox do burocrata | 24 | **28** |
| Visao minima | 190 px | **220 px** (ate 300 no sniper) |
| Recarga de ataque (rusher) | 1.0-1.3 s | **0.8-1.0 s** |
| Recarga de ataque (ranged) | 2.0-2.6 s | **1.2-1.6 s** |
| Papeis de grupo | ate 1/3 de guarda | **no maximo 1 de guarda**; 1-2 inimigos = todos para cima |

Os sprites sao ampliados com vizinho-mais-proximo na pre-renderizacao
(`SpriteFactory._sheetScaled`), sem perder o pixel art. A LOS continua sendo
bloqueada somente por tiles: mesas e estantes sao cobertura para o corpo, nao
para a visao.

## Velocidades (player = 92 px/s)

| Inimigo | px/s | papel |
|---------|-----:|-------|
| Bug | 86 | enxame, o mais rapido |
| Grampeador | 66 | rusher de pulo |
| Estagiario Fantasma | 66 | teleporta para perto |
| Formulario | 62 | rusher que se divide |
| Pilha de Papel | 58 | rusher basico |
| Burocrata | 44 | tank (subiu de 36: ameacava pouco) |
| Bug Ancestral | 52 | sniper (elite) |
| Telefone | 44 | ranged com cone de som |
| Cabo Emaranhado | 48 | tank que aplica lentidao |
| Planilha | 40 | ranged em arco |
| Cafe Derramado | 38 | support (pocas) |


Nenhum inimigo comum alcanca o player correndo (92 px/s): sempre da para kitar.
O que fecha o cerco sao as ondas + a geometria da sala (moveis solidos servem de
cobertura para os dois lados) + os ranged cortando a fuga.

## Ondas

`waveConfig(andar)`: 1-2 ondas (1-3 do andar 4 em diante), 2-3 inimigos por onda
no andar 1, ate 4-5 no andar 6. As portas trancam durante as ondas.

## Chefes

| Chefe | Andar | Vida | Fases |
|-------|------:|-----:|------:|
| A Recepcionista | 1 | 120 | 2 |
| O Vendedor do Mes | 2 | 165 | 2 |
| A Entrevistadora | 3 | 210 | 2 |
| O Gerente de Projetos | 4 | 265 | 2 |
| O Estagiario de TI | 5 | 330 | 3 |
| O CEO | 6 | 620 | 3 (fase 3 espelha suas bencaos) |

Chefes **nao** recebem a escala do andar (`floorScale` fixo em 1x) — a curva vem
dos numeros acima. Com o DPS base (~13.6) a Recepcionista leva ~9 s; com um build
de meio de run o CEO leva de 30 a 60 s, considerando as esquivas.

## Criterios de aceite verificados (playtest 1)

| Criterio | Resultado |
|----------|-----------|
| 85% da velocidade maxima em <= 0.15 s | **0.05 s** (`tests/movement.test.js`) |
| Parar em <= 0.12 s | **0.05 s** (`tests/movement.test.js`) |
| 77% da largura / 75% da altura da sala visivel | **77% / 75%** (`tests/rooms.test.js`) |
| 10 seeds com caminho viavel e sem prop bloqueando porta | **60/60 salas** (`tests/rooms.test.js`) |
| Papel/Telefone/Bug: IDLE -> ALERT -> CHASE -> ATTACK + dano | **3/3** (`tests/enemies.test.js`) |
| 10 especies atacam em sala limpa | **10/10** |
| Overlay touch escondido no PC / visivel no celular | **ok** (`tests/touch.test.js`, `tools/browser-smoke.mjs`) |
| TECLADO/TOUCH persistem no localStorage (`touchPref`) | **ok** |

## Mira (twin-stick)

| | valor |
|---|---|
| Conversao screen -> mundo | `x_mundo = (x_tela - VIEW_W/2) / cam.zoom + cam.x` (o `/zoom` importa desde o zoom 1.4) |
| Angulo do tiro | `atan2(y_mundo - y_player, x_mundo - x_player)` — **nunca** do `facing` |
| Sprite (`facing`) | andando: lado do movimento (feedback de recuo); parado: lado do cursor |
| Entrada do mouse | assume a mira no **mousemove** (antes so no clique) e mantem quando o mouse para |
| Fallback | teclado puro (sem nunca ter usado o mouse) mira na direcao do movimento; gamepad/touch tem prioridade quando ativos |
| Cursor | `crosshair` no canvas |

Testes: `tests/aim.test.mjs` — 11 casos, incluindo a regressao do zoom 1.4 (o
resultado com zoom 1.4 e comparado com o calculo **sem** `/zoom` para provar que
a divisao esta sendo feita).

## Regras que o gerador garante (testadas)

- O corredor central de cada porta (faixa de 30 px) **nunca** recebe movel solido:
  toda sala e sempre atravessavel.
- Nenhum prop nasce no centro da sala (40x34 px livres) para o combate respirar.
- 10 seeds x 6 andares sempre produzem caminho viavel do spawn ate o chefe.
