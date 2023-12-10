function main() {
  const bars = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1];
  const water = computeTrappedWater(bars);
  console.log('Trapped water: ', water);
}

// https://leetcode.com/problems/trapping-rain-water/
function computeTrappedWater(bars: readonly number[]): number {
  if (bars.length === 0) {
    return 0;
  }
  const forward = computeWaterAir(bars, true);
  const backward = computeWaterAir(bars, false);
  return (forward.water + backward.water - forward.air - backward.air) / 2;
}

function computeWaterAir(
  bars: readonly number[],
  forward: boolean
): { water: number; air: number } {
  if (bars.length === 0) {
    return {water: 0, air: 0};
  }
  const startIndex = forward ? 0 : bars.length - 1;
  const endIndex = forward ? bars.length : -1;
  const shift = forward ? 1 : -1;
  let water = 0;
  let air = 0;
  let pivotIndex = startIndex;
  let pivotHeight = bars[startIndex];
  let areaAfterPivot = 0;
  for (let i = startIndex + shift; i !== endIndex; i += shift) {
    const height = bars[i];
    areaAfterPivot += height;
    if (height > pivotHeight) {
      const blockedArea = areaAfterPivot - height;
      water += pivotHeight * (Math.abs(i - pivotIndex) - 1) - blockedArea;
      air += (height - pivotHeight) * Math.abs(i - startIndex);
      pivotHeight = height;
      pivotIndex = i;
      areaAfterPivot = 0;
    }
  }
  water += pivotHeight * (Math.abs(endIndex - pivotIndex) - 1) - areaAfterPivot;
  return {water, air};
}

main();
