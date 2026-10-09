import test from 'node:test'
import assert from 'node:assert/strict'
import np from '../vendor/number-precision/index.js'

test('plus and times avoid binary float artifacts', () => {
  assert.equal(np.plus(0.1, 0.2), 0.3)
  assert.equal(np.plus(2.3, 2.4), 4.7)
  assert.equal(np.plus(1, 2, 3.5), 6.5)
  assert.equal(np.times(2.3, 2.4), 5.52)
  assert.equal(np.times(0.07, 100), 7)
  assert.equal(np.times(0.5, 100), 50)
  assert.equal(np.plus(-0.1, 0.1), 0)
})

test('divide keeps tiny quotients and handles negatives', () => {
  assert.equal(np.divide(1, 4), 0.25)
  assert.equal(np.divide(1, 1.5e21), 6.666666666666666e-22)
  assert.equal(np.divide(-6, 3), -2)
})

test('round uses half-away-from-zero on decimal digits', () => {
  assert.equal(np.round(1.005, 2), 1.01)
  assert.equal(np.round(-1.005, 2), -1.01)
  assert.equal(np.round(2.345, 2), 2.35)
  assert.equal(np.round(1.5, 0), 2)
  assert.equal(np.round(-1.5, 0), -2)
  assert.equal(np.round(123.456, 1), 123.5)
  assert.equal(np.round(12.5, 0), 13)
  assert.equal(np.round(1e-7, 2), 0)
})

test('round never returns negative zero', () => {
  assert.ok(Object.is(np.round(-0, 1), 0))
  assert.ok(Object.is(np.round(-0.001, 2), 0))
})

test('default export exposes the same functions Arco uses', () => {
  for (const name of ['times', 'plus', 'divide', 'round', 'enableBoundaryChecking']) {
    assert.equal(typeof np[name], 'function', name)
  }
  assert.doesNotThrow(() => np.enableBoundaryChecking(false))
})
