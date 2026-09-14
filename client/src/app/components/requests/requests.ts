import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth/auth';
import { Request } from '../../services/request/request';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-requests',
  imports: [MainNavigation, FormsModule],
  templateUrl: './requests.html',
  styleUrl: './requests.css',
})
export class Requests implements OnInit {
  private readonly auth = inject(Auth);
  private readonly requestService = inject(Request);

  protected selectedPersonalRequestId: string | null = null;
  protected isLoading = true;
  protected requestError = '';
  protected personalRequests: any[] = [];

  ngOnInit(): void {
    this.loadRequests();
  }

  protected get selectedPersonalRequest() {
    return this.personalRequests.find((request) => request.id === this.selectedPersonalRequestId);
  }

  protected getRequestType(type: string): string {
    switch (type) {
      case 'groupCreation':
        return 'Group creation';
      case 'roomProposal':
        return 'Room proposal';
      case 'groupBanReport':
        return 'Group-ban report';
      case 'groupDeletion':
        return 'Group deletion';
      case 'systemBan':
        return 'System hard ban';
      default:
        return 'Membership';
    }
  }

  protected getRequestSummary(request: any): string {
    // Each request type stores its main subject in a different field.
    switch (request.type) {
      case 'groupCreation':
        return 'Create group';
      case 'roomProposal':
        return request.proposedRoom?.name || 'Unnamed room';
      case 'groupBanReport':
      case 'systemBan':
        return request.targetName || 'Deleted user';
      case 'groupDeletion':
        return 'Delete group';
      default:
        return 'Join group';
    }
  }

  protected formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private loadRequests(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.isLoading = false;
      this.requestError = 'You must be logged in to view requests.';
      return;
    }

    this.requestService.getMyRequests().subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (!response.valid) {
          this.requestError = response.message || 'Unable to load requests.';
          return;
        }

        this.personalRequests = response.requests;
        this.selectedPersonalRequestId = this.personalRequests[0]?.id || null;
      },
      error: (error) => {
        this.isLoading = false;
        this.requestError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
