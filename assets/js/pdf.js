const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 42;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 46;
const BRAND_RED = "#ef1b1b";
const TEXT_DARK = "#111827";
const TEXT_SOFT = "#4b5563";
const BORDER = "#d7dce5";
const SURFACE = "#f8fafc";

let measureContext = null;
let pendingPdfAction = null;

function escapeHtml(text = "") {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugifyFileName(value = "arquivo") {
  const base = String(value || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return base || "arquivo";
}

function getMeasureContext() {
  if (!measureContext) {
    const canvas = document.createElement("canvas");
    measureContext = canvas.getContext("2d");
  }
  return measureContext;
}

function fontCss(style = {}) {
  const weight = style.bold ? "700" : "400";
  const italic = style.italic ? "italic " : "";
  const family = style.font === "courier" ? "Courier New, monospace" : "Arial, sans-serif";
  return `${italic}${weight} ${style.size || 11}px ${family}`;
}

function measureText(text = "", style = {}) {
  const ctx = getMeasureContext();
  ctx.font = fontCss(style);
  return ctx.measureText(String(text || "")).width;
}

function normalizeWhitespace(text = "", pre = false) {
  const value = String(text || "").replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n");
  return pre ? value : value.replace(/[\t ]+/g, " ");
}

function colorToRgb(value = "", fallback = "#111827") {
  const raw = String(value || fallback).trim();
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }
  const rgb = raw.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((part) => Number.parseFloat(part.trim())).filter((n) => Number.isFinite(n));
    return { r: clamp(Math.round(parts[0] ?? 17), 0, 255), g: clamp(Math.round(parts[1] ?? 24), 0, 255), b: clamp(Math.round(parts[2] ?? 39), 0, 255) };
  }
  return colorToRgb(fallback, "#111827");
}

function colorCommand(color = TEXT_DARK) {
  const rgb = colorToRgb(color);
  return `${(rgb.r / 255).toFixed(4)} ${(rgb.g / 255).toFixed(4)} ${(rgb.b / 255).toFixed(4)} rg`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function winAnsiHex(text = "") {
  const map = new Map([
    [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
    [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
    [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
    [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
    [0x017e, 0x9e], [0x0178, 0x9f]
  ]);
  const normalized = String(text || "")
    .replace(/[\u2190\u2192]/g, "-")
    .replace(/[\u25b6]/g, ">");
  let hex = "";
  for (const char of normalized) {
    const code = char.charCodeAt(0);
    const byte = code <= 0xff ? code : map.get(code) ?? 0x3f;
    hex += byte.toString(16).toUpperCase().padStart(2, "0");
  }
  return hex || "20";
}

function pdfTextCommand(text = "", x = 0, y = 0, style = {}) {
  const font = style.font === "courier" ? (style.bold ? "FCB" : "FC") : (style.bold ? "FHB" : "FH");
  const size = asNumber(style.size, 11);
  const safeText = String(text || "").replace(/\n/g, " ");
  return `BT /${font} ${size.toFixed(2)} Tf ${colorCommand(style.color || TEXT_DARK)} 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm <${winAnsiHex(safeText)}> Tj ET\n`;
}

function pdfRectCommand(x, y, width, height, options = {}) {
  const cmds = [];
  if (options.fill) {
    cmds.push(`${colorCommand(options.fill).replace(" rg", " rg")} ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`);
  }
  if (options.stroke) {
    const rgb = colorToRgb(options.stroke);
    cmds.push(`${(rgb.r / 255).toFixed(4)} ${(rgb.g / 255).toFixed(4)} ${(rgb.b / 255).toFixed(4)} RG ${asNumber(options.lineWidth, 1).toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S\n`);
  }
  return cmds.join("");
}

class PdfDocumentBuilder {
  constructor() {
    this.pages = [];
    this.current = null;
    this.y = 0;
    this.pageNumber = 0;
    this.startPage();
  }

  startPage() {
    this.pageNumber += 1;
    this.current = [];
    this.pages.push(this.current);
    this.y = PAGE_HEIGHT - MARGIN_TOP;
    this.current.push(pdfTextCommand("Ministério Seven", MARGIN_X, PAGE_HEIGHT - 24, { size: 9, color: TEXT_SOFT, bold: true }));
    this.current.push(pdfTextCommand(`Página ${this.pageNumber}`, PAGE_WIDTH - MARGIN_X - 44, 24, { size: 8, color: "#6b7280" }));
  }

  ensureSpace(height = 20) {
    if (this.y - height < MARGIN_BOTTOM) this.startPage();
  }

  addRect(x, y, width, height, options = {}) {
    this.current.push(pdfRectCommand(x, y, width, height, options));
  }

  addLine(runs = [], options = {}) {
    const lineHeight = asNumber(options.lineHeight, 15);
    this.ensureSpace(lineHeight);
    let x = asNumber(options.x, MARGIN_X);
    const y = this.y;
    for (const run of runs) {
      const text = String(run.text || "");
      if (!text) continue;
      this.current.push(pdfTextCommand(text, x, y, run.style || {}));
      x += measureText(text, run.style || {});
    }
    this.y -= lineHeight;
  }

  addBlank(height = 8) {
    this.ensureSpace(height);
    this.y -= height;
  }

  addTitle(text = "", subtitle = "", kind = "") {
    this.current.push(pdfRectCommand(MARGIN_X, this.y - 5, 48, 3, { fill: BRAND_RED }));
    this.y -= 28;
    this.addWrappedText(text, {
      font: "helvetica",
      size: 22,
      bold: true,
      color: "#0f172a",
      lineHeight: 27,
      maxWidth: PAGE_WIDTH - MARGIN_X * 2
    });
    if (subtitle) {
      this.addWrappedText(subtitle, { size: 11, color: TEXT_SOFT, lineHeight: 15, maxWidth: PAGE_WIDTH - MARGIN_X * 2 });
    }
    if (kind) {
      this.addWrappedText(kind, { size: 10, bold: true, color: BRAND_RED, lineHeight: 14, maxWidth: PAGE_WIDTH - MARGIN_X * 2 });
    }
    this.addBlank(8);
  }

  addMeta(text = "") {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return;
    this.addWrappedText(clean, { size: 9.5, color: TEXT_SOFT, lineHeight: 13, maxWidth: PAGE_WIDTH - MARGIN_X * 2 });
    this.addBlank(10);
  }

  addNoteBox(title = "", text = "") {
    const lines = splitPlainTextToLines(text, { font: "helvetica", size: 10.5, color: TEXT_DARK }, PAGE_WIDTH - MARGIN_X * 2 - 26);
    if (!lines.length) return;
    const boxHeight = 26 + lines.length * 14 + 12;
    this.ensureSpace(boxHeight + 10);
    const boxTop = this.y;
    const boxY = boxTop - boxHeight;
    this.addRect(MARGIN_X, boxY, PAGE_WIDTH - MARGIN_X * 2, boxHeight, { fill: "#fff7f7", stroke: "#f3b5b5", lineWidth: 0.8 });
    this.current.push(pdfTextCommand(title, MARGIN_X + 13, boxTop - 21, { size: 11, bold: true, color: BRAND_RED }));
    this.y = boxTop - 40;
    for (const line of lines) this.addLine(line, { x: MARGIN_X + 13, lineHeight: 14 });
    this.y = boxY - 16;
  }

  addWrappedText(text = "", style = {}) {
    const lines = splitPlainTextToLines(text, style, asNumber(style.maxWidth, PAGE_WIDTH - MARGIN_X * 2));
    for (const line of lines) this.addLine(line, { lineHeight: asNumber(style.lineHeight, 15) });
  }

  addRichLines(lines = [], options = {}) {
    const maxWidth = asNumber(options.maxWidth, PAGE_WIDTH - MARGIN_X * 2);
    const lineHeight = asNumber(options.lineHeight, 15);
    const blankLineHeight = asNumber(options.blankLineHeight, lineHeight * 0.45);
    const wrapped = [];
    lines.forEach((line) => {
      const current = wrapRunsToLines(line, maxWidth, !!options.pre);
      wrapped.push(...current);
    });
    let previousWasBlank = false;
    for (const line of wrapped) {
      if (!line.some((run) => String(run.text || "").trim())) {
        if (!previousWasBlank) this.addBlank(blankLineHeight);
        previousWasBlank = true;
      } else {
        this.addLine(line, { lineHeight });
        previousWasBlank = false;
      }
    }
  }
}

function splitPlainTextToLines(text = "", style = {}, maxWidth = 500) {
  const result = [];
  const paragraphs = normalizeWhitespace(text, false).split("\n");
  for (const paragraph of paragraphs) {
    const clean = paragraph.trim();
    if (!clean) {
      result.push([]);
      continue;
    }
    const words = clean.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (measureText(next, style) > maxWidth && line) {
        result.push([{ text: line, style }]);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) result.push([{ text: line, style }]);
  }
  return result;
}

function runWidth(run = {}) {
  return measureText(run.text || "", run.style || {});
}

function splitRunByWidth(run = {}, maxWidth = 500) {
  const text = String(run.text || "");
  if (runWidth(run) <= maxWidth) return [{ ...run }];
  const pieces = [];
  let buffer = "";
  for (const char of text) {
    const next = buffer + char;
    if (measureText(next, run.style) > maxWidth && buffer) {
      pieces.push({ text: buffer, style: run.style });
      buffer = char;
    } else {
      buffer = next;
    }
  }
  if (buffer) pieces.push({ text: buffer, style: run.style });
  return pieces;
}

function tokenizeRun(run = {}, pre = false) {
  const text = String(run.text || "");
  if (pre) return splitRunByWidth(run, 5000);
  const tokens = text.split(/(\s+)/).filter(Boolean).map((token) => ({ text: /^\s+$/.test(token) ? " " : token, style: run.style }));
  return tokens.length ? tokens : [{ text: "", style: run.style }];
}

function wrapRunsToLines(runs = [], maxWidth = 500, pre = false) {
  const lines = [];
  let line = [];
  let width = 0;
  const pushLine = () => {
    lines.push(line);
    line = [];
    width = 0;
  };

  if (!runs.length) return [[]];

  for (const run of runs) {
    const pieces = tokenizeRun(run, pre);
    for (const piece of pieces) {
      if (!piece.text) continue;
      if (pre && measureText(piece.text, piece.style) > maxWidth) {
        const split = splitRunByWidth(piece, maxWidth);
        for (const part of split) {
          const partWidth = runWidth(part);
          if (width + partWidth > maxWidth && line.length) pushLine();
          line.push(part);
          width += partWidth;
        }
        continue;
      }
      const pieceWidth = runWidth(piece);
      if (width + pieceWidth > maxWidth && line.length) {
        while (line.length && line[line.length - 1].text === " ") line.pop();
        pushLine();
        if (piece.text === " ") continue;
      }
      line.push(piece);
      width += pieceWidth;
    }
  }

  if (line.length) lines.push(line);
  return lines.length ? lines : [[]];
}

function defaultStyle(options = {}) {
  return {
    font: options.font || "helvetica",
    size: options.size || 11,
    color: options.color || TEXT_DARK,
    bold: !!options.bold,
    italic: !!options.italic
  };
}

function getElementRunStyle(element, inherited = {}, options = {}) {
  const tag = element.tagName?.toUpperCase?.() || "";
  const isChord = element.classList?.contains("chord-token");
  const computed = window.getComputedStyle ? window.getComputedStyle(element) : null;
  let color = inherited.color || options.color || TEXT_DARK;
  if (isChord && computed?.color) color = computed.color;
  if (element.style?.color) color = element.style.color;
  const weight = computed?.fontWeight || "";
  const numericWeight = Number.parseInt(weight, 10);
  const bold = inherited.bold || ["B", "STRONG", "H1", "H2", "H3"].includes(tag) || isChord || numericWeight >= 600;
  const italic = inherited.italic || ["I", "EM"].includes(tag) || computed?.fontStyle === "italic";
  let size = inherited.size || options.size || 11;
  if (["H1"].includes(tag)) size = Math.max(size + 7, 18);
  if (["H2"].includes(tag)) size = Math.max(size + 3, 14);
  return { ...inherited, font: options.font || inherited.font || "helvetica", size, color, bold, italic };
}

function extractRichLinesFromElement(root, options = {}) {
  const pre = !!options.pre;
  const lines = [[]];
  const baseStyle = defaultStyle(options);
  const blockTags = new Set(["P", "DIV", "SECTION", "ARTICLE", "LI", "UL", "OL", "BLOCKQUOTE", "H1", "H2", "H3"]);

  const ensureLine = () => {
    if (!lines.length) lines.push([]);
    return lines[lines.length - 1];
  };

  const pushLine = (force = false) => {
    const current = ensureLine();
    if (force || current.length) lines.push([]);
  };

  const appendText = (text = "", style = baseStyle) => {
    const normalized = normalizeWhitespace(text, pre);
    const parts = normalized.split("\n");
    parts.forEach((part, index) => {
      // Ignora espaços de formatação do HTML entre <p>, <div> etc.
      // Esses espaços não fazem parte da letra e antes viravam "linhas vazias" no PDF.
      if (!pre && !String(part || "").trim()) return;
      if (index > 0) pushLine(true);
      const content = pre ? part : part.replace(/\s+/g, " ").trim();
      if (content) ensureLine().push({ text: content, style });
    });
  };

  const walk = (node, inherited = baseStyle) => {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      appendText(node.nodeValue || "", inherited);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node;
    const tag = element.tagName.toUpperCase();
    if (["SCRIPT", "STYLE", "BUTTON", "IFRAME"].includes(tag)) return;
    if (tag === "BR") {
      pushLine(true);
      return;
    }
    const isBlock = blockTags.has(tag);
    if (isBlock && lines[lines.length - 1]?.length) pushLine(true);
    const style = getElementRunStyle(element, inherited, options);
    Array.from(element.childNodes).forEach((child) => walk(child, style));
    if (isBlock) pushLine(true);
  };

  Array.from(root?.childNodes || []).forEach((child) => walk(child, baseStyle));

  while (lines.length && !lines[0].length) lines.shift();
  while (lines.length && !lines[lines.length - 1].length) lines.pop();
  return lines.length ? lines : [[{ text: root?.textContent || "", style: baseStyle }]];
}

function plainTextFromElement(id = "") {
  const element = document.getElementById(id);
  return (element?.innerText || element?.textContent || "").replace(/\u00a0/g, " ").trim();
}

function getMetaText(id = "") {
  return plainTextFromElement(id).replace(/\s*\|\s*/g, " | ").replace(/\s+/g, " ").trim();
}

function getPdfKind() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("musica-vocal")) return "Música Vocal";
  if (path.includes("cifra")) return "Cifra";
  return "Música";
}

function collectMusicaPdfData() {
  const title = plainTextFromElement("musica-titulo") || "Música";
  const subtitle = plainTextFromElement("musica-subtitulo");
  const meta = getMetaText("musica-meta");
  const notesEl = document.getElementById("musica-vocal-observacoes");
  const notesTitle = notesEl?.querySelector("h2")?.textContent?.trim() || "Observações do vocal";
  const notes = notesEl ? Array.from(notesEl.querySelectorAll("div, p")).map((el) => el.innerText || el.textContent || "").join("\n").trim() : "";
  const contentEl = document.getElementById("musica-letra");
  const lines = extractRichLinesFromElement(contentEl, { font: "helvetica", size: 10.7, color: TEXT_DARK, pre: false });
  return {
    type: "musica",
    kind: getPdfKind(),
    title,
    subtitle,
    meta,
    notesTitle,
    notes,
    lines,
    fileName: `Ministerio-Seven-${slugifyFileName(getPdfKind())}-${slugifyFileName(title)}.pdf`,
    previewHtml: buildPreviewHtml({ kind: getPdfKind(), title, subtitle, meta, notesTitle, notes, contentHtml: contentEl?.innerHTML || "" })
  };
}

function collectCifraPdfData() {
  const title = plainTextFromElement("cifra-titulo") || "Cifra";
  const subtitle = plainTextFromElement("cifra-subtitulo");
  const meta = getMetaText("cifra-meta");
  const contentEl = document.getElementById("cifra-content");
  const lines = extractRichLinesFromElement(contentEl, { font: "courier", size: 8.9, color: TEXT_DARK, pre: true });
  return {
    type: "cifra",
    kind: "Cifra",
    title,
    subtitle,
    meta,
    lines,
    fileName: `Ministerio-Seven-Cifra-${slugifyFileName(title)}.pdf`,
    previewHtml: buildPreviewHtml({ kind: "Cifra", title, subtitle, meta, contentHtml: contentEl?.innerHTML || "", isCifra: true })
  };
}

function buildPreviewHtml(data = {}) {
  return `
    <article class="pdf-preview-sheet ${data.isCifra ? "is-cifra" : ""}">
      <div class="pdf-preview-brand"><span></span> Ministério Seven</div>
      <h2>${escapeHtml(data.title || "PDF")}</h2>
      ${data.subtitle ? `<p class="pdf-preview-subtitle">${escapeHtml(data.subtitle)}</p>` : ""}
      ${data.meta ? `<p class="pdf-preview-meta">${escapeHtml(data.meta)}</p>` : ""}
      <small class="pdf-preview-kind">${escapeHtml(data.kind || "PDF")}</small>
      ${data.notes ? `<section class="pdf-preview-notes"><strong>${escapeHtml(data.notesTitle || "Observações")}</strong><div>${escapeHtml(data.notes).replace(/\n/g, "<br>")}</div></section>` : ""}
      <div class="pdf-preview-content">${data.contentHtml || ""}</div>
    </article>`;
}

function buildPdfBlob(data = {}) {
  const builder = new PdfDocumentBuilder();
  builder.addTitle(data.title, data.subtitle, data.kind);
  builder.addMeta(data.meta);
  if (data.notes) builder.addNoteBox(data.notesTitle || "Observações", data.notes);
  builder.addRichLines(data.lines || [], {
    pre: data.type === "cifra",
    lineHeight: data.type === "cifra" ? 11.6 : 12.8,
    blankLineHeight: data.type === "cifra" ? 5.2 : 5.8,
    maxWidth: PAGE_WIDTH - MARGIN_X * 2
  });
  const bytes = makePdfBytes(builder.pages);
  return new Blob([bytes], { type: "application/pdf" });
}

function makePdfBytes(pageContents = []) {
  const objects = [];
  const addObject = (content) => {
    objects.push(String(content));
    return objects.length;
  };

  const catalogId = addObject("__CATALOG__");
  const pagesId = addObject("__PAGES__");
  const fontHelvetica = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontHelveticaBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const fontCourier = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  const fontCourierBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>");

  const pageIds = [];
  for (const content of pageContents) {
    const stream = String(content.join(""));
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /FH ${fontHelvetica} 0 R /FHB ${fontHelveticaBold} 0 R /FC ${fontCourier} 0 R /FCB ${fontCourierBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

function downloadBlob(blob, fileName = "arquivo.pdf") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function ensurePdfModal() {
  let modal = document.getElementById("pdf-export-modal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "pdf-export-modal";
  modal.className = "pdf-export-modal hidden";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="pdf-export-backdrop" data-pdf-close></div>
    <section class="pdf-export-panel" role="dialog" aria-modal="true" aria-labelledby="pdf-export-title">
      <button type="button" class="pdf-export-close" data-pdf-close aria-label="Fechar">✕</button>
      <div class="pdf-export-header">
        <span class="pdf-export-icon">⤓</span>
        <div>
          <h2 id="pdf-export-title">Baixar PDF</h2>
          <p>Confira o arquivo e clique em baixar. A impressão fica por sua conta depois, pelo PDF salvo.</p>
        </div>
      </div>
      <div id="pdf-export-preview" class="pdf-export-preview"></div>
      <div class="pdf-export-actions">
        <button type="button" class="button-outline" data-pdf-close>Cancelar</button>
        <button type="button" class="button-primary" id="pdf-export-download">Baixar PDF</button>
      </div>
    </section>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-pdf-close]")) closePdfModal();
  });
  modal.querySelector("#pdf-export-download")?.addEventListener("click", () => {
    if (typeof pendingPdfAction === "function") pendingPdfAction();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) closePdfModal();
  });
  return modal;
}

function openPdfModal(data = {}) {
  const modal = ensurePdfModal();
  const preview = modal.querySelector("#pdf-export-preview");
  const title = modal.querySelector("#pdf-export-title");
  if (title) title.textContent = `Baixar PDF - ${data.title || "Arquivo"}`;
  if (preview) preview.innerHTML = data.previewHtml || "";
  pendingPdfAction = () => {
    const button = modal.querySelector("#pdf-export-download");
    const oldText = button?.textContent || "Baixar PDF";
    if (button) {
      button.disabled = true;
      button.textContent = "Gerando...";
    }
    window.setTimeout(() => {
      try {
        const blob = buildPdfBlob(data);
        downloadBlob(blob, data.fileName || "Ministerio-Seven.pdf");
        closePdfModal();
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Não foi possível gerar o PDF. Tente novamente.");
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = oldText;
        }
      }
    }, 30);
  };
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdf-modal-open");
}

function closePdfModal() {
  const modal = document.getElementById("pdf-export-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdf-modal-open");
  pendingPdfAction = null;
}

export function exportMusicaPdf() {
  const data = collectMusicaPdfData();
  openPdfModal(data);
}

export function exportCifraPdf() {
  const data = collectCifraPdfData();
  openPdfModal(data);
}
