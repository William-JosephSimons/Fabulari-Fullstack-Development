// Open an existing group through the same dashboard a Group Admin uses.
function openBookClubAdministration() {
  cy.visit('/login');
  cy.get('#login-username').type('jordan');
  cy.get('#login-password').type('e2e-password');
  cy.contains('button', 'Login').click();
  cy.location('pathname').should('eq', '/user-dashboard');

  cy.contains('nav a', 'Group Administrator dashboard').click();
  cy.contains('tr', 'Book Club').find('input[type="radio"]').check();
  cy.contains('a', 'Manage selected group').click();
  cy.location('pathname').should('eq', '/groups/book-club/admin');
}

describe('group administration', () => {
  it('approves a room proposal and creates, edits and deletes a room', () => {
    const roomName = 'Cypress Discussion';
    const editedName = 'Cypress Reading Chat';

    openBookClubAdministration();
    cy.get('nav[aria-label="Group administration sections"]').contains('a', 'Requests').click();
    cy.contains('tr', 'Events')
      .should('contain.text', 'Room proposal')
      .contains('button', 'Approve')
      .click();
    cy.get('[role="status"]').should('contain.text', 'Room proposal approved.');

    cy.contains('a', 'Return to group administration').click();
    cy.contains('tr', 'Events').should('contain.text', 'Plan book launches');

    cy.get('#room-name').type(roomName);
    cy.get('#room-description').type('Discuss the next book together.');
    cy.contains('button', 'Create room').click();
    cy.contains('tr', roomName).should('contain.text', 'Discuss the next book together.');

    cy.contains('tr', roomName).contains('button', 'Edit').click();
    cy.get('#room-name').clear().type(editedName);
    cy.get('#room-description').clear().type('Discuss books with other members.');
    cy.contains('button', 'Save room').click();
    cy.contains('tr', editedName).should('contain.text', 'Discuss books with other members.');

    cy.reload();
    cy.contains('tr', editedName).should('contain.text', 'Discuss books with other members.');

    // Cypress accepts the confirmation when the handler does not return false.
    cy.on('window:confirm', (message) => {
      expect(message).to.equal(`Delete the ${editedName} room?`);
    });
    cy.contains('tr', editedName).contains('button', 'Delete').click();
    cy.get('table').should('not.contain', editedName);
    cy.reload();
    cy.get('table').should('not.contain', editedName);
    cy.contains('tr', 'Events').should('exist');
  });

  it('changes a members Admin role and removes members below a new minimum age', () => {
    const description = 'Books and stories chosen by group members.';

    openBookClubAdministration();
    cy.get('nav[aria-label="Group administration sections"]').contains('button', 'Members').click();

    cy.contains('tr', 'avery').contains('button', 'Promote').click();
    cy.get('[role="status"]').should('contain.text', 'Avery is now a Group Admin.');
    cy.contains('tr', 'avery').should('contain.text', 'Group Admin');

    cy.contains('tr', 'avery').contains('button', 'Demote').click();
    cy.get('[role="status"]').should('contain.text', 'Avery is no longer a Group Admin.');
    cy.contains('tr', 'avery').should('contain.text', 'Member');

    cy.get('nav[aria-label="Group administration sections"]')
      .contains('button', 'Settings')
      .click();
    cy.get('#group-description').clear().type(description);
    cy.get('#group-minimum-age').clear().type('21');
    cy.contains('button', 'Save settings').click();
    cy.get('[role="status"]')
      .should('contain.text', 'Group settings updated.')
      .and('contain.text', 'under-age');

    cy.reload();
    cy.get('nav[aria-label="Group administration sections"]')
      .contains('button', 'Settings')
      .click();
    cy.get('#group-description').should('have.value', description);
    cy.get('#group-minimum-age').should('have.value', '21');

    cy.get('nav[aria-label="Group administration sections"]').contains('button', 'Members').click();
    cy.get('section[aria-labelledby="group-members-heading"] tbody')
      .should('not.contain', 'casey')
      .and('not.contain', 'billy');
    cy.contains('tr', 'jordan').should('contain.text', 'Group Admin');
  });
});
