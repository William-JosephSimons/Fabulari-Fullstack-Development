import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-group-requests',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './group-requests.html',
  styleUrl: './group-requests.css',
})
export class GroupRequests {
  private readonly route = inject(ActivatedRoute);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
  protected readonly groupName = 'Book Club';
  protected rejectionRequestId: number | null = null;
  protected rejectionReason = '';
  protected decisionMessage = '';
  protected decisionError = '';

  protected requests = [
    {
      id: 101,
      requester: 'Avery',
      type: 'Membership',
      reason: 'Age 22 - eligible',
      decidable: true
    },
    {
      id: 102,
      requester: 'Billy',
      type: 'Room proposal',
      reason: 'Events room',
      decidable: true
    },
    {
      id: 103,
      requester: 'Casey',
      type: 'Group-ban report',
      reason: 'Report concerning Sam',
      decidable: true
    },
    {
      id: 104,
      requester: 'Jordan',
      type: 'System hard ban',
      reason: 'Pending Super Admin decision',
      decidable: false
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
