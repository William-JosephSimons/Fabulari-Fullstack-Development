import { Component } from '@angular/core';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-profile',
  imports: [MainNavigation],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {}
