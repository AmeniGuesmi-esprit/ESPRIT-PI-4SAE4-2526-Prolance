import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Project } from '../../models/project.model';
import { PdfExportService } from '../../services/pdf-export.service';

@Component({
  selector: 'app-project-details',
  templateUrl: './projectDetails.component.html',
  styleUrls: ['./project-details.component.scss']
})
export class ProjectDetailsComponent {
  @Input() project?: Project;
  @Output() close = new EventEmitter<void>();

  isExporting = false;

  constructor(private pdfExportService: PdfExportService) {}

  closeModal(): void {
    this.close.emit();
  }

  countByPriority(priority: string): number {
    return (this.project?.tasks || []).filter(
      t => (t.priority as string)?.toUpperCase() === priority
    ).length;
  }

  exportPdf(): void {
    if (!this.project) return;
    this.isExporting = true;
    setTimeout(() => {
      this.pdfExportService.exportTasksPdf(this.project!);
      this.isExporting = false;
    }, 300);
  }
}