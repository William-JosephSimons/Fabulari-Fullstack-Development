import { defineConfig } from 'cypress';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { io } from 'socket.io-client';

// Keep the extra socket outside Cypress's single browser during the chat test.
let secondSocket: any = null;
let secondMessages: any[] = [];

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    setupNodeEvents(on, config) {
      on('task', {
        seedE2eDatabase() {
          const seedScript = resolve(config.projectRoot, '..', 'server', 'seed.js');

          // Run the same seed command against the separate E2E database before each test.
          execFileSync(process.execPath, [seedScript, '--e2e']);
          return null;
        },
        // Join a second account after the test logs it in through the real API.
        connectSecondChatClient(details: any) {
          secondSocket?.disconnect();
          secondMessages = [];

          const socket = io('http://localhost:3000', {
            auth: { token: details.token },
            reconnection: false,
          });
          secondSocket = socket;
          socket.on('message:new', (message) => secondMessages.push(message));

          // Wait until the server has accepted the second member into the room.
          return new Promise<null>((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.disconnect();
              reject(new Error('The second chat client could not join the room.'));
            }, 10000);

            socket.once('connect', () => socket.emit('room:join', { roomId: details.roomId }));
            socket.once('presence:state', () => {
              clearTimeout(timeout);
              resolve(null);
            });
            socket.once('socket:error', (error) => {
              clearTimeout(timeout);
              reject(new Error(error.message));
            });
            socket.once('connect_error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
        },
        // Send one text message from the second room member.
        sendSecondChatMessage(details: any) {
          if (!secondSocket) {
            throw new Error('The second chat client is not connected.');
          }

          secondSocket.emit('message:send', details);
          return null;
        },
        // A broadcast may arrive before Cypress asks for it, so check saved events first.
        waitForSecondChatMessage(details: any) {
          const matches = (message: any) => {
            return (
              message.type === details.type &&
              (details.text === undefined || message.text === details.text)
            );
          };
          const existingMessage = secondMessages.find(matches);

          if (existingMessage) {
            return existingMessage;
          }

          if (!secondSocket) {
            throw new Error('The second chat client is not connected.');
          }

          const socket = secondSocket;
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.off('message:new', checkMessage);
              reject(new Error('The second chat client did not receive the message.'));
            }, 10000);

            function checkMessage(message: any) {
              if (matches(message)) {
                clearTimeout(timeout);
                socket.off('message:new', checkMessage);
                resolve(message);
              }
            }

            socket.on('message:new', checkMessage);
          });
        },
        // Close the extra connection between tests and after the chat journey.
        disconnectSecondChatClient() {
          secondSocket?.disconnect();
          secondSocket = null;
          secondMessages = [];
          return null;
        },
      });
    },
  },
});
