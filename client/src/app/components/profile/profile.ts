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
  protected email = '';
  protected profile = {
    firstName: '',
    lastName: '',
    username: '',
    birthdate: '',
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

  protected showLaterFeature(feature: string): void {
    this.profileError = '';
    this.profileMessage = `${feature} will be connected in Phase 2.`;
  }

  private setProfile(user: any): void {
    this.auth.saveCurrentUser(user);
    this.email = user.email;
    this.profile = {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      birthdate: user.birthdate,
    };
  }
}
