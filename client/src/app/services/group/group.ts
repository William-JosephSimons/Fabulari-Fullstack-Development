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

  getGroups() {
    return this.http.get(`${this.serverUrl}/api/groups`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  getGroupUsers(groupId: string) {
    return this.http.get(`${this.serverUrl}/api/groups/${groupId}/users`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  updateGroupSettings(groupId: string, settingsDetails: object) {
    return this.http.patch(
      `${this.serverUrl}/api/groups/${groupId}`,
      settingsDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  getGroupRooms(groupId: string) {
    return this.http.get(`${this.serverUrl}/api/groups/${groupId}/rooms`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  getRoomMessages(roomId: string) {
    return this.http.get(`${this.serverUrl}/api/rooms/${roomId}/messages`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  uploadChatImage(roomId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post(`${this.serverUrl}/api/rooms/${roomId}/message-images`, formData, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  createRoom(groupId: string, roomDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/rooms`,
      roomDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  updateRoom(roomId: string, roomDetails: object) {
    return this.http.patch(
      `${this.serverUrl}/api/rooms/${roomId}`,
      roomDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  deleteRoom(roomId: string) {
    return this.http.delete(`${this.serverUrl}/api/rooms/${roomId}`, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  submitGroupRequest(requestDetails: object) {
    return this.http.post(`${this.serverUrl}/api/group-requests`, requestDetails, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  submitMembershipRequest(groupId: string, requestDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/join-requests`,
      requestDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  submitRoomProposal(groupId: string, proposalDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/room-requests`,
      proposalDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  submitGroupBanReport(groupId: string, reportDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/ban-reports`,
      reportDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  submitGroupDeletionRequest(groupId: string, requestDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/delete-request`,
      requestDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  submitSystemBanRequest(groupId: string, requestDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/system-ban-requests`,
      requestDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  promoteMember(groupId: string, adminDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/admins`,
      adminDetails,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  demoteAdmin(groupId: string, targetUserId: string) {
    return this.http.delete(
      `${this.serverUrl}/api/groups/${groupId}/admins/${targetUserId}`,
      { headers: this.auth.getAuthHeaders() }
    );
  }
}
