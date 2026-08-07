import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-admin-users',
  imports: [SuperAdminNavigation, FormsModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsers {
  protected searchTerm = '';

  // Only safe account details are included in this administration view.
  protected readonly users = [
    {
      username: 'alex',
      email: 'alex@example.com',
      name: 'Alex Admin',
      age: 32,
      systemRole: 'Super Admin'
    },
    {
      username: 'billy',
      email: 'billy@example.com',
      name: 'William Simons',
      age: 20,
      systemRole: 'User'
    },
    {
      username: 'jordan',
      email: 'jordan@example.com',
      name: 'Jordan Lee',
      age: 24,
      systemRole: 'User'
    }
  ];

  protected readonly systemBans = [
    { email: 'banned@example.com', date: '20 Jul 2026', reason: 'Serious abuse' },
    { email: 'spam@example.com', date: '15 Jul 2026', reason: 'Repeated spam' }
  ];

  protected get filteredUsers() {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.users;
    }

    return this.users.filter((user) =>
      `${user.username} ${user.email} ${user.name}`.toLowerCase().includes(search)
    );
  }
}
