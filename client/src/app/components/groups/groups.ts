import { Component, inject } from '@angular/core';
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
export class Groups {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);

  protected searchTerm = '';
  protected membershipMessage = '';
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

  // These groups demonstrate each membership state until the HTTP service is added.
  protected readonly groups = [
    {
      id: 'book-club',
      name: 'Book Club',
      description: 'Read and discuss great books.',
      minimumAge: 16,
      status: 'member'
    },
    {
      id: 'photography-club',
      name: 'Photography Club',
      description: 'Share photos and local photo walks.',
      minimumAge: 16,
      status: 'available'
    },
    {
      id: 'music-makers',
      name: 'Music Makers',
      description: 'Share songs and discuss local music.',
      minimumAge: 18,
      status: 'pending'
    },
    {
      id: 'game-makers',
      name: 'Game Makers',
      description: 'Design and build games together.',
      minimumAge: 21,
      status: 'underAge'
    },
    {
      id: 'competitive-chess',
      name: 'Competitive Chess',
      description: 'Tournaments and match discussion.',
      minimumAge: 18,
      status: 'banned'
    }
  ];

  protected get filteredGroups() {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.groups;
    }

    return this.groups.filter((group) =>
      `${group.name} ${group.description}`.toLowerCase().includes(search)
    );
  }

  protected openGroup(groupId: string): void {
    // The selected group ID becomes part of the URL for the detail page to read.
    this.router.navigate(['/groups', groupId]);
  }

  protected requestMembership(groupName: string): void {
    this.membershipMessage = `Membership request sent to ${groupName}.`;
  }

  protected submitGroupRequest(): void {
    this.requestMessage = '';
    this.requestError = '';

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.requestError = 'You must be logged in to request a group.';
      return;
    }

    const requestDetails = {
      ...this.groupRequest,
      requesterId: currentUser.id,
    };

    this.requestSubmitting = true;

    this.groupService.submitGroupRequest(requestDetails).subscribe({
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
}
