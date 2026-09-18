import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Group } from '../../services/group/group';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-group-admin-dashboard',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './group-admin-dashboard.html',
  styleUrl: './group-admin-dashboard.css',
})
export class GroupAdminDashboard implements OnInit {
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);

  protected readonly userName = this.auth.getCurrentUser()?.firstName || 'User';
  protected selectedGroupId: string | null = null;
  protected isLoading = true;
  protected groupsError = '';
  protected administeredGroups: any[] = [];

  // Load the current user and the groups they administer.
  ngOnInit(): void {
    this.loadGroups();
  }

  protected get selectedGroup() {
    return this.administeredGroups.find((group) => group.id === this.selectedGroupId);
  }

  protected get pendingItems() {
    const summary = this.selectedGroup?.adminSummary;

    return [
      { label: 'Membership requests', count: summary?.membershipRequestCount || 0 },
      { label: 'Room proposals', count: summary?.roomProposalCount || 0 },
      { label: 'Group-ban reports', count: summary?.groupBanReportCount || 0 },
    ];
  }

  // Build the dashboard rows from groups with admin access.
  private loadGroups(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.isLoading = false;
      this.groupsError = 'You must be logged in to view administered groups.';
      return;
    }

    this.groupService.getGroups().subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (!response.valid) {
          this.groupsError = response.message || 'Unable to load administered groups.';
          return;
        }

        this.administeredGroups = response.groups.filter((group: any) => group.isAdmin);
        this.selectedGroupId = this.administeredGroups[0]?.id || null;
      },
      error: (error) => {
        this.isLoading = false;
        this.groupsError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
