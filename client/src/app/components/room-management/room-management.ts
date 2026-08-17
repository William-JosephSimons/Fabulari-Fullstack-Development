import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-room-management',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './room-management.html',
  styleUrl: './room-management.css',
})
export class RoomManagement {
  private readonly route = inject(ActivatedRoute);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
  protected roomMessage = '';
  protected newRoom = { name: '', description: '' };

  // The room controls use local data until the persistence routes are introduced.
  protected rooms = [
    { id: 'general', name: 'General', description: 'Main discussion' },
    { id: 'reviews', name: 'Reviews', description: 'Book reviews' }
  ];

  protected createRoom(): void {
    const roomId = this.newRoom.name.trim().toLowerCase().replaceAll(' ', '-');

    this.rooms.push({
      id: roomId,
      name: this.newRoom.name.trim(),
      description: this.newRoom.description.trim()
    });
    this.roomMessage = `${this.newRoom.name.trim()} was added.`;
    this.newRoom = { name: '', description: '' };
  }

  protected deleteRoom(roomId: string): void {
    const room = this.rooms.find((item) => item.id === roomId);
    this.rooms = this.rooms.filter((item) => item.id !== roomId);
    this.roomMessage = `${room?.name ?? 'Room'} was deleted.`;
  }
}
