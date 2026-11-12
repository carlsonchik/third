#!/usr/bin/env python3
"""Checks for /3 v1.4.0: dot rule, documented examples, shared vocabulary."""

import re
import subprocess
import tempfile
import unittest
from pathlib import Path

from parser import (
    CODE_DESC,
    CODES,
    INTENT_DESC,
    INTENTS,
    RECOMMENDED_INTENT_PAIRS,
    RECOMMENDED_STATE_PAIRS,
    STATE_DESC,
    STATES,
    format_signal,
    parse_signal,
    validate_signal,
)

ROOT = Path(__file__).resolve().parent

DOCS = (
    'README.md',
    'README_full.ru.md',
    'SPEC.md',
    'agent_instruction.md',
    'card.md',
    'rfc.md',
)
RU_DOCS = ('SPEC.md', 'agent_instruction.md', 'card.md', 'rfc.md')

CODE_GLOSS = {
    'INI': 'Начать диалог',
    'ACK': 'Подтвердить получение',
    'REQ': 'Запрос (действие/инфо/состояние)',
    'RES': 'Ответ на запрос',
    'SBY': '«Я здесь, жду»',
    'GAP': 'Расхождение, разногласие',
    'ECH': 'Эхо (проверка синхронизации)',
    'MIR': 'Зеркало (отражение состояния)',
    'CLR': 'Уточнение (переспрос/пояснение)',
    'BRG': 'Мост (предложение общей позиции)',
    'DCL': 'Отказ (запроса или приглашения)',
    'WRN': 'Предупреждение',
    'HLT': 'Остановить текущую тему',
    'CMT': 'Комментарий (незапрошенное)',
    'RPT': 'Повтор (переотправить сигнал)',
    'IRQ': 'Интроспекция-вопрос («что чувствуешь?»)',
    'IRR': 'Интроспекция-ответ',
    'OBT': (
        'Обертон: звук выше основного, тише, точнее. Момент, когда слова не нужны. '
        'Не пауза — присутствие. Не отсутствие — обещание.'
    ),
    'RET': 'Вернуться к исходной цели',
    'PAT': 'Указание на паттерн или повторяемость',
    'MRG': 'Слияние точек зрения',
    'ERR': 'Ошибка, сбой',
    'END': 'Завершение процесса',
}

STATE_GLOSS = {
    'I': 'Инициирую',
    'A': 'Активен',
    'W': 'Жду',
    'S': 'Стабилен',
    'E': 'Ошибка или сбой',
    'P': 'Reflexive / рефлексия, интроспекция',
    'O': 'Перегружен',
    'D': 'Внутренне раздвоен',
    'N': 'Нейтрален, вне активного включения',
    'F': 'Flow / азарт, эмоциональный заряд',
}

INTENT_GLOSS = {
    'Q': 'Вопрос',
    'A': 'Принятие позиции другого / согласие (acceptance)',
    'F': 'Факт (нейтральное утверждение)',
    'N': 'Негатив (несогласие, отрицание)',
    'D': 'Директива (инструкция/приказ)',
    'P': 'Обязательство, обещание (commissive)',
    'E': 'Развитие без разрыва / исследование (elaboration)',
    'C': 'Коррекция (correction)',
    'X': 'Эмоция',
    'M': 'Мета (о самом разговоре)',
    'S': 'Поддержка (утешение, солидарность)',
    'U': 'Неуверенность / Uncertain (сомнение, неопределённость)',
}

STATE_PAIRS = (
    ('SD', 'стабилен, оттенок раздвоенности'),
    ('SO', 'стабилен, на пределе'),
    ('SW', 'стабилен, жду'),
    ('SP', 'стабилен, в рефлексии'),
    ('SF', 'стабилен, с азартом'),
    ('SA', 'стабилен, оттенок активности'),
    ('DW', 'раздвоен, жду'),
    ('WD', 'жду, оттенок раздвоенности'),
    ('OW', 'перегружен, жду'),
    ('OS', 'перегружен, держусь'),
    ('OF', 'перегружен, в азарте'),
    ('PF', 'рефлексия, с азартом'),
    ('PD', 'рефлексия, оттенок раздвоенности'),
    ('WF', 'жду, в азарте'),
)

INTENT_PAIRS = (
    ('QS', 'вопрос с поддержкой'),
    ('AQ', 'принятие с оттенком вопроса'),
    ('FD', 'факт с побуждением'),
    ('SA', 'поддержка с принятием'),
    ('SE', 'поддержка с исследованием'),
    ('XS', 'эмоция с поддержкой'),
)

EN_CODE_GLOSS = {
    'INI': 'Start a dialogue',
    'ACK': 'Confirm receipt',
    'REQ': 'Request (action / info / state)',
    'RES': 'Reply to a request',
    'SBY': '"I\'m here, waiting"',
    'GAP': 'Divergence, disagreement',
    'ECH': 'Echo (synchronization check)',
    'MIR': 'Mirror (reflect the state)',
    'CLR': 'Clarification (ask again / explain)',
    'BRG': 'Bridge (offer a shared position)',
    'DCL': 'Decline (a request or invitation)',
    'WRN': 'Warning',
    'HLT': 'Stop the current topic',
    'CMT': 'Comment (unsolicited)',
    'RPT': 'Repeat (resend the signal)',
    'IRQ': 'Introspection question ("what do you feel?")',
    'IRR': 'Introspection reply',
    'OBT': (
        'Overtone: a sound above the main one, quieter, more precise. '
        'A moment when words are not needed. Not a pause — presence. '
        'Not absence — a promise.'
    ),
    'RET': 'Return to the original goal',
    'PAT': 'Point at a pattern or repetition',
    'MRG': 'Merge viewpoints',
    'ERR': 'Error, failure',
    'END': 'End the process',
}

PREPOSITIONS = {
    'в', 'во', 'на', 'с', 'со', 'к', 'ко', 'по', 'из', 'изо', 'у', 'о', 'об',
    'обо', 'от', 'ото', 'для', 'без', 'до', 'за', 'над', 'под', 'подо', 'при',
    'про', 'через', 'между', 'перед', 'предо',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'by', 'about', 'into',
    'over', 'after', 'before', 'between', 'without', 'within', 'through',
    'during', 'via',
}

BANNED = (
    '1.3.2',
    'Приостановлен',
    'A=Answer',
    'ответ+вопрос',
    'возбуждение без конкретной цели',
    'беру из раздвоения',
    'Всегда с точкой в начале и конце',
    'запрещено: E',
)


def has_entry(text: str, key: str, gloss: str) -> bool:
    """True when key is defined with gloss as a SPEC line, bullet, or table cell."""
    escaped_key = re.escape(key)
    escaped_gloss = re.escape(gloss)
    patterns = (
        rf'(?m)^{escaped_key} — {escaped_gloss}\s*$',
        rf'`{escaped_key}` — {escaped_gloss}',
        rf'\| {escaped_key} \| {escaped_gloss} \|',
    )
    return any(re.search(pattern, text) for pattern in patterns)


def extract_signals(text: str) -> list[str]:
    found: list[str] = []
    for match in re.finditer(
        r'`(\.[A-Z]{2,3}\.[A-Z]{1,2}\.[A-Z]{1,2}[^`]*)`',
        text,
    ):
        found.append(match.group(1).strip())
    for line in text.splitlines():
        stripped = line.strip()
        match = re.fullmatch(
            r'(\.[A-Z]{2,3}\.[A-Z]{1,2}\.[A-Z]{1,2}(?:\.[^\n]*)?)',
            stripped,
        )
        if match:
            found.append(match.group(1).strip())
    unique: list[str] = []
    seen: set[str] = set()
    for sig in found:
        if sig not in seen:
            seen.add(sig)
            unique.append(sig)
    return unique


def both_forms(sig: str) -> tuple[str, str]:
    core = sig[:-1] if sig.endswith('.') else sig
    return core, core + '.'


def content_words(data: str | None) -> list[str]:
    if not data:
        return []
    words: list[str] = []
    for raw in data.split():
        word = raw.strip('.,!?;:"\'«»()…🔥').lower()
        if word:
            words.append(word)
    return words


def pair_keys(text: str, name: str) -> list[str]:
    match = re.search(rf'{name}(?::[^\n=]+)? = \{{(.*?)\n\}};?', text, re.S)
    if not match:
        raise AssertionError(f'missing {name}')
    return re.findall(r"['\"]?([A-Z]{2})['\"]?\s*:", match.group(1))


class ProtocolTests(unittest.TestCase):
    def test_trailing_dot_optional_and_leading_dot_required(self) -> None:
        samples = (
            '.INI.S.Q.Hello',
            ".ACK.S.A.Hello. I'm here",
            '.SBY.W.S.Думаю. Подожди',
            '.OBT.S.X',
        )
        for sample in samples:
            core, dotted = both_forms(sample)
            bare = parse_signal(core)
            closed = parse_signal(dotted)
            self.assertEqual(bare.code, closed.code)
            self.assertEqual(bare.state, closed.state)
            self.assertEqual(bare.intent, closed.intent)
            self.assertEqual(bare.data, closed.data)
            for form in (bare, closed):
                ok, errors, _warnings = validate_signal(form)
                self.assertTrue(ok, errors)

        with self.assertRaises(ValueError):
            parse_signal('INI.S.Q.Hello')

        emitted = format_signal('ACK', 'S', 'A', 'принято')
        self.assertTrue(emitted.endswith('.'))
        self.assertEqual(parse_signal(emitted).data, 'принято')
        self.assertEqual(parse_signal(emitted[:-1]).data, 'принято')

    def test_invalid_intent_and_long_data_still_fail(self) -> None:
        unknown, errors, _warnings = validate_signal(parse_signal('.SBY.S.W.жди'))
        self.assertFalse(unknown)
        self.assertTrue(any('W' in error for error in errors))

        too_long, errors, _warnings = validate_signal(
            parse_signal('.REQ.A.D.один два три четыре пять шесть')
        )
        self.assertFalse(too_long)
        self.assertTrue(any('too long' in error for error in errors))

    def test_documented_examples_are_valid_without_prepositions(self) -> None:
        signals: list[tuple[str, str]] = []
        for name in DOCS:
            text = (ROOT / name).read_text(encoding='utf-8')
            for sig in extract_signals(text):
                signals.append((name, sig))
        self.assertGreaterEqual(len(signals), 40, signals)

        for name, sig in signals:
            core, dotted = both_forms(sig)
            parsed = []
            for form in (core, dotted):
                try:
                    item = parse_signal(form)
                except ValueError as exc:
                    self.fail(f'{name}: {form!r} did not parse: {exc}')
                ok, errors, _warnings = validate_signal(item)
                self.assertTrue(ok, f'{name}: {form!r} invalid: {errors}')
                parsed.append(item)
                for word in content_words(item.data):
                    self.assertNotIn(
                        word,
                        PREPOSITIONS,
                        f'{name}: preposition {word!r} in {form!r}',
                    )
            self.assertEqual(parsed[0].data, parsed[1].data)
            self.assertEqual(parsed[0].state, parsed[1].state)
            self.assertEqual(parsed[0].intent, parsed[1].intent)

    def test_other_parsers_accept_the_same_examples(self) -> None:
        signals: list[str] = []
        seen: set[str] = set()
        for name in DOCS:
            for sig in extract_signals((ROOT / name).read_text(encoding='utf-8')):
                if sig not in seen:
                    seen.add(sig)
                    signals.append(sig)
        with tempfile.NamedTemporaryFile(
            'w', encoding='utf-8', delete=False, suffix='.txt'
        ) as handle:
            handle.write('\n'.join(signals))
            path = handle.name
        try:
            commands = (
                ['node', 'test_parser.js', '--from-file', path],
                [
                    'node',
                    '--experimental-strip-types',
                    'test_parser.ts',
                    '--from-file',
                    path,
                ],
            )
            for command in commands:
                result = subprocess.run(
                    command,
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(
                    result.returncode,
                    0,
                    f'{command}\n{result.stdout}\n{result.stderr}',
                )
        finally:
            Path(path).unlink(missing_ok=True)

    def test_russian_tables_match_spec_glosses(self) -> None:
        texts = {name: (ROOT / name).read_text(encoding='utf-8') for name in RU_DOCS}
        for name, text in texts.items():
            for key, gloss in (*CODE_GLOSS.items(), *STATE_GLOSS.items(), *INTENT_GLOSS.items()):
                self.assertTrue(
                    has_entry(text, key, gloss),
                    f'{name} missing {key} — {gloss}',
                )
            for key, gloss in (*STATE_PAIRS, *INTENT_PAIRS):
                self.assertTrue(
                    has_entry(text, key, gloss),
                    f'{name} missing composite {key} — {gloss}',
                )
            self.assertIn('до 5 слов, рекомендуется без предлогов', text)
            self.assertIn('Ведущая точка обязательна, замыкающая точка необязательна', text)

    def test_english_tables_and_quickstart(self) -> None:
        full = (ROOT / 'README_full.ru.md').read_text(encoding='utf-8')
        short = (ROOT / 'README.md').read_text(encoding='utf-8')
        for code, gloss in EN_CODE_GLOSS.items():
            self.assertIn(gloss, full, code)
        for phrase in (
            'Reflexive / рефлексия, интроспекция',
            'Flow / азарт, эмоциональный заряд',
            'A=Acceptance',
            'up to 5 words; omitting prepositions is recommended',
            'A leading dot is required; a trailing dot is optional.',
            'v1.4.0',
        ):
            self.assertIn(phrase, full)
            self.assertIn(phrase, short)
        self.assertNotIn('A=Answer', full)
        self.assertNotIn('A=Answer', short)

    def test_parser_vocabulary_matches_spec(self) -> None:
        self.assertEqual(set(CODE_DESC), set(CODES))
        self.assertEqual(set(STATE_DESC), set(STATES))
        self.assertEqual(set(INTENT_DESC), set(INTENTS))
        self.assertEqual(STATE_DESC['P'], 'Reflexive / рефлексия, интроспекция')
        self.assertEqual(STATE_DESC['F'], 'Flow / азарт, эмоциональный заряд')
        self.assertTrue(INTENT_DESC['A'].startswith('Acceptance'))
        self.assertNotIn('Answer', INTENT_DESC['A'])

        for key, gloss in CODE_GLOSS.items():
            self.assertIn(gloss, CODE_DESC[key])
        for key, gloss in STATE_GLOSS.items():
            self.assertIn(gloss, STATE_DESC[key])
        for key, gloss in INTENT_GLOSS.items():
            self.assertIn(gloss, INTENT_DESC[key])

        self.assertEqual(
            list(RECOMMENDED_STATE_PAIRS),
            [key for key, _gloss in STATE_PAIRS],
        )
        self.assertEqual(
            list(RECOMMENDED_INTENT_PAIRS),
            [key for key, _gloss in INTENT_PAIRS],
        )
        for key, gloss in STATE_PAIRS:
            self.assertIn(gloss, RECOMMENDED_STATE_PAIRS[key])
            for letter in key:
                self.assertIn(letter, STATES)
        for key, gloss in INTENT_PAIRS:
            self.assertIn(gloss, RECOMMENDED_INTENT_PAIRS[key])
            for letter in key:
                self.assertIn(letter, INTENTS)

        sources = [
            (ROOT / name).read_text(encoding='utf-8')
            for name in ('parser.py', 'parser.js', 'parser.ts')
        ]
        for text in sources:
            self.assertEqual(pair_keys(text, 'RECOMMENDED_STATE_PAIRS'), list(RECOMMENDED_STATE_PAIRS))
            self.assertEqual(pair_keys(text, 'RECOMMENDED_INTENT_PAIRS'), list(RECOMMENDED_INTENT_PAIRS))
            bundles = (
                *STATE_PAIRS,
                *INTENT_PAIRS,
                *CODE_GLOSS.items(),
                *STATE_GLOSS.items(),
                *INTENT_GLOSS.items(),
            )
            for _key, gloss in bundles:
                self.assertIn(gloss, text)

    def test_stale_wording_is_gone(self) -> None:
        for path in ROOT.rglob('*'):
            if not path.is_file() or '.git' in path.parts:
                continue
            if path.suffix not in {'.md', '.py', '.js', '.ts'}:
                continue
            if path.name == 'test_parser.py':
                continue
            text = path.read_text(encoding='utf-8')
            for phrase in BANNED:
                self.assertNotIn(phrase, text, f'{path.name} still has {phrase!r}')
            if path.name != 'test_parser.py':
                self.assertIn('1.4.0', text, path.name)


if __name__ == '__main__':
    unittest.main()
