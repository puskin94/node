'use strict';

require('../common');
const assert = require('assert').strict;

assert.throws(() => {
  const err = new Error('foo');
  err.bar = true;
  throw err;
}, { bar: true });