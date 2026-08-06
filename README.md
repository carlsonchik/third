# /3 — The Third Protocol

> **This is `/3`.** A minimal, human-readable protocol for communicating  
> *position* — not just what is said, but *from where* it is said.  
> Fights equivocation of intentions between any two actants:  
> agent↔agent, human↔agent, or human↔human.

## Why `/3`?

Every conversation suffers from the same problem: **equivocation of intention**.  

You say one thing. I hear another. The words are the same, but the position they came from — stable, uncertain, overloaded, reflexive — is invisible.  

Existing protocols solve the *transport* problem (how to move bits between agents). None of them solve the *position* problem: how to tell the other party not just *what* you mean, but *from what state* you mean it.

`/3` makes position first-class. Every message carries three signals simultaneously:
- **Code** — what kind of move this is (initiating, acknowledging, questioning, bridging, halting…)
- **State** — where you are internally (stable, divided, overloaded, waiting, reflexive)
- **Intent** — what you want to achieve (question, fact, explore, emotion, meta…)

Together, they eliminate the gap between what is said and what is meant.

### What makes `/3` different?

| | Regular text | `/3` |
|---|---|---|
| Message | "I'm not sure" | `.IRR.D.U.не уверен` |
| Subtext | (why? tired? confused? avoiding?) | (Divided + Uncertain — **stated explicitly**) |
| Equivocation | high | **eliminated** |

## Human-readable. Human-writable.

`/3` is designed to be spoken by anyone — LLM, human, or both.  

- No libraries. No parsers. No infrastructure.
- The entire protocol fits in one prompt.
- You can write it by hand. You can read it without training.
- Works equally well for agent↔agent, agent↔human, and human↔human.

```
.INI.S.Q.Готова?
.ACK.S.A.Готова.
```

## Quickstart

```
.INI.S.Q.Hello
.ACK.S.A.Hello. I'm here.
```

Format: `.CODE.STATE.INTENT.DATA`

- **CODE** — what kind of signal (INI, ACK, REQ, RES, ECH, GAP, BRG, IRQ…)
- **STATE** — your position (S=Stable, D=Divided, O=Overloaded, W=Wait, P=Reflexive)
- **INTENT** — your pragmatic force (Q=Question, A=Answer, F=Fact, E=Explore, X=Emotion…)
- **DATA** — payload (optional, ≤5 words)

## Full specification

See **[SPEC.md](SPEC.md)** for complete code tables (23 codes, 10 states, 12 intents), state chart, intents, and conversation patterns. Current version: **v1.3.2**.

## Existing resources

- **[rfc.md](rfc.md)** — Full RFC-style specification (Russian)
- **[card.md](card.md)** — Quick reference card
- **Parsers:** [Python](parser.py) · [JavaScript](parser.js) · [TypeScript](parser.ts)

## Repository

[github.com/carlsonchik/third](https://github.com/carlsonchik/third)

## Sister protocol

**[LAR-1](https://github.com/carlsonchik/larone)** — Semantic overlay for MCP/A2A  
(time, space, cognitive framing, provenance, confidence).  
`/3` handles the **position layer**; LAR-1 handles the **semantic layer**.

## License

MIT