import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Admin } from '../../services/admin/admin';
import { Auth } from '../../services/auth/auth';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-super-admin-dashboard',
  imports: [SuperAdminNavigation, RouterLink],
  templateUrl: './super-admin-dashboard.html',
  styleUrl: './super-admin-dashboard.css',
})
export class SuperAdminDashboard implements OnInit {
  private readonly auth = inject(Auth);
  private readonly adminService = inject(Admin);

  protected readonly userName = this.auth.getCurrentUser()?.firstName || 'User';
  protected isLoading = true;
  protected dashboardError = '';
  protected systemSummary: any[] = [];
  protected pendingItems: any[] = [];

  ngOnInit(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.isLoading = false;
      this.dashboardError = 'You must be logged in to view the system dashboard.';
      return;
    }

    this.adminService.getDashboardSummary(currentUser.id).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (!response.valid) {
          this.dashboardError = response.message || 'Unable to load the system dashboard.';
          return;
        }

        const summary = response.summary;
        this.systemSummary = [
          { label: 'Users', total: summary.userCount },
          { label: 'Groups', total: summary.groupCount },
          { label: 'Pending requests', total: summary.pendingRequestCount },
          { label: 'Permanent bans', total: summary.systemBanCount },
        ];
        this.pendingItems = [
          { label: 'Group creation requests', count: summary.groupCreationRequestCount },
          { label: 'Group deletion requests', count: summary.groupDeletionRequestCount },
          { label: 'System hard-ban requests', count: summary.systemBanRequestCount },
        ];
      },
      error: (error) => {
        this.isLoading = false;
        this.dashboardError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
