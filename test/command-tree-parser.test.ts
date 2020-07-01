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

  test.only('multi input (word) function matcher #1', () => {
    const echoParser = (_current: string, _previous: any[], remaining: string[]): ParseResult<string> => {
      return ok(remaining.join(' '), remaining.length);
    };

    const ctp2 = new CTP([
      [echoParser]
    ], {debug: true});

    const response = ctp2.parse('please reply with this!')

    expect(response.value).toBe('please reply with this!');
  });

  test('multi input (word) function matcher #2', () => {
    const thanksParser = (_current: string, _previous: any[], remaining: string[]): ParseResult<string> => {
      if (/thanks,?/.test(remaining.join(' ')) || /thank you,?/.test(remaining.join(' '))) {
        return ok(remaining[remaining.length - 1]);
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
        return ok(result);
      }
    }

    const ctp2 = new CTP([
      ['take', [
        [takeNumbers, resp1((numbers: number[]) => ok(numbers[0] * numbers[1]))],
        [takeNumbers, resp1((numbers: number[]) => ok(numbers[0] + numbers[1] + numbers[2]))],
      ]]
    ]);

    const response1 = ctp2.parse('take 2 3 product');
    expect(response1.value).toBe(6);
    const response2 = ctp2.parse('take 2 3 4 sum'); 
    expect(response2.value).toBe(9);
    const response3 = ctp2.parse('take five product');
    expect(isNoMatch(response3)).toBe(true);
  })
})

// describe('catch many params', () => {
//   test('catch all', () => {
//     const ctp = new CTP([
//       ['hello', ]
//     ])
//   })
// })

