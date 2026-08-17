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
  protected email = '';
  protected profile = {
    firstName: '',
    lastName: '',
    username: '',
    age: 18,
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
        age: currentUser.age,
      };
    }
  }

  protected saveProfile(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
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
    this.profileMessage = `${feature} will be connected in Phase 2.`;
  }
}
