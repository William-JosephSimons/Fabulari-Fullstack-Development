import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-audit-logs',
  imports: [SuperAdminNavigation, FormsModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css',
})
export class AuditLogs {
  protected selectedActionType = 'all';
  protected selectedStartDate = '';
  protected selectedEndDate = '';
  protected activeActionType = 'all';
  protected activeStartDate = '';
  protected activeEndDate = '';

  // ISO dates make the local date-range comparisons straightforward.
  protected readonly auditLogs = [
    {
      date: '2026-08-02',
      dateTime: '2 Aug 2026, 10:42',
      actor: 'alex',
      actionType: 'groupApproved',
      action: 'Group approved',
      details: 'Approved Photography Club'
    },
    {
      date: '2026-08-02',
      dateTime: '2 Aug 2026, 09:18',
      actor: 'jordan',
      actionType: 'roomCreated',
      action: 'Room created',
      details: 'Created Reviews in Book Club'
    },
    {
      date: '2026-08-01',
      dateTime: '1 Aug 2026, 16:03',
      actor: 'jordan',
      actionType: 'groupChanged',
      action: 'Group changed',
      details: 'Minimum age raised to 16'
    },
    {
      date: '2026-08-01',
      dateTime: '1 Aug 2026, 11:30',
      actor: 'alex',
      actionType: 'requestRejected',
      action: 'Request rejected',
      details: 'Group deletion rejected'
    }
  ];

  protected get filteredAuditLogs() {
    return this.auditLogs.filter((log) => {
      const matchesType =
        this.activeActionType === 'all' || log.actionType === this.activeActionType;
      const afterStart = !this.activeStartDate || log.date >= this.activeStartDate;
      const beforeEnd = !this.activeEndDate || log.date <= this.activeEndDate;

      return matchesType && afterStart && beforeEnd;
    });
  }

  protected applyFilters(): void {
    this.activeActionType = this.selectedActionType;
    this.activeStartDate = this.selectedStartDate;
    this.activeEndDate = this.selectedEndDate;
  }
}
