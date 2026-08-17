import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-user-dashboard',
  imports: [MainNavigation, RouterLink],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard {
  private readonly auth = inject(Auth);

  protected readonly userName = this.auth.getCurrentUser()?.firstName || 'User';

  // Temporary display data will be replaced by the HTTP services introduced in Week 5.
  protected readonly groups = [
    { id: 'book-club', name: 'Book Club', access: 'Member' }
  ];

  protected readonly recentRequests = [
    { description: 'Music Makers membership', status: 'Pending' },
    { description: 'Writers Hub membership', status: 'Rejected' }
  ];
}
