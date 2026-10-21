import PROGRAMS from './programs.js';
import { compile } from './compiler.js';
import { generateAssignmentPdf } from './pdf.js';
import { fillStudentForm, readStudentForm, studentDisplayName, validateStudent } from './student.js';
import { clearStoredData, loadProgress, loadStudent, saveProgramResult, saveProgress, saveStudent } from './storage.js';

const storedProgress = loadProgress();
const state = {
  student: loadStudent(),
  currentId: 1,
  completed: new Set(storedProgress.completedIds),
  results: storedProgress.results,
  search: ''
};
const elements = {};
const byId = id => document.getElementById(id);

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function currentProgram() { return PROGRAMS.find(program => program.id === state.currentId) || PROGRAMS[0]; }
function showScreen(screen) { elements.studentScreen.hidden = screen !== 'student'; elements.workspaceScreen.hidden = screen !== 'workspace'; }

function renderStudentHeader() {
  elements.headerStudent.hidden = !state.student;
  elements.logoutButton.hidden = !state.student;
  if (state.student) elements.headerStudent.innerHTML = `<strong>${escapeHtml(studentDisplayName(state.student))}</strong> <span>· ${escapeHtml(state.student.rollNumber)}</span>`;
}

function renderProgress() {
  elements.progressCount.textContent = `${state.completed.size} of ${PROGRAMS.length} completed`;
  elements.progressBar.style.width = `${(state.completed.size / PROGRAMS.length) * 100}%`;
}

function renderProgramList() {
  const query = state.search.trim().toLowerCase();
  const visible = PROGRAMS.filter(program => `${program.id} ${program.title} ${program.topic}`.toLowerCase().includes(query));
  elements.programList.innerHTML = visible.map(program => `<button class="program-item${program.id === state.currentId ? ' active' : ''}" type="button" data-program-id="${program.id}" aria-current="${program.id === state.currentId ? 'true' : 'false'}"><span class="program-number">${String(program.id).padStart(2, '0')}</span><span class="program-name">${escapeHtml(program.title)}</span><span class="program-check" aria-label="${state.completed.has(program.id) ? 'Completed' : ''}">${state.completed.has(program.id) ? '✓' : ''}</span></button>`).join('');
  elements.emptySearch.hidden = visible.length !== 0;
  elements.programTotal.textContent = `${visible.length} of ${PROGRAMS.length} exercises`;
}

function renderInputPanel(program) {
  const inputs = (program.inputs || []).filter(input => input.method === 'GET' || input.method === 'POST');
  if (!inputs.length) return '';
  return `<div class="input-panel"><p class="section-label">Request input</p>${inputs.map(input => {
    const value = input.value ?? '';
    if (input.type === 'select') return `<div class="input-field"><label for="request-${escapeHtml(input.name)}">${escapeHtml(input.label)}</label><select id="request-${escapeHtml(input.name)}" name="${escapeHtml(input.name)}" data-request-method="${escapeHtml(input.method || 'POST')}">${(input.options || []).map(option => `<option value="${escapeHtml(option)}" ${String(option) === String(value) ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></div>`;
    return `<div class="input-field"><label for="request-${escapeHtml(input.name)}">${escapeHtml(input.label)}</label><input id="request-${escapeHtml(input.name)}" name="${escapeHtml(input.name)}" type="${escapeHtml(input.type || 'text')}" value="${escapeHtml(value)}" ${input.min !== undefined ? `min="${escapeHtml(input.min)}"` : ''} ${input.max !== undefined ? `max="${escapeHtml(input.max)}"` : ''} ${input.step !== undefined ? `step="${escapeHtml(input.step)}"` : ''} data-request-method="${escapeHtml(input.method || 'POST')}"></div>`;
  }).join('')}</div>`;
}

function renderLineNumbers(source) {
  return String(source || '').split('\n').map((_line, index) => index + 1).join('\n');
}

function syncLineNumbers() {
  const editor = byId('code-editor');
  const numbers = elements.programWorkspace?.querySelector('.line-numbers');
  if (!editor || !numbers) return;
  numbers.textContent = renderLineNumbers(editor.value);
  numbers.scrollTop = editor.scrollTop;
}

function sandboxHtmlDocument(html) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:20px;color:#20252b;font:14px/1.5 Arial,sans-serif}h1{margin:0 0 16px;font-size:24px}header,main,footer{display:block;margin-bottom:16px}label{display:block;margin:0 0 12px}input{display:block;width:100%;max-width:280px;height:30px;margin-top:5px;padding:0 8px;border:1px solid #c8cdd2;border-radius:3px;box-sizing:border-box}button{margin-top:4px;padding:7px 12px;border:1px solid #9da4aa;border-radius:3px;background:#f3f4f5;color:#20252b;font:13px Arial,sans-serif}</style></head><body>${html}</body></html>`;
}

function renderProgram() {
  const program = currentProgram();
  const completed = state.completed.has(program.id);
  const result = state.results[String(program.id)] || null;
  const isHtmlOutput = Boolean(result?.success && result.execution?.hasHtml);
  const output = result?.success ? (isHtmlOutput ? '<iframe class="html-output-preview" title="Rendered program output" sandbox=""></iframe>' : '<pre class="output-text"></pre>') : '<div class="output-placeholder">Run the program to see its actual execution output.</div>';
  const error = result && !result.success ? `<div class="error-box">${escapeHtml((result.errors || []).map(item => `${item.name}: ${item.message}`).join('\n'))}</div>` : '';
  const source = result?.source || program.code;
  elements.programWorkspace.innerHTML = `<article class="program-card"><header class="program-header"><div><p class="program-index">PROGRAM ${String(program.id).padStart(2, '0')} <span>· ${escapeHtml(program.topic)}</span></p><h2>${escapeHtml(program.title)}</h2></div><div class="program-header-actions">${completed ? '<span class="completion-pill">✓ Completed</span>' : ''}<button class="button button-secondary" type="button" data-action="back-list">All programs</button></div></header><section class="question-section"><p class="section-label">Question</p><p class="question-text">${escapeHtml(program.question)}</p></section>${renderInputPanel(program)}<section class="program-studio"><section class="code-panel"><div class="studio-panel-heading"><div><p class="section-label">PHP code</p><span class="studio-hint">Edit the program, then run it.</span></div><span class="language-label">PHP</span></div><div class="editor-shell"><pre class="line-numbers" aria-hidden="true">${renderLineNumbers(source)}</pre><textarea class="code-editor" id="code-editor" spellcheck="false" aria-label="PHP code editor">${escapeHtml(source)}</textarea></div></section><section class="console-panel"><div class="studio-panel-heading"><div><p class="section-label">Output</p><span class="studio-hint">Real execution console</span></div><span class="output-state">${result ? (result.success ? 'Output ready' : 'Execution failed') : 'Waiting to run'}</span></div><div class="console-content">${output}${error}</div></section></section><div class="program-actions"><span class="run-status">${result?.success ? `Executed in ${result.execution?.steps || 0} steps` : (result ? 'Fix the error and run again' : 'Ready to run')}</span><div class="action-group"><button class="button button-primary" type="button" data-action="run">Run Program <span aria-hidden="true">▶</span></button>${result?.success && !completed ? '<button class="button button-success" type="button" data-action="complete">Mark complete</button>' : ''}</div></div>${completed ? '<p class="completion-note">This program is marked complete. You can still edit and run it again.</p>' : ''}</article>`;
  if (result?.success) {
    if (isHtmlOutput) elements.programWorkspace.querySelector('.html-output-preview').srcdoc = sandboxHtmlDocument(result.html || result.output);
    else elements.programWorkspace.querySelector('.output-text').textContent = result.output;
  }
  syncLineNumbers();
}

function readRequest(program) {
  const request = program.request ? { method: program.request.method, query: { ...(program.request.query || {}) }, body: { ...(program.request.body || {}) } } : { method: 'GET', query: {}, body: {} };
  elements.programWorkspace.querySelectorAll('[data-request-method]').forEach(field => {
    const target = field.dataset.requestMethod.toLowerCase() === 'get' ? request.query : request.body;
    target[field.name] = field.type === 'number' && field.value !== '' ? Number(field.value) : field.value;
    request.method = field.dataset.requestMethod.toUpperCase();
  });
  return request;
}

function persistResult(id, result, source) {
  const saved = { success: Boolean(result.success), source, output: result.output || '', html: result.html || '', text: result.text || '', execution: result.execution || null, errors: result.errors || [] };
  state.results[String(id)] = saved;
  saveProgramResult({ completedIds: [...state.completed], results: state.results }, id, saved);
}

function runCurrentProgram() {
  const program = currentProgram();
  const editor = byId('code-editor');
  const result = compile({ ...program, code: editor.value }, { request: readRequest(program) });
  persistResult(program.id, result, editor.value);
  renderProgramList();
  renderProgram();
}

function markComplete() {
  const result = state.results[String(state.currentId)];
  if (!result?.success) return;
  state.completed.add(state.currentId);
  saveProgress({ completedIds: [...state.completed], results: state.results });
  renderProgress();
  renderProgramList();
  renderProgram();
}

function startWorkspace() { showScreen('workspace'); renderStudentHeader(); renderProgress(); renderProgramList(); renderProgram(); }

function showStudentEditor() {
  fillStudentForm(elements.studentForm, state.student);
  showScreen('student');
  renderStudentHeader();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function logout() {
  clearStoredData();
  state.student = null;
  state.completed.clear();
  state.results = {};
  state.currentId = 1;
  state.search = '';
  elements.studentForm.reset();
  elements.programWorkspace.innerHTML = '';
  showScreen('student');
  renderStudentHeader();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleStudentSubmit(event) {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const student = readStudentForm(event.currentTarget);
  const validation = validateStudent(student);
  if (!validation.valid) return;
  state.student = student;
  saveStudent(student);
  startWorkspace();
}

function generatePdf() {
  try {
    const result = generateAssignmentPdf({ student: state.student });
    window.alert(`PDF generated successfully: ${result.filename}`);
  } catch (error) {
    window.alert(`Unable to generate PDF: ${error.message}`);
  }
}

function bindEvents() {
  elements.studentForm.addEventListener('submit', handleStudentSubmit);
  elements.programSearch.addEventListener('input', event => { state.search = event.target.value; renderProgramList(); });
  document.addEventListener('input', event => { if (event.target.id === 'code-editor') syncLineNumbers(); });
  document.addEventListener('scroll', event => { if (event.target.id === 'code-editor') syncLineNumbers(); }, true);
  document.addEventListener('click', event => {
    const programButton = event.target.closest('[data-program-id]');
    if (programButton) { state.currentId = Number(programButton.dataset.programId); renderProgramList(); renderProgram(); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'run') runCurrentProgram();
    if (action === 'complete') markComplete();
    if (action === 'generate-pdf') generatePdf();
    if (action === 'back-list') elements.programSidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (action === 'edit-student') showStudentEditor();
    if (action === 'logout') logout();
    if (action === 'home') { event.preventDefault(); showStudentEditor(); }
  });
}

function init() {
  if (!PROGRAMS.length) return;
  Object.assign(elements, { studentScreen: byId('student-screen'), workspaceScreen: byId('workspace-screen'), studentForm: byId('student-form'), headerStudent: byId('header-student'), logoutButton: byId('logout-button'), progressCount: byId('progress-count'), progressBar: byId('progress-bar'), programList: byId('program-list'), programTotal: byId('program-total'), emptySearch: byId('empty-search'), programSearch: byId('program-search'), programWorkspace: byId('program-workspace'), programSidebar: document.querySelector('.program-sidebar') });
  bindEvents();
  if (state.student && validateStudent(state.student).valid) { fillStudentForm(elements.studentForm, state.student); startWorkspace(); } else showScreen('student');
}

document.addEventListener('DOMContentLoaded', init);
