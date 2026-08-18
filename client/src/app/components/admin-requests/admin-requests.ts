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

  protected approveRequest(requestId: string): void {
    const request = this.requests.find((item) => item.id === requestId);
    if (!request) {
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

    this.requestService.getAdminRequests(currentUser.id).subscribe({
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

  private removeRequest(requestId: string): void {
    this.requests = this.requests.filter((request) => request.id !== requestId);
  }
}
