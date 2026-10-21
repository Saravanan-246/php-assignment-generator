const ROLL_PREFIX = '24UGCS';
const STUDENT_FIELDS = [
  { name: 'name', label: 'Name', autocomplete: 'name', placeholder: 'Enter your name' },
  { name: 'rollNumber', label: 'Roll Number', autocomplete: 'off', placeholder: 'Enter last digits' }
];

function readStudentForm(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const digits = String(data.get('rollDigits') || '').trim();
  return { name, rollNumber: `${ROLL_PREFIX}${digits}` };
}

function validateStudent(student) {
  const rollNumber = String(student?.rollNumber || '').trim();
  const suffix = rollNumber.startsWith(ROLL_PREFIX) ? rollNumber.slice(ROLL_PREFIX.length) : '';
  const missing = [
    !String(student?.name || '').trim() ? 'Name' : null,
    !/^\d{1,20}$/.test(suffix) ? 'Roll Number' : null
  ].filter(Boolean);
  return { valid: missing.length === 0, missing };
}

function fillStudentForm(form, student) {
  const nameInput = form.elements.namedItem('name');
  const rollInput = form.elements.namedItem('rollDigits');
  if (nameInput) nameInput.value = student?.name || '';
  if (rollInput) rollInput.value = student?.rollNumber?.startsWith(ROLL_PREFIX) ? student.rollNumber.slice(ROLL_PREFIX.length) : '';
}

function studentDisplayName(student) { return student?.name || 'Student'; }

export { ROLL_PREFIX, STUDENT_FIELDS, fillStudentForm, readStudentForm, studentDisplayName, validateStudent };
