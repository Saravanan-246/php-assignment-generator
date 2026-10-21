import { parseSource } from './parser.js';

class RuntimeError extends Error {
  constructor(message) {
    super(`Runtime error: ${message}`);
    this.name = 'RuntimeError';
  }
}

class PhpArray {
  constructor(entries = []) {
    this.entries = new Map();
    this.nextIndex = 0;
    for (const entry of entries) this.set(entry.key, entry.value);
  }

  normalizeKey(key) {
    if (typeof key === 'number' && Number.isInteger(key)) return key;
    if (typeof key === 'string' && /^-?\d+$/.test(key)) return Number(key);
    return String(key);
  }

  set(key, value) {
    if (key === null || key === undefined) {
      while (this.entries.has(this.nextIndex)) this.nextIndex += 1;
      key = this.nextIndex;
      this.nextIndex += 1;
    } else {
      key = this.normalizeKey(key);
      if (typeof key === 'number' && key >= this.nextIndex) this.nextIndex = key + 1;
    }
    this.entries.set(key, value);
    return value;
  }

  get(key) { return this.entries.get(this.normalizeKey(key)); }
  has(key) { return this.entries.has(this.normalizeKey(key)); }
  count() { return this.entries.size; }
  values() { return this.entries.values(); }
  pairs() { return this.entries.entries(); }
}

class Cell {
  constructor(value = null) { this.value = value; }
}

class Environment {
  constructor(parent = null, functions = null) {
    this.parent = parent;
    this.cells = new Map();
    this.functions = functions || parent?.functions || new Map();
  }

  define(name, value = null) {
    const cell = new Cell(value);
    this.cells.set(name, cell);
    return cell;
  }

  findCell(name) {
    if (this.cells.has(name)) return this.cells.get(name);
    return this.parent?.findCell(name) || null;
  }

  cell(name) {
    return this.findCell(name) || this.define(name, null);
  }

  value(name) { return this.findCell(name)?.value ?? null; }
}

class ControlSignal {
  constructor(type, value = null) { this.type = type; this.value = value; }
}

function isTruthy(value) {
  return !(value === false || value === null || value === undefined || value === 0 || value === '' || (value instanceof PhpArray && value.count() === 0));
}

function phpString(value) {
  if (value === null || value === undefined) return '';
  if (value === true) return '1';
  if (value === false) return '';
  if (value instanceof PhpArray) return 'Array';
  if (typeof value === 'number' && Number.isInteger(value)) return String(value);
  return String(value);
}

function unwrapArray(value) {
  if (value instanceof PhpArray) return value;
  if (Array.isArray(value)) return new PhpArray(value.map(item => ({ key: null, value: item })));
  return null;
}

function phpEquals(left, right, strict = false) {
  if (strict) return typeof left === typeof right && left === right;
  if (typeof left === 'number' || typeof right === 'number') return Number(left) === Number(right);
  return left === right;
}

function normalizeSourceInput(sourceOrProgram) {
  if (typeof sourceOrProgram === 'string') return { source: sourceOrProgram, files: {} };
  if (!sourceOrProgram || typeof sourceOrProgram.code !== 'string') throw new RuntimeError('Expected PHP source code or a program entry');
  return { source: sourceOrProgram.code, files: sourceOrProgram.files || {}, program: sourceOrProgram };
}

class Runtime {
  constructor(options = {}) {
    this.maxSteps = options.maxSteps ?? 10000;
    this.maxLoopIterations = options.maxLoopIterations ?? 1000;
    this.maxRecursionDepth = options.maxRecursionDepth ?? 100;
    this.steps = 0;
    this.loopIterations = 0;
    this.recursionDepth = 0;
    this.output = '';
    this.files = options.files || {};
    this.env = new Environment();
    this.installBuiltins();
    this.env.define('_GET', new PhpArray(Object.entries(options.request?.query || {}).map(([key, value]) => ({ key, value }))));
    this.env.define('_POST', new PhpArray(Object.entries(options.request?.body || {}).map(([key, value]) => ({ key, value }))));
  }

  installBuiltins() {
    const builtins = {
      count: args => {
        const array = unwrapArray(args[0]);
        return array ? array.count() : (args[0] == null ? 0 : String(args[0]).length);
      },
      round: args => {
        const value = Number(args[0] || 0);
        const precision = Number(args[1] || 0);
        const factor = 10 ** precision;
        return Math.round(value * factor) / factor;
      },
      intdiv: args => {
        const divisor = Number(args[1]);
        if (divisor === 0) throw new RuntimeError('Division by zero in intdiv');
        return Math.trunc(Number(args[0]) / divisor);
      },
      ucfirst: args => {
        const value = phpString(args[0]);
        return value ? value[0].toUpperCase() + value.slice(1) : value;
      },
      stripos: args => {
        const index = phpString(args[0]).toLowerCase().indexOf(phpString(args[1]).toLowerCase());
        return index === -1 ? false : index;
      },
      implode: args => {
        const array = unwrapArray(args[1] ?? args[0]);
        const separator = args.length > 1 ? phpString(args[0]) : '';
        return array ? [...array.values()].map(phpString).join(separator) : '';
      },
      trim: args => phpString(args[0]).trim(),
      htmlspecialchars: args => phpString(args[0]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'),
      filter_var: args => {
        const value = phpString(args[0]);
        return args[1] === 'FILTER_VALIDATE_EMAIL' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : false;
      }
    };
    for (const [name, implementation] of Object.entries(builtins)) this.env.functions.set(name, { builtin: implementation });
  }

  tick() {
    this.steps += 1;
    if (this.steps > this.maxSteps) throw new RuntimeError(`execution limit of ${this.maxSteps} steps exceeded`);
  }

  loopTick() {
    this.loopIterations += 1;
    if (this.loopIterations > this.maxLoopIterations) throw new RuntimeError(`loop limit of ${this.maxLoopIterations} iterations exceeded`);
  }

  execute(program) {
    try {
      this.executeStatements(program.body, this.env);
    } catch (signal) {
      if (signal instanceof ControlSignal && signal.type === 'return') throw new RuntimeError('return used outside a function');
      throw signal;
    }
    return { output: this.output, steps: this.steps, loopIterations: this.loopIterations };
  }

  executeStatements(statements, env) {
    for (const statement of statements) {
      this.tick();
      this.executeStatement(statement, env);
    }
  }

  executeStatement(statement, env) {
    switch (statement.type) {
      case 'EmptyStatement': return;
      case 'HtmlStatement': this.output += statement.value; return;
      // PHP blocks do not create a new variable scope; functions do that in
      // call(), so assignments made inside if/loop blocks remain visible.
      case 'BlockStatement': this.executeStatements(statement.body, env); return;
      case 'ExpressionStatement': this.evaluate(statement.expression, env); return;
      case 'EchoStatement': for (const expression of statement.expressions) this.output += phpString(this.evaluate(expression, env)); return;
      case 'AssignmentExpression': this.evaluate(statement, env); return;
      case 'IfStatement': if (isTruthy(this.evaluate(statement.test, env))) this.executeStatement(statement.consequent, env); else if (statement.alternate) this.executeStatement(statement.alternate, env); return;
      case 'SwitchStatement': return this.executeSwitch(statement, env);
      case 'ForStatement': return this.executeFor(statement, env);
      case 'WhileStatement': return this.executeWhile(statement, env);
      case 'DoWhileStatement': return this.executeDoWhile(statement, env);
      case 'ForeachStatement': return this.executeForeach(statement, env);
      case 'FunctionDeclaration': env.functions.set(statement.name, { declaration: statement, closure: env }); return;
      case 'ReturnStatement': throw new ControlSignal('return', statement.argument ? this.evaluate(statement.argument, env) : null);
      case 'BreakStatement': throw new ControlSignal('break');
      case 'ContinueStatement': throw new ControlSignal('continue');
      case 'IncludeStatement': return this.executeInclude(statement, env);
      default: throw new RuntimeError(`Unsupported AST node ${statement.type}`);
    }
  }

  executeSwitch(statement, env) {
    const target = this.evaluate(statement.discriminant, env);
    let active = false;
    try {
      for (const switchCase of statement.cases) {
        if (!active && (switchCase.test === null || phpEquals(target, this.evaluate(switchCase.test, env)))) active = true;
        if (active) {
          for (const item of switchCase.consequent) {
            this.tick();
            this.executeStatement(item, env);
          }
        }
      }
    } catch (signal) {
      if (signal instanceof ControlSignal && signal.type === 'break') return;
      throw signal;
    }
  }

  executeFor(statement, env) {
    if (statement.init) this.evaluate(statement.init, env);
    while (statement.test == null || isTruthy(this.evaluate(statement.test, env))) {
      this.loopTick();
      try { this.executeStatement(statement.body, env); } catch (signal) {
        if (!(signal instanceof ControlSignal)) throw signal;
        if (signal.type === 'break') break;
        if (signal.type !== 'continue') throw signal;
      }
      if (statement.update) this.evaluate(statement.update, env);
    }
  }

  executeWhile(statement, env) {
    while (isTruthy(this.evaluate(statement.test, env))) {
      this.loopTick();
      try { this.executeStatement(statement.body, env); } catch (signal) {
        if (!(signal instanceof ControlSignal)) throw signal;
        if (signal.type === 'break') break;
        if (signal.type !== 'continue') throw signal;
      }
    }
  }

  executeDoWhile(statement, env) {
    do {
      this.loopTick();
      try { this.executeStatement(statement.body, env); } catch (signal) {
        if (!(signal instanceof ControlSignal)) throw signal;
        if (signal.type === 'break') break;
        if (signal.type !== 'continue') throw signal;
      }
    } while (isTruthy(this.evaluate(statement.test, env)));
  }

  executeForeach(statement, env) {
    const array = unwrapArray(this.evaluate(statement.iterable, env));
    if (!array) throw new RuntimeError('foreach requires an array');
    for (const [key, value] of array.pairs()) {
      this.loopTick();
      if (statement.key) this.assign(statement.key, key, env);
      this.assign(statement.value, value, env);
      try { this.executeStatement(statement.body, env); } catch (signal) {
        if (!(signal instanceof ControlSignal)) throw signal;
        if (signal.type === 'break') break;
        if (signal.type !== 'continue') throw signal;
      }
    }
  }

  executeInclude(statement, env) {
    const filename = phpString(this.evaluate(statement.expression, env));
    const source = this.files[filename];
    if (source === undefined) {
      if (statement.mode === 'require') throw new RuntimeError(`Required file not found: ${filename}`);
      return;
    }
    this.executeStatements(parseSource(source).body, env);
  }

  evaluate(expression, env) {
    this.tick();
    switch (expression.type) {
      case 'Literal': return expression.value;
      case 'Constant': return expression.name;
      case 'Identifier': return expression.name;
      case 'Variable': return env.value(expression.name);
      case 'ArrayExpression': return new PhpArray(expression.entries.map(entry => ({ key: entry.key ? this.evaluate(entry.key, env) : null, value: this.evaluate(entry.value, env) })));
      case 'IndexExpression': return this.readIndex(expression, env);
      case 'AssignmentExpression': return this.assignExpression(expression, env);
      case 'BinaryExpression': return this.evaluateBinary(expression, env);
      case 'ConditionalExpression': return isTruthy(this.evaluate(expression.test, env)) ? this.evaluate(expression.consequent, env) : this.evaluate(expression.alternate, env);
      case 'UnaryExpression': return this.evaluateUnary(expression, env);
      case 'CastExpression': return this.cast(expression.dataType, this.evaluate(expression.argument, env));
      case 'CallExpression': return this.call(expression, env);
      default: throw new RuntimeError(`Unsupported expression ${expression.type}`);
    }
  }

  evaluateBinary(expression, env) {
    if (expression.operator === '&&') return isTruthy(this.evaluate(expression.left, env)) && isTruthy(this.evaluate(expression.right, env));
    if (expression.operator === '||') return isTruthy(this.evaluate(expression.left, env)) || isTruthy(this.evaluate(expression.right, env));
    if (expression.operator === '??') {
      const left = this.evaluate(expression.left, env);
      return left === null || left === undefined ? this.evaluate(expression.right, env) : left;
    }
    const left = this.evaluate(expression.left, env);
    const right = this.evaluate(expression.right, env);
    switch (expression.operator) {
      case '.': return phpString(left) + phpString(right);
      case '+': return Number(left || 0) + Number(right || 0);
      case '-': return Number(left || 0) - Number(right || 0);
      case '*': return Number(left || 0) * Number(right || 0);
      case '/': if (Number(right) === 0) throw new RuntimeError('Division by zero'); return Number(left) / Number(right);
      case '%': if (Number(right) === 0) throw new RuntimeError('Division by zero'); return Number(left) % Number(right);
      case '==': return phpEquals(left, right);
      case '!=': return !phpEquals(left, right);
      case '===': return phpEquals(left, right, true);
      case '!==': return !phpEquals(left, right, true);
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      default: throw new RuntimeError(`Unsupported operator ${expression.operator}`);
    }
  }

  evaluateUnary(expression, env) {
    if (expression.operator === '!') return !isTruthy(this.evaluate(expression.argument, env));
    if (expression.operator === '-') return -Number(this.evaluate(expression.argument, env));
    if (expression.operator === '+') return Number(this.evaluate(expression.argument, env));
    const cell = this.reference(expression.argument, env);
    const old = Number(cell.value || 0);
    cell.value = expression.operator === '++' ? old + 1 : old - 1;
    return expression.prefix ? cell.value : old;
  }

  cast(dataType, value) {
    if (dataType === 'int') return Number.isNaN(Number(value)) ? 0 : Math.trunc(Number(value));
    if (dataType === 'float') return Number(value) || 0;
    if (dataType === 'string') return phpString(value);
    if (dataType === 'bool') return isTruthy(value);
    return value;
  }

  readIndex(expression, env) {
    const object = this.evaluate(expression.object, env);
    const key = expression.property === null ? null : this.evaluate(expression.property, env);
    const array = unwrapArray(object);
    if (!array) return null;
    return key === null ? null : array.get(key) ?? null;
  }

  reference(expression, env) {
    if (expression.type === 'Variable') return env.cell(expression.name);
    if (expression.type === 'IndexExpression') {
      const array = unwrapArray(this.evaluate(expression.object, env));
      if (!array) throw new RuntimeError('Cannot index a non-array value');
      const key = expression.property === null ? null : this.evaluate(expression.property, env);
      if (key === null) {
        const newKey = array.nextIndex;
        array.set(null, null);
        return { get value() { return array.get(newKey); }, set value(value) { array.set(newKey, value); } };
      }
      return { get value() { return array.get(key); }, set value(value) { array.set(key, value); } };
    }
    throw new RuntimeError('Expression is not assignable');
  }

  assign(target, value, env) { this.reference(target, env).value = value; return value; }

  assignExpression(expression, env) {
    const right = this.evaluate(expression.right, env);
    if (expression.operator === '=') return this.assign(expression.left, right, env);
    const current = this.evaluate(expression.left, env);
    const operators = { '+=': '+', '-=': '-', '*=': '*', '/=': '/' };
    const result = this.evaluateBinary({ type: 'BinaryExpression', operator: operators[expression.operator], left: { type: 'Literal', value: current }, right: { type: 'Literal', value: right } }, env);
    return this.assign(expression.left, result, env);
  }

  call(expression, env) {
    const name = expression.callee.type === 'Identifier' ? expression.callee.name : null;
    if (!name) throw new RuntimeError('Only named functions are supported');
    const fn = env.functions.get(name);
    if (!fn) throw new RuntimeError(`Unknown function ${name}`);
    if (fn.builtin) return fn.builtin(expression.arguments.map(argument => this.evaluate(argument, env)));
    if (this.recursionDepth >= this.maxRecursionDepth) throw new RuntimeError(`recursion limit of ${this.maxRecursionDepth} calls exceeded`);
    const declaration = fn.declaration;
    const local = new Environment(fn.closure, env.functions);
    for (let i = 0; i < declaration.params.length; i += 1) {
      const parameter = declaration.params[i];
      const argument = expression.arguments[i];
      if (parameter.byReference) {
        if (!argument) throw new RuntimeError(`Missing argument for reference parameter ${parameter.name}`);
        local.cells.set(parameter.name, this.reference(argument, env));
      } else {
        local.define(parameter.name, argument ? this.evaluate(argument, env) : null);
      }
    }
    this.recursionDepth += 1;
    try {
      this.executeStatement(declaration.body, local);
    } catch (signal) {
      if (signal instanceof ControlSignal && signal.type === 'return') return signal.value;
      throw signal;
    } finally {
      this.recursionDepth -= 1;
    }
    return null;
  }
}

function run(sourceOrProgram, options = {}) {
  const normalized = normalizeSourceInput(sourceOrProgram);
  const request = options.request || normalized.program?.request || {};
  const runtime = new Runtime({ ...options, request, files: normalized.files });
  const ast = parseSource(normalized.source);
  const result = runtime.execute(ast);
  return { ...result, ast };
}

export { Environment, PhpArray, Runtime, RuntimeError, run };
export default run;
