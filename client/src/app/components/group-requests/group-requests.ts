import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Request } from '../../services/request/request';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-group-requests',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './group-requests.html',
  styleUrl: './group-requests.css',
})
export class GroupRequests implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);
  private readonly requestService = inject(Request);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
  protected readonly currentUserId = this.auth.getCurrentUser()?.id || '';
  protected groupName = 'Group';
  protected rejectionRequestId: string | null = null;
  protected rejectionReason = '';
  protected decisionMessage = '';
  protected decisionError = '';
  protected requestError = '';
  protected requestBeingDecided: string | null = null;
  protected isLoading = true;
  protected requests: any[] = [];

  // Read the group ID and load its pending request inbox.
  ngOnInit(): void {
    this.loadRequests();
  }

  // Return the group request currently selected for rejection.
  protected get rejectionRequest() {
    return this.requests.find((request) => request.id === this.rejectionRequestId);
  }

  // Convert each group request type into a readable label.
  protected getRequestType(request: any): string {
    switch (request.type) {
      case 'roomProposal':
        return 'Room proposal';
      case 'groupBanReport':
        return 'Group-ban report';
      default:
        return 'Membership';
    }
  }

  // Approve one request after locating it in the current inbox.
  protected approveRequest(requestId: string): void {
    const request = this.requests.find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    this.sendDecision(request, 'approved');
  }

  // Open the rejection form for one request.
  protected beginRejection(requestId: string): void {
    this.rejectionRequestId = requestId;
    this.rejectionReason = '';
    this.decisionMessage = '';
    this.requestError = '';
    this.decisionError = '';
  }

  // Validate the rejection reason and send the decision.
  protected confirmRejection(): void {
    if (!this.rejectionReason.trim()) {
      this.decisionError = 'A rejection reason is required.';
      return;
    }

    const request = this.rejectionRequest;
    if (request) {
      this.sendDecision(request, 'rejected', this.rejectionReason.trim());
    }
  }

  // Close and clear the rejection form.
  protected closeRejection(): void {
    this.rejectionRequestId = null;
    this.rejectionReason = '';
    this.decisionError = '';
  }

  // Refresh pending requests for the selected group.
  private loadRequests(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!this.groupId) {
      this.isLoading = false;
      this.requestError = 'A group must be selected.';
      return;
    }

    if (!currentUser) {
      this.isLoading = false;
      this.requestError = 'You must be logged in to view requests.';
      return;
    }

    this.requestService.getGroupRequests(this.groupId).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (!response.valid) {
          this.requestError = response.message || 'Unable to load requests.';
          return;
        }

        this.groupName = response.group.title;
        this.requests = response.requests;
      },
      error: (error) => {
        this.isLoading = false;
        this.requestError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  // Send an approval or rejection and update the inbox afterward.
  private sendDecision(request: any, decision: string, rejectionReason = ''): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.requestError = 'You must be logged in to decide requests.';
      return;
    }

    this.decisionMessage = '';
    this.requestError = '';
    this.decisionError = '';
    this.requestBeingDecided = request.id;

    this.requestService
      .decideRequest(request.id, {
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

          this.removeRequest(request.id);
          this.closeRejection();
          this.decisionMessage = response.message;
        },
        error: (error) => {
          this.requestBeingDecided = null;
          this.requestError = error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  // Remove a decided request from the local pending list.
  private removeRequest(requestId: string): void {
    this.requests = this.requests.filter((request) => request.id !== requestId);
  }
}
