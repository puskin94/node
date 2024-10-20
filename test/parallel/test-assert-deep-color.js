'use strict';

require('../common');
const assert = require('assert');
const { test } = require('node:test');

process.env.FORCE_COLOR = 1;

test('Check assertion with colors', () => {
  assert.throws(
    () => assert.strictEqual('apple', 'pear'),
    {
      name: 'AssertionError',
      message: 'Expected values to be strictly equal:\n\n\'apple\' !== \'pear\'\n'
    }
  );

  assert.throws(
    () => assert.strictEqual('ABABABABABAB', 'BABABABABABA'),
    {
      name: 'AssertionError',
      message: 'Expected values to be strictly equal:\n' +
        '+ actual - expected\n' +
        '\n' +
        "+ 'ABABABABABAB'\n" +
        "- 'BABABABABABA'\n"
    }
  );
});
