import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-room-management',
  imports: [MainNavigation, RouterLink],
  templateUrl: './room-management.html',
  styleUrl: './room-management.css',
})
export class RoomManagement {
  private readonly route = inject(ActivatedRoute);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
}
