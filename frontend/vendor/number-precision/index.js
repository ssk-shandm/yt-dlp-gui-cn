// Exact decimal arithmetic on the shortest decimal form of each operand, using BigInt.
const DIVISION_DIGITS = 30
const DECIMAL = /^([+-]?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i

const isFiniteNumeric = value => Number.isFinite(Number(value))

function toDecimal(value) {
  const match = DECIMAL.exec(String(value))
  if (!match) throw new TypeError(`Expected a finite number, got ${value}`)
  const [, sign, whole, fraction = '', exponent = '0'] = match
  let digits = BigInt(whole + fraction)
  let scale = fraction.length - Number(exponent)
  if (scale < 0) {
    digits *= 10n ** BigInt(-scale)
    scale = 0
  }
  return { negative: sign === '-', digits, scale }
}

const signedDigits = ({ negative, digits }) => (negative ? -digits : digits)

function fromDecimal(negative, digits, scale) {
  if (digits === 0n) return 0
  return Number(`${negative ? '-' : ''}${digits}e${-scale}`)
}

function reduceOperands(nums, operation) {
  return nums.slice(1).reduce(operation, nums[0])
}

function add(a, b) {
  if (!isFiniteNumeric(a) || !isFiniteNumeric(b)) return Number(a) + Number(b)
  const x = toDecimal(a)
  const y = toDecimal(b)
  const scale = Math.max(x.scale, y.scale)
  const sum = signedDigits(x) * 10n ** BigInt(scale - x.scale) + signedDigits(y) * 10n ** BigInt(scale - y.scale)
  return fromDecimal(sum < 0n, sum < 0n ? -sum : sum, scale)
}

function multiply(a, b) {
  if (!isFiniteNumeric(a) || !isFiniteNumeric(b)) return Number(a) * Number(b)
  const x = toDecimal(a)
  const y = toDecimal(b)
  return fromDecimal(x.negative !== y.negative, x.digits * y.digits, x.scale + y.scale)
}

function divide(a, b) {
  if (!isFiniteNumeric(a) || !isFiniteNumeric(b) || Number(b) === 0) return Number(a) / Number(b)
  const x = toDecimal(a)
  const y = toDecimal(b)
  const shift = Math.max(0, DIVISION_DIGITS + y.digits.toString().length - x.digits.toString().length)
  const quotient = (x.digits * 10n ** BigInt(shift + y.scale)) / (y.digits * 10n ** BigInt(x.scale))
  return fromDecimal(x.negative !== y.negative, quotient, shift)
}

function round(value, decimal) {
  if (!isFiniteNumeric(value)) return Number(value)
  const x = toDecimal(value)
  if (x.scale <= decimal) return Number(value) || 0
  const unit = 10n ** BigInt(x.scale - decimal)
  const rounded = (x.digits + unit / 2n) / unit
  if (rounded === 0n) return 0
  return fromDecimal(x.negative, rounded, decimal)
}

export const times = (...nums) => reduceOperands(nums, multiply)
export const plus = (...nums) => reduceOperands(nums, add)
export { divide, round }

// Exact integer arithmetic has no safe-integer limit to check; kept because Arco calls it.
export function enableBoundaryChecking() {}

export default { times, plus, divide, round, enableBoundaryChecking }
