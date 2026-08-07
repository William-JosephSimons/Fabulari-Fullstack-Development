import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-profile',
  imports: [MainNavigation, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  protected profileMessage = '';

  // The email is displayed but deliberately has no editable binding.
  protected readonly email = 'billy@example.com';
  protected profile = {
    firstName: 'William',
    lastName: 'Simons',
    username: 'billy',
    age: 20
  };

  protected saveProfile(): void {
    // Week 5 will send these editable fields to the private profile route.
    this.profileMessage = 'Profile changes saved locally.';
  }

  protected showLaterFeature(feature: string): void {
    this.profileMessage = `${feature} will be connected in Phase 2.`;
  }
}
