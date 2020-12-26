import CTP, { isNoMatch, Transformers as T, ok, resp2, ParseResult, isOK, noMatch, resp1 } from '../src/index';

test('sanity', () => {
  expect(1).toBe(1);
});

describe('single layer', () => {
  test('simple match', () => {
    const ctp = new CTP([
      ['hello', 'hello to you']
    ]);

    const response = ctp.parse('hello');
    expect(response.value).toBe('hello to you');
  });

  test('simple no-match', () => {
    const ctp = new CTP([
      ['hello', 'hello to you']
    ]);

    const response = ctp.parse('hola');
    expect(isNoMatch(response)).toBe(true);
  });

  test('case-sensitive match', () => {
    const ctp = new CTP([
      ['Hello', 'hello to you']
    ], {
      caseInsensitive: false,
    });

    const response = ctp.parse('Hello');
    expect(response.value).toBe('hello to you');
  })

  test('case-sensitive no-match', () => {
    const ctp = new CTP([
      ['hello', 'hello to you']
    ], {
      caseInsensitive: false,
    });

    const response = ctp.parse('HELLO');
    expect(isNoMatch(response)).toBe(true);
  })

  test('case-INsensitive match', () => {
    const ctp = new CTP([
      ['hello', 'hello to you']
    ], {
      caseInsensitive: true,
    });

    const response = ctp.parse('HELLO');
    expect(response.value).toBe('hello to you');
  })

  test('match first item first', () => {
    const ctp = new CTP([
      ['hello', 'response 1'],
      ['hello', 'response 2']
    ]);

    const response = ctp.parse('hello');
    expect(response.value).toBe('response 1');
  });

  test('match second item only', () => {
    const ctp = new CTP([
      ['hello', 'response 1'],
      ['hello!', 'response 2']
    ]);

    const response = ctp.parse('hello!');
    expect(response.value).toBe('response 2');
  });
});

describe('complex', () => {
  test('two word match', () => {
    const ctp = new CTP([
      ['hello', 'there', 'hello to you'],
    ]);

    const response1 = ctp.parse(('hello'));
    expect(isNoMatch(response1)).toBe(true);

    const response2 = ctp.parse(('hello there'));
    expect(response2.value).toBe('hello to you');
  })

  test('match input without value result', () => {
    const ctp = new CTP([
      ['a', 'b'],
    ]);

    const response1 = ctp.parse('a b');
    expect(isOK(response1)).toBe(true);
  })

  test('do not match input without value result with too many params', () => {
    const ctp = new CTP([
      ['a', 'b'],
    ]);

    const response1 = ctp.parse('a b c');
    expect(isNoMatch(response1)).toBe(true);
  })

  test('extra param is not accepted to a terminal resp function', () => {
    const ctp = new CTP([
      ['a', 'b', resp1(() => ok(null))],
    ]);

    const response1 = ctp.parse('a b c');
    expect(isNoMatch(response1)).toBe(true);
  })

  test('extra param IS accepted to a non-terminal resp function and it is optional', () => {
    const ctp = new CTP([
      ['a', 'b', (_lastInput) => ok(null)],
    ]);

    const response1 = ctp.parse('a b c');
    expect(isOK(response1)).toBe(true);
    const response2 = ctp.parse('a b');
    expect(isOK(response2)).toBe(true);
  })


  test('branched match', () => {
    const ctp = new CTP([
      ['hello', [
        ['there', 'hello to you'],
        ['friend', 'hello my friend'],
      ]],
    ]);

    const response1 = ctp.parse(('hello there'));
    expect(response1.value).toBe('hello to you');

    const response2 = ctp.parse(('hello friend'));
    expect(response2.value).toBe('hello my friend');
  })

  const add = resp2((a: number, b: number) => ok(a + b));

  const ctp = new CTP([
    ['add', T.NUMBER, T.NUMBER, add],
  ])

  test('function matchers', () => {
    const response1 = ctp.parse('add a b');
    expect(isNoMatch(response1)).toBe(true);

    const response2 = ctp.parse(('add 3 7'));
    expect(response2.value).toBe(10);
  })

  test('multi input (word) function matcher #1', () => {
    const echoParser = (_current: string, _previous: any[], remaining: string[]): ParseResult<string> => {
      return ok(remaining.join(' '), remaining.length);
    };

    const ctp2 = new CTP([
      [echoParser]
    ]);

    const response = ctp2.parse('please reply with this!')

    expect(response.value).toBe('please reply with this!');
  });

  test('multi input (word) function matcher #2', () => {
    const thanksParser = (_current: string, _previous: any[], remaining: string[]): ParseResult<string> => {
      if (/thanks,?/.test(remaining.join(' ')) || /thank you,?/.test(remaining.join(' '))) {
        return ok(remaining[remaining.length - 1], remaining.length);
      } else {
        return noMatch;
      }
    };

    const ctp2 = new CTP([
      [thanksParser]
    ])

    const response1 = ctp2.parse('thanks, john');
    expect(response1.value).toBe('john');
    const response2 = ctp2.parse('thank you, john');
    expect(response2.value).toBe('john');
    const response3 = ctp2.parse('bye');
    expect(isOK(response3)).toBe(false);
  })

  test('multi input matcher consumes variable number of items', () => {
    const takeNumbers = (_current: string, _previous: any[], _remaining: string[]): ParseResult<number[]> => {
      let result: number[] = [];
      for (const x of _remaining) {
        if (Number.isFinite(parseFloat(x))) {
          result.push(parseFloat(x));
        } else {
          break;
        }
      }

      if (result.length === 0) {
        return noMatch;
      } else {
        return ok(result, result.length);
      }
    }

    const ctp2 = new CTP([
      ['take', [
        [takeNumbers, 'product', resp2((numbers: number[]) => ok(numbers[0] * numbers[1]))],
        [takeNumbers, 'sum', resp2((numbers: number[]) => ok(numbers[0] + numbers[1] + numbers[2]))],
      ]]
    ]);

    const response1 = ctp2.parse('take 2 3 product');
    expect(response1.value).toBe(6);
    const response2 = ctp2.parse('take 2 3 4 sum');
    expect(response2.value).toBe(9);
    const response3 = ctp2.parse('take five product');
    expect(isNoMatch(response3)).toBe(true);
  })

  test('optional input at the end', () => {
    const optionalNumber = (current: string) => {
      return ok(current ? parseFloat(current) : null, current ? 1 : 0);
    }

    const ctp2 = new CTP([
      ['sumopt', T.NUMBER, optionalNumber, resp2((a: number, b: number | null) => ok(a + (b ?? 0)))],
    ])

    const response1 = ctp2.parse('sumopt 1 2');
    expect(response1.value).toBe(3);
    const response2 = ctp2.parse('sumopt 1');
    expect(response2.value).toBe(1);
    const response3 = ctp2.parse('sumopt 1 2 3');
    expect(isOK(response3)).toBe(false);
  })
})

