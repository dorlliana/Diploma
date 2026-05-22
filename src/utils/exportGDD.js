// Рекурсивно рендеримо задачі у markdown з відступами
const renderTasks = (tasks, depth = 0) => {
  let md = '';
  const indent = '  '.repeat(depth);
  for (const t of tasks) {
    const check = t.done ? '[x]' : '[ ]';
    md += `${indent}- ${check} ${t.text || '(без назви)'}\n`;
    if (t.children?.length) {
      md += renderTasks(t.children, depth + 1);
    }
  }
  return md;
};

export function exportGDDMarkdown(nodes, boardName = 'Дошка') {
  const isKanban = (n) => n.data?.contentType === 'kanban';
  const isImage  = (n) => n.data?.contentType === 'image';
  const isAudio  = (n) => n.data?.contentType === 'audio';
  const isCode   = (n) => n.data?.contentType === 'code';
  const isText   = (n) => n.data?.contentType === 'text' || (!n.data?.contentType);

  const kanbanNodes = nodes.filter(isKanban);
  const otherNodes  = nodes.filter((n) => !isKanban(n));

  let md = `# Game Design Document\n\n`;
  md += `**Проєкт / дошка:** ${boardName}\n`;

  if (kanbanNodes.length === 0) {
    md += `_Немає Todo list. Перетягніть Todo list на дошку або застосуйте GDD-шаблон._\n\n`;
  } else {
    let totalTasks = 0;
    let totalDone  = 0;
    const countAll = (tasks) => {
      for (const t of tasks) {
        totalTasks++;
        if (t.done) totalDone++;
        if (t.children?.length) countAll(t.children);
      }
    };
    kanbanNodes.forEach(n => countAll(n.data.tasks || []));
    const pct = totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0;

    md += `## Загальний прогрес\n`;
    md += `Виконано **${totalDone}** з **${totalTasks}** задач (${pct}%)\n\n`;

    md += `## Задачі по колонках\n`;
    for (const node of kanbanNodes) {
      const colLabel = node.data.label || 'Без назви';
      const tasks = node.data.tasks || [];

      let colTotal = 0, colDone = 0;
      const countCol = (ts) => {
        for (const t of ts) {
          colTotal++; if (t.done) colDone++;
          if (t.children?.length) countCol(t.children);
        }
      };
      countCol(tasks);
      const colPct = colTotal ? Math.round((colDone / colTotal) * 100) : 0;

      md += `### ${colLabel}\n\n`;
      md += `> ${colDone}/${colTotal} виконано (${colPct}%)\n\n`;

      if (tasks.length === 0) {
        md += `_Колонка порожня_\n\n`;
      } else {
        md += renderTasks(tasks);
        md += '\n';
      }
    }
  }

  if (otherNodes.length > 0) {
    md += `## Інші матеріали\n`;
    for (const n of otherNodes) {
      const d = n.data || {};

      if (isImage(n)) {
        const imageLabel = d.label || 'Зображення';
        let fileName = '(файл не завантажено)';
        if (d.content) {
          const match = d.content.match(/^data:image\/([a-zA-Z]+);base64,/);
          const ext = match ? match[1] : 'png';
          const safeName = imageLabel.replace(/[^\wа-яА-ЯіІїЇєЄ\s-]/g, '').trim().replace(/\s+/g, '_');
          fileName = `${safeName}.${ext}`;
        }
        md += `### ${imageLabel}\n`;
        md += `**Тип:** Зображення\n`;
        md += `**Файл:** \`${fileName}\`\n`;
        if (d.description) md += `${d.description}\n\n`;
      } else if (isAudio(n)) {
        const audioLabel = d.label || 'Аудіо';
        let fileName = '(файл не завантажено)';
        if (d.content) {
          if (typeof d.content === 'object' && d.content.name) {
            fileName = d.content.name;
          } else if (typeof d.content === 'string') {
            const match = d.content.match(/^data:audio\/([a-zA-Z0-9]+);base64,/);
            const ext = match ? match[1] : 'mp3';
            const safeName = audioLabel.replace(/[^\wа-яА-ЯіІїЇєЄ\s-]/g, '').trim().replace(/\s+/g, '_');
            fileName = `${safeName}.${ext}`;
          }
        }
        md += `### ${audioLabel}\n`;
        md += `**Тип:** Аудіоресурс\n`;
        md += `**Файл:** \`${fileName}\`\n`;
        if (d.description) md += `${d.description}\n`;
      } else if (isCode(n)) {
        const title = d.label || 'GML Script';
        md += `### ${title}\n`;
        md += `**Тип:** GML Script\n\n`;
        if (d.content) {
          md += '```gml\n' + d.content + '\n```\n\n';
        }
        if (d.description) md += `${d.description}\n\n`;
      } else if (isText(n)) {
        const title = d.label || d.content || 'Нотатка';
        md += `### ${title}\n`;
        if (d.showTitle && d.content) {
          md += `${d.content}\n\n`;
        }
        if (d.description) md += `${d.description}\n\n`;
      }
    }
  }

  const safeName = boardName.replace(/[^\w\u0400-\u04FF-]+/g, '_');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `GDD-${safeName}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF Export ────────────────────────────────────────────────────────────────

const renderTasksHtml = (tasks, depth = 0) => {
  let html = '';
  const indent = depth * 20;
  for (const t of tasks) {
    const check = t.done
      ? '<span class="check done">✓</span>'
      : '<span class="check">○</span>';
    const textStyle = t.done ? 'style="text-decoration:line-through;opacity:0.5"' : '';
    html += `<div class="task-row" style="padding-left:${indent}px">
      ${check}
      <span class="task-text" ${textStyle}>${t.text || '(без назви)'}</span>
    </div>`;
    if (t.children?.length) {
      html += renderTasksHtml(t.children, depth + 1);
    }
  }
  return html;
};

export function exportGDDPdf(nodes, boardName = 'Дошка') {
  const isKanban = (n) => n.data?.contentType === 'kanban';
  const isImage  = (n) => n.data?.contentType === 'image';
  const isAudio  = (n) => n.data?.contentType === 'audio';
  const isCode   = (n) => n.data?.contentType === 'code';
  const isText   = (n) => n.data?.contentType === 'text' || (!n.data?.contentType);

  const kanbanNodes = nodes.filter(isKanban);
  const otherNodes  = nodes.filter((n) => !isKanban(n));

  let totalTasks = 0;
  let totalDone  = 0;
  const countAll = (tasks) => {
    for (const t of tasks) {
      totalTasks++;
      if (t.done) totalDone++;
      if (t.children?.length) countAll(t.children);
    }
  };
  kanbanNodes.forEach(n => countAll(n.data.tasks || []));
  const pct = totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0;

  // ── Kanban секція ──
  let kanbanHtml = '';
  if (kanbanNodes.length === 0) {
    kanbanHtml = '<p class="empty-hint">Немає Todo list на дошці.</p>';
  } else {
    kanbanHtml += `
      <div class="progress-section">
        <div class="progress-header">
          <span>Загальний прогрес</span>
          <span class="pct">${pct}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-stats">
          <span class="done-count">${totalDone} виконано</span>
          <span class="left-count">${totalTasks - totalDone} залишилось</span>
        </div>
      </div>
      <h2>Задачі по колонках</h2>
    `;

    for (const node of kanbanNodes) {
      const colLabel = node.data.label || 'Без назви';
      const tasks = node.data.tasks || [];

      let colTotal = 0, colDone = 0;
      const countCol = (ts) => {
        for (const t of ts) {
          colTotal++; if (t.done) colDone++;
          if (t.children?.length) countCol(t.children);
        }
      };
      countCol(tasks);
      const colPct = colTotal ? Math.round((colDone / colTotal) * 100) : 0;

      kanbanHtml += `
        <div class="kanban-col">
          <div class="col-header">
            <span class="col-title">${colLabel}</span>
            <span class="col-badge">${colDone}/${colTotal} (${colPct}%)</span>
          </div>
          <div class="col-progress-wrap">
            <div class="col-progress-fill" style="width:${colPct}%"></div>
          </div>
          <div class="col-tasks">
            ${tasks.length === 0
              ? '<div class="empty-hint">Колонка порожня</div>'
              : renderTasksHtml(tasks)
            }
          </div>
        </div>
      `;
    }
  }

  // ── Інші матеріали ──
  let othersHtml = '';
  if (otherNodes.length > 0) {
    othersHtml += '<h2>Інші матеріали</h2>';
    for (const n of otherNodes) {
      const d = n.data || {};

      if (isImage(n)) {
        const imageLabel = d.label || 'Зображення';
        let fileName = '(файл не завантажено)';
        if (d.content) {
          const match = d.content.match(/^data:image\/([a-zA-Z]+);base64,/);
          const ext = match ? match[1] : 'png';
          const safeName = imageLabel.replace(/[^\wа-яА-ЯіІїЇєЄ\s-]/g, '').trim().replace(/\s+/g, '_');
          fileName = `${safeName}.${ext}`;
        }
        othersHtml += `
          <div class="other-item">
            <div class="other-title">${imageLabel}</div>
            <div class="other-meta">Тип: Зображення &nbsp;|&nbsp; Файл: <code>${fileName}</code></div>
            ${d.description ? `<div class="other-desc">${d.description}</div>` : ''}
          </div>
        `;
      } else if (isAudio(n)) {
        const audioLabel = d.label || 'Аудіо';
        let fileName = '(файл не завантажено)';
        if (d.content) {
          if (typeof d.content === 'object' && d.content.name) {
            fileName = d.content.name;
          } else if (typeof d.content === 'string') {
            const match = d.content.match(/^data:audio\/([a-zA-Z0-9]+);base64,/);
            const ext = match ? match[1] : 'mp3';
            const safeName = audioLabel.replace(/[^\wа-яА-ЯіІїЇєЄ\s-]/g, '').trim().replace(/\s+/g, '_');
            fileName = `${safeName}.${ext}`;
          }
        }
        othersHtml += `
          <div class="other-item">
            <div class="other-title">${audioLabel}</div>
            <div class="other-meta">Тип: Аудіоресурс &nbsp;|&nbsp; Файл: <code>${fileName}</code></div>
            ${d.description ? `<div class="other-desc">${d.description}</div>` : ''}
          </div>
        `;
      } else if (isCode(n)) {
        const title = d.label || 'GML Script';
        othersHtml += `
          <div class="other-item">
            <div class="other-title">${title}</div>
            <div class="other-meta">Тип: GML Script</div>
            ${d.content ? `<pre class="code-block">${d.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>` : ''}
            ${d.description ? `<div class="other-desc">${d.description}</div>` : ''}
          </div>
        `;
      } else if (isText(n)) {
        const title = d.label || d.content || 'Нотатка';
        othersHtml += `
          <div class="other-item">
            <div class="other-title">${title}</div>
            ${d.showTitle && d.content ? `<div class="other-desc">${d.content}</div>` : ''}
            ${d.description ? `<div class="other-desc">${d.description}</div>` : ''}
          </div>
        `;
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <title>GDD — ${boardName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #111;
      padding: 32px 40px;
      font-size: 13px;
      line-height: 1.6;
    }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .subtitle { color: #555; font-size: 13px; margin-bottom: 24px; }
    h2 { font-size: 16px; margin: 28px 0 12px; border-bottom: 2px solid #007aff; padding-bottom: 4px; color: #007aff; }

    .progress-section {
      background: #f4f8ff;
      border: 1px solid #cce0ff;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .progress-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 600; }
    .pct { color: #007aff; }
    .progress-bar-wrap { background: #ddd; border-radius: 4px; height: 6px; overflow: hidden; margin-bottom: 6px; }
    .progress-bar-fill { height: 100%; background: #34c759; border-radius: 4px; }
    .progress-stats { display: flex; justify-content: space-between; font-size: 11px; }
    .done-count { color: #34c759; font-weight: 600; }
    .left-count { color: #888; }

    .kanban-col {
      break-inside: avoid;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .col-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
    }
    .col-title { font-weight: 700; font-size: 13px; }
    .col-badge { font-size: 11px; color: #666; background: #eee; border-radius: 10px; padding: 2px 8px; }
    .col-progress-wrap { height: 3px; background: #e0e0e0; }
    .col-progress-fill { height: 100%; background: #007aff; }
    .col-tasks { padding: 10px 14px; }

    .task-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 3px 0;
      font-size: 12px;
    }
    .check { flex-shrink: 0; font-size: 12px; color: #aaa; width: 16px; }
    .check.done { color: #34c759; }
    .task-text { flex: 1; }
    .empty-hint { color: #aaa; font-style: italic; font-size: 12px; padding: 4px 0; }

    .other-item {
      break-inside: avoid;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
    }
    .other-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
    .other-meta { font-size: 11px; color: #666; margin-bottom: 6px; }
    .other-desc { font-size: 12px; color: #333; white-space: pre-wrap; }
    code { background: #f0f0f0; border-radius: 3px; padding: 1px 4px; font-family: monospace; font-size: 11px; }
    pre.code-block {
      background: #1a1a1a;
      color: #abb2bf;
      border-radius: 6px;
      padding: 12px;
      font-size: 11px;
      font-family: 'Consolas', 'Courier New', monospace;
      overflow: auto;
      white-space: pre-wrap;
      margin-top: 8px;
    }

    .print-btn-row { margin-bottom: 20px; }
    .print-btn {
      background: #007aff;
      border: none;
      color: #fff;
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      font-weight: 600;
    }
    .print-hint { margin-left: 12px; color: #666; font-size: 12px; }

    @media print {
      .print-btn-row { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-btn-row">
    <button class="print-btn" onclick="window.print()">⬇ Зберегти як PDF (Ctrl+P)</button>
    <span class="print-hint">У діалозі друку оберіть «Зберегти як PDF»</span>
  </div>

  <h1>Game Design Document</h1>
  <p class="subtitle">Проєкт / дошка: <strong>${boardName}</strong></p>

  ${kanbanHtml}
  ${othersHtml}
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Будь ласка, дозвольте спливаючі вікна для цього сайту, щоб експортувати PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
}