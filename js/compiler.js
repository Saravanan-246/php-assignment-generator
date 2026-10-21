import { parseSource } from './parser.js';
import { run } from './runtime.js';
import { processHtmlOutput } from './html.js';

/**
 * Convert PHP short echo blocks to ordinary echo statements before the
 * deliberately small parser sees the source. The replacement preserves the
 * original location in the mixed PHP/HTML stream.
 */
function normalizeShortEcho(source) {
  return String(source).replace(/<\?=\s*([\s\S]*?)\?>/g, (_match, expression) => `<?php echo ${expression.trim()}; ?>`);
}

function programInput(program, options = {}) {
  if (options.request) return options.request;
  return program?.request || { method: 'GET', query: {}, body: {} };
}

function errorDetails(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error)
  };
}

/**
 * Compile and execute one catalogue entry (or a source string) in one
 * consistent parser/runtime pipeline.
 */
function compileProgram(programOrSource, options = {}) {
  const isProgram = typeof programOrSource !== 'string';
  const source = isProgram ? programOrSource?.code : programOrSource;
  const files = isProgram ? (programOrSource.files || {}) : (options.files || {});
  const request = isProgram ? programInput(programOrSource, options) : (options.request || { method: 'GET', query: {}, body: {} });
  const baseResult = {
    success: false,
    output: '',
    html: '',
    errors: [],
    execution: null
  };

  if (typeof source !== 'string') {
    return { ...baseResult, errors: [{ name: 'CompileError', message: 'Program source must be a string' }] };
  }

  const normalizedSource = normalizeShortEcho(source);
  try {
    // Parse once for validation and AST access. Runtime execution then parses
    // the exact same normalized source for the same source/files/request.
    const ast = parseSource(normalizedSource);
    const result = run({ code: normalizedSource, files }, {
      ...options,
      request,
      files
    });
    const processed = processHtmlOutput(result.output);
    return {
      success: true,
      output: result.output,
      html: processed.html,
      text: processed.text,
      errors: [],
      execution: {
        steps: result.steps,
        loopIterations: result.loopIterations,
        hasHtml: processed.hasHtml
      },
      ast
    };
  } catch (error) {
    return {
      ...baseResult,
      errors: [errorDetails(error)]
    };
  }
}

function compile(programOrSource, options = {}) {
  return compileProgram(programOrSource, options);
}

export { compile, compileProgram, normalizeShortEcho };
export default compileProgram;
