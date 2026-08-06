import { Component } from '@angular/core';
import { AuthNavigation } from '../auth-navigation/auth-navigation';

@Component({
  selector: 'app-first-run-setup',
  imports: [AuthNavigation],
  templateUrl: './first-run-setup.html',
  styleUrl: './first-run-setup.css',
})
export class FirstRunSetup {}
