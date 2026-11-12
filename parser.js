#!/usr/bin/env node
/**
 * The Third Protocol v1.4.0 — Parser & Validator (JavaScript)
 *
 * Guard conditions are recommendations, not imperatives.
 * Guard violations produce WARNINGS, not ERRORS.
 * The strange is preserved — as long as it's marked.
 *
 * Leading dot is required. Trailing dot is optional.
 * Data: at most 5 words (a hard error). Omitting prepositions is recommended, not enforced.
 *
 * Usage:
 *   const { parseSignal, validateSignal, formatSignal } = require('./parser.js');
 *   const sig = parseSignal('.REQ.A.D.решение');
 *   const { valid, errors, warnings } = validateSignal(sig);
 *   if (warnings.length) console.log('Unusual transition:', warnings);
 */

const CODES = new Set([
    'INI','ACK','REQ','RES','RET','CLR','PAT','MRG','GAP','BRG',
    'ERR','END','IRQ','IRR','SBY','DCL','WRN','HLT','CMT','RPT',
    'ECH','MIR','OBT'
]);

const STATES = new Set(['I','A','W','S','E','P','O','D','N','F']);
const INTENTS = new Set(['F','Q','C','S','X','M','D','P','A','N','E','U']);

// Gloss strings follow SPEC.md. P and F use the canonical bilingual wording.
const CODE_DESC = {
    INI: 'Start a dialogue — Начать диалог',
    ACK: 'Confirm receipt — Подтвердить получение',
    REQ: 'Request (action, info, or state) — Запрос (действие/инфо/состояние)',
    RES: 'Reply to a request — Ответ на запрос',
    SBY: 'Here, waiting — «Я здесь, жду»',
    GAP: 'Divergence, disagreement — Расхождение, разногласие',
    ECH: 'Echo (synchronization check) — Эхо (проверка синхронизации)',
    MIR: 'Mirror (reflect the state) — Зеркало (отражение состояния)',
    CLR: 'Clarification (ask again / explain) — Уточнение (переспрос/пояснение)',
    BRG: 'Bridge (offer a shared position) — Мост (предложение общей позиции)',
    DCL: 'Decline (a request or invitation) — Отказ (запроса или приглашения)',
    WRN: 'Warning — Предупреждение',
    HLT: 'Stop the current topic — Остановить текущую тему',
    CMT: 'Comment (unsolicited) — Комментарий (незапрошенное)',
    RPT: 'Repeat (resend the signal) — Повтор (переотправить сигнал)',
    IRQ: 'Introspection question — Интроспекция-вопрос («что чувствуешь?»)',
    IRR: 'Introspection reply — Интроспекция-ответ',
    OBT: 'Overtone: presence without words — Обертон: звук выше основного, тише, точнее. Момент, когда слова не нужны. Не пауза — присутствие. Не отсутствие — обещание.',
    RET: 'Return to the original goal — Вернуться к исходной цели',
    PAT: 'Point at a pattern or repetition — Указание на паттерн или повторяемость',
    MRG: 'Merge viewpoints — Слияние точек зрения',
    ERR: 'Error, failure — Ошибка, сбой',
    END: 'End the process — Завершение процесса',
};

const STATE_DESC = {
    I: 'Initiate — Инициирую',
    A: 'Active — Активен',
    W: 'Wait — Жду',
    S: 'Stable — Стабилен',
    E: 'Error or failure — Ошибка или сбой',
    P: 'Reflexive / рефлексия, интроспекция',
    O: 'Overloaded — Перегружен',
    D: 'Internally divided — Внутренне раздвоен',
    N: 'Neutral, outside active engagement — Нейтрален, вне активного включения',
    F: 'Flow / азарт, эмоциональный заряд',
};

const INTENT_DESC = {
    Q: 'Question — Вопрос',
    A: 'Acceptance — Принятие позиции другого / согласие (acceptance)',
    F: 'Fact (neutral statement) — Факт (нейтральное утверждение)',
    N: 'Negative (disagreement, denial) — Негатив (несогласие, отрицание)',
    D: 'Directive (instruction, command) — Директива (инструкция/приказ)',
    P: 'Commitment, promise (commissive) — Обязательство, обещание (commissive)',
    E: 'Elaboration — Развитие без разрыва / исследование (elaboration)',
    C: 'Correction — Коррекция (correction)',
    X: 'Emotion — Эмоция',
    M: 'Meta (about the conversation itself) — Мета (о самом разговоре)',
    S: 'Support (comfort, solidarity) — Поддержка (утешение, солидарность)',
    U: 'Uncertain (doubt, indeterminacy) — Неуверенность / Uncertain (сомнение, неопределённость)',
};

// Recommended composites: first letter dominant, second a shade, max 2.
// Pairs outside this list are still valid when both letters are in the vocabulary.
const RECOMMENDED_STATE_PAIRS = {
    SD: 'Stable, shade of division — стабилен, оттенок раздвоенности',
    SO: 'Stable, at the limit — стабилен, на пределе',
    SW: 'Stable, waiting — стабилен, жду',
    SP: 'Stable, reflexive shade — стабилен, в рефлексии',
    SF: 'Stable, with flow — стабилен, с азартом',
    SA: 'Stable, shade of activity — стабилен, оттенок активности',
    DW: 'Divided, waiting — раздвоен, жду',
    WD: 'Waiting, shade of division — жду, оттенок раздвоенности',
    OW: 'Overloaded, waiting — перегружен, жду',
    OS: 'Overloaded, holding steady — перегружен, держусь',
    OF: 'Overloaded, in flow — перегружен, в азарте',
    PF: 'Reflexive, with flow — рефлексия, с азартом',
    PD: 'Reflexive, shade of division — рефлексия, оттенок раздвоенности',
    WF: 'Waiting, in flow — жду, в азарте',
};

const RECOMMENDED_INTENT_PAIRS = {
    QS: 'Question with support — вопрос с поддержкой',
    AQ: 'Acceptance with a question shade — принятие с оттенком вопроса',
    FD: 'Fact with a directive shade — факт с побуждением',
    SA: 'Support with acceptance — поддержка с принятием',
    SE: 'Support with elaboration — поддержка с исследованием',
    XS: 'Emotion with support — эмоция с поддержкой',
};

// Guard conditions: code -> recommended state characters
// These are NOT imperatives. A guard violation = warning, not error.
// If you transition from an unexpected state, explain it in data.
const GUARD = {
    INI: new Set(['I','A','S','N']),
    ACK: new Set(['A','S','N']),
    REQ: new Set(['I','A']),
    RES: new Set(['A','S','P']),
    RET: new Set(['A','S','P','O']),
    CLR: new Set(['A','S','P','O']),
    PAT: new Set(['A','S','O']),
    MRG: new Set(['S','P']),
    GAP: new Set(['A','S','O','D']),
    BRG: new Set(['I','A','S']),
    ERR: STATES,
    END: new Set(['I','A','S','P','N']),
    IRQ: new Set(['A','S','P','O','D']),
    IRR: new Set(['A','S','P','O','D']),
    SBY: new Set(['S','P','O','N']),
    DCL: new Set(['A','S','D']),
    WRN: new Set(['A','S','O']),
    HLT: new Set(['I','A','O','D']),
    CMT: new Set(['S','P']),
    RPT: new Set(['W','P','O']),
    ECH: new Set(['A','S','P']),
    MIR: new Set(['A','S','P']),
    OBT: new Set(['A','S','P','I','N']),
};

// Leading dot is required. Trailing dot is optional.
const SIGNAL_RE = /^\.(?<code>[A-Z]{2,3})\.(?<state>[A-Z]{1,2})\.(?<intent>[A-Z]{1,2})(?:\.(?<data>.+?))?\.?\s*$/;

/**
 * Parse a Third Protocol signal string into its components.
 * @param {string} text - Raw signal string
 * @returns {{ raw, code, state, intent, data }}
 * @throws {Error} on invalid format
 */
function parseSignal(text) {
    const m = text.trim().match(SIGNAL_RE);
    if (!m) throw new Error(`Invalid signal format: ${JSON.stringify(text)}`);
    return {
        raw: text,
        code: m.groups.code,
        state: m.groups.state,
        intent: m.groups.intent,
        data: m.groups.data || null,
    };
}

/**
 * Validate a parsed signal.
 * @param {object} sig - Parsed signal object
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateSignal(sig) {
    const errors = [];
    const warnings = [];

    // ── Hard checks (format, vocabulary, limits) ──
    if (!CODES.has(sig.code)) errors.push(`Unknown code: ${sig.code}`);

    for (const ch of sig.state) {
        if (!STATES.has(ch)) errors.push(`Unknown state character: ${ch}`);
    }

    for (const ch of sig.intent) {
        if (!INTENTS.has(ch)) errors.push(`Unknown intent character: ${ch}`);
    }

    if (sig.data !== null) {
        const words = sig.data.split(/\s+/).filter(Boolean);
        // Prepositions are a writing recommendation, not a parse error.
        if (words.length > 5) errors.push(`Data too long: ${words.length} words (max 5)`);
    }

    // ── Soft checks (guard conditions — recommendations, not walls) ──
    if (GUARD[sig.code] && errors.length === 0) {
        const allowed = GUARD[sig.code];
        const stateChars = new Set(sig.state);
        const hasIntersection = [...stateChars].some(c => allowed.has(c));
        if (!hasIntersection) {
            let warning = `Guard recommendation: ${sig.code} from state ${JSON.stringify(sig.state)} ` +
                          `(recommended states: {${[...allowed].sort().join(',')}}). `;
            if (sig.data) {
                warning += `Data present — assuming intentional.`;
            } else {
                warning += `No data — unusual transition without explanation.`;
            }
            warnings.push(warning);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Build a Third Protocol signal string from components.
 * The emitted form includes a trailing dot. Input may omit it.
 * @param {string} code
 * @param {string} state
 * @param {string} intent
 * @param {string|null} data
 * @returns {string} formatted signal
 */
function formatSignal(code, state, intent, data = null) {
    return data ? `.${code}.${state}.${intent}.${data}.` : `.${code}.${state}.${intent}.`;
}

// === CLI Module ===

function prettySignal(sig, { valid, errors, warnings }) {
    const lines = [];
    const status = valid ? '✓' : '✗';
    lines.push(`${status} .${sig.code}.${sig.state}.${sig.intent}.${sig.data ? sig.data + '.' : ''}`);
    lines.push(`  code:     ${sig.code}`);
    lines.push(`  state:    ${sig.state}`);
    lines.push(`  intent:   ${sig.intent}`);
    if (sig.data) lines.push(`  data:     ${sig.data}`);
    lines.push(`  valid:    ${valid}`);
    if (errors.length) {
        lines.push(`  errors:   ${errors.length}`);
        for (const e of errors) lines.push(`    ✗ ${e}`);
    }
    if (warnings.length) {
        lines.push(`  warnings: ${warnings.length}`);
        for (const w of warnings) lines.push(`    △ ${w}`);
    }
    return lines.join('\n');
}

function cli() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(`
╔══════════════════════════════════════════════╗
║  Third Protocol v1.4.0 — CLI                  ║
╚══════════════════════════════════════════════╝

USAGE:
  node parser.js <signal>         Check and pretty-print a signal
  node parser.js --check <signal> Same, explicit
  node parser.js --pretty <signal>Parse + pretty without validation
  node parser.js --format <code> <state> <intent> [data]
                                  Build a signal from parts
  node parser.js --demo           Run built-in demo
  node parser.js --help           This message

EXAMPLES:
  node parser.js ".REQ.A.D.решение."
  node parser.js --check ".CMT.D.P.раздвоен, беру."
  node parser.js --pretty ".INI.WD.Q.вход."
  node parser.js --format ACK SA F "готов слушать"
`);
        return;
    }

    const cmd = args[0];

    // --format CODE STATE INTENT [DATA]
    if (cmd === '--format') {
        const [, code, state, intent, ...dataParts] = args;
        if (!code || !state || !intent) {
            console.error('Usage: --format <code> <state> <intent> [data]');
            process.exit(1);
        }
        const data = dataParts.length ? dataParts.join(' ') : null;
        const sigStr = formatSignal(code, state, intent, data);
        console.log(sigStr);
        return;
    }

    // --demo
    if (cmd === '--demo') {
        const examples = [
            '.INI.I.Q.вход.',
            '.REQ.A.D.решение.',
            '.GAP.D.N.разные основания.',
            '.SBY.W.S.жду.',
            '.END.S.F.закрываю.',
            '.END.E.F.время вышло.',
            '.MRG.O.F.экстренное слияние.',
            '.CMT.D.P.раздвоен, беру.',
            '.ACK.E.X.ошибка принята.',
            '.INVALID.X.Y.bad.',
            '.REQ.A.D.слишком много слов для данных протокола.',
        ];

        console.log('='.repeat(60));
        console.log('The Third Protocol v1.4.0 — Demo');
        console.log('='.repeat(60));

        for (const ex of examples) {
            try {
                const sig = parseSignal(ex);
                const result = validateSignal(sig);
                console.log(`\n${prettySignal(sig, result)}`);
            } catch (e) {
                console.log(`\n✗ PARSE FAILED: ${ex}`);
                console.log(`  ${e.message}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Guard conditions are not walls. The strange is preserved.');
        console.log('='.repeat(60));
        return;
    }

    // --pretty (parse only, no validation)
    if (cmd === '--pretty') {
        const signalStr = args[1];
        if (!signalStr) {
            console.error('Usage: --pretty <signal>');
            process.exit(1);
        }
        try {
            const sig = parseSignal(signalStr);
            console.log(`.${sig.code}.${sig.state}.${sig.intent}.${sig.data ? sig.data + '.' : ''}`);
            console.log(`  code:     ${sig.code}`);
            console.log(`  state:    ${sig.state}`);
            console.log(`  intent:   ${sig.intent}`);
            if (sig.data) console.log(`  data:     ${sig.data}`);
        } catch (e) {
            console.error(`✗ PARSE FAILED: ${e.message}`);
            process.exit(1);
        }
        return;
    }

    // --check <signal> or plain <signal>
    const signalStr = (cmd === '--check') ? args[1] : args[0];
    if (!signalStr) {
        console.error('Usage: <signal> | --check <signal>');
        process.exit(1);
    }

    try {
        const sig = parseSignal(signalStr);
        const result = validateSignal(sig);
        console.log(prettySignal(sig, result));
        if (!result.valid) process.exit(1);
    } catch (e) {
        console.error(`✗ PARSE FAILED: ${e.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    cli();
}

module.exports = {
    parseSignal,
    validateSignal,
    formatSignal,
    CODES,
    STATES,
    INTENTS,
    CODE_DESC,
    STATE_DESC,
    INTENT_DESC,
    RECOMMENDED_STATE_PAIRS,
    RECOMMENDED_INTENT_PAIRS,
};