/**
 * A tariff formula as the tax calculator's export writes it
 * ("-0.827429* $wert$ + 0.089718* $wert$ * (log $wert$ - 1) + 829.41877"),
 * reduced to constant + linear·x + xLnX·x·ln(x): the shape of a piece of the
 * tax model's `logarithmic` tariff. Anything that does not reduce to that
 * shape is refused, never approximated. `log` is the natural logarithm.
 */

export interface FormulaTerms {
  constant: number;
  linear: number;
  xLnX: number;
}

/** Coefficients of 1, x, ln x and x·ln x. */
type Value = [number, number, number, number];

const scalar = (n: number): Value => [n, 0, 0, 0];
const isScalar = (v: Value) => v[1] === 0 && v[2] === 0 && v[3] === 0;

function times(a: Value, b: Value): Value {
  if (isScalar(a)) return b.map((c) => c * a[0]) as Value;
  if (isScalar(b)) return a.map((c) => c * b[0]) as Value;
  // x · (p + q·ln x) = p·x + q·x·ln x; nothing else stays in the shape.
  const [x, other] = a[0] === 0 && a[2] === 0 && a[3] === 0 ? [a, b] : [b, a];
  if (x[0] !== 0 || x[2] !== 0 || x[3] !== 0 || other[1] !== 0 || other[3] !== 0) {
    throw new Error("a product that is not of the form x·(a + b·ln x)");
  }
  return [0, x[1] * other[0], 0, x[1] * other[2]];
}

const TOKEN = /\s*(\d+(?:\.\d+)?|\$wert\$|log|[-+*/()])/y;

export function parseFormula(text: string): FormulaTerms {
  const tokens: string[] = [];
  TOKEN.lastIndex = 0;
  const source = text.trim();
  while (TOKEN.lastIndex < source.length) {
    const match = TOKEN.exec(source);
    if (!match) {
      throw new Error(`formula "${text}": cannot read from "${source.slice(TOKEN.lastIndex)}"`);
    }
    tokens.push(match[1]!);
  }
  let at = 0;
  const peek = () => tokens[at];
  const take = (expected?: string) => {
    const token = tokens[at++];
    if (token === undefined || (expected !== undefined && token !== expected)) {
      throw new Error(`formula "${text}": expected ${expected ?? "more"} at token ${at}`);
    }
    return token;
  };

  function expression(): Value {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const sign = take() === "+" ? 1 : -1;
      const next = term();
      value = value.map((c, i) => c + sign * next[i]!) as Value;
    }
    return value;
  }
  function term(): Value {
    let value = factor();
    while (peek() === "*" || peek() === "/") {
      if (take() === "*") {
        value = times(value, factor());
      } else {
        const divisor = factor();
        if (!isScalar(divisor) || divisor[0] === 0) {
          throw new Error(`formula "${text}": divides by something other than a number`);
        }
        value = value.map((c) => c / divisor[0]) as Value;
      }
    }
    return value;
  }
  function factor(): Value {
    const token = take();
    if (token === "-") return factor().map((c) => -c) as Value;
    if (token === "+") return factor();
    if (token === "(") {
      const inner = expression();
      take(")");
      return inner;
    }
    if (token === "$wert$") return [0, 1, 0, 0];
    if (token === "log") {
      const argument = factor();
      if (argument.join() !== "0,1,0,0") {
        throw new Error(`formula "${text}": log of something other than the amount`);
      }
      return [0, 0, 1, 0];
    }
    const n = Number(token);
    if (!Number.isFinite(n)) {
      throw new Error(`formula "${text}": unexpected "${token}"`);
    }
    return scalar(n);
  }

  const [constant, linear, ln, xLnX] = expression();
  if (at !== tokens.length) {
    throw new Error(`formula "${text}": unexpected "${tokens[at]}"`);
  }
  if (ln !== 0) {
    throw new Error(`formula "${text}": a bare ln x term`);
  }
  return { constant, linear, xLnX };
}
