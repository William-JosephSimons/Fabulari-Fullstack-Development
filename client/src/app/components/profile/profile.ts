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
    const currentUser = this.auth.getCurrentUser();

    if (currentUser) {
      this.email = currentUser.email;
      this.profile = {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        username: currentUser.username,
        birthdate: currentUser.birthdate,
      };
    }
  }

  protected saveProfile(): void {
    const currentUser = this.auth.getCurrentUser();
    this.profileMessage = '';
    this.profileError = '';

    if (!currentUser) {
      return;
    }

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

    // Spreading preserves the ID, email and role while replacing editable fields.
    const updatedUser = {
      ...currentUser,
      ...this.profile,
      updatedAt: new Date().toISOString(),
    };

    this.auth.saveCurrentUser(updatedUser);
    this.profileMessage = 'Profile changes saved locally.';
  }

  protected showLaterFeature(feature: string): void {
    this.profileError = '';
    this.profileMessage = `${feature} will be connected in Phase 2.`;
  }
}
