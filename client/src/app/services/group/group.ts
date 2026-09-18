import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '../auth/auth';

@Injectable({
  providedIn: 'root',
})
export class Group {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly serverUrl = 'http://localhost:3000';

  // Load groups with membership and administration status.
  getGroups() {
    return this.http.get(`${this.serverUrl}/api/groups`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Load safe member and ban lists for one administered group.
  getGroupUsers(groupId: string) {
    return this.http.get(`${this.serverUrl}/api/groups/${groupId}/users`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Save direct Group Admin changes to one group.
  updateGroupSettings(groupId: string, settingsDetails: object) {
    return this.http.patch(
      `${this.serverUrl}/api/groups/${groupId}`,
      settingsDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Load the rooms available to an eligible group member.
  getGroupRooms(groupId: string) {
    return this.http.get(`${this.serverUrl}/api/groups/${groupId}/rooms`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Load the latest retained messages for one room.
  getRoomMessages(roomId: string) {
    return this.http.get(`${this.serverUrl}/api/rooms/${roomId}/messages`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Send one chat image using the multipart field expected by Multer.
  uploadChatImage(roomId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post(`${this.serverUrl}/api/rooms/${roomId}/message-images`, formData, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Ask the server to delete one message owned by the current user.
  deleteMessage(messageId: string) {
    return this.http.delete(`${this.serverUrl}/api/messages/${messageId}`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Create a room directly as a Group Admin.
  createRoom(groupId: string, roomDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/rooms`,
      roomDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Save a room's edited name and description.
  updateRoom(roomId: string, roomDetails: object) {
    return this.http.patch(
      `${this.serverUrl}/api/rooms/${roomId}`,
      roomDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Delete a room and its retained chat data.
  deleteRoom(roomId: string) {
    return this.http.delete(`${this.serverUrl}/api/rooms/${roomId}`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Submit a proposed group for Super Admin approval.
  submitGroupRequest(requestDetails: object) {
    return this.http.post(`${this.serverUrl}/api/group-requests`, requestDetails, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  // Submit the current user's own membership request.
  submitMembershipRequest(groupId: string, requestDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/join-requests`,
      requestDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Submit a member's room proposal.
  submitRoomProposal(groupId: string, proposalDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/room-requests`,
      proposalDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Submit a group-ban report about a current member.
  submitGroupBanReport(groupId: string, reportDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/ban-reports`,
      reportDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Ask the Super Admin to delete one administered group.
  submitGroupDeletionRequest(groupId: string, requestDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/delete-request`,
      requestDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Ask the Super Admin to hard-ban one group member.
  submitSystemBanRequest(groupId: string, requestDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/system-ban-requests`,
      requestDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Promote an existing member to Group Admin.
  promoteMember(groupId: string, adminDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/admins`,
      adminDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  // Demote another Group Admin while preserving admin continuity.
  demoteAdmin(groupId: string, targetUserId: string) {
    return this.http.delete(
      `${this.serverUrl}/api/groups/${groupId}/admins/${targetUserId}`,
      { headers: this.auth.getAuthHeaders() }
    );
  }
}
