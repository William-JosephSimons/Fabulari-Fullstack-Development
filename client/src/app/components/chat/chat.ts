import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
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
export class Chat implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);

  protected groupId = '';
  protected roomId = '';
  protected groupName = 'Group';
  protected groupColour = '#D8DBE6';
  protected roomName = 'Room';
  protected loadError = '';
  protected messageText = '';
  protected rooms: any[] = [];
  protected currentUserId = '';
  protected currentUserName = 'User';
  protected currentUserInitial = '?';
  protected currentUserIsAdmin = false;

  protected readonly participants = [
    { userId: 'user-2', name: 'Jordan', initial: 'J', isAdmin: true },
    { userId: 'user-4', name: 'Billy', initial: 'B', isAdmin: false },
    { userId: 'user-6', name: 'Sam', initial: 'S', isAdmin: false },
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
      userId: '',
    },
    {
      type: 'text',
      userName: 'Jordan',
      initial: 'J',
      isAdmin: true,
      time: '10:31',
      text: 'Welcome! What is everyone reading?',
      id: 'msg-104',
      userId: 'user-2',
    },
    {
      type: 'text',
      userName: 'Billy',
      initial: 'B',
      isAdmin: false,
      time: '10:33',
      text: 'I just started The Hobbit.',
      id: 'msg-105',
      userId: 'user-4',
    },
    {
      type: 'image',
      userName: 'Sam',
      initial: 'S',
      isAdmin: false,
      time: '10:35',
      text: '',
      id: 'msg-106',
      userId: 'user-6',
    },
    {
      type: 'notice',
      userName: '',
      initial: '',
      isAdmin: false,
      time: '',
      text: 'Casey left the room.',
      id: '',
      userId: '',
    },
  ];

  ngOnInit(): void {
    // Angular reuses this component when a user moves between rooms in the same group.
    this.route.paramMap.subscribe((params) => {
      this.groupId = params.get('groupId') || '';
      this.roomId = params.get('roomId') || '';
      this.loadRoomShell();
    });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  protected sendMessage(): void {
    const text = this.messageText.trim();

    if (!text) {
      return;
    }

    // Socket.IO will replace this local update during Phase 2.
    this.messages.push({
      type: 'text',
      userName: this.currentUserName,
      initial: this.currentUserInitial,
      isAdmin: this.currentUserIsAdmin,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      id: `msg-${this.messages.length + 104}`,
      userId: this.currentUserId,
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
      this.loadError = 'A group, room and current user are required.';
      return;
    }

    this.currentUserId = currentUser.id;
    this.currentUserName = currentUser.firstName;
    this.currentUserInitial = currentUser.firstName.charAt(0).toUpperCase() || '?';
    this.loadError = '';

    this.groupService.getGroupRooms(this.groupId, currentUser.id).subscribe({
      next: (response: any) => {
        if (!response.valid) {
          this.loadError = response.message || 'Unable to load this chat room.';
          return;
        }

        this.groupName = response.group.title;
        this.groupColour = response.group.colour;
        this.currentUserIsAdmin = response.group.isAdmin;
        this.rooms = response.rooms;

        const currentParticipant = this.participants.find(
          (participant) => participant.userId === currentUser.id,
        );

        if (currentParticipant) {
          currentParticipant.name = currentUser.firstName;
          currentParticipant.initial = this.currentUserInitial;
          currentParticipant.isAdmin = response.group.isAdmin;
        } else {
          // Presence is mocked in Phase 1, but the signed-in user should still be shown.
          this.participants.push({
            userId: currentUser.id,
            name: currentUser.firstName,
            initial: currentUser.firstName.charAt(0).toUpperCase() || '?',
            isAdmin: response.group.isAdmin,
          });
        }

        const selectedRoom = this.rooms.find((room) => room.id === this.roomId);

        if (!selectedRoom) {
          this.loadError = 'That room does not belong to this group.';
          return;
        }

        this.roomName = selectedRoom.name;
        // Wait for Angular to add the new message before measuring the scroll height.
        setTimeout(() => this.scrollToBottom());
      },
      error: (error) => {
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
