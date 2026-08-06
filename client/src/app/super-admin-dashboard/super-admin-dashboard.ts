import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-super-admin-dashboard',
  imports: [SuperAdminNavigation, RouterLink],
  templateUrl: './super-admin-dashboard.html',
  styleUrl: './super-admin-dashboard.css',
})
export class SuperAdminDashboard {
  protected readonly userName = 'Alex';

  // Static system figures will be replaced by API results in the connected dashboard.
  protected readonly systemSummary = [
    { label: 'Users', total: 63 },
    { label: 'Groups', total: 8 },
    { label: 'Pending requests', total: 4 },
    { label: 'Permanent bans', total: 2 }
  ];

  protected readonly pendingItems = [
    { label: 'Group creation requests', count: 2 },
    { label: 'Group deletion requests', count: 1 },
    { label: 'System hard-ban requests', count: 1 }
  ];
}
