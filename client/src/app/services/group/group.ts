import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Group {
  private readonly http = inject(HttpClient);
  private readonly serverUrl = 'http://localhost:3000';

  getGroups(userId: string) {
    return this.http.get(`${this.serverUrl}/api/groups`, {
      params: { userId },
    });
  }

  getGroupUsers(groupId: string, userId: string) {
    return this.http.get(`${this.serverUrl}/api/groups/${groupId}/users`, {
      params: { userId },
    });
  }

  updateGroupSettings(groupId: string, settingsDetails: object) {
    return this.http.patch(
      `${this.serverUrl}/api/groups/${groupId}`,
      settingsDetails
    );
  }

  submitGroupRequest(requestDetails: object) {
    return this.http.post(`${this.serverUrl}/api/group-requests`, requestDetails);
  }

  submitMembershipRequest(groupId: string, requestDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/join-requests`,
      requestDetails
    );
  }

  promoteMember(groupId: string, adminDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/admins`,
      adminDetails
    );
  }

  demoteAdmin(groupId: string, targetUserId: string, actingUserId: string) {
    return this.http.delete(
      `${this.serverUrl}/api/groups/${groupId}/admins/${targetUserId}`,
      { params: { actingUserId } }
    );
  }
}
