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
  private readonly pageSize = 5;
  private appliedActionType = 'all';
  private appliedStartDate = '';
  private appliedEndDate = '';
  private appliedSearch = '';

  protected selectedActionType = 'all';
  protected selectedStartDate = '';
  protected selectedEndDate = '';
  protected searchTerm = '';
  protected isLoading = true;
  protected auditError = '';
  protected auditLogs: any[] = [];
  protected actionTypes: string[] = [];
  protected auditTotal = 0;
  protected auditHasMore = false;

  // Load the first page of audit records and available action types.
  ngOnInit(): void {
    this.applyFilters();
  }

  // Validate the dates and restart the list with the selected filters.
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

    this.appliedActionType = this.selectedActionType;
    this.appliedStartDate = this.selectedStartDate;
    this.appliedEndDate = this.selectedEndDate;
    this.appliedSearch = this.searchTerm.trim();
    this.loadAuditLogs(true);
  }

  // Append the next page of matching audit records.
  protected loadMore(): void {
    this.loadAuditLogs(false);
  }

  // Split a stored camel-case action into readable words.
  protected formatActionType(actionType: string): string {
    // Add spaces before capital letters so camelCase action types are readable.
    const words = actionType.replace(/([A-Z])/g, ' $1');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  // Format an ISO timestamp using the browser's local date and time.
  protected formatDateTime(createdAt: string): string {
    return new Date(createdAt).toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  // Load records, either replacing the list or appending its next page.
  private loadAuditLogs(reset: boolean): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.isLoading = false;
      this.auditError = 'You must be logged in to view audit logs.';
      return;
    }

    this.auditError = '';
    this.isLoading = true;

    if (reset) {
      this.auditLogs = [];
      this.auditTotal = 0;
      this.auditHasMore = false;
    }

    this.auditService
      .getAuditLogs(
        this.appliedActionType,
        this.appliedStartDate,
        this.appliedEndDate,
        this.appliedSearch,
        this.auditLogs.length,
        this.pageSize,
      )
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;

          if (!response.valid) {
            this.auditError = response.message || 'Unable to load audit logs.';
            return;
          }

          this.auditLogs = reset ? response.auditLogs : [...this.auditLogs, ...response.auditLogs];
          this.actionTypes = response.actionTypes;
          this.auditTotal = response.total;
          this.auditHasMore = response.hasMore;
        },
        error: (error) => {
          this.isLoading = false;
          this.auditError = error.error?.message || 'Unable to contact the server.';
        },
      });
  }
}
