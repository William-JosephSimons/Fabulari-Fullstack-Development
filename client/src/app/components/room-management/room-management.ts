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
  protected settingsMessage = '';
  protected settingsError = '';
  protected settingsSaving = false;
  protected groupDeletionReason = '';
  protected groupDeletionMessage = '';
  protected groupDeletionError = '';
  protected groupDeletionSaving = false;
  protected groupSettings = {
    title: '',
    description: '',
    minimumAge: 0,
    colour: '#000000',
  };
  protected adminMessage = '';
  protected adminChangingId: string | null = null;
  protected banTargetId: string | null = null;
  protected banReason = '';
  protected banReportMessage = '';
  protected banReportError = '';
  protected banReportSaving = false;
  protected systemBanTargetId: string | null = null;
  protected systemBanReason = '';
  protected systemBanMessage = '';
  protected systemBanError = '';
  protected systemBanSaving = false;
  protected members: any[] = [];
  protected bannedUsers: any[] = [];
  protected roomsLoading = true;
  protected canManageRooms = false;
  protected roomMessage = '';
  protected roomError = '';
  protected roomSaving = false;
  protected editingRoomId: string | null = null;
  protected deletingRoomId: string | null = null;
  protected roomDetails = { name: '', description: '' };
  protected rooms: any[] = [];

  // Read the group ID and load its management data.
  ngOnInit(): void {
    this.loadGroupUsers();
    this.loadRooms();
  }

  protected get administratorCount(): number {
    return this.members.filter((member) => member.isAdmin).length;
  }

  protected get banTarget() {
    return this.members.find((member) => member.id === this.banTargetId);
  }

  protected get systemBanTarget() {
    return this.members.find((member) => member.id === this.systemBanTargetId);
  }

  // Switch between group settings, users, rooms and moderation sections.
  protected showSection(section: string): void {
    this.activeSection = section;
  }

  // Validate and save direct changes to the selected group.
  protected saveGroupSettings(): void {
    if (!this.groupId || !this.currentUserId) {
      this.settingsError = 'A group and current user are required.';
      return;
    }

    this.settingsMessage = '';
    this.settingsError = '';
    this.settingsSaving = true;

    this.groupService
      .updateGroupSettings(this.groupId, {
        title: this.groupSettings.title,
        description: this.groupSettings.description,
        minimumAge: this.groupSettings.minimumAge,
        colour: this.groupSettings.colour,
      })
      .subscribe({
        next: (response: any) => {
          this.settingsSaving = false;

          if (!response.valid) {
            this.settingsError = response.message || 'The group settings could not be saved.';
            return;
          }

          this.groupName = response.group.title;
          this.groupSettings.title = response.group.title;
          this.groupSettings.description = response.group.description;
          this.groupSettings.minimumAge = response.group.minimumAge;
          this.groupSettings.colour = response.group.colour;
          // Match the Members tab to any removals caused by the new minimum age.
          this.members = this.members.filter((member) => {
            return member.age >= response.group.minimumAge;
          });

          this.settingsMessage = response.message;
          if (response.removedMemberCount > 0) {
            const memberWord =
              response.removedMemberCount === 1 ? 'member' : 'members';
            this.settingsMessage += ` ${response.removedMemberCount} under-age ${memberWord} removed.`;
          }
        },
        error: (error) => {
          this.settingsSaving = false;
          this.settingsError =
            error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  // Submit the entered reason for Super Admin deletion approval.
  protected submitGroupDeletionRequest(): void {
    if (!this.groupId || !this.currentUserId) {
      this.groupDeletionError = 'A group and current user are required.';
      return;
    }

    if (!this.groupDeletionReason.trim()) {
      this.groupDeletionError = 'A deletion reason is required.';
      return;
    }

    this.groupDeletionMessage = '';
    this.groupDeletionError = '';
    this.groupDeletionSaving = true;

    this.groupService
      .submitGroupDeletionRequest(this.groupId, {
        reason: this.groupDeletionReason,
      })
      .subscribe({
        next: (response: any) => {
          this.groupDeletionSaving = false;

          if (!response.valid) {
            this.groupDeletionError =
              response.message || 'The deletion request could not be submitted.';
            return;
          }

          this.groupDeletionReason = '';
          this.groupDeletionMessage = response.message;
        },
        error: (error) => {
          this.groupDeletionSaving = false;
          this.groupDeletionError =
            error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  // Promote the selected existing member to Group Admin.
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

  // Demote the selected admin after browser confirmation.
  protected demoteAdmin(member: any): void {
    if (!this.groupId || !this.currentUserId) {
      this.usersError = 'A group and current user are required.';
      return;
    }

    this.adminMessage = '';
    this.usersError = '';
    this.adminChangingId = member.id;

    this.groupService
      .demoteAdmin(this.groupId, member.id)
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

  // Open the group-ban form for one member.
  protected beginBanReport(memberId: string): void {
    this.closeSystemBanRequest();
    this.systemBanMessage = '';
    this.banTargetId = memberId;
    this.banReason = '';
    this.banReportMessage = '';
    this.banReportError = '';
  }

  // Close and clear the group-ban form.
  protected closeBanReport(): void {
    this.banTargetId = null;
    this.banReason = '';
    this.banReportError = '';
  }

  // Validate and submit the current group-ban report.
  protected submitBanReport(): void {
    if (!this.groupId || !this.currentUserId || !this.banTargetId) {
      this.banReportError = 'A group, Group Admin and target member are required.';
      return;
    }

    if (!this.banReason.trim()) {
      this.banReportError = 'A report reason is required.';
      return;
    }

    this.banReportMessage = '';
    this.banReportError = '';
    this.banReportSaving = true;

    this.groupService
      .submitGroupBanReport(this.groupId, {
        targetUserId: this.banTargetId,
        reason: this.banReason,
      })
      .subscribe({
        next: (response: any) => {
          this.banReportSaving = false;

          if (!response.valid) {
            this.banReportError = response.message || 'The report could not be submitted.';
            return;
          }

          this.closeBanReport();
          this.banReportMessage = response.message;
        },
        error: (error) => {
          this.banReportSaving = false;
          this.banReportError =
            error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  // Open the system hard-ban form for one member.
  protected beginSystemBanRequest(memberId: string): void {
    this.closeBanReport();
    this.banReportMessage = '';
    this.systemBanTargetId = memberId;
    this.systemBanReason = '';
    this.systemBanMessage = '';
    this.systemBanError = '';
  }

  // Close and clear the system hard-ban form.
  protected closeSystemBanRequest(): void {
    this.systemBanTargetId = null;
    this.systemBanReason = '';
    this.systemBanError = '';
  }

  // Validate and submit the current system hard-ban request.
  protected submitSystemBanRequest(): void {
    if (!this.groupId || !this.currentUserId || !this.systemBanTargetId) {
      this.systemBanError = 'A group, Group Admin and target member are required.';
      return;
    }

    if (!this.systemBanReason.trim()) {
      this.systemBanError = 'A system hard-ban reason is required.';
      return;
    }

    this.systemBanMessage = '';
    this.systemBanError = '';
    this.systemBanSaving = true;

    this.groupService
      .submitSystemBanRequest(this.groupId, {
        targetUserId: this.systemBanTargetId,
        reason: this.systemBanReason,
      })
      .subscribe({
        next: (response: any) => {
          this.systemBanSaving = false;

          if (!response.valid) {
            this.systemBanError =
              response.message || 'The system hard-ban request could not be submitted.';
            return;
          }

          this.closeSystemBanRequest();
          this.systemBanMessage = response.message;
        },
        error: (error) => {
          this.systemBanSaving = false;
          this.systemBanError =
            error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  // Create a room or save the room currently being edited.
  protected saveRoom(): void {
    if (!this.groupId || !this.currentUserId) {
      this.roomError = 'A group and current user are required.';
      return;
    }

    const requestDetails = {
      name: this.roomDetails.name,
      description: this.roomDetails.description,
    };

    this.roomMessage = '';
    this.roomError = '';
    this.roomSaving = true;

    if (this.editingRoomId) {
      this.groupService.updateRoom(this.editingRoomId, requestDetails).subscribe({
        next: (response: any) => {
          this.roomSaving = false;

          if (!response.valid) {
            this.roomError = response.message || 'The room could not be updated.';
            return;
          }

          this.rooms = this.rooms.map((room) => {
            return room.id === response.room.id ? response.room : room;
          });
          this.roomMessage = response.message;
          this.cancelRoomEdit();
        },
        error: (error) => {
          this.roomSaving = false;
          this.roomError =
            error.error?.message || 'Unable to contact the server.';
        },
      });
      return;
    }

    this.groupService.createRoom(this.groupId, requestDetails).subscribe({
      next: (response: any) => {
        this.roomSaving = false;

        if (!response.valid) {
          this.roomError = response.message || 'The room could not be created.';
          return;
        }

        this.rooms.push(response.room);
        this.roomMessage = response.message;
        this.roomDetails = { name: '', description: '' };
      },
      error: (error) => {
        this.roomSaving = false;
        this.roomError =
          error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  // Copy one room into the editing form.
  protected startRoomEdit(room: any): void {
    this.editingRoomId = room.id;
    this.roomDetails = {
      name: room.name,
      description: room.description,
    };
    this.roomMessage = '';
    this.roomError = '';
  }

  // Return the room form to its empty creation state.
  protected cancelRoomEdit(): void {
    this.editingRoomId = null;
    this.roomDetails = { name: '', description: '' };
  }

  // Delete the selected room after browser confirmation.
  protected deleteRoom(room: any): void {
    if (!this.currentUserId) {
      this.roomError = 'A current user is required.';
      return;
    }

    if (!confirm(`Delete the ${room.name} room?`)) {
      return;
    }

    this.roomMessage = '';
    this.roomError = '';
    this.deletingRoomId = room.id;

    this.groupService.deleteRoom(room.id).subscribe({
      next: (response: any) => {
        this.deletingRoomId = null;

        if (!response.valid) {
          this.roomError = response.message || 'The room could not be deleted.';
          return;
        }

        this.rooms = this.rooms.filter((item) => item.id !== room.id);
        if (this.editingRoomId === room.id) {
          this.cancelRoomEdit();
        }
        this.roomMessage = response.message;
      },
      error: (error) => {
        this.deletingRoomId = null;
        this.roomError =
          error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  // Refresh the selected group's safe member and ban lists.
  private loadGroupUsers(): void {
    if (!this.groupId || !this.currentUserId) {
      this.usersLoading = false;
      this.usersError = 'A group and current user are required.';
      this.settingsError = this.usersError;
      return;
    }

    this.groupService.getGroupUsers(this.groupId).subscribe({
      next: (response: any) => {
        this.usersLoading = false;

        if (!response.valid) {
          this.usersError = response.message || 'Unable to load group users.';
          this.settingsError = this.usersError;
          return;
        }

        this.groupName = response.group.title;
        this.groupSettings.title = response.group.title;
        this.groupSettings.description = response.group.description;
        this.groupSettings.minimumAge = response.group.minimumAge;
        this.groupSettings.colour = response.group.colour;
        this.members = response.members;
        this.bannedUsers = response.bannedUsers;
      },
      error: (error) => {
        this.usersLoading = false;
        this.usersError =
          error.error?.message || 'Unable to contact the server.';
        this.settingsError = this.usersError;
      },
    });
  }

  // Refresh the selected group's settings and room list.
  private loadRooms(): void {
    if (!this.groupId || !this.currentUserId) {
      this.roomsLoading = false;
      this.roomError = 'A group and current user are required.';
      return;
    }

    this.groupService.getGroupRooms(this.groupId).subscribe({
      next: (response: any) => {
        this.roomsLoading = false;

        if (!response.valid) {
          this.roomError = response.message || 'Unable to load rooms.';
          return;
        }

        this.groupName = response.group.title;
        this.canManageRooms = response.group.isAdmin;

        if (!this.canManageRooms) {
          this.roomError = 'Only a Group Admin can manage these rooms.';
          return;
        }

        this.rooms = response.rooms;
      },
      error: (error) => {
        this.roomsLoading = false;
        this.roomError =
          error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
