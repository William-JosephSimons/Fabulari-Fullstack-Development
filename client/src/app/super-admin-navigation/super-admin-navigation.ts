import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-super-admin-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './super-admin-navigation.html',
  styleUrl: './super-admin-navigation.css',
})
export class SuperAdminNavigation {}
