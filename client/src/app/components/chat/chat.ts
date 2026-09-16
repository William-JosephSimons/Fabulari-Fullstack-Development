import { AfterViewInit, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Auth } from '../../services/auth/auth';
import { Group } from '../../services/group/group';
import { Socket } from '../../services/socket/socket';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-chat',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);
  private readonly groupService = inject(Group);
  private readonly socketService = inject(Socket);
  private readonly socketSubscriptions: Subscription[] = [];

  protected groupId = '';
  protected roomId = '';
  protected groupName = 'Group';
  protected groupColour = '#D8DBE6';
  protected roomName = 'Room';
  protected loadError = '';
  protected socketError = '';
  protected messageText = '';
  protected uploadingImage = false;
  protected rooms: any[] = [];
  protected currentUserId = '';
  protected participants: any[] = [];

  protected messages: any[] = [];

  ngOnInit(): void {
    this.socketService.connect();
    this.socketSubscriptions.push(
      this.socketService.onNewMessage().subscribe((message: any) => {
        if (message.roomId !== this.roomId) {
          return;
        }

        this.messages.push({
          ...message,
          time: new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });

        // Wait for Angular to display the message before updating the scroll position.
        setTimeout(() => this.scrollToBottom());
      }),
    );
    this.socketSubscriptions.push(
      this.socketService.onPresenceState().subscribe((details: any) => {
        if (details.roomId === this.roomId) {
          this.socketError = '';
          this.participants = details.participants;
        }
      }),
    );
    this.socketSubscriptions.push(
      this.socketService.onPresenceJoined().subscribe((details: any) => {
        if (details.roomId === this.roomId) {
          this.addPresenceNotice(`${details.participant.name} joined the room.`);
        }
      }),
    );
    this.socketSubscriptions.push(
      this.socketService.onPresenceLeft().subscribe((details: any) => {
        if (details.roomId === this.roomId) {
          this.addPresenceNotice(`${details.participant.name} left the room.`);
        }
      }),
    );
    this.socketSubscriptions.push(
      this.socketService.onSocketError().subscribe((error: any) => {
        this.socketError = error.message || 'The live chat request could not be completed.';
      }),
    );
    this.socketSubscriptions.push(
      this.socketService.onConnectionError().subscribe((error: any) => {
        this.socketError = error.message || 'Unable to connect to live chat.';
      }),
    );
    this.socketSubscriptions.push(
      this.socketService.onDisconnected().subscribe(() => {
        this.socketError = 'The live chat connection was lost. Trying to reconnect.';
        this.participants = [];
      }),
    );
    this.socketSubscriptions.push(
      this.socketService.onConnected().subscribe(() => {
        this.socketError = '';

        if (this.roomId && this.currentUserId) {
          this.socketService.joinRoom(this.roomId);
        }
      }),
    );

    // Angular reuses this component when a user moves between rooms in the same group.
    this.route.paramMap.subscribe((params) => {
      // Leave the previously selected room before loading the new route
      if (this.roomId) {
        this.socketService.leaveRoom(this.roomId);
      }

      this.groupId = params.get('groupId') || '';
      this.roomId = params.get('roomId') || '';
      this.socketError = '';
      this.participants = [];
      this.messages = [];
      this.loadRoomShell();
    });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    for (const subscription of this.socketSubscriptions) {
      subscription.unsubscribe();
    }

    if (this.roomId) {
      this.socketService.leaveRoom(this.roomId);
    }

    this.socketService.disconnect();
  }

  protected sendMessage(): void {
    const text = this.messageText.trim();

    if (!text) {
      return;
    }

    this.socketError = '';
    this.socketService.sendMessage(this.roomId, text);
    this.messageText = '';
  }

  protected deleteMessage(messageId: string): void {
    this.messages = this.messages.filter((message) => message.id !== messageId);
  }

  protected uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.socketError = '';
    this.uploadingImage = true;

    this.groupService.uploadChatImage(this.roomId, file).subscribe({
      next: () => {
        this.uploadingImage = false;
        input.value = '';
      },
      error: (error) => {
        this.socketError = error.error?.message || 'The chat image could not be uploaded.';
        this.uploadingImage = false;
        input.value = '';
      },
    });
  }

  protected getAvatarUrl(avatarUrl: string | null): string {
    return avatarUrl ? this.auth.getUploadUrl(avatarUrl) : '';
  }

  protected getMessageImageUrl(imageUrl: string): string {
    return this.auth.getUploadUrl(imageUrl);
  }

  private loadRoomShell(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!this.groupId || !this.roomId || !currentUser) {
      this.loadError = 'A group, room and current user are required.';
      return;
    }

    this.currentUserId = currentUser.id;
    this.loadError = '';

    this.groupService.getGroupRooms(this.groupId).subscribe({
      next: (response: any) => {
        if (!response.valid) {
          this.loadError = response.message || 'Unable to load this chat room.';
          return;
        }

        this.groupName = response.group.title;
        this.groupColour = response.group.colour;
        this.rooms = response.rooms;

        const selectedRoom = this.rooms.find((room) => room.id === this.roomId);

        if (!selectedRoom) {
          this.loadError = 'That room does not belong to this group.';
          return;
        }

        this.roomName = selectedRoom.name;
        this.loadMessages();
      },
      error: (error) => {
        this.loadError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  private loadMessages(): void {
    this.groupService.getRoomMessages(this.roomId).subscribe({
      next: (response: any) => {
        this.messages = response.messages.map((message: any) => ({
          ...message,
          time: new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));

        this.socketService.joinRoom(this.roomId);
        // Wait for Angular to display the history before updating the scroll position.
        setTimeout(() => this.scrollToBottom());
      },
      error: (error) => {
        this.loadError = error.error?.message || 'Unable to load the room messages.';
      },
    });
  }

  private addPresenceNotice(text: string): void {
    this.messages.push({
      type: 'notice',
      userName: '',
      initial: '',
      isAdmin: false,
      time: '',
      text,
      id: '',
      userId: '',
      avatarUrl: null,
    });

    setTimeout(() => this.scrollToBottom());
  }

  private scrollToBottom(): void {
    const messageList = document.getElementById('message-list');

    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }
}
