import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-chat',
  imports: [MainNavigation],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat {
  private readonly route = inject(ActivatedRoute);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
  protected readonly roomId = this.route.snapshot.paramMap.get('roomId');
}
