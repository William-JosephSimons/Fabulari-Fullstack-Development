import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-group-detail',
  imports: [MainNavigation, RouterLink],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.css',
})
export class GroupDetail {
  private readonly route = inject(ActivatedRoute);

  // One component can display any group by reading its ID from the current URL.
  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
}
