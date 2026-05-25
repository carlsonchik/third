#!/usr/bin/env node
/**
 * The Third Protocol v1.2 — Parser & Validator (JavaScript)
 *
 * Guard conditions are recommendations, not imperatives.
 * Guard violations produce WARNINGS, not ERRORS.
 * The strange is preserved — as long as it's marked.
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
    'ECH','MIR'
]);

const STATES = new Set(['I','A','W','S','E','P','O','D','N']);
const INTENTS = new Set(['F','Q','C','S','X','M','D','P','A','N','E']);

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
};

// Regex: trailing dot optional to tolerate live typing
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
║  Third Protocol v1.2 — CLI                  ║
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
  node parser.js --check ".CMT.D.P.беру из раздвоения."
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
            '.CMT.D.P.беру из раздвоения.',
            '.ACK.E.X.ошибка принята.',
            '.INVALID.X.Y.bad.',
            '.REQ.A.D.слишком много слов для данных протокола.',
        ];

        console.log('='.repeat(60));
        console.log('The Third Protocol v1.2 — Demo');
        console.log('='.repeat(60));

        for (const ex of examples) {
            const sig = parseSignal(ex);
            const result = validateSignal(sig);
            console.log(`\n${prettySignal(sig, result)}`);
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

module.exports = { parseSignal, validateSignal, formatSignal };