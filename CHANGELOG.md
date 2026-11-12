# Changelog

## 1.4.0 — 2026-11-12

Consistency release. [SPEC.md](SPEC.md) is the canonical vocabulary for codes, states, intents, composites, and the recording rules. The other documents and the three parsers follow it.

### Vocabulary

- State **P** is `Reflexive / рефлексия, интроспекция`. Pause is state **W** and code **HLT**, not P.
- State **F** is `Flow / азарт, эмоциональный заряд`.
- Intent **A** is acceptance — принятие позиции другого / согласие — not “answer”.
- Code glosses match SPEC. In particular: **CMT** is an unsolicited comment, not a commitment (commitment is intent P); **RET** is a return to the original goal, not a rollback; **RPT** resends the signal.

### Letter homonyms

- SPEC now states that P, D, A, E, F, S, and N mean different things in the state field and the intent field. Meaning is determined by field position. The same rule applies to composites (`SA` is one pair as a state and another as an intent).

### Composites

- Rule: at most two letters. The first is dominant, the second is a shade. Any other pair of vocabulary letters is still syntactically valid.
- One recommended list of state pairs (`SD` `SO` `SW` `SP` `SF` `SA` `DW` `WD` `OW` `OS` `OF` `PF` `PD` `WF`) and intent pairs (`QS` `AQ` `FD` `SA` `SE` `XS`) replaces the divergent lists.

### Examples

- `.SBY.S.W…` put W in the intent slot. W is not an intent. The signal is `.SBY.W.S.Думаю. Подожди`.
- `.REQ.AQ.Q…` put Q in the state slot. It is now `.REQ.A.Q.цель диалога`.
- `.BRG.SE.E…` had the intent pair in the state slot. It is now `.BRG.S.SE.пересоберем рамку`.
- Bare `.OBT` is not a signal. Overtone examples are `.OBT.S.X`.
- Halt examples no longer use state P to mean “paused”.
- Data examples stay within 5 words and avoid prepositions, keeping the same move.

### Data field

- The rule is «до 5 слов, рекомендуется без предлогов» (up to 5 words; omitting prepositions is recommended).
- Parsers still reject more than 5 words. They do not reject prepositions.

### Trailing dot

- A leading dot is required. A trailing dot is optional.
- Python, JavaScript, and TypeScript parsers accept both forms. `test_parser.py`, `test_parser.js`, and `test_parser.ts` cover the rule and check that every documented example validates.
- The JavaScript demo now reports a parse failure instead of aborting, matching the Python and TypeScript demos. The valid demo line that used the preposition «из» is now `.CMT.D.P.раздвоен, беру`.

### Guard wording

- `END` from state E stays outside the recommended set. The RFC now calls that “не рекомендуется”, matching the parsers: guard misses are warnings, not hard errors.
