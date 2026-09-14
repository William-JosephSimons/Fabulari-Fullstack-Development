import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth/auth';
import { Request } from '../../services/request/request';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-admin-requests',
  imports: [SuperAdminNavigation, FormsModule],
  templateUrl: './admin-requests.html',
  styleUrl: './admin-requests.css',
})
export class AdminRequests implements OnInit {
  private readonly auth = inject(Auth);
  private readonly requestService = inject(Request);

  protected rejectionRequestId: string | null = null;
  protected rejectionReason = '';
  protected decisionMessage = '';
  protected requestError = '';
  protected rejectionError = '';
  protected requestBeingDecided: string | null = null;
  protected isLoading = true;
  protected requests: any[] = [];

  ngOnInit(): void {
    this.loadRequests();
  }

  protected get rejectionRequest() {
    return this.requests.find((request) => request.id === this.rejectionRequestId);
  }

  protected getRequestType(request: any): string {
    switch (request.type) {
      case 'groupDeletion':
        return 'Group deletion';
      case 'systemBan':
        return 'System hard ban';
      default:
        return 'Group creation';
    }
  }

  protected getRequestTarget(request: any): string {
    switch (request.type) {
      case 'groupDeletion':
        return request.groupName || 'Deleted group';
      case 'systemBan':
        return request.targetName || 'Deleted user';
      default:
        return request.proposedGroup?.title || 'Unnamed group';
    }
  }

  protected approveRequest(requestId: string): void {
    const request = this.requests.find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    if (
      request.type === 'groupDeletion' &&
      !confirm(`Permanently delete ${this.getRequestTarget(request)}?`)
    ) {
      return;
    }

    if (
      request.type === 'systemBan' &&
      !confirm(`Permanently delete ${this.getRequestTarget(request)} and ban their email?`)
    ) {
      return;
    }

    this.sendDecision(request, 'approved');
  }

  protected beginRejection(requestId: string): void {
    this.rejectionRequestId = requestId;
    this.rejectionReason = '';
    this.decisionMessage = '';
    this.requestError = '';
    this.rejectionError = '';
  }

  protected confirmRejection(): void {
    if (!this.rejectionReason.trim()) {
      this.rejectionError = 'A rejection reason is required.';
      return;
    }

    const request = this.rejectionRequest;
    if (request) {
      this.sendDecision(request, 'rejected', this.rejectionReason.trim());
    }
  }

  protected closeRejection(): void {
    this.rejectionRequestId = null;
    this.rejectionReason = '';
    this.rejectionError = '';
  }

  private loadRequests(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.isLoading = false;
      this.requestError = 'You must be logged in to view requests.';
      return;
    }

    this.isLoading = true;

    this.requestService.getAdminRequests().subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (!response.valid) {
          this.requestError = response.message || 'Unable to load requests.';
          return;
        }

        this.requests = response.requests;
      },
      error: (error) => {
        this.isLoading = false;
        this.requestError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  private sendDecision(request: any, decision: string, rejectionReason = ''): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.requestError = 'You must be logged in to decide requests.';
      return;
    }

    this.decisionMessage = '';
    this.requestError = '';
    this.rejectionError = '';
    this.requestBeingDecided = request.id;

    this.requestService
      .decideRequest(request.id, {
        deciderId: currentUser.id,
        decision,
        rejectionReason,
      })
      .subscribe({
        next: (response: any) => {
          this.requestBeingDecided = null;

          if (!response.valid) {
            this.requestError = response.message || 'The request decision was unsuccessful.';
            return;
          }

          this.closeRejection();
          this.decisionMessage = response.message;
          // A destructive decision may remove other requests that are no longer valid.
          this.loadRequests();
        },
        error: (error) => {
          this.requestBeingDecided = null;
          this.requestError = error.error?.message || 'Unable to contact the server.';
        },
      });
  }
}
