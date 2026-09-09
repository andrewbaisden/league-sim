export interface RandomSource {
  next(): number;
}

function mix(value: number): number {
  let result = value >>> 0;
  result = Math.imul(result ^ (result >>> 16), 0x21f0aaad);
  result = Math.imul(result ^ (result >>> 15), 0x735a2d97);
  return (result ^ (result >>> 15)) >>> 0;
}

export function deriveSeed(batchSeed: number, runIndex: number): number {
  return mix((batchSeed >>> 0) ^ Math.imul(runIndex + 1, 0x9e3779b9));
}

export function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    },
  };
}
