/**
 * Output helpers for the small PHP + HTML execution pipeline.
 *
 * The runtime already emits fragments in execution order. These helpers keep
 * that order intact while exposing a safe, explicit HTML result for callers.
 */

function asOutputString(value) {
  return value === null || value === undefined ? '' : String(value);
}

function stripHtmlTags(value) {
  return asOutputString(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'");
}

function processHtmlOutput(output) {
  const html = asOutputString(output);
  return {
    html,
    text: stripHtmlTags(html),
    hasHtml: /<\/?[A-Za-z][^>]*>/.test(html)
  };
}

function renderHtml(output) {
  return processHtmlOutput(output).html;
}

export { processHtmlOutput, renderHtml, stripHtmlTags };
export default processHtmlOutput;
