import PROGRAMS from './programs.js';

const PAGE = {
  width: 210,
  height: 297,
  left: 22,
  right: 22,
  top: 22,
  bottom: 22
};

function getJsPdf() {
  const constructor = window.jspdf?.jsPDF || window.jsPDF;
  if (!constructor) throw new Error('jsPDF is not available. Check the browser connection and reload the page.');
  return constructor;
}

function safeFilename(value) {
  const cleaned = String(value || 'student').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'student';
}

function addFooter(doc, pageNumber) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(String(pageNumber), PAGE.width / 2, PAGE.height - 12, { align: 'center' });
}

function wrappedLines(doc, value, width) {
  const lines = [];
  for (const sourceLine of String(value ?? '').split(/\r?\n/)) {
    const split = doc.splitTextToSize(sourceLine || ' ', width);
    lines.push(...(split.length ? split : [' ']));
  }
  return lines;
}

function writeText(doc, value, x, y, width, options = {}) {
  const font = options.font || 'helvetica';
  const style = options.style || 'normal';
  const size = options.size || 10;
  const lineHeight = options.lineHeight || size * 0.48;
  const color = options.color || [0, 0, 0];
  const lines = wrappedLines(doc, value, width);
  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(lines, x, y, { baseline: 'top' });
  return y + lines.length * lineHeight;
}

function generateAssignmentPdf({ student }) {
  if (!student?.name || !student?.rollNumber) throw new Error('Student name and roll number are required before generating the PDF.');

  const JsPDF = getJsPdf();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const contentWidth = PAGE.width - PAGE.left - PAGE.right;
  let pageNumber = 1;
  let y = PAGE.top;

  const newPage = () => {
    addFooter(doc, pageNumber);
    doc.addPage();
    pageNumber += 1;
    y = PAGE.top;
  };

  const ensureSpace = (height) => {
    if (y + height > PAGE.height - PAGE.bottom - 12) newPage();
  };

  const sectionHeading = (label) => {
    ensureSpace(13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(label, PAGE.left, y);
    y += 6;
  };

  const writeCode = (code) => {
    const lineHeight = 4.3;
    const lines = wrappedLines(doc, code, contentWidth);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(0, 0, 0);
    for (const line of lines) {
      if (y + lineHeight > PAGE.height - PAGE.bottom - 12) newPage();
      doc.text(line, PAGE.left, y, { baseline: 'top' });
      y += lineHeight;
    }
    y += 5;
  };

  const writeOutput = (output) => {
    const lineHeight = 4.8;
    const lines = wrappedLines(doc, output, contentWidth);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    for (const line of lines) {
      if (y + lineHeight > PAGE.height - PAGE.bottom - 12) newPage();
      doc.text(line, PAGE.left, y, { baseline: 'top' });
      y += lineHeight;
    }
    y += 10;
  };

  const renderHtmlOutput = (html, program) => {
    let docBody = null;
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(html || '', 'text/html');
      docBody = parsed.body;
    }

    if (!docBody) {
      const clean = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      writeOutput(clean);
      return;
    }

    if (program?.id === 19 && !docBody.querySelector('h1, h2, h3')) {
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Job Application Form', PAGE.left, y);
      y += 6.5;
    }

    const renderInputBox = (val) => {
      const boxWidth = 80;
      const boxHeight = 6.5;
      ensureSpace(boxHeight + 4);
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.22);
      doc.rect(PAGE.left, y, boxWidth, boxHeight, 'S');
      if (val !== undefined && val !== null && String(val).length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        doc.setTextColor(20, 20, 20);
        doc.text(String(val), PAGE.left + 2.5, y + 4.4);
      }
      y += boxHeight + 4;
    };

    const renderButton = (btnText) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      const textWidth = doc.getTextWidth(btnText);
      const btnWidth = Math.max(30, textWidth + 12);
      const btnHeight = 6.8;
      ensureSpace(btnHeight + 6);
      doc.setDrawColor(90, 90, 90);
      doc.setFillColor(242, 242, 242);
      doc.setLineWidth(0.25);
      doc.rect(PAGE.left, y, btnWidth, btnHeight, 'FD');
      doc.setTextColor(0, 0, 0);
      doc.text(btnText, PAGE.left + btnWidth / 2, y + 4.5, { align: 'center' });
      y += btnHeight + 5;
    };

    const renderNodes = (nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.nodeType === 3 /* TEXT_NODE */) {
          const text = node.textContent.trim();
          if (text) {
            ensureSpace(5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(0, 0, 0);
            const lines = wrappedLines(doc, text, contentWidth);
            for (const line of lines) {
              ensureSpace(4.8);
              doc.text(line, PAGE.left, y, { baseline: 'top' });
              y += 4.8;
            }
            y += 3;
          }
        } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
          const tag = node.tagName.toLowerCase();
          if (tag === 'h1') {
            ensureSpace(8);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(node.textContent.trim(), PAGE.left, y);
            y += 7;
          } else if (tag === 'h2') {
            ensureSpace(7);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(node.textContent.trim(), PAGE.left, y);
            y += 6;
          } else if (tag === 'p') {
            ensureSpace(5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(0, 0, 0);
            const lines = wrappedLines(doc, node.textContent.trim(), contentWidth);
            for (const line of lines) {
              ensureSpace(4.8);
              doc.text(line, PAGE.left, y, { baseline: 'top' });
              y += 4.8;
            }
            y += 3.5;
          } else if (tag === 'br') {
            y += 3;
          } else if (tag === 'label') {
            const inputEl = node.querySelector('input');
            if (inputEl) {
              let labelText = '';
              for (const sub of node.childNodes) {
                if (sub !== inputEl) labelText += sub.textContent;
              }
              labelText = labelText.trim();
              if (labelText && !labelText.endsWith(':')) labelText += ':';
              ensureSpace(14);
              if (labelText) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text(labelText, PAGE.left, y);
                y += 4.5;
              }
              renderInputBox(inputEl.getAttribute('value') ?? '');
            } else {
              let labelText = node.textContent.trim();
              if (labelText && !labelText.endsWith(':')) labelText += ':';
              const nextEl = node.nextElementSibling;
              if (nextEl && nextEl.tagName.toLowerCase() === 'input') {
                ensureSpace(14);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text(labelText, PAGE.left, y);
                y += 4.5;
                renderInputBox(nextEl.getAttribute('value') ?? '');
                i++;
              } else {
                ensureSpace(5);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text(labelText, PAGE.left, y);
                y += 5;
              }
            }
          } else if (tag === 'input') {
            renderInputBox(node.getAttribute('value') ?? '');
          } else if (tag === 'button') {
            renderButton(node.textContent.trim() || 'Submit');
          } else if (tag === 'form' || tag === 'header' || tag === 'main' || tag === 'footer' || tag === 'div') {
            renderNodes(node.childNodes);
          } else {
            renderNodes(node.childNodes);
          }
        }
      }
    };

    renderNodes(docBody.childNodes);
    y += 8;
  };

  // Cover information and the first program share the natural document flow.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('PHP PROGRAMMING', PAGE.left, y);
  y += 9;
  doc.text('ASSIGNMENT', PAGE.left, y);
  y += 14;
  doc.setFontSize(11);
  doc.text('PHP AND MYSQL', PAGE.left, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Name: ${student.name}`, PAGE.left, y);
  y += 7;
  doc.text(`Roll No: ${student.rollNumber}`, PAGE.left, y);
  y += 18;

  for (const program of PROGRAMS) {
    ensureSpace(34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`PROGRAM ${String(program.id).padStart(2, '0')}`, PAGE.left, y);
    y += 7;
    y = writeText(doc, program.title, PAGE.left, y, contentWidth, { size: 11, style: 'bold', lineHeight: 5.4 }) + 9;

    sectionHeading('Problem / Question');
    y = writeText(doc, program.question, PAGE.left, y, contentWidth, { size: 10, lineHeight: 4.8 }) + 10;

    sectionHeading('PHP Program Code');
    writeCode(program.code);

    sectionHeading('Output');
    if (program.id >= 17) {
      renderHtmlOutput(program.demoOutput, program);
    } else {
      writeOutput(program.demoOutput);
    }
  }

  addFooter(doc, pageNumber);
  const filename = `PHP_Assignment_${safeFilename(student.rollNumber)}.pdf`;
  doc.save(filename);
  return { filename, programCount: PROGRAMS.length, pageCount: pageNumber };
}

export { generateAssignmentPdf };
export default generateAssignmentPdf;
