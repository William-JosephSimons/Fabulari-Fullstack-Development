import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Group } from '../../services/group/group';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-group-detail',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.css',
})
export class GroupDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
  protected readonly currentUserId = this.auth.getCurrentUser()?.id || '';
  protected groupName = 'Group';
  protected groupColour = '#D8DBE6';
  protected isGroupAdmin = false;
  protected isLoading = true;
  protected roomError = '';
  protected proposalMessage = '';
  protected proposalError = '';
  protected proposalSaving = false;
  protected rooms: any[] = [];
  protected proposalDetails = {
    name: '',
    description: '',
    reason: '',
  };

  ngOnInit(): void {
    this.loadRooms();
  }

  protected submitRoomProposal(): void {
    if (!this.groupId || !this.currentUserId) {
      this.proposalError = 'A group and current user are required.';
      return;
    }

    this.proposalMessage = '';
    this.proposalError = '';
    this.proposalSaving = true;

    this.groupService
      .submitRoomProposal(this.groupId, {
        requesterId: this.currentUserId,
        name: this.proposalDetails.name,
        description: this.proposalDetails.description,
        reason: this.proposalDetails.reason,
      })
      .subscribe({
        next: (response: any) => {
          this.proposalSaving = false;

          if (!response.valid) {
            this.proposalError = response.message || 'The room proposal could not be submitted.';
            return;
          }

          this.proposalMessage = response.message;
          this.proposalDetails = { name: '', description: '', reason: '' };
        },
        error: (error) => {
          this.proposalSaving = false;
          this.proposalError = error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  private loadRooms(): void {
    if (!this.groupId || !this.currentUserId) {
      this.isLoading = false;
      this.roomError = 'A group and current user are required.';
      return;
    }

    this.groupService.getGroupRooms(this.groupId, this.currentUserId).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (!response.valid) {
          this.roomError = response.message || 'Unable to load rooms.';
          return;
        }

        this.groupName = response.group.title;
        this.groupColour = response.group.colour;
        this.isGroupAdmin = response.group.isAdmin;
        this.rooms = response.rooms;
      },
      error: (error) => {
        this.isLoading = false;
        this.roomError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
