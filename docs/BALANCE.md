# Balanceamento — numeros medidos

Tudo aqui foi medido com `node tools/duel.mjs`, que roda um **bot competente**
(mira no inimigo mais proximo, atira sempre, mantem distancia, usa strafe e gasta
dash quando o inimigo cola ou telegrafa) em salas de combate reais. O mesmo bot
joga a run inteira em `node tools/smoke.mjs`.

## Player de referencia

| | valor |
|---|---|
| Coracoes | 3 (base) |
| Dano do clipe | 3 (critico x2 em 10% dos tiros) |
| Cadencia | 0.22 s (~13.6 DPS base) |
| Dash | 330 px/s por 0.18 s, 0.30 s invulneravel, 0.8 s de recarga |
| Invulnerabilidade ao levar dano | 1.0 s |
| Postura por acerto | 12 (execucao = 60% da vida maxima) |

## Resultado por andar

`max` inicial (3 coracoes, sem bencaos) x build de meio de run (5 coracoes,
+30% dano, cadencia -20%, piercacao 1, 2 dashes).

| Andar | Build | Dano medio por sala | Salas limpas | Mortes |
|-------|-------|--------------------:|-------------:|-------:|
| 1 | inicial | 0.0 | 8/8 | 0/8 |
| 3 | meio de run | 0.3 | 4/4 | 0/4 |
| 5 | meio de run | 2.5 | 3/4 | 1/4 |
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

## Velocidades (player = 92 px/s)

| Inimigo | px/s | papel |
|---------|-----:|-------|
| Bug | 86 | enxame, o mais rapido |
| Grampeador | 66 | rusher de pulo |
| Estagiario Fantasma | 66 | teleporta para perto |
| Formulario | 62 | rusher que se divide |
| Pilha de Papel | 58 | rusher basico |
| Bug Ancestral | 52 | sniper (elite) |
| Telefone | 44 | ranged com cone de som |
| Cabo Emaranhado | 42 | tank que aplica lentidao |
| Planilha | 40 | ranged em arco |
| Cafe Derramado | 38 | support (pocas) |
| Burocrata | 36 | tank com escudo frontal |

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

## Regras que o gerador garante (testadas)

- O corredor central de cada porta (faixa de 30 px) **nunca** recebe movel solido:
  toda sala e sempre atravessavel.
- Nenhum prop nasce no centro da sala (40x34 px livres) para o combate respirar.
- 10 seeds x 6 andares sempre produzem caminho viavel do spawn ate o chefe.
