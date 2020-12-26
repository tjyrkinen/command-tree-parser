export interface CommandTree extends Array<SubCommand> {};

export type SubCommand = Matcher[];

export type FnMatcher<T = any> = { terminal?: boolean } & ((currentInput: string, previousResults: any[], remainingArgs: string[]) => ParseResult<T>);
export type Matcher = string | FnMatcher | CommandTree;

export interface CTPOptions {
  separator: string | RegExp;
  caseInsensitive: boolean;
  debug: boolean;
}

const defaultOptions: CTPOptions = {
  separator: /\s+/,
  caseInsensitive: true,
  debug: false,
}

export interface OK<T> { ok: true, value: T, argsConsumed: number | undefined };
export type NoMatch = { ok: false, value: undefined, argsConsumed: undefined };
export type ParseResult<T> = OK<T> | NoMatch;

export const ok: <T>(value: T, argsConsumed?: number | undefined) => OK<T> = (value, argsConsumed) => ({ ok: true, value, argsConsumed });
export const noMatch: NoMatch = { ok: false, value: undefined, argsConsumed: undefined }

export function isOK<T>(x: ParseResult<T>): x is OK<T> { return x.ok }
export function isNoMatch<T>(x: ParseResult<T>): x is NoMatch { return !x.ok }
export function valueOf<T>(x: OK<T>): T {
  if (isOK(x)) { return x.value; }
  else { throw new Error('Cannot get value of NoMatch'); }
}

export default class CommandTreeParser {
  private options: CTPOptions;

  constructor(private commandTree: CommandTree, options: Partial<CTPOptions> = {}) {
    this.options = Object.assign({}, defaultOptions, options);
  }

  parse(input: string): ParseResult<any> {
    const args = input.split(this.options.separator);

    const result = this.parseInner(this.commandTree, args, []);
    return result;
  }

  private parseInner(parser: CommandTree | SubCommand, args: string[], previousResults: any[]): ParseResult<any> {
    this.debug('parseInner', parser, args);

    let result: ParseResult<any> = noMatch;

    const getResult = (input: string | undefined, matcher: Matcher, previousResults: any[], remainingArgs: string[]): ParseResult<any> => {
      this.debug('getResult', input, matcher)
      if (typeof matcher === 'string') {
        if (input !== undefined && this.options.caseInsensitive
            ? (matcher.toLowerCase() === input.toLowerCase())
            : (matcher === input))
        {
          return ok(matcher, 1);
        } else {
          return noMatch;
        }
      } else if (typeof matcher === 'function') {
        if (matcher.terminal && input !== undefined) {
          return noMatch;
        }
        const result = matcher(input ?? '', previousResults, remainingArgs);
        if (result.ok && result.argsConsumed === undefined) {
          result.argsConsumed = 1;
        }
        this.debug('getResult-result', result);
        return result;
      } else {
        throw new Error('Unknown matcher type');
      }
    }

    if (Array.isArray(parser[0])) {
      for (const subCommand of parser as CommandTree) {
        result = this.parseInner(subCommand, args, previousResults)
        if (isOK(result)) {
          return result;
        }
      }

      return noMatch;
    } else {
      const matcher = parser[0];

      if (matcher === undefined) {
        return noMatch;
      }

      // Special case: input ended and we have a single string left, which is to be used as the result
      result = (args.length === 0 && parser.length === 1 && typeof matcher === 'string')
        ? ok(matcher)
        : getResult(args[0], matcher, previousResults, args);

      const remainingArgs = args.length - (result.argsConsumed ?? 1);
      const remainingParserLength = parser.length - 1;

      this.debug({result, remainingArgs, remainingParserLength})
      if (isNoMatch(result)) {
        return noMatch;
      } else {
        if (remainingArgs >= 1 && remainingParserLength < 1) {
          return noMatch;
        } else if (remainingArgs <= 0 && remainingParserLength === 0) {
          return result;
        } else {
          return this.parseInner(parser.slice(1), args.slice(result.argsConsumed), previousResults.concat([valueOf(result)]));
        }
      }
    }
  }

  private debug(...args: any[]) {
    if (this.options.debug) {
      console.log('DEBUG:', ...args);
    }
  }
}

const partial = (fn: Function, ...applied: any[]) => (...args: any[]) => fn(...applied, ...args);

export function respN<T>(n: number, fn: (...args: any[]) => ParseResult<T>): FnMatcher {
  const resultFn = (_input: unknown, previousResults: any[], _remaining: string[]) => fn(...(previousResults.slice(previousResults.length - n)));
  resultFn.terminal = true;
  return resultFn;
}

export const resp = partial(respN, 0);
export const resp1 = partial(respN, 1);
export const resp2 = partial(respN, 2);
export const resp3 = partial(respN, 3);
export const resp4 = partial(respN, 4);

export namespace Transformers {
  export function STRING(s: string): ParseResult<string> {
    return ok(s, 1);
  }

  export function NUMBER(s: string): ParseResult<number> {
    const res = parseFloat(s);
    return Number.isNaN(res) ? noMatch : ok(res, 1);
  }

  export function INTEGER(s: string): ParseResult<number> {
    const res = parseInt(s, 10);
    return Number.isNaN(res) ? noMatch : ok(res, 1);
  }

  export function OPTIONAL<T>(matcher: FnMatcher<T>): FnMatcher<T | null> {
    return (currentInput: string, previousResults: any[], remainingArgs: string[]) => {
      if (!currentInput) {
        return ok(null, 0);
      } else {
        return matcher(currentInput, previousResults, remainingArgs);
      }
    }
  }
}
