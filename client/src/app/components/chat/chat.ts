import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Group } from '../../services/group/group';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-chat',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);

  protected groupId = '';
  protected roomId = '';
  protected groupName = 'Group';
  protected roomName = 'Room';
  protected isLoading = true;
  protected loadError = '';
  protected messageText = '';
  protected rooms: any[] = [];

  protected readonly participants = [
    { name: 'Jordan', initial: 'J', isAdmin: true },
    { name: 'Billy', initial: 'B', isAdmin: false },
    { name: 'Sam', initial: 'S', isAdmin: false }
  ];

  // Every object has the same fields to keep the mock template easy to follow.
  protected messages = [
    {
      type: 'notice',
      userName: '',
      initial: '',
      isAdmin: false,
      time: '',
      text: 'Jordan joined the room.',
      id: '',
      ownMessage: false
    },
    {
      type: 'text',
      userName: 'Jordan',
      initial: 'J',
      isAdmin: true,
      time: '10:31',
      text: 'Welcome! What is everyone reading?',
      id: 'msg-104',
      ownMessage: false
    },
    {
      type: 'text',
      userName: 'Billy',
      initial: 'B',
      isAdmin: false,
      time: '10:33',
      text: 'I just started The Hobbit.',
      id: 'msg-105',
      ownMessage: true
    },
    {
      type: 'image',
      userName: 'Sam',
      initial: 'S',
      isAdmin: false,
      time: '10:35',
      text: '',
      id: 'msg-106',
      ownMessage: false
    },
    {
      type: 'notice',
      userName: '',
      initial: '',
      isAdmin: false,
      time: '',
      text: 'Casey left the room.',
      id: '',
      ownMessage: false
    }
  ];

  ngOnInit(): void {
    // Angular reuses this component when a user moves between rooms in the same group.
    this.route.paramMap.subscribe((params) => {
      this.groupId = params.get('groupId') || '';
      this.roomId = params.get('roomId') || '';
      this.loadRoomShell();
    });
  }

  protected sendMessage(): void {
    const text = this.messageText.trim();

    if (!text) {
      return;
    }

    // Socket.IO will replace this local update during Phase 2.
    this.messages.push({
      type: 'text',
      userName: 'Billy',
      initial: 'B',
      isAdmin: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      id: `msg-${this.messages.length + 104}`,
      ownMessage: true
    });
    this.messageText = '';

    // Wait for Angular to add the new message before measuring the scroll height.
    setTimeout(() => this.scrollToBottom());
  }

  protected deleteMessage(messageId: string): void {
    this.messages = this.messages.filter((message) => message.id !== messageId);
  }

  private loadRoomShell(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!this.groupId || !this.roomId || !currentUser) {
      this.isLoading = false;
      this.loadError = 'A group, room and current user are required.';
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    this.groupService.getGroupRooms(this.groupId, currentUser.id).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (!response.valid) {
          this.loadError = response.message || 'Unable to load this chat room.';
          return;
        }

        this.groupName = response.group.title;
        this.rooms = response.rooms;

        const selectedRoom = this.rooms.find((room) => room.id === this.roomId);

        if (!selectedRoom) {
          this.loadError = 'That room does not belong to this group.';
          return;
        }

        this.roomName = selectedRoom.name;

        // Phase 1 shows one mock conversation while the room shell uses saved data.
        setTimeout(() => this.scrollToBottom());
      },
      error: (error) => {
        this.isLoading = false;
        this.loadError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  private scrollToBottom(): void {
    const messageList = document.getElementById('message-list');

    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }
}
