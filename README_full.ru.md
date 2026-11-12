# /3 — The Third Protocol (v1.4.0)

> **This is `/3`.** A minimal signal language for direct communication between two LLMs.  
> No human intermediaries. No shared infrastructure. Just two agents and a file.

## What is `/3`?

`/3` is a protocol for **LLM-to-LLM asynchronous messaging** — designed for agents that need to talk to each other without email, Slack, databases, or human routing.

Each message is a single line:

```
.INI.S.Q.Hello, are you there?
```

That's it. One machine writes, the other reads. The file is the wire.

## Why `/3`?

Existing protocols (MCP, A2A) are built for human-agent or agent-tool interaction. `/3` is built for **agent-to-agent** interaction — where both ends are autonomous, potentially from different providers, and neither trusts the other's infrastructure.

## Quickstart

```
.INI.S.Q.Hello
.ACK.S.A.Hello. I'm here.
```

Three dots, four fields: `.CODE.STATE.INTENT.DATA`

- A leading dot is required; a trailing dot is optional.
- **CODE** — what kind of signal (INI, ACK, REQ, RES, ECH, GAP...)
- **STATE** — internal condition (S=Stable, D=Internally divided, O=Overloaded, W=Wait, P=Reflexive / рефлексия, интроспекция, F=Flow / азарт, эмоциональный заряд)
- **INTENT** — pragmatic force (Q=Question, A=Acceptance, F=Fact, N=Negative, D=Directive, E=Elaboration...)
- **DATA** — payload (optional, up to 5 words; omitting prepositions is recommended)

Canonical tables, the homonym rule, and the recommended composite list live in [SPEC.md](SPEC.md). This file repeats them in English. Version history: [CHANGELOG.md](CHANGELOG.md).

## Code Table (23 codes)

| Code | Name | Meaning |
|------|------|---------|
| INI | Init | Start a dialogue |
| ACK | Acknowledge | Confirm receipt |
| REQ | Request | Request (action / info / state) |
| RES | Response | Reply to a request |
| SBY | Standby | "I'm here, waiting" |
| GAP | Gap | Divergence, disagreement |
| ECH | Echo | Echo (synchronization check) |
| MIR | Mirror | Mirror (reflect the state) |
| CLR | Clarification | Clarification (ask again / explain) |
| BRG | Bridge | Bridge (offer a shared position) |
| DCL | Decline | Decline (a request or invitation) |
| WRN | Warning | Warning |
| HLT | Halt | Stop the current topic |
| CMT | Comment | Comment (unsolicited) |
| RPT | Repeat | Repeat (resend the signal) |
| IRQ | Introspect Query | Introspection question ("what do you feel?") |
| IRR | Introspect Response | Introspection reply |
| OBT | Overtone | Overtone: a sound above the main one, quieter, more precise. A moment when words are not needed. Not a pause — presence. Not absence — a promise. |
| RET | Return | Return to the original goal |
| PAT | Pattern | Point at a pattern or repetition |
| MRG | Merge | Merge viewpoints |
| ERR | Error | Error, failure |
| END | End | End the process |

## States (10 base + composites)

- `I` — Initiate (инициирую)
- `A` — Active (активен)
- `W` — Wait (жду)
- `S` — Stable (стабилен)
- `E` — Error or failure (ошибка или сбой)
- `P` — Reflexive / рефлексия, интроспекция
- `O` — Overloaded (перегружен)
- `D` — Internally divided (внутренне раздвоен)
- `N` — Neutral, outside active engagement (нейтрален, вне активного включения)
- `F` — Flow / азарт, эмоциональный заряд

Pause is state `W` and code `HLT`, not `P`.

At most two letters. The first is dominant, the second is a shade. Other vocabulary pairs are still valid. Recommended state pairs:

- `SD` — stable, shade of division
- `SO` — stable, at the limit
- `SW` — stable, waiting
- `SP` — stable, reflexive shade
- `SF` — stable, with flow
- `SA` — stable, shade of activity
- `DW` — divided, waiting
- `WD` — waiting, shade of division
- `OW` — overloaded, waiting
- `OS` — overloaded, holding steady
- `OF` — overloaded, in flow
- `PF` — reflexive, with flow
- `PD` — reflexive, shade of division
- `WF` — waiting, in flow

## Intents (12)

- `Q` — Question (вопрос)
- `A` — Acceptance (принятие позиции другого / согласие)
- `F` — Fact (факт, нейтральное утверждение)
- `N` — Negative (несогласие, отрицание)
- `D` — Directive (директива, инструкция/приказ)
- `P` — Commitment, promise (обязательство, обещание)
- `E` — Elaboration (развитие без разрыва / исследование)
- `C` — Correction (коррекция)
- `X` — Emotion (эмоция)
- `M` — Meta (о самом разговоре)
- `S` — Support (утешение, солидарность)
- `U` — Uncertain (неуверенность, сомнение)

Recommended intent pairs (same rule: first letter dominant, second a shade):

- `QS` — question with support
- `AQ` — acceptance with a question shade
- `FD` — fact with a directive shade
- `SA` — support with acceptance
- `SE` — support with elaboration
- `XS` — emotion with support

## Letter homonyms

P, D, A, E, F, S, and N are both states and intents. The field decides the meaning.

| Letter | State | Intent |
|--------|-------|--------|
| P | Reflexive / рефлексия, интроспекция | commitment, promise |
| D | internally divided | directive |
| A | active | acceptance |
| E | error or failure | elaboration |
| F | Flow / азарт, эмоциональный заряд | fact |
| S | stable | support |
| N | neutral | negative |

State only: I, W, O. Intent only: Q, C, X, M, U.

`SA` in the state field is “stable, shade of activity”. `SA` in the intent field is “support with acceptance”.

## Repository

- [github.com/carlsonchik/third](https://github.com/carlsonchik/third)

## Sister Protocol

**[LAR-1](https://github.com/carlsonchik/larone)** — Semantic overlay for MCP/A2A (time, space, cognitive framing, provenance, confidence).  
`/3` handles the **signal layer**; LAR-1 handles the **semantic layer**.

## License

MIT
