import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Group } from '../../services/group/group';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-groups',
  imports: [MainNavigation, FormsModule],
  templateUrl: './groups.html',
  styleUrl: './groups.css',
})
export class Groups implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);

  protected searchTerm = '';
  protected membershipMessage = '';
  protected membershipError = '';
  protected membershipReason = '';
  protected membershipRequestGroupId: string | null = null;
  protected membershipSubmitting = false;
  protected groupsLoading = true;
  protected groupsError = '';
  protected requestMessage = '';
  protected requestError = '';
  protected requestSubmitting = false;
  protected groupRequest = {
    title: '',
    description: '',
    minimumAge: 16,
    colour: '#4FA3F5',
    reason: ''
  };

  protected groups: any[] = [];

  ngOnInit(): void {
    this.loadGroups();
  }

  protected get filteredGroups() {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.groups;
    }

    return this.groups.filter((group) =>
      `${group.title} ${group.description}`.toLowerCase().includes(search)
    );
  }

  protected openGroup(groupId: string): void {
    // The selected group ID becomes part of the URL for the detail page to read.
    this.router.navigate(['/groups', groupId]);
  }

  protected beginMembershipRequest(groupId: string): void {
    this.membershipRequestGroupId = groupId;
    this.membershipReason = '';
    this.membershipMessage = '';
    this.membershipError = '';
  }

  protected cancelMembershipRequest(): void {
    this.membershipRequestGroupId = null;
    this.membershipReason = '';
    this.membershipError = '';
  }

  protected submitMembershipRequest(groupId: string): void {
    const reason = this.membershipReason.trim();

    if (!reason) {
      this.membershipError = 'A reason is required.';
      return;
    }

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.membershipError = 'You must be logged in to request membership.';
      return;
    }

    this.membershipSubmitting = true;
    this.membershipError = '';

    this.groupService
      .submitMembershipRequest(groupId, {
        reason,
      })
      .subscribe({
        next: (response: any) => {
          this.membershipSubmitting = false;

          if (!response.valid) {
            this.membershipError = response.message || 'The membership request was unsuccessful.';
            return;
          }

          const group = this.groups.find((item) => item.id === groupId);
          if (group) {
            group.status = 'pending';
          }

          this.membershipMessage = response.message;
          this.cancelMembershipRequest();
        },
        error: (error) => {
          this.membershipSubmitting = false;
          this.membershipError =
            error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  protected submitGroupRequest(): void {
    this.requestMessage = '';
    this.requestError = '';

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.requestError = 'You must be logged in to request a group.';
      return;
    }

    this.requestSubmitting = true;

    this.groupService.submitGroupRequest(this.groupRequest).subscribe({
      next: (response: any) => {
        this.requestSubmitting = false;

        if (!response.valid) {
          this.requestError = response.message || 'The group request was unsuccessful.';
          return;
        }

        this.requestMessage = response.message;
        this.groupRequest = {
          title: '',
          description: '',
          minimumAge: 16,
          colour: '#4FA3F5',
          reason: '',
        };
      },
      error: (error) => {
        this.requestSubmitting = false;
        this.requestError =
          error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  private loadGroups(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.groupsLoading = false;
      this.groupsError = 'You must be logged in to browse groups.';
      return;
    }

    this.groupService.getGroups().subscribe({
      next: (response: any) => {
        this.groupsLoading = false;

        if (!response.valid) {
          this.groupsError = response.message || 'Unable to load groups.';
          return;
        }

        this.groups = response.groups;
      },
      error: (error) => {
        this.groupsLoading = false;
        this.groupsError =
          error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
