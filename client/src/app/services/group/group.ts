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

  submitGroupRequest(requestDetails: object) {
    return this.http.post(`${this.serverUrl}/api/group-requests`, requestDetails);
  }

  submitMembershipRequest(groupId: string, requestDetails: object) {
    return this.http.post(
      `${this.serverUrl}/api/groups/${groupId}/join-requests`,
      requestDetails
    );
  }
}
