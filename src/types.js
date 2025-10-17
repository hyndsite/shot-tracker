export function efg(t) {
  return t.attempts ? (t.makes + 0.5 * t.threesMade) / t.attempts : 0
}
