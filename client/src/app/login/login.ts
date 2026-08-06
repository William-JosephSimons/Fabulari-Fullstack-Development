import { Component } from '@angular/core';
import { AuthNavigation } from '../auth-navigation/auth-navigation';

@Component({
  selector: 'app-login',
  imports: [AuthNavigation],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {}
