type NumberType = number | string

export declare function times(...nums: NumberType[]): number
export declare function plus(...nums: NumberType[]): number
export declare function divide(...nums: NumberType[]): number
export declare function round(num: NumberType, decimal: number): number
export declare function enableBoundaryChecking(flag?: boolean): void

declare const NumberPrecision: {
  times: typeof times
  plus: typeof plus
  divide: typeof divide
  round: typeof round
  enableBoundaryChecking: typeof enableBoundaryChecking
}

export default NumberPrecision
