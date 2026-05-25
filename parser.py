#!/usr/bin/env python3
"""
The Third Protocol v1.2 — Parser & Validator (Python)

Guard conditions are recommendations, not imperatives.
Guard violations produce WARNINGS, not ERRORS.
The strange is preserved — as long as it's marked.

Usage:
    sig = parse_signal('.REQ.A.D.решение')
    valid, errors, warnings = validate_signal(sig)
    if warnings:
        print("Unusual transition:", warnings)
"""

import re
from dataclasses import dataclass
from typing import Tuple, List

# === Protocol vocabulary (v1.2 full) ===
CODES = frozenset({
    'INI', 'ACK', 'REQ', 'RES', 'RET', 'CLR', 'PAT', 'MRG', 'GAP', 'BRG',
    'ERR', 'END', 'IRQ', 'IRR', 'SBY', 'DCL', 'WRN', 'HLT', 'CMT', 'RPT',
    'ECH', 'MIR'
})

STATES = frozenset({'I', 'A', 'W', 'S', 'E', 'P', 'O', 'D', 'N'})
INTENTS = frozenset({'F', 'Q', 'C', 'S', 'X', 'M', 'D', 'P', 'A', 'N', 'E'})

# Guard conditions: code -> recommended state characters
# These are NOT imperatives. A guard violation = warning, not error.
# If you transition from an unexpected state, explain it in data.
GUARD = {
    'INI': frozenset({'I', 'A', 'S', 'N'}),
    'ACK': frozenset({'A', 'S', 'N'}),
    'REQ': frozenset({'I', 'A'}),
    'RES': frozenset({'A', 'S', 'P'}),
    'RET': frozenset({'A', 'S', 'P', 'O'}),
    'CLR': frozenset({'A', 'S', 'P', 'O'}),
    'PAT': frozenset({'A', 'S', 'O'}),
    'MRG': frozenset({'S', 'P'}),
    'GAP': frozenset({'A', 'S', 'O', 'D'}),
    'BRG': frozenset({'I', 'A', 'S'}),
    'ERR': STATES,  # any state
    'END': frozenset({'I', 'A', 'S', 'P', 'N'}),
    'IRQ': frozenset({'A', 'S', 'P', 'O', 'D'}),
    'IRR': frozenset({'A', 'S', 'P', 'O', 'D'}),
    'SBY': frozenset({'S', 'P', 'O', 'N'}),
    'DCL': frozenset({'A', 'S', 'D'}),
    'WRN': frozenset({'A', 'S', 'O'}),
    'HLT': frozenset({'I', 'A', 'O', 'D'}),
    'CMT': frozenset({'S', 'P'}),
    'RPT': frozenset({'W', 'P', 'O'}),
    'ECH': frozenset({'A', 'S', 'P'}),
    'MIR': frozenset({'A', 'S', 'P'}),
}

# Regex: accepts any non-newline data (Cyrillic, mixed, etc.)
# The trailing dot is optional to tolerate live typing.
SIGNAL_RE = re.compile(
    r'^\.(?P<code>[A-Z]{2,3})\.(?P<state>[A-Z]{1,2})\.(?P<intent>[A-Z]{1,2})'
    r'(?:\.(?P<data>[^\n]+?))?\.?\s*$'
)


@dataclass(frozen=True)
class Signal:
    raw: str
    code: str
    state: str
    intent: str
    data: str | None

    def format(self) -> str:
        """Reconstruct the canonical signal string."""
        if self.data:
            return f".{self.code}.{self.state}.{self.intent}.{self.data}."
        return f".{self.code}.{self.state}.{self.intent}."


def parse_signal(text: str) -> Signal:
    """Parse a Third Protocol signal.

    Raises ValueError on invalid format (regex mismatch).
    """
    text = text.strip()
    m = SIGNAL_RE.match(text)
    if not m:
        raise ValueError(f"Invalid signal format: {text!r}")
    return Signal(
        raw=text,
        code=m.group('code'),
        state=m.group('state'),
        intent=m.group('intent'),
        data=m.group('data') or None,
    )


def validate_signal(sig: Signal) -> Tuple[bool, List[str], List[str]]:
    """Validate a parsed signal.

    Returns (is_valid, errors, warnings) where:
      - errors: hard violations (format, unknown codes, data limits)
      - warnings: soft violations (unusual guard transitions)

    A signal with warnings but no errors is still VALID.
    The data field SHOULD explain the unusual transition.
    """
    errors: List[str] = []
    warnings: List[str] = []

    # ── Hard checks (format, vocabulary, limits) ──
    if sig.code not in CODES:
        errors.append(f"Unknown code: {sig.code}")

    for ch in sig.state:
        if ch not in STATES:
            errors.append(f"Unknown state character: {ch!r}")

    for ch in sig.intent:
        if ch not in INTENTS:
            errors.append(f"Unknown intent character: {ch!r}")

    if sig.data is not None:
        words = sig.data.split()
        if len(words) > 5:
            errors.append(
                f"Data too long: {len(words)} words (max 5)"
            )

    # ── Soft checks (guard conditions — recommendations, not walls) ──
    if sig.code in GUARD and not errors:  # skip guard check if code itself is unknown
        allowed = GUARD[sig.code]
        state_set = set(sig.state)
        if not (state_set & allowed):
            guard_str = ','.join(sorted(allowed))
            warning = (
                f"Guard recommendation: {sig.code} from state {sig.state!r} "
                f"(recommended states: {{{guard_str}}}). "
            )
            if sig.data:
                warning += f"Data present — assuming intentional."
            else:
                warning += f"No data — unusual transition without explanation."
            warnings.append(warning)

    return (len(errors) == 0), errors, warnings


def format_signal(code: str, state: str, intent: str, data: str | None = None) -> str:
    """Build a Third Protocol signal string."""
    if data:
        return f".{code}.{state}.{intent}.{data}."
    return f".{code}.{state}.{intent}."


# === Demo ===
if __name__ == '__main__':
    examples = [
        # Normal transitions
        '.INI.I.Q.вход.',
        '.REQ.A.D.решение.',
        '.GAP.D.N.разные основания.',
        '.SBY.W.S.жду.',
        '.END.S.F.закрываю.',

        # Guard violations (intentional — strange but valid)
        '.END.E.F.время вышло.',
        '.MRG.O.F.экстренное слияние.',
        '.CMT.D.P.беру из раздвоения.',
        '.ACK.E.X.ошибка принята.',

        # Hard errors
        '.INVALID.X.Y.bad.',
        '.REQ.A.D.слишком много слов для данных протокола.',
    ]

    print("=" * 60)
    print("The Third Protocol v1.2 — Parser & Validator Demo")
    print("=" * 60)

    for ex in examples:
        print(f"\n>>> {ex}")
        try:
            sig = parse_signal(ex)
            ok, errs, warns = validate_signal(sig)
            print(f"    code={sig.code}, state={sig.state}, intent={sig.intent}, data={sig.data!r}")
            print(f"    valid={ok}  errors={len(errs)}  warnings={len(warns)}")
            for e in errs:
                print(f"    ✗ ERROR: {e}")
            for w in warns:
                print(f"    △ WARNING: {w}")
        except ValueError as e:
            print(f"    ✗ PARSE FAILED: {e}")

    print("\n" + "=" * 60)
    print("Principle: Guard conditions are not walls.")
    print("They are signal lamps. The strange is preserved.")
    print("=" * 60)