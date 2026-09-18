import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Group } from '../../services/group/group';
import { Request } from '../../services/request/request';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-user-dashboard',
  imports: [MainNavigation, RouterLink],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit {
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);
  private readonly requestService = inject(Request);

  protected readonly userName = this.auth.getCurrentUser()?.firstName || 'User';
  protected groupsLoading = true;
  protected requestsLoading = true;
  protected groupsError = '';
  protected requestsError = '';
  protected groups: any[] = [];
  protected recentRequests: any[] = [];

  // Load the current user, memberships and recent request history.
  ngOnInit(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.groupsLoading = false;
      this.requestsLoading = false;
      this.groupsError = 'You must be logged in to view your groups.';
      this.requestsError = 'You must be logged in to view your requests.';
      return;
    }

    this.loadGroups();
    this.loadRecentRequests();
  }

  // Turn each request type into a short dashboard description.
  protected getRequestDescription(request: any): string {
    let requestType = 'membership';

    switch (request.type) {
      case 'groupCreation':
        requestType = 'group creation';
        break;
      case 'roomProposal':
        requestType = 'room proposal';
        break;
      case 'groupBanReport':
        requestType = 'group-ban report';
        break;
      case 'groupDeletion':
        requestType = 'group deletion';
        break;
      case 'systemBan':
        requestType = 'system hard ban';
        break;
    }

    return `${request.groupName || 'Group'} ${requestType}`;
  }

  // Capitalise the stored request status for display.
  protected formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  // Load only the groups where the current user is a member.
  private loadGroups(): void {
    this.groupService.getGroups().subscribe({
      next: (response: any) => {
        this.groupsLoading = false;

        if (!response.valid) {
          this.groupsError = response.message || 'Unable to load your groups.';
          return;
        }

        this.groups = response.groups.filter((group: any) => group.status === 'member');
      },
      error: (error) => {
        this.groupsLoading = false;
        this.groupsError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  // Load a small newest-first request summary for the dashboard.
  private loadRecentRequests(): void {
    this.requestService.getMyRequests().subscribe({
      next: (response: any) => {
        this.requestsLoading = false;

        if (!response.valid) {
          this.requestsError = response.message || 'Unable to load your requests.';
          return;
        }

        this.recentRequests = response.requests.slice(0, 3);
      },
      error: (error) => {
        this.requestsLoading = false;
        this.requestsError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
