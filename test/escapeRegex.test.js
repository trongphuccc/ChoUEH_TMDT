const test = require('node:test');
const assert = require('node:assert');
const escapeRegex = require('../utils/escapeRegex');

test('special characters are matched literally', () => {
  assert.strictEqual(escapeRegex('a(b'), 'a\\(b');
  assert.ok(new RegExp(escapeRegex('C++'), 'i').test('Học C++ cơ bản'));
  assert.ok(new RegExp(escapeRegex('(((a+)+)+$')).test('x(((a+)+)+$'));
});

test('input is capped so a pasted wall of text cannot blow up the query', () => {
  assert.strictEqual(escapeRegex('x'.repeat(500)).length, 100);
});
