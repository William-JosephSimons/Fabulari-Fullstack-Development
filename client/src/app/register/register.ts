import { Component } from '@angular/core';
import { AuthNavigation } from '../auth-navigation/auth-navigation';

@Component({
  selector: 'app-register',
  imports: [AuthNavigation],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {}
