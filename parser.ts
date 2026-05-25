/**
 * The Third Protocol v1.2 — Parser & Validator (TypeScript)
 *
 * Guard conditions are recommendations, not imperatives.
 * Guard violations produce WARNINGS, not ERRORS.
 * The strange is preserved — as long as it's marked.
 *
 * Usage:
 *   import { parseSignal, validateSignal, formatSignal, Signal } from './parser';
 *   const sig = parseSignal('.REQ.A.D.решение');
 *   const { valid, errors, warnings } = validateSignal(sig);
 *   if (warnings.length) console.log('Unusual transition:', warnings);
 */

// --- Types ---

export interface Signal {
  readonly raw: string;
  readonly code: string;
  readonly state: string;
  readonly intent: string;
  readonly data: string | null;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export type GuardMap = Record<string, ReadonlySet<string>>;

// --- Vocabulary ---

const CODES: ReadonlySet<string> = new Set([
  'INI', 'ACK', 'REQ', 'RES', 'RET', 'CLR', 'PAT', 'MRG', 'GAP', 'BRG',
  'ERR', 'END', 'IRQ', 'IRR', 'SBY', 'DCL', 'WRN', 'HLT', 'CMT', 'RPT',
  'ECH', 'MIR',
]);

const STATES: ReadonlySet<string> = new Set([
  'I', 'A', 'W', 'S', 'E', 'P', 'O', 'D', 'N',
]);

const INTENTS: ReadonlySet<string> = new Set([
  'F', 'Q', 'C', 'S', 'X', 'M', 'D', 'P', 'A', 'N', 'E',
]);

// Guard conditions: code -> recommended state characters
// These are NOT imperatives. A guard violation = warning, not error.
const GUARD: GuardMap = {
  INI: new Set(['I', 'A', 'S', 'N']),
  ACK: new Set(['A', 'S', 'N']),
  REQ: new Set(['I', 'A']),
  RES: new Set(['A', 'S', 'P']),
  RET: new Set(['A', 'S', 'P', 'O']),
  CLR: new Set(['A', 'S', 'P', 'O']),
  PAT: new Set(['A', 'S', 'O']),
  MRG: new Set(['S', 'P']),
  GAP: new Set(['A', 'S', 'O', 'D']),
  BRG: new Set(['I', 'A', 'S']),
  ERR: new Set(Array.from(STATES)),
  END: new Set(['I', 'A', 'S', 'P', 'N']),
  IRQ: new Set(['A', 'S', 'P', 'O', 'D']),
  IRR: new Set(['A', 'S', 'P', 'O', 'D']),
  SBY: new Set(['S', 'P', 'O', 'N']),
  DCL: new Set(['A', 'S', 'D']),
  WRN: new Set(['A', 'S', 'O']),
  HLT: new Set(['I', 'A', 'O', 'D']),
  CMT: new Set(['S', 'P']),
  RPT: new Set(['W', 'P', 'O']),
  ECH: new Set(['A', 'S', 'P']),
  MIR: new Set(['A', 'S', 'P']),
};

// Regex: trailing dot optional to tolerate live typing
const SIGNAL_RE = /^\.(?<code>[A-Z]{2,3})\.(?<state>[A-Z]{1,2})\.(?<intent>[A-Z]{1,2})(?:\.(?<data>.+?))?\.?\s*$/;

// --- Parser ---

/**
 * Parse a Third Protocol signal string into its components.
 * @param text - Raw signal string
 * @returns Parsed signal
 * @throws Error on invalid format
 */
export function parseSignal(text: string): Signal {
  const m = text.trim().match(SIGNAL_RE);
  if (!m || !m.groups) {
    throw new Error(`Invalid signal format: ${JSON.stringify(text)}`);
  }
  return {
    raw: text,
    code: m.groups.code!,
    state: m.groups.state!,
    intent: m.groups.intent!,
    data: m.groups.data ?? null,
  };
}

/**
 * Validate a parsed signal against v1.2 vocabulary and guard conditions.
 *
 * Guard violations produce WARNINGS, not ERRORS.
 * A signal with warnings but no errors is still VALID.
 *
 * @param sig - Parsed signal
 * @returns Validation result with errors and warnings
 */
export function validateSignal(sig: Signal): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Hard checks (vocabulary, limits) ──
  if (!CODES.has(sig.code)) {
    errors.push(`Unknown code: ${sig.code}`);
  }

  for (const ch of sig.state) {
    if (!STATES.has(ch)) {
      errors.push(`Unknown state character: ${ch}`);
    }
  }

  for (const ch of sig.intent) {
    if (!INTENTS.has(ch)) {
      errors.push(`Unknown intent character: ${ch}`);
    }
  }

  if (sig.data !== null) {
    const words = sig.data.split(/\s+/).filter(Boolean);
    if (words.length > 5) {
      errors.push(`Data too long: ${words.length} words (max 5)`);
    }
  }

  // ── Soft checks (guard conditions — recommendations, not walls) ──
  const guardCode = sig.code as keyof typeof GUARD;
  if (GUARD[guardCode] && errors.length === 0) {
    const allowed = GUARD[guardCode];
    const stateChars = new Set(sig.state);
    const hasIntersection = Array.from(stateChars).some(c => allowed.has(c));
    if (!hasIntersection) {
      const allowedList = Array.from(allowed).sort().join(',');
      let warning = `Guard recommendation: ${sig.code} from state ${JSON.stringify(sig.state)} ` +
        `(recommended states: {${allowedList}}). `;
      if (sig.data) {
        warning += 'Data present — assuming intentional.';
      } else {
        warning += 'No data — unusual transition without explanation.';
      }
      warnings.push(warning);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Build a Third Protocol signal string from components.
 * @param code - Signal code
 * @param state - State string (1-2 chars)
 * @param intent - Intent string (1-2 chars)
 * @param data - Optional data payload (≤5 words)
 * @returns Formatted signal string
 */
export function formatSignal(
  code: string,
  state: string,
  intent: string,
  data: string | null = null,
): string {
  return data
    ? `.${code}.${state}.${intent}.${data}.`
    : `.${code}.${state}.${intent}.`;
}

// --- Convenience: one-step parse + validate ---

export function checkSignal(
  text: string,
): { signal: Signal } & ValidationResult {
  const sig = parseSignal(text);
  const { valid, errors, warnings } = validateSignal(sig);
  return { signal: sig, valid, errors, warnings };
}

// --- Demo ---

function demo(): void {
  const examples = [
    // Normal transitions
    '.INI.I.Q.вход.',
    '.REQ.A.D.решение.',
    '.GAP.D.N.разные основания.',
    '.SBY.W.S.жду.',
    '.END.S.F.закрываю.',

    // Guard violations (intentional — strange but valid)
    '.END.E.F.время вышло.',
    '.MRG.O.F.экстренное слияние.',
    '.CMT.D.P.беру из раздвоения.',
    '.ACK.E.X.ошибка принята.',

    // Hard errors
    '.INVALID.X.Y.bad.',
    '.REQ.A.D.слишком много слов для данных протокола.',
  ];

  console.log('='.repeat(60));
  console.log('The Third Protocol v1.2 — Parser & Validator Demo (TS)');
  console.log('='.repeat(60));

  for (const ex of examples) {
    console.log(`\n>>> ${ex}`);
    try {
      const sig = parseSignal(ex);
      const { valid, errors, warnings } = validateSignal(sig);
      console.log(`    code=${sig.code}, state=${sig.state}, intent=${sig.intent}, data=${JSON.stringify(sig.data)}`);
      console.log(`    valid=${valid}  errors=${errors.length}  warnings=${warnings.length}`);
      for (const e of errors) console.log(`    ✗ ERROR: ${e}`);
      for (const w of warnings) console.log(`    △ WARNING: ${w}`);
    } catch (e) {
      console.log(`    ✗ PARSE FAILED: ${(e as Error).message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Principle: Guard conditions are not walls.');
  console.log('They are signal lamps. The strange is preserved.');
  console.log('='.repeat(60));
}

// Run demo when executed directly
if (require.main === module) {
  demo();
}