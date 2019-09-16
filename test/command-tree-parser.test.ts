import CTP, { isNoMatch, Transformers as T, ok, resp2 } from '../src/index';

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
})

