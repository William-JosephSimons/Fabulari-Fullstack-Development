import { Component } from '@angular/core';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-user-dashboard',
  imports: [MainNavigation],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard {}
