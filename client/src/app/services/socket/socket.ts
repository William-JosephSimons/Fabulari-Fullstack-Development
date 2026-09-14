import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import io from 'socket.io-client';
import { Auth } from '../auth/auth';

@Injectable({
  providedIn: 'root',
})
export class Socket {
  private readonly auth = inject(Auth);
  private readonly serverUrl = 'http://localhost:3000';
  private socket: any = null;

  connect(): void {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        auth: {
          token: this.auth.getAuthToken() || '',
        },
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId: string): void {
    this.socket?.emit('room:join', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.socket?.emit('room:leave', { roomId });
  }

  sendMessage(roomId: string, text: string): void {
    this.socket?.emit('message:send', { roomId, text });
  }

  onNewMessage() {
    return this.listen('message:new');
  }

  onMessageDeleted() {
    return this.listen('message:deleted');
  }

  onPresenceState() {
    return this.listen('presence:state');
  }

  onPresenceJoined() {
    return this.listen('presence:joined');
  }

  onPresenceLeft() {
    return this.listen('presence:left');
  }

  onSocketError() {
    return this.listen('socket:error');
  }

  onConnected() {
    return this.listen('connect');
  }

  onDisconnected() {
    return this.listen('disconnect');
  }

  onConnectionError() {
    return this.listen('connect_error');
  }

  private listen(eventName: string) {
    return new Observable((observer) => {
      if (!this.socket) {
        observer.error(new Error('The socket connection has not been started.'));
        return;
      }

      const eventHandler = (data: any) => observer.next(data);
      this.socket.on(eventName, eventHandler);
      return () => this.socket?.off(eventName, eventHandler);
    });
  }
}
