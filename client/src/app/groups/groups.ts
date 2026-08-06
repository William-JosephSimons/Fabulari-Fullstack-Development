import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-groups',
  imports: [MainNavigation],
  templateUrl: './groups.html',
  styleUrl: './groups.css',
})
export class Groups {
  private readonly router = inject(Router);

  protected openGroup(groupId: string): void {
    // The selected group ID becomes part of the URL for the detail page to read.
    this.router.navigate(['/groups', groupId]);
  }
}
