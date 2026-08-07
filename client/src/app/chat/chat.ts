import { AfterViewInit, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-chat',
  imports: [MainNavigation, FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);

  protected readonly groupId = this.route.snapshot.paramMap.get('groupId');
  protected readonly roomId = this.route.snapshot.paramMap.get('roomId');
  protected messageText = '';

  protected readonly rooms = [
    { id: 'general', name: 'General' },
    { id: 'reviews', name: 'Reviews' },
    { id: 'events', name: 'Events' }
  ];

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

  private scrollToBottom(): void {
    const messageList = document.getElementById('message-list');

    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }
}
