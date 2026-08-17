import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-groups',
  imports: [MainNavigation, FormsModule],
  templateUrl: './groups.html',
  styleUrl: './groups.css',
})
export class Groups {
  private readonly router = inject(Router);

  protected searchTerm = '';
  protected membershipMessage = '';
  protected requestMessage = '';
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
    // Week 5 will replace this local confirmation with an HTTP request.
    this.requestMessage = `${this.groupRequest.title} was submitted for approval.`;
  }
}
