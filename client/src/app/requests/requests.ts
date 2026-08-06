import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-requests',
  imports: [MainNavigation, SuperAdminNavigation],
  templateUrl: './requests.html',
  styleUrl: './requests.css',
})
export class Requests {
  private readonly route = inject(ActivatedRoute);

  // This shared page uses route data until real authentication can choose the navigation.
  protected readonly showSuperAdminNavigation =
    this.route.snapshot.data['navigation'] === 'superAdmin';
}
