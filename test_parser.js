/**
 * Minimal checks for /3 v1.4.0 (JavaScript parser).
 * Leading dot required, trailing dot optional.
 */

const assert = require('assert');
const fs = require('fs');
const {
    parseSignal,
    validateSignal,
    STATE_DESC,
    INTENT_DESC,
    RECOMMENDED_STATE_PAIRS,
    RECOMMENDED_INTENT_PAIRS,
} = require('./parser.js');

const STATE_ORDER = [
    'SD', 'SO', 'SW', 'SP', 'SF', 'SA', 'DW', 'WD', 'OW', 'OS', 'OF', 'PF', 'PD', 'WF',
];
const INTENT_ORDER = ['QS', 'AQ', 'FD', 'SA', 'SE', 'XS'];

function bothForms(text) {
    const core = text.endsWith('.') ? text.slice(0, -1) : text;
    const parsed = [core, core + '.'].map((form) => {
        const sig = parseSignal(form);
        const result = validateSignal(sig);
        assert.ok(result.valid, `${form} ${result.errors.join('; ')}`);
        return sig;
    });
    assert.strictEqual(parsed[0].code, parsed[1].code);
    assert.strictEqual(parsed[0].state, parsed[1].state);
    assert.strictEqual(parsed[0].intent, parsed[1].intent);
    assert.strictEqual(parsed[0].data, parsed[1].data);
}

function main() {
    assert.strictEqual(STATE_DESC.P, 'Reflexive / рефлексия, интроспекция');
    assert.strictEqual(STATE_DESC.F, 'Flow / азарт, эмоциональный заряд');
    assert.ok(INTENT_DESC.A.startsWith('Acceptance'));
    assert.ok(!INTENT_DESC.A.includes('Answer'));
    assert.deepStrictEqual(Object.keys(RECOMMENDED_STATE_PAIRS), STATE_ORDER);
    assert.deepStrictEqual(Object.keys(RECOMMENDED_INTENT_PAIRS), INTENT_ORDER);

    bothForms('.INI.S.Q.Hello');
    bothForms(".ACK.S.A.Hello. I'm here");
    bothForms('.SBY.W.S.Думаю. Подожди');
    bothForms('.OBT.S.X');

    assert.throws(() => parseSignal('INI.S.Q.Hello'));

    const unknown = validateSignal(parseSignal('.SBY.S.W.жди'));
    assert.strictEqual(unknown.valid, false);

    const tooLong = validateSignal(parseSignal('.REQ.A.D.один два три четыре пять шесть'));
    assert.strictEqual(tooLong.valid, false);

    for (const pair of STATE_ORDER) {
        const result = validateSignal(parseSignal(`.CMT.${pair}.F.метка`));
        assert.ok(result.valid, pair + ' ' + result.errors.join('; '));
    }
    for (const pair of INTENT_ORDER) {
        const result = validateSignal(parseSignal(`.CMT.S.${pair}.метка`));
        assert.ok(result.valid, pair + ' ' + result.errors.join('; '));
    }

    const fileFlag = process.argv.indexOf('--from-file');
    if (fileFlag !== -1) {
        const lines = fs.readFileSync(process.argv[fileFlag + 1], 'utf8').split('\n');
        for (const line of lines) {
            const sig = line.trim();
            if (sig) bothForms(sig);
        }
    }
}

main();
