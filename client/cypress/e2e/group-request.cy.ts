// Log in through the page using an account from the E2E seed.
function login(username: string) {
  cy.visit('/login');
  cy.get('#login-username').type(username);
  cy.get('#login-password').type('e2e-password');
  cy.contains('button', 'Login').click();
}

describe('group creation request', () => {
  it('creates a group after the Super Admin approves a user request', () => {
    const groupTitle = 'Cypress Study Group ' + Date.now();
    const description = 'A group for discussing course projects.';

    login('jordan');
    cy.location('pathname').should('eq', '/user-dashboard');
    cy.contains('nav a', 'Groups').click();

    cy.get('#group-title').type(groupTitle);
    cy.get('#group-description').type(description);
    cy.get('#minimum-age').clear().type('18');
    cy.get('#request-reason').type('Several students want a place to discuss projects.');
    cy.contains('button', 'Submit group request').click();
    cy.get('[role="status"]').should('contain.text', 'Group request submitted for approval.');

    cy.contains('nav a', 'Requests').click();
    cy.contains('tr', groupTitle).should('contain.text', 'Pending');

    cy.intercept('POST', '**/api/logout').as('logout');
    cy.contains('button', 'Logout').click();
    cy.wait('@logout').its('response.statusCode').should('eq', 200);

    login('alex');
    cy.location('pathname').should('eq', '/super-admin-dashboard');
    cy.contains('nav a', 'Requests').click();
    cy.contains('tr', groupTitle)
      .should('contain.text', description)
      .and('contain.text', 'Minimum age: 18');
    cy.contains('tr', groupTitle).contains('button', 'Approve').click();
    cy.get('[role="status"]').should('contain.text', 'Group request approved.');

    cy.contains('button', 'Logout').click();
    cy.wait('@logout').its('response.statusCode').should('eq', 200);

    login('jordan');
    cy.location('pathname').should('eq', '/user-dashboard');
    cy.contains('nav a', 'Groups').click();
    cy.contains('article', groupTitle)
      .should('contain.text', description)
      .and('contain.text', 'Minimum age 18')
      .and('contain.text', 'Group Admin');

    cy.contains('nav a', 'Group Administrator dashboard').click();
    cy.contains('tr', groupTitle).should('be.visible');
  });
});
