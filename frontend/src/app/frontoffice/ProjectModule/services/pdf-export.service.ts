import { Injectable } from '@angular/core';
import { Project } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class PdfExportService {

  exportTasksPdf(project: Project): void {
    const tasks = project.tasks || [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const priorityColor = (p: string) => {
      switch (p?.toUpperCase()) {
        case 'HIGH':   return { bg: '#fee2e2', text: '#991b1b', label: '🔴 HIGH' };
        case 'MEDIUM': return { bg: '#fef3c7', text: '#92400e', label: '🟡 MEDIUM' };
        case 'LOW':    return { bg: '#d1fae5', text: '#065f46', label: '🟢 LOW' };
        default:       return { bg: '#f3f4f6', text: '#374151', label: p };
      }
    };

    const taskRows = tasks.map((task, i) => {
      const pr = priorityColor(task.priority as string);
      return `
        <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td class="td-num">${i + 1}</td>
          <td class="td-name"><strong>${task.taskName}</strong></td>
          <td class="td-desc">${task.description || '—'}</td>
          <td class="td-priority">
            <span class="badge" style="background:${pr.bg};color:${pr.text}">${pr.label}</span>
          </td>
          <td class="td-date">${task.startDate ? new Date(task.startDate).toLocaleDateString('fr-FR') : '—'}</td>
          <td class="td-date">${task.endDate   ? new Date(task.endDate).toLocaleDateString('fr-FR')   : '—'}</td>
        </tr>`;
    }).join('');

    const statsHigh   = tasks.filter(t => (t.priority as string)?.toUpperCase() === 'HIGH').length;
    const statsMedium = tasks.filter(t => (t.priority as string)?.toUpperCase() === 'MEDIUM').length;
    const statsLow    = tasks.filter(t => (t.priority as string)?.toUpperCase() === 'LOW').length;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Tasks — ${project.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1c1e21; background: #fff; }

    /* HEADER */
    .header {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: white;
      padding: 2rem 2.5rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-left h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem; }
    .header-left p  { font-size: 0.9rem; opacity: 0.85; }
    .header-right   { text-align: right; font-size: 0.85rem; opacity: 0.9; line-height: 1.7; }

    /* PROJECT INFO */
    .project-info {
      background: #f8f5ff;
      border-left: 5px solid #a855f7;
      margin: 1.5rem 2.5rem;
      padding: 1rem 1.5rem;
      border-radius: 0 8px 8px 0;
      display: flex;
      gap: 3rem;
      flex-wrap: wrap;
    }
    .info-item label { font-size: 0.75rem; color: #7c3aed; font-weight: 700; text-transform: uppercase; }
    .info-item span  { display: block; font-size: 0.95rem; font-weight: 600; color: #2c3e50; margin-top: 2px; }

    /* STATS */
    .stats {
      display: flex;
      gap: 1rem;
      margin: 0 2.5rem 1.5rem;
    }
    .stat-card {
      flex: 1;
      padding: 0.9rem 1rem;
      border-radius: 10px;
      text-align: center;
    }
    .stat-card .num  { font-size: 1.8rem; font-weight: 800; }
    .stat-card .lbl  { font-size: 0.75rem; font-weight: 600; margin-top: 2px; }
    .stat-total  { background: #ede9fe; color: #7c3aed; }
    .stat-high   { background: #fee2e2; color: #991b1b; }
    .stat-medium { background: #fef3c7; color: #92400e; }
    .stat-low    { background: #d1fae5; color: #065f46; }

    /* SECTION TITLE */
    .section-title {
      font-size: 1rem;
      font-weight: 700;
      color: #7c3aed;
      margin: 0 2.5rem 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e9d5ff;
    }

    /* TABLE */
    .table-wrap { margin: 0 2.5rem 2rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    thead tr { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; }
    thead th { padding: 0.85rem 1rem; text-align: left; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .row-even { background: #fafafa; }
    .row-odd  { background: #ffffff; }
    td { padding: 0.85rem 1rem; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
    .td-num      { width: 40px;  color: #a855f7; font-weight: 700; }
    .td-name     { width: 18%; }
    .td-desc     { color: #495057; line-height: 1.5; }
    .td-priority { width: 110px; }
    .td-date     { width: 90px;  color: #6c757d; font-size: 0.82rem; white-space: nowrap; }
    .badge { display: inline-block; padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }

    /* FOOTER */
    .footer {
      margin-top: 2rem;
      padding: 1rem 2.5rem;
      border-top: 2px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: #9ca3af;
    }

    /* PRINT */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }

    /* BUTTON */
    .btn-bar { text-align: center; padding: 1.5rem; }
    .btn-print {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: white; border: none; padding: 0.85rem 2.5rem;
      border-radius: 50px; font-size: 1rem; font-weight: 700;
      cursor: pointer; box-shadow: 0 4px 15px rgba(124,58,237,0.4);
      margin-right: 1rem;
    }
    .btn-close {
      background: #f1f3f5; color: #495057; border: 1.5px solid #e0e0e0;
      padding: 0.85rem 2rem; border-radius: 50px; font-size: 1rem;
      font-weight: 600; cursor: pointer;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <h1>📋 Project Tasks Report</h1>
      <p>Prolance — Freelance Management Platform</p>
    </div>
    <div class="header-right">
      <div>Generated on : ${new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</div>
      <div>Total tasks : <strong>${tasks.length}</strong></div>
    </div>
  </div>

  <!-- PROJECT INFO -->
  <div class="project-info">
    <div class="info-item">
      <label>Project</label>
      <span>${project.title}</span>
    </div>
    <div class="info-item">
      <label>Category</label>
      <span>${project.category}</span>
    </div>
    <div class="info-item">
      <label>Budget</label>
      <span>${project.budget?.toLocaleString('fr-FR')} TND</span>
    </div>
    <div class="info-item">
      <label>Start Date</label>
      <span>${project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : '—'}</span>
    </div>
    <div class="info-item">
      <label>End Date</label>
      <span>${project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : '—'}</span>
    </div>
    <div class="info-item">
      <label>Client</label>
      <span>${project.client?.name || ''} ${project.client?.lastName || ''}</span>
    </div>
  </div>

  <!-- STATS -->
  <div class="stats">
    <div class="stat-card stat-total">
      <div class="num">${tasks.length}</div>
      <div class="lbl">Total Tasks</div>
    </div>
    <div class="stat-card stat-high">
      <div class="num">${statsHigh}</div>
      <div class="lbl">🔴 High</div>
    </div>
    <div class="stat-card stat-medium">
      <div class="num">${statsMedium}</div>
      <div class="lbl">🟡 Medium</div>
    </div>
    <div class="stat-card stat-low">
      <div class="num">${statsLow}</div>
      <div class="lbl">🟢 Low</div>
    </div>
  </div>

  <!-- TASKS TABLE -->
  <div class="section-title">📌 All Tasks</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Task Name</th>
          <th>Description</th>
          <th>Priority</th>
          <th>Start</th>
          <th>End</th>
        </tr>
      </thead>
      <tbody>
        ${taskRows || '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#999;">No tasks found</td></tr>'}
      </tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Prolance Platform — Confidential</span>
    <span>${project.title} — Tasks Report</span>
  </div>

  <!-- PRINT BUTTON -->
  <div class="btn-bar no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>

</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }
}