/**
 * Minimal checks for /3 v1.4.0 (TypeScript parser).
 * Leading dot required, trailing dot optional.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  INTENT_DESC,
  RECOMMENDED_INTENT_PAIRS,
  RECOMMENDED_STATE_PAIRS,
  STATE_DESC,
  parseSignal,
  validateSignal,
} from './parser.ts';

const STATE_ORDER = [
  'SD', 'SO', 'SW', 'SP', 'SF', 'SA', 'DW', 'WD', 'OW', 'OS', 'OF', 'PF', 'PD', 'WF',
];
const INTENT_ORDER = ['QS', 'AQ', 'FD', 'SA', 'SE', 'XS'];

function bothForms(text: string): void {
  const core = text.endsWith('.') ? text.slice(0, -1) : text;
  const parsed = [core, core + '.'].map((form) => {
    const sig = parseSignal(form);
    const result = validateSignal(sig);
    assert.equal(result.valid, true, `${form} ${result.errors.join('; ')}`);
    return sig;
  });
  assert.equal(parsed[0]?.code, parsed[1]?.code);
  assert.equal(parsed[0]?.state, parsed[1]?.state);
  assert.equal(parsed[0]?.intent, parsed[1]?.intent);
  assert.equal(parsed[0]?.data, parsed[1]?.data);
}

function main(): void {
  assert.equal(STATE_DESC.P, 'Reflexive / рефлексия, интроспекция');
  assert.equal(STATE_DESC.F, 'Flow / азарт, эмоциональный заряд');
  assert.equal(INTENT_DESC.A?.startsWith('Acceptance'), true);
  assert.equal(INTENT_DESC.A?.includes('Answer'), false);
  assert.deepEqual(Object.keys(RECOMMENDED_STATE_PAIRS), STATE_ORDER);
  assert.deepEqual(Object.keys(RECOMMENDED_INTENT_PAIRS), INTENT_ORDER);

  bothForms('.INI.S.Q.Hello');
  bothForms(".ACK.S.A.Hello. I'm here");
  bothForms('.SBY.W.S.Думаю. Подожди');
  bothForms('.OBT.S.X');

  assert.throws(() => parseSignal('INI.S.Q.Hello'));

  const unknown = validateSignal(parseSignal('.SBY.S.W.жди'));
  assert.equal(unknown.valid, false);

  const tooLong = validateSignal(parseSignal('.REQ.A.D.один два три четыре пять шесть'));
  assert.equal(tooLong.valid, false);

  for (const pair of STATE_ORDER) {
    const result = validateSignal(parseSignal(`.CMT.${pair}.F.метка`));
    assert.equal(result.valid, true, `${pair} ${result.errors.join('; ')}`);
  }
  for (const pair of INTENT_ORDER) {
    const result = validateSignal(parseSignal(`.CMT.S.${pair}.метка`));
    assert.equal(result.valid, true, `${pair} ${result.errors.join('; ')}`);
  }

  const fileFlag = process.argv.indexOf('--from-file');
  if (fileFlag !== -1) {
    const file = process.argv[fileFlag + 1];
    if (!file) {
      throw new Error('--from-file needs a path');
    }
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
      const sig = line.trim();
      if (sig) bothForms(sig);
    }
  }
}

main();
