describe('live chat', () => {
  afterEach(() => {
    cy.task('disconnectSecondChatClient');
  });

  it('shares text, images and presence with another connected member', () => {
    const samText = 'Hello from Sam in the Cypress chat test.';
    const jordanText = 'Hello Sam, I can see your message.';

    cy.visit('/login');
    cy.get('#login-username').type('jordan');
    cy.get('#login-password').type('e2e-password');
    cy.contains('button', 'Login').click();
    cy.contains('nav a', 'Groups').click();
    cy.contains('article', 'Book Club').contains('button', 'View rooms').click();
    cy.contains('tr', 'General').contains('a', 'Open chat').click();
    cy.location('pathname').should('eq', '/groups/book-club/rooms/room-1');
    cy.get('.connection-status').should('contain.text', 'Live chat connected.');
    cy.get('aside[aria-labelledby="presence-heading"]').should('contain.text', 'In this room (1)');

    // Cypress controls one browser, so Sam joins through a second Socket.IO client.
    cy.request('POST', 'http://localhost:3000/api/login', {
      username: 'sam',
      password: 'e2e-password',
    }).then((response) => {
      return cy.task('connectSecondChatClient', {
        token: response.body.token,
        roomId: 'room-1',
      });
    });
    cy.get('aside[aria-labelledby="presence-heading"]').should('contain.text', 'In this room (2)');
    cy.contains('li', 'Jordan').should('contain.text', 'Admin');
    cy.contains('li', 'Sam').should('not.contain.text', 'Admin');
    cy.contains('#message-list .chat-notice', 'Sam joined the room.').should('exist');

    cy.task('sendSecondChatMessage', { roomId: 'room-1', text: samText });
    cy.contains('article.chat-message', samText)
      .should('contain.text', 'Sam')
      .find('button')
      .should('not.exist');

    cy.get('#message-text').type(jordanText);
    cy.contains('button', 'Send').click();
    cy.contains('article.chat-message', jordanText)
      .should('contain.text', 'Jordan')
      .contains('button', 'Delete')
      .should('exist');
    cy.task('waitForSecondChatMessage', { type: 'text', text: jordanText })
      .its('userName')
      .should('eq', 'Jordan');

    // Use the existing small PNG, not a separate test upload file.
    cy.get('#chat-image').selectFile('public/images/fabulari-logo.png', { force: true });
    cy.get('#message-list img[alt="Image shared by Jordan"]')
      .should('have.prop', 'naturalWidth')
      .and('be.greaterThan', 0);
    cy.task('waitForSecondChatMessage', { type: 'image' })
      .its('userName')
      .should('eq', 'Jordan');

    cy.get('#message-list img[alt="Image shared by Jordan"]')
      .closest('article')
      .contains('button', 'Delete')
      .click();
    cy.get('#message-list img[alt="Image shared by Jordan"]').should('not.exist');

    cy.task('disconnectSecondChatClient');
    cy.get('aside[aria-labelledby="presence-heading"]').should('contain.text', 'In this room (1)');
    cy.contains('#message-list .chat-notice', 'Sam left the room.').should('exist');

    cy.reload();
    cy.get('.connection-status').should('contain.text', 'Live chat connected.');
    cy.contains('article.chat-message', samText).should('exist');
    cy.contains('article.chat-message', jordanText).should('exist');
    cy.get('#message-list article.chat-message').should(($messages) => {
      expect($messages.length).to.be.at.most(5);
    });
    cy.get('#message-list .chat-notice').should('not.exist');
  });
});
