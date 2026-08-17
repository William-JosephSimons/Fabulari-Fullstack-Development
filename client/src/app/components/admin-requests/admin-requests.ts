import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-admin-requests',
  imports: [SuperAdminNavigation, FormsModule],
  templateUrl: './admin-requests.html',
  styleUrl: './admin-requests.css',
})
export class AdminRequests {
  protected rejectionRequestId: number | null = null;
  protected rejectionReason = '';
  protected decisionMessage = '';
  protected decisionError = '';

  protected requests = [
    {
      id: 201,
      requester: 'Jordan',
      group: 'Book Club',
      type: 'System hard ban',
      reason: 'Serious abuse by Riley'
    },
    {
      id: 202,
      requester: 'Casey',
      group: 'Writers Hub',
      type: 'Group deletion',
      reason: 'The group is no longer active'
    },
    {
      id: 203,
      requester: 'Morgan',
      group: 'Art Space',
      type: 'Group creation',
      reason: 'Create a local art community'
    }
  ];

  protected get rejectionRequest() {
    return this.requests.find((request) => request.id === this.rejectionRequestId);
  }

  protected approveRequest(requestId: number): void {
    const request = this.requests.find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    this.removeRequest(requestId);
    this.closeRejection();
    this.decisionMessage = `${request.type} approved.`;
  }

  protected beginRejection(requestId: number): void {
    this.rejectionRequestId = requestId;
    this.rejectionReason = '';
    this.decisionMessage = '';
    this.decisionError = '';
  }

  protected confirmRejection(): void {
    if (!this.rejectionReason.trim()) {
      this.decisionError = 'A rejection reason is required.';
      return;
    }

    const request = this.rejectionRequest;
    if (request) {
      this.removeRequest(request.id);
      this.decisionMessage = `${request.type} rejected.`;
    }
    this.closeRejection();
  }

  protected closeRejection(): void {
    this.rejectionRequestId = null;
    this.rejectionReason = '';
    this.decisionError = '';
  }

  private removeRequest(requestId: number): void {
    // Week 5 will replace this local removal with a saved request decision.
    this.requests = this.requests.filter((request) => request.id !== requestId);
  }
}
