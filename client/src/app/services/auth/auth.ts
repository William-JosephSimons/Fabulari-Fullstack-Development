import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly serverUrl = 'http://localhost:3000';
  private readonly storageKey = 'currentUser';
  private readonly tokenStorageKey = 'authToken';

  login(loginDetails: object) {
    return this.http.post(`${this.serverUrl}/api/login`, loginDetails);
  }

  register(registrationDetails: object) {
    return this.http.post(`${this.serverUrl}/api/register`, registrationDetails);
  }

  getBootstrapStatus() {
    return this.http.get(`${this.serverUrl}/api/bootstrap-status`);
  }

  createSuperAdmin(setupDetails: object) {
    return this.http.post(`${this.serverUrl}/api/bootstrap`, setupDetails);
  }

  saveCurrentUser(user: object): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  saveLogin(user: object, token: string): void {
    this.saveCurrentUser(user);
    localStorage.setItem(this.tokenStorageKey, token);
  }

  getCurrentUser() {
    const storedUser = localStorage.getItem(this.storageKey);

    return storedUser ? JSON.parse(storedUser) : null;
  }

  getAuthToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.getAuthToken() || ''}`,
    };
  }

  getSession() {
    return this.http.get(`${this.serverUrl}/api/session`, {
      headers: this.getAuthHeaders(),
    });
  }

  getProfile() {
    return this.http.get(`${this.serverUrl}/api/profile`, {
      headers: this.getAuthHeaders(),
    });
  }

  updateProfile(profileDetails: object) {
    return this.http.put(`${this.serverUrl}/api/profile`, profileDetails, {
      headers: this.getAuthHeaders(),
    });
  }

  changePassword(passwordDetails: object) {
    return this.http.put(`${this.serverUrl}/api/profile/password`, passwordDetails, {
      headers: this.getAuthHeaders(),
    });
  }

  uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post(`${this.serverUrl}/api/profile/avatar`, formData, {
      headers: this.getAuthHeaders(),
    });
  }

  getUploadUrl(uploadPath: string): string {
    return uploadPath ? `${this.serverUrl}${uploadPath}` : '';
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null && this.getAuthToken() !== null;
  }

  logout(): void {
    const token = this.getAuthToken();

    if (token) {
      this.http
        .post(`${this.serverUrl}/api/logout`, {}, { headers: this.getAuthHeaders() })
        .subscribe({
          // Local logout must still work if the server session has already ended.
          error: () => {},
        });
    }

    this.clearLogin();
  }

  clearLogin(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.tokenStorageKey);
  }
}
