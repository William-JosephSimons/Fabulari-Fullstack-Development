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

  // Open one authenticated Socket.IO connection when needed.
  connect(): void {
    if (!this.socket) {
      this.socket = io(this.serverUrl, {
        auth: {
          token: this.auth.getAuthToken() || '',
        },
      });
    }
  }

  // Close and discard the current Socket.IO connection.
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Ask the server to validate and join one room.
  joinRoom(roomId: string): void {
    this.socket?.emit('room:join', { roomId });
  }

  // Tell the server to leave the selected room.
  leaveRoom(roomId: string): void {
    this.socket?.emit('room:leave', { roomId });
  }

  // Send text to the server for validation and storage.
  sendMessage(roomId: string, text: string): void {
    this.socket?.emit('message:send', { roomId, text });
  }

  // Expose new room messages as an Observable.
  onNewMessage() {
    return this.listen('message:new');
  }

  // Expose live message removals as an Observable.
  onMessageDeleted() {
    return this.listen('message:deleted');
  }

  // Expose complete participant-list replacements.
  onPresenceState() {
    return this.listen('presence:state');
  }

  // Expose first-connection join notices.
  onPresenceJoined() {
    return this.listen('presence:joined');
  }

  // Expose final-connection leave notices.
  onPresenceLeft() {
    return this.listen('presence:left');
  }

  // Expose friendly room and message errors from the server.
  onSocketError() {
    return this.listen('socket:error');
  }

  // Expose successful connection and reconnection events.
  onConnected() {
    return this.listen('connect');
  }

  // Expose connection-loss events.
  onDisconnected() {
    return this.listen('disconnect');
  }

  // Expose errors raised before socket authentication succeeds.
  onConnectionError() {
    return this.listen('connect_error');
  }

  // Remove the exact Socket.IO listener when its Observable is unsubscribed.
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
