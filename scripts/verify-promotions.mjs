import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { console };
vm.createContext(context);
vm.runInContext(`${readFileSync('price-calculator.js', 'utf8')}\nthis.calc = priceCalculator;`, context);

const calc = context.calc;
const price = 10;
const payForByQuantity = [
  [1, 1],
  [2, 2],
  [3, 2],
  [4, 3],
  [5, 4],
  [6, 4],
];

for (const [quantity, payFor] of payForByQuantity) {
  const subtotal = calc.calculateBuyTwoGetOne(price, quantity);
  const expected = price * payFor;
  if (subtotal !== expected) {
    throw new Error(`買二送一 ${quantity} 件應付 ${expected}，實際 ${subtotal}`);
  }
}

const secondHalf = calc.calculateSecondHalf(100, 2);
if (secondHalf !== 150) {
  throw new Error(`第二件應為原價的 50%，2 件小計應為 150，實際 ${secondHalf}`);
}

console.log('promotion checks passed');
