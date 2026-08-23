import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Audit } from '../../services/audit/audit';
import { Auth } from '../../services/auth/auth';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-audit-logs',
  imports: [SuperAdminNavigation, FormsModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css',
})
export class AuditLogs implements OnInit {
  private readonly auditService = inject(Audit);
  private readonly auth = inject(Auth);

  protected selectedActionType = 'all';
  protected selectedStartDate = '';
  protected selectedEndDate = '';
  protected isLoading = true;
  protected auditError = '';
  protected auditLogs: any[] = [];
  protected actionTypes: string[] = [];

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  protected applyFilters(): void {
    this.auditError = '';

    if (
      this.selectedStartDate &&
      this.selectedEndDate &&
      this.selectedStartDate > this.selectedEndDate
    ) {
      this.auditError = 'The start date cannot be after the end date.';
      return;
    }

    this.loadAuditLogs();
  }

  protected formatActionType(actionType: string): string {
    // Add spaces before capital letters so camelCase action types are readable.
    const words = actionType.replace(/([A-Z])/g, ' $1');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  protected formatDateTime(createdAt: string): string {
    return new Date(createdAt).toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  private loadAuditLogs(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.isLoading = false;
      this.auditError = 'You must be logged in to view audit logs.';
      return;
    }

    this.auditError = '';
    this.isLoading = true;

    this.auditService
      .getAuditLogs(
        currentUser.id,
        this.selectedActionType,
        this.selectedStartDate,
        this.selectedEndDate
      )
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;

          if (!response.valid) {
            this.auditError = response.message || 'Unable to load audit logs.';
            return;
          }

          this.auditLogs = response.auditLogs;
          this.actionTypes = response.actionTypes;
        },
        error: (error) => {
          this.isLoading = false;
          this.auditError = error.error?.message || 'Unable to contact the server.';
        },
      });
  }
}
