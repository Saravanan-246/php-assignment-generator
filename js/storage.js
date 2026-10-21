const STUDENT_KEY = 'php-assignment-generator.student.v1';
const PROGRESS_KEY = 'php-assignment-generator.progress.v1';

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_error) {
    return false;
  }
}

function loadStudent() {
  const student = readJson(STUDENT_KEY, null);
  if (!student || typeof student !== 'object') return null;
  return { name: String(student.name || ''), rollNumber: String(student.rollNumber || '') };
}
function saveStudent(student) {
  return writeJson(STUDENT_KEY, { name: String(student?.name || ''), rollNumber: String(student?.rollNumber || '') });
}

function emptyProgress() { return { completedIds: [], results: {} }; }

function loadProgress() {
  const progress = readJson(PROGRESS_KEY, emptyProgress());
  return {
    completedIds: Array.isArray(progress?.completedIds) ? progress.completedIds.map(Number).filter(Number.isInteger) : [],
    results: progress?.results && typeof progress.results === 'object' ? progress.results : {}
  };
}

function saveProgress(progress) {
  return writeJson(PROGRESS_KEY, {
    completedIds: [...new Set((progress.completedIds || []).map(Number).filter(Number.isInteger))],
    results: progress.results || {}
  });
}

function saveProgramResult(progress, id, result) {
  const results = { ...(progress.results || {}) };
  results[String(id)] = {
    success: Boolean(result.success),
    source: result.source || '',
    output: result.output || '',
    html: result.html || '',
    text: result.text || '',
    execution: result.execution || null,
    savedAt: new Date().toISOString()
  };
  return saveProgress({ ...progress, results });
}

function clearStoredData() {
  try {
    window.localStorage.removeItem(STUDENT_KEY);
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch (_error) {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

export { clearStoredData, loadProgress, loadStudent, saveProgramResult, saveProgress, saveStudent };
