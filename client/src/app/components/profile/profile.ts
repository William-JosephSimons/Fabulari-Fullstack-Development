import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MainNavigation } from '../main-navigation/main-navigation';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-profile',
  imports: [MainNavigation, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly auth = inject(Auth);

  protected profileMessage = '';
  protected profileError = '';
  protected profileLoading = true;
  protected profileSaving = false;
  protected showPasswordForm = false;
  protected avatarSaving = false;
  protected passwordSaving = false;
  protected passwordMessage = '';
  protected passwordError = '';
  protected email = '';
  protected avatarUrl = '';
  protected profile = {
    firstName: '',
    lastName: '',
    username: '',
    birthdate: '',
  };
  protected passwordDetails = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  protected get profileInitial(): string {
    return this.profile.firstName.charAt(0).toUpperCase() || '?';
  }

  ngOnInit(): void {
    this.auth.getProfile().subscribe({
      next: (response: any) => {
        this.profileLoading = false;

        if (!response.valid || !response.user) {
          this.profileError = response.message || 'Unable to load your profile.';
          return;
        }

        this.setProfile(response.user);
      },
      error: (error) => {
        this.profileLoading = false;
        this.profileError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  protected saveProfile(): void {
    this.profileMessage = '';
    this.profileError = '';

    const birthdate = new Date(`${this.profile.birthdate}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();

    if (
      today.getMonth() < birthdate.getMonth() ||
      (today.getMonth() === birthdate.getMonth() && today.getDate() < birthdate.getDate())
    ) {
      age--;
    }

    if (Number.isNaN(birthdate.getTime()) || age < 1 || age > 120) {
      this.profileError = 'Enter a valid birthdate for an age between 1 and 120.';
      return;
    }

    this.profileSaving = true;
    this.auth.updateProfile(this.profile).subscribe({
      next: (response: any) => {
        this.profileSaving = false;

        if (!response.valid || !response.user) {
          this.profileError = response.message || 'Unable to save your profile.';
          return;
        }

        this.setProfile(response.user);
        this.profileMessage = response.message;
      },
      error: (error) => {
        this.profileSaving = false;
        this.profileError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  protected uploadAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.profileMessage = '';
    this.profileError = '';

    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      this.profileError = 'Choose a PNG, JPEG or GIF profile image.';
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.profileError = 'Profile images cannot be larger than 2 MB.';
      input.value = '';
      return;
    }

    this.avatarSaving = true;
    this.auth.uploadProfileImage(file).subscribe({
      next: (response: any) => {
        this.avatarSaving = false;
        input.value = '';

        if (!response.valid || !response.user) {
          this.profileError = response.message || 'Unable to update your profile image.';
          return;
        }

        this.setProfile(response.user);
        this.profileMessage = response.message;
      },
      error: (error) => {
        this.avatarSaving = false;
        input.value = '';
        this.profileError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  protected togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    this.profileMessage = '';
    this.profileError = '';
    this.passwordMessage = '';
    this.passwordError = '';
    this.passwordDetails = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  }

  protected changePassword(): void {
    this.passwordMessage = '';
    this.passwordError = '';

    if (
      !this.passwordDetails.currentPassword ||
      !this.passwordDetails.newPassword ||
      !this.passwordDetails.confirmPassword
    ) {
      this.passwordError = 'Complete all password fields.';
      return;
    }

    if (this.passwordDetails.newPassword.length < 8) {
      this.passwordError = 'The new password must contain at least 8 characters.';
      return;
    }

    if (this.passwordDetails.newPassword !== this.passwordDetails.confirmPassword) {
      this.passwordError = 'The new passwords do not match.';
      return;
    }

    this.passwordSaving = true;
    this.auth
      .changePassword({
        currentPassword: this.passwordDetails.currentPassword,
        newPassword: this.passwordDetails.newPassword,
      })
      .subscribe({
        next: (response: any) => {
          this.passwordSaving = false;

          if (!response.valid) {
            this.passwordError = response.message || 'Unable to change your password.';
            return;
          }

          this.passwordDetails = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };
          this.passwordMessage = response.message;
        },
        error: (error) => {
          this.passwordSaving = false;
          this.passwordError = error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  private setProfile(user: any): void {
    this.auth.saveCurrentUser(user);
    this.email = user.email;
    this.avatarUrl = this.auth.getUploadUrl(user.avatarUrl);
    this.profile = {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      birthdate: user.birthdate,
    };
  }
}
