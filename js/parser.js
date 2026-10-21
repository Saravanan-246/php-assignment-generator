/**
 * Small PHP subset parser used by the assignment runner.
 *
 * This is deliberately not a PHP compiler. It parses only the constructs
 * present in programs.js and produces a predictable, dependency-free AST.
 */

class ParseError extends Error {
  constructor(message, token) {
    const location = token ? ` at line ${token.line}, column ${token.column}` : '';
    super(`Parse error${location}: ${message}`);
    this.name = 'ParseError';
    this.token = token;
  }
}

const TWO_CHAR_OPERATORS = new Set(['==', '!=', '<=', '>=', '++', '--', '=>', '&&', '||', '??', '===', '!==', '+=', '-=', '*=', '/=']);
const THREE_CHAR_OPERATORS = new Set(['===', '!==']);
const SINGLE_CHAR = new Set('{}()[];,?:.+-*/%=<>!&');

function tokenizePhp(source) {
  const tokens = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const advance = (count = 1) => {
    for (let i = 0; i < count; i += 1) {
      if (source[index] === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      index += 1;
    }
  };
  const add = (type, value, startLine, startColumn) => tokens.push({ type, value, line: startLine, column: startColumn });

  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      advance();
      continue;
    }
    if (char === '/' && source[index + 1] === '/') {
      while (index < source.length && source[index] !== '\n') advance();
      continue;
    }
    if (char === '/' && source[index + 1] === '*') {
      advance(2);
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) advance();
      if (index >= source.length) throw new ParseError('Unterminated block comment');
      advance(2);
      continue;
    }

    const startLine = line;
    const startColumn = column;
    if (char === '$') {
      let value = '$';
      advance();
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        value += source[index];
        advance();
      }
      if (value === '$') throw new ParseError('Expected a variable name after $', { line: startLine, column: startColumn });
      add('variable', value, startLine, startColumn);
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      advance();
      let closed = false;
      while (index < source.length) {
        if (source[index] === quote) {
          advance();
          closed = true;
          break;
        }
        if (source[index] === '\\') {
          const escaped = source[index + 1];
          const escapes = { n: '\n', r: '\r', t: '\t', '\\': '\\', '"': '"', "'": "'" };
          value += escapes[escaped] ?? escaped ?? '';
          advance(escaped === undefined ? 1 : 2);
        } else {
          value += source[index];
          advance();
        }
      }
      if (!closed) throw new ParseError('Unterminated string literal', { line: startLine, column: startColumn });
      add('string', value, startLine, startColumn);
      continue;
    }
    if (/[0-9]/.test(char)) {
      let value = char;
      advance();
      while (index < source.length && /[0-9.]/.test(source[index])) {
        value += source[index];
        advance();
      }
      if ((value.match(/\./g) || []).length > 1) throw new ParseError(`Invalid number ${value}`, { line: startLine, column: startColumn });
      add('number', Number(value), startLine, startColumn);
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let value = char;
      advance();
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        value += source[index];
        advance();
      }
      add('identifier', value, startLine, startColumn);
      continue;
    }

    const three = source.slice(index, index + 3);
    const two = source.slice(index, index + 2);
    if (THREE_CHAR_OPERATORS.has(three)) {
      add('operator', three, startLine, startColumn);
      advance(3);
    } else if (TWO_CHAR_OPERATORS.has(two)) {
      add('operator', two, startLine, startColumn);
      advance(2);
    } else if (SINGLE_CHAR.has(char)) {
      add(['{}()[];,?:'.includes(char) ? 'punctuation' : 'operator'], char, startLine, startColumn);
      advance();
    } else {
      throw new ParseError(`Unsupported character ${JSON.stringify(char)}`, { line: startLine, column: startColumn });
    }
  }
  tokens.push({ type: 'eof', value: '<eof>', line, column });
  return tokens;
}

function splitPhpAndHtml(source) {
  const parts = [];
  let cursor = 0;
  const openPattern = /<\?(?:php)?/gi;
  while (cursor < source.length) {
    openPattern.lastIndex = cursor;
    const open = openPattern.exec(source);
    if (!open) {
      if (source.slice(cursor)) parts.push({ type: 'html', value: source.slice(cursor) });
      break;
    }
    if (open.index > cursor) parts.push({ type: 'html', value: source.slice(cursor, open.index) });
    const close = source.indexOf('?>', open.index + open[0].length);
    if (close === -1) throw new ParseError('PHP block is missing ?>');
    parts.push({ type: 'php', value: source.slice(open.index + open[0].length, close) });
    cursor = close + 2;
  }
  return parts.length ? parts : [{ type: 'php', value: source }];
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  current() { return this.tokens[this.position]; }
  at(value) { return this.current().value === value; }
  atType(type) { return this.current().type === type; }
  consume(value) {
    if (!this.at(value)) throw new ParseError(`Expected ${value}, found ${this.current().value}`, this.current());
    return this.tokens[this.position++];
  }
  consumeIf(value) {
    if (this.at(value)) return this.tokens[this.position++];
    return null;
  }
  identifier(value) {
    return this.current().type === 'identifier' && (!value || this.current().value === value);
  }
  expectIdentifier() {
    if (!this.atType('identifier')) throw new ParseError('Expected an identifier', this.current());
    return this.tokens[this.position++].value;
  }
  semi() { this.consumeIf(';'); }

  parseProgram() {
    const body = [];
    while (!this.atType('eof')) body.push(this.parseStatement());
    return { type: 'Program', body };
  }

  parseStatement() {
    if (this.at('{')) return this.parseBlock();
    if (this.identifier('if')) return this.parseIf();
    if (this.identifier('switch')) return this.parseSwitch();
    if (this.identifier('for')) return this.parseFor();
    if (this.identifier('while')) return this.parseWhile();
    if (this.identifier('do')) return this.parseDoWhile();
    if (this.identifier('foreach')) return this.parseForeach();
    if (this.identifier('function')) return this.parseFunctionDeclaration();
    if (this.identifier('return')) return this.parseReturn();
    if (this.identifier('break')) { this.position += 1; this.semi(); return { type: 'BreakStatement' }; }
    if (this.identifier('continue')) { this.position += 1; this.semi(); return { type: 'ContinueStatement' }; }
    if (this.identifier('echo')) return this.parseEcho();
    if (this.identifier('include') || this.identifier('require')) {
      const keyword = this.tokens[this.position++].value;
      const expression = this.parseExpression();
      this.semi();
      return { type: 'IncludeStatement', mode: keyword, expression };
    }
    if (this.at(';')) { this.position += 1; return { type: 'EmptyStatement' }; }
    const expression = this.parseExpression();
    this.semi();
    return { type: 'ExpressionStatement', expression };
  }

  parseBlock() {
    this.consume('{');
    const body = [];
    while (!this.at('}') && !this.atType('eof')) body.push(this.parseStatement());
    this.consume('}');
    return { type: 'BlockStatement', body };
  }

  parseIf() {
    this.position += 1;
    this.consume('(');
    const test = this.parseExpression();
    this.consume(')');
    const consequent = this.parseStatement();
    const alternate = this.identifier('elseif') ? this.parseIf() : this.identifier('else') ? (this.position += 1, this.parseStatement()) : null;
    return { type: 'IfStatement', test, consequent, alternate };
  }

  parseSwitch() {
    this.position += 1;
    this.consume('(');
    const discriminant = this.parseExpression();
    this.consume(')');
    this.consume('{');
    const cases = [];
    while (!this.at('}') && !this.atType('eof')) {
      let test = null;
      if (this.identifier('case')) {
        this.position += 1;
        test = this.parseExpression();
        this.consume(':');
      } else if (this.identifier('default')) {
        this.position += 1;
        this.consume(':');
      } else {
        throw new ParseError('Expected case or default in switch', this.current());
      }
      const consequent = [];
      while (!this.at('}') && !this.identifier('case') && !this.identifier('default')) consequent.push(this.parseStatement());
      cases.push({ type: 'SwitchCase', test, consequent });
    }
    this.consume('}');
    return { type: 'SwitchStatement', discriminant, cases };
  }

  parseFor() {
    this.position += 1;
    this.consume('(');
    const init = this.at(';') ? null : this.parseExpression();
    this.consume(';');
    const test = this.at(';') ? null : this.parseExpression();
    this.consume(';');
    const update = this.at(')') ? null : this.parseExpression();
    this.consume(')');
    return { type: 'ForStatement', init, test, update, body: this.parseStatement() };
  }

  parseWhile() {
    this.position += 1;
    this.consume('(');
    const test = this.parseExpression();
    this.consume(')');
    return { type: 'WhileStatement', test, body: this.parseStatement() };
  }

  parseDoWhile() {
    this.position += 1;
    const body = this.parseStatement();
    if (!this.identifier('while')) throw new ParseError('Expected while after do body', this.current());
    this.position += 1;
    this.consume('(');
    const test = this.parseExpression();
    this.consume(')');
    this.semi();
    return { type: 'DoWhileStatement', body, test };
  }

  parseForeach() {
    this.position += 1;
    this.consume('(');
    const iterable = this.parseExpression();
    if (!this.identifier('as')) throw new ParseError('Expected as in foreach', this.current());
    this.position += 1;
    const first = this.parseVariable();
    let key = null;
    let value = first;
    if (this.consumeIf('=>')) {
      key = first;
      value = this.parseVariable();
    }
    this.consume(')');
    return { type: 'ForeachStatement', iterable, key, value, body: this.parseStatement() };
  }

  parseFunctionDeclaration() {
    this.position += 1;
    const name = this.expectIdentifier();
    this.consume('(');
    const params = [];
    while (!this.at(')')) {
      const byReference = Boolean(this.consumeIf('&'));
      const param = this.parseVariable();
      params.push({ name: param.name, byReference });
      if (!this.consumeIf(',')) break;
    }
    this.consume(')');
    return { type: 'FunctionDeclaration', name, params, body: this.parseBlock() };
  }

  parseReturn() {
    this.position += 1;
    const argument = this.at(';') || this.at('}') ? null : this.parseExpression();
    this.semi();
    return { type: 'ReturnStatement', argument };
  }

  parseEcho() {
    this.position += 1;
    const expressions = [this.parseExpression()];
    while (this.consumeIf(',')) expressions.push(this.parseExpression());
    this.semi();
    return { type: 'EchoStatement', expressions };
  }

  parseExpression() { return this.parseAssignment(); }

  parseAssignment() {
    const left = this.parseTernary();
    if (['=', '+=', '-=', '*=', '/='].includes(this.current().value)) {
      const operator = this.tokens[this.position++].value;
      return { type: 'AssignmentExpression', operator, left, right: this.parseAssignment() };
    }
    return left;
  }

  parseTernary() {
    const test = this.parseBinary(0);
    if (!this.consumeIf('?')) return test;
    const consequent = this.parseExpression();
    this.consume(':');
    return { type: 'ConditionalExpression', test, consequent, alternate: this.parseExpression() };
  }

  parseBinary(minPrecedence) {
    let left = this.parseUnary();
    const precedence = { '||': 1, '??': 1, '&&': 2, '==': 3, '!=': 3, '===': 3, '!==': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '.': 5, '*': 6, '/': 6, '%': 6 };
    while (precedence[this.current().value] > minPrecedence) {
      const operator = this.tokens[this.position++].value;
      const right = this.parseBinary(precedence[operator]);
      left = { type: 'BinaryExpression', operator, left, right };
    }
    return left;
  }

  parseUnary() {
    if (['!', '-', '+', '++', '--'].includes(this.current().value)) {
      const operator = this.tokens[this.position++].value;
      return { type: 'UnaryExpression', operator, argument: this.parseUnary(), prefix: true };
    }
    if (this.at('(') && this.tokens[this.position + 1]?.type === 'identifier' && ['int', 'float', 'string', 'bool'].includes(this.tokens[this.position + 1].value) && this.tokens[this.position + 2]?.value === ')') {
      this.position += 2;
      this.consume(')');
      return { type: 'CastExpression', dataType: this.tokens[this.position - 2].value, argument: this.parseUnary() };
    }
    let expression = this.parsePrimary();
    while (['++', '--'].includes(this.current().value)) expression = { type: 'UnaryExpression', operator: this.tokens[this.position++].value, argument: expression, prefix: false };
    return expression;
  }

  parsePrimary() {
    const token = this.current();
    if (token.type === 'number' || token.type === 'string') {
      this.position += 1;
      return { type: 'Literal', value: token.value };
    }
    if (token.type === 'variable') return this.parsePostfix(this.parseVariable());
    if (token.type === 'identifier') {
      this.position += 1;
      if (token.value === 'true') return { type: 'Literal', value: true };
      if (token.value === 'false') return { type: 'Literal', value: false };
      if (token.value === 'null') return { type: 'Literal', value: null };
      if (token.value === 'FILTER_VALIDATE_EMAIL') return { type: 'Constant', name: token.value };
      return this.parsePostfix({ type: 'Identifier', name: token.value });
    }
    if (this.consumeIf('(')) {
      const expression = this.parseExpression();
      this.consume(')');
      return this.parsePostfix(expression);
    }
    if (this.at('[')) return this.parseArray();
    throw new ParseError(`Unexpected token ${token.value}`, token);
  }

  parsePostfix(expression) {
    while (true) {
      if (this.consumeIf('(')) {
        const args = [];
        while (!this.at(')')) {
          args.push(this.parseExpression());
          if (!this.consumeIf(',')) break;
        }
        this.consume(')');
        expression = { type: 'CallExpression', callee: expression, arguments: args };
      } else if (this.consumeIf('[')) {
        const property = this.at(']') ? null : this.parseExpression();
        this.consume(']');
        expression = { type: 'IndexExpression', object: expression, property };
      } else {
        break;
      }
    }
    return expression;
  }

  parseVariable() {
    if (!this.atType('variable')) throw new ParseError('Expected a variable', this.current());
    const name = this.tokens[this.position++].value.slice(1);
    return this.parsePostfix({ type: 'Variable', name });
  }

  parseArray() {
    this.consume('[');
    const entries = [];
    while (!this.at(']')) {
      const first = this.parseExpression();
      const key = this.consumeIf('=>') ? first : null;
      const value = key ? this.parseExpression() : first;
      entries.push({ key, value });
      if (!this.consumeIf(',')) break;
    }
    this.consume(']');
    return { type: 'ArrayExpression', entries };
  }
}

function parsePhp(source) {
  return new Parser(tokenizePhp(source)).parseProgram();
}

function parseSource(source) {
  const body = [];
  for (const part of splitPhpAndHtml(source)) {
    if (part.type === 'html') {
      if (part.value) body.push({ type: 'HtmlStatement', value: part.value });
    } else {
      body.push(...parsePhp(part.value).body);
    }
  }
  return { type: 'Program', body };
}

export { ParseError, parsePhp, parseSource, splitPhpAndHtml, tokenizePhp };
export default parseSource;
