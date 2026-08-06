import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-group-admin-dashboard',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './group-admin-dashboard.html',
  styleUrl: './group-admin-dashboard.css',
})
export class GroupAdminDashboard {
  protected readonly userName = 'Jordan';
  protected selectedGroupId = 'book-club';

  // These values let the selection and summary layout work before services are connected.
  protected readonly administeredGroups = [
    { id: 'book-club', name: 'Book Club', members: 24, rooms: 3 },
    { id: 'writers-hub', name: 'Writers Hub', members: 15, rooms: 2 }
  ];

  protected readonly pendingItems = [
    { label: 'Membership requests', count: 3 },
    { label: 'Room proposals', count: 1 },
    { label: 'Group-ban reports', count: 1 }
  ];
}
