import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Group } from '../../services/group/group';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-room-management',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './room-management.html',
  styleUrl: './room-management.css',
})
export class RoomManagement implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
  protected readonly currentUserId = this.auth.getCurrentUser()?.id || '';
  protected activeSection = 'rooms';
  protected groupName = 'Group';
  protected usersLoading = true;
  protected usersError = '';
  protected adminMessage = '';
  protected adminChangingId: string | null = null;
  protected members: any[] = [];
  protected bannedUsers: any[] = [];
  protected roomMessage = '';
  protected newRoom = { name: '', description: '' };

  // The room controls use local data until the persistence routes are introduced.
  protected rooms = [
    { id: 'general', name: 'General', description: 'Main discussion' },
    { id: 'reviews', name: 'Reviews', description: 'Book reviews' }
  ];

  ngOnInit(): void {
    this.loadGroupUsers();
  }

  protected get administratorCount(): number {
    return this.members.filter((member) => member.isAdmin).length;
  }

  protected showSection(section: string): void {
    this.activeSection = section;
  }

  protected promoteMember(member: any): void {
    if (!this.groupId || !this.currentUserId) {
      this.usersError = 'A group and current user are required.';
      return;
    }

    this.adminMessage = '';
    this.usersError = '';
    this.adminChangingId = member.id;

    this.groupService
      .promoteMember(this.groupId, {
        actingUserId: this.currentUserId,
        targetUserId: member.id,
      })
      .subscribe({
        next: (response: any) => {
          this.adminChangingId = null;

          if (!response.valid) {
            this.usersError = response.message || 'The member could not be promoted.';
            return;
          }

          member.isAdmin = true;
          this.adminMessage = response.message;
        },
        error: (error) => {
          this.adminChangingId = null;
          this.usersError =
            error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  protected demoteAdmin(member: any): void {
    if (!this.groupId || !this.currentUserId) {
      this.usersError = 'A group and current user are required.';
      return;
    }

    this.adminMessage = '';
    this.usersError = '';
    this.adminChangingId = member.id;

    this.groupService
      .demoteAdmin(this.groupId, member.id, this.currentUserId)
      .subscribe({
        next: (response: any) => {
          this.adminChangingId = null;

          if (!response.valid) {
            this.usersError = response.message || 'The Group Admin could not be demoted.';
            return;
          }

          member.isAdmin = false;
          this.adminMessage = response.message;
        },
        error: (error) => {
          this.adminChangingId = null;
          this.usersError =
            error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  protected createRoom(): void {
    const roomId = this.newRoom.name.trim().toLowerCase().replaceAll(' ', '-');

    this.rooms.push({
      id: roomId,
      name: this.newRoom.name.trim(),
      description: this.newRoom.description.trim()
    });
    this.roomMessage = `${this.newRoom.name.trim()} was added.`;
    this.newRoom = { name: '', description: '' };
  }

  protected deleteRoom(roomId: string): void {
    const room = this.rooms.find((item) => item.id === roomId);
    this.rooms = this.rooms.filter((item) => item.id !== roomId);
    this.roomMessage = `${room?.name ?? 'Room'} was deleted.`;
  }

  private loadGroupUsers(): void {
    if (!this.groupId || !this.currentUserId) {
      this.usersLoading = false;
      this.usersError = 'A group and current user are required.';
      return;
    }

    this.groupService.getGroupUsers(this.groupId, this.currentUserId).subscribe({
      next: (response: any) => {
        this.usersLoading = false;

        if (!response.valid) {
          this.usersError = response.message || 'Unable to load group users.';
          return;
        }

        this.groupName = response.group.title;
        this.members = response.members;
        this.bannedUsers = response.bannedUsers;
      },
      error: (error) => {
        this.usersLoading = false;
        this.usersError =
          error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
