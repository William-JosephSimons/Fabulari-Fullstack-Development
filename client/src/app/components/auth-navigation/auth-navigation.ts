import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-auth-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './auth-navigation.html',
  styleUrl: './auth-navigation.css',
})
export class AuthNavigation {}
