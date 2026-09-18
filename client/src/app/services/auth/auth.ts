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

  // Send login details and receive the safe user and session token.
  login(loginDetails: object) {
    return this.http.post(`${this.serverUrl}/api/login`, loginDetails);
  }

  // Submit the self-registration form.
  register(registrationDetails: object) {
    return this.http.post(`${this.serverUrl}/api/register`, registrationDetails);
  }

  // Check whether first-run Super Admin setup is available.
  getBootstrapStatus() {
    return this.http.get(`${this.serverUrl}/api/bootstrap-status`);
  }

  // Submit the first-run Super Admin form.
  createSuperAdmin(setupDetails: object) {
    return this.http.post(`${this.serverUrl}/api/bootstrap`, setupDetails);
  }

  // Store the safe current user required by the Angular interface.
  saveCurrentUser(user: object): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  // Store both parts of a successful login.
  saveLogin(user: object, token: string): void {
    this.saveCurrentUser(user);
    localStorage.setItem(this.tokenStorageKey, token);
  }

  // Parse the current user from local storage when present.
  getCurrentUser() {
    const storedUser = localStorage.getItem(this.storageKey);

    return storedUser ? JSON.parse(storedUser) : null;
  }

  // Return the opaque token stored after login.
  getAuthToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  // Build the bearer header shared by protected HTTP calls.
  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.getAuthToken() || ''}`,
    };
  }

  // Ask the server to validate and refresh the stored login.
  getSession() {
    return this.http.get(`${this.serverUrl}/api/session`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Load the authenticated user's private profile.
  getProfile() {
    return this.http.get(`${this.serverUrl}/api/profile`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Save the editable private-profile fields.
  updateProfile(profileDetails: object) {
    return this.http.put(`${this.serverUrl}/api/profile`, profileDetails, {
      headers: this.getAuthHeaders(),
    });
  }

  // Submit the current and replacement passwords.
  changePassword(passwordDetails: object) {
    return this.http.put(`${this.serverUrl}/api/profile/password`, passwordDetails, {
      headers: this.getAuthHeaders(),
    });
  }

  // Send one avatar file using the multipart field expected by Multer.
  uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post(`${this.serverUrl}/api/profile/avatar`, formData, {
      headers: this.getAuthHeaders(),
    });
  }

  // Turn a stored relative upload path into a browser URL.
  getUploadUrl(uploadPath: string): string {
    return uploadPath ? `${this.serverUrl}${uploadPath}` : '';
  }

  // Require both stored login values for client-side route access.
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null && this.getAuthToken() !== null;
  }

  // End the server session when possible and always clear local login data.
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

  // Remove both stored login values.
  clearLogin(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.tokenStorageKey);
  }
}
