export interface CommandTree extends Array<SubCommand> {};

export type SubCommand = Matcher[];

export type FnMatcher = (currentInput: string, ...previousResults: any[]) => ParseResult<any>;
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

export interface OK<T> { ok: true, value: T };
export type NoMatch = { ok: false, value: undefined };
export type ParseResult<T> = OK<T> | NoMatch;

export const ok: <T>(value: T) => OK<T> = (value) => ({ ok: true, value });
export const noMatch: NoMatch = { ok: false, value: undefined }

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

    const getResult: (input: string, matcher: Matcher, previousResults: any[]) => ParseResult<any> =
      (input, matcher, previousResults) => {
        this.debug('getResult', input, matcher)
        if (typeof matcher === 'string') {
          if (input === undefined || (this.options.caseInsensitive
              ? (matcher.toLowerCase() === input.toLowerCase())
              : (matcher === input)))
          {
            return ok(matcher);
          } else {
            return noMatch;
          }
        } else if (typeof matcher === 'function') {
          return matcher(input, ...previousResults);
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

      if (matcher === undefined || args[0] === undefined && parser.length > 1) {
        return noMatch;
      }

      result = getResult(args[0], matcher, previousResults);
      if (isNoMatch(result)) {
        return noMatch;
      } else {
        if (parser.length === 1 && args.length === 0) {
          return result;
        } else {
          return this.parseInner(parser.slice(1), args.slice(1), previousResults.concat(valueOf(result)));
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

export function respN<T>(n: number, fn: (...args: any[]) => ParseResult<T>) {
  return (_input: undefined, ...args: any[]) => fn(...(args.slice(args.length - n)));
}

export const resp = partial(respN, 0);
export const resp1 = partial(respN, 1);
export const resp2 = partial(respN, 2);
export const resp3 = partial(respN, 3);
export const resp4 = partial(respN, 4);

export namespace Transformers {
  export function NUMBER(s: string): ParseResult<number> {
    const res = parseFloat(s);
    return Number.isNaN(res) ? noMatch : ok(res);
  }

  export function INTEGER(s: string): ParseResult<number> {
    const res = parseInt(s, 10);
    return Number.isNaN(res) ? noMatch : ok(res);
  }
}
