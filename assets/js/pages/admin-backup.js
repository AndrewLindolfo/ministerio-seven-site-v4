import { getBackupSections, exportBackupJson } from "../services/backup-service.js";
import { analyzeBackupJson, restoreBackupJson } from "../services/restore-service.js";
import { explainFirebaseError } from "../db.js";
import { recordAdminActivity } from "../services/admin-activity-service.js";

const ALL_SECTIONS = getBackupSections();

let currentImportJson = null;
let currentImportAnalysis = null;
let busy = false;

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setModalOpen(modal, open) {
  if (!modal) return;
  modal.classList.toggle("hidden", !open);
  modal.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("modal-open", Boolean(open));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pluralizeItems(count = 0) {
  const n = Number(count || 0);
  return n === 1 ? "1 item" : `${n} itens`;
}

function getCheckedSectionIds(container) {
  return Array.from(container?.querySelectorAll("input[data-section-id]:checked") || [])
    .map((input) => input.dataset.sectionId)
    .filter(Boolean);
}

function updateSelectAllState(container, selectAll) {
  if (!container || !selectAll) return;
  const boxes = Array.from(container.querySelectorAll("input[data-section-id]:not(:disabled)"));
  const checked = boxes.filter((box) => box.checked);
  selectAll.checked = boxes.length > 0 && checked.length === boxes.length;
  selectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
}

function wireSelectAll(container, selectAll) {
  if (!container || !selectAll) return;

  selectAll.addEventListener("change", () => {
    const boxes = Array.from(container.querySelectorAll("input[data-section-id]:not(:disabled)"));
    for (const box of boxes) box.checked = selectAll.checked;
    updateSelectAllState(container, selectAll);
  });

  container.addEventListener("change", (event) => {
    if (event.target?.matches?.("input[data-section-id]")) {
      updateSelectAllState(container, selectAll);
    }
  });
}

function renderExportOptions(container, selectAll) {
  if (!container) return;
  container.innerHTML = ALL_SECTIONS.map((section) => `
    <label class="backup-option">
      <input type="checkbox" data-section-id="${escapeHtml(section.id)}" checked />
      <span class="backup-option-content">
        <strong>${escapeHtml(section.label)}</strong>
        <small>${escapeHtml(section.description || "")}</small>
      </span>
    </label>
  `).join("");
  updateSelectAllState(container, selectAll);
}

function renderImportOptions(container, selectAll, analysis) {
  if (!container) return;
  const sections = analysis?.sections || [];

  container.innerHTML = sections.map((section) => {
    const disabled = !section.available;
    const counts = Object.entries(section.collectionCounts || {})
      .map(([collectionName, count]) => `${collectionName}: ${count}`)
      .join(" • ");

    return `
      <label class="backup-option ${disabled ? "backup-option--disabled" : ""}">
        <input type="checkbox" data-section-id="${escapeHtml(section.id)}" ${disabled ? "disabled" : "checked"} />
        <span class="backup-option-content">
          <strong>${escapeHtml(section.label)} <em>${escapeHtml(pluralizeItems(section.count))}</em></strong>
          <small>${escapeHtml(section.available ? (counts || section.description || "") : "Não encontrado neste arquivo.")}</small>
        </span>
      </label>
    `;
  }).join("");

  const unknown = Array.isArray(analysis?.unknownCollections) ? analysis.unknownCollections : [];
  if (unknown.length) {
    const unknownText = unknown.map((item) => `${item.collection} (${pluralizeItems(item.count)})`).join(", ");
    container.insertAdjacentHTML("beforeend", `
      <div class="backup-warning-box">
        Este arquivo também possui coleções não reconhecidas por esta versão do site: ${escapeHtml(unknownText)}.
      </div>
    `);
  }

  updateSelectAllState(container, selectAll);
}

function buildRestoreMessage(summary) {
  const restoredEntries = Object.values(summary.sectionSummary || {}).filter((item) => Number(item.count || 0) > 0);
  const restoredText = restoredEntries.length
    ? restoredEntries.map((item) => `${item.label}: ${item.count}`).join("\n")
    : "Nenhum item foi restaurado.";

  const warningsText = Array.isArray(summary.warnings) && summary.warnings.length
    ? `\n\nAvisos:\n- ${summary.warnings.join("\n- ")}`
    : "";

  return `Backup restaurado.\n\nItens restaurados:\n${restoredText}${warningsText}`;
}

function selectedLabels(sectionIds = []) {
  const wanted = new Set(sectionIds);
  return ALL_SECTIONS.filter((section) => wanted.has(section.id)).map((section) => section.label);
}

async function readBackupFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}

function setButtonBusy(button, isBusy, busyText = "Processando...") {
  if (!button) return;
  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function openImportModal(importModal, importOptions, importSelectAll, importSummary) {
  if (!currentImportAnalysis) return;
  renderImportOptions(importOptions, importSelectAll, currentImportAnalysis);
  if (importSummary) {
    const meta = currentImportAnalysis.meta || {};
    const exportedAt = meta.exportedAt ? new Date(meta.exportedAt).toLocaleString("pt-BR") : "data não informada";
    importSummary.innerHTML = `
      <strong>Backup detectado:</strong> ${escapeHtml(meta.site || meta.app || "Ministério Seven")}<br />
      <span>Exportado em: ${escapeHtml(exportedAt)}</span><br />
      <span>Total encontrado: ${escapeHtml(pluralizeItems(currentImportAnalysis.totalItems))}</span>
    `;
  }
  setModalOpen(importModal, true);
}

document.addEventListener("DOMContentLoaded", () => {
  const exportButton = document.getElementById("backup-export-button");
  const restoreButton = document.getElementById("backup-restore-button");
  const input = document.getElementById("backup-restore-input");
  const fileName = document.getElementById("backup-file-name");

  const exportModal = document.getElementById("backup-export-modal");
  const exportOptions = document.getElementById("backup-export-options");
  const exportSelectAll = document.getElementById("backup-export-select-all");
  const exportConfirm = document.getElementById("backup-export-confirm");

  const importModal = document.getElementById("backup-import-modal");
  const importOptions = document.getElementById("backup-import-options");
  const importSelectAll = document.getElementById("backup-import-select-all");
  const importConfirm = document.getElementById("backup-import-confirm");
  const importSummary = document.getElementById("backup-import-summary");

  wireSelectAll(exportOptions, exportSelectAll);
  wireSelectAll(importOptions, importSelectAll);

  document.querySelectorAll("[data-backup-close]").forEach((button) => {
    button.addEventListener("click", () => {
      if (busy) return;
      setModalOpen(exportModal, false);
      setModalOpen(importModal, false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || busy) return;
    setModalOpen(exportModal, false);
    setModalOpen(importModal, false);
  });

  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (fileName) {
      fileName.textContent = file ? file.name : "Nenhum arquivo selecionado";
    }

    currentImportJson = null;
    currentImportAnalysis = null;
    if (!file) return;

    try {
      currentImportJson = await readBackupFile(file);
      currentImportAnalysis = analyzeBackupJson(currentImportJson);
      if (!currentImportAnalysis.availableSections.length) {
        alert("O arquivo foi lido, mas nenhuma opção de backup compatível foi encontrada.");
        return;
      }
      openImportModal(importModal, importOptions, importSelectAll, importSummary);
    } catch (error) {
      console.error("Erro ao analisar arquivo de backup:", error);
      alert(`Não foi possível ler este arquivo de backup.\n\n${error?.message || "Arquivo inválido."}`);
    }
  });

  exportButton?.addEventListener("click", () => {
    renderExportOptions(exportOptions, exportSelectAll);
    setModalOpen(exportModal, true);
  });

  exportConfirm?.addEventListener("click", async () => {
    if (busy) return;
    const sectionIds = getCheckedSectionIds(exportOptions);
    if (!sectionIds.length) {
      alert("Marque pelo menos uma opção para fazer backup.");
      return;
    }

    try {
      busy = true;
      setButtonBusy(exportConfirm, true, "Gerando...");
      const data = await exportBackupJson(sectionIds);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
      const type = sectionIds.length === ALL_SECTIONS.length ? "completo" : "parcial";
      downloadJsonFile(data, `ministerio-seven-v4-backup-${type}-${stamp}.json`);
      await recordAdminActivity({
        action: "export",
        module: "backup",
        itemId: stamp,
        itemName: `Backup ${type} ${stamp}`,
        details: `Backup exportado com: ${selectedLabels(sectionIds).join(", ")}.`
      });
      setModalOpen(exportModal, false);
      alert("Backup gerado com sucesso.");
    } catch (error) {
      console.error("Erro ao fazer backup:", error);
      alert(`Não foi possível gerar o backup.\n\n${explainFirebaseError(error)}`);
    } finally {
      busy = false;
      setButtonBusy(exportConfirm, false);
    }
  });

  restoreButton?.addEventListener("click", () => {
    if (!input?.files?.[0]) {
      alert("Selecione um arquivo de backup primeiro.");
      return;
    }
    if (!currentImportJson || !currentImportAnalysis) {
      alert("O arquivo ainda não foi analisado. Selecione o arquivo novamente.");
      return;
    }
    openImportModal(importModal, importOptions, importSelectAll, importSummary);
  });

  importConfirm?.addEventListener("click", async () => {
    if (busy) return;
    if (!currentImportJson) {
      alert("Selecione um arquivo de backup primeiro.");
      return;
    }

    const sectionIds = getCheckedSectionIds(importOptions);
    if (!sectionIds.length) {
      alert("Marque pelo menos uma opção para recuperar do backup.");
      return;
    }

    const labels = selectedLabels(sectionIds).join(", ");
    if (!confirm(`Confirmar recuperação do backup?\n\nSerá importado: ${labels}\n\nOs documentos do arquivo serão restaurados usando os mesmos IDs. Os dados existentes com o mesmo ID serão atualizados.`)) {
      return;
    }

    try {
      busy = true;
      setButtonBusy(importConfirm, true, "Importando...");
      const file = input?.files?.[0];
      const summary = await restoreBackupJson(currentImportJson, sectionIds);
      await recordAdminActivity({
        action: "import",
        module: "backup",
        itemId: file?.name || "backup-json",
        itemName: file?.name || "Backup JSON",
        details: `Backup importado com: ${labels}.`
      });
      setModalOpen(importModal, false);
      alert(buildRestoreMessage(summary));
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      alert(`Não foi possível restaurar o backup.\n\n${error?.message || explainFirebaseError(error)}`);
    } finally {
      busy = false;
      setButtonBusy(importConfirm, false);
    }
  });
});
