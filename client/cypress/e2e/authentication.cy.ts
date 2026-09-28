// These tests use the running Angular and Express apps
describe('authentication', () => {
  it('protects pages, restores a login after refresh, and ends the server session on logout', () => {
    cy.visit('/profile');
    cy.location('pathname').should('eq', '/login');

    cy.get('#login-username').type('jordan');
    cy.get('#login-password').type('e2e-password');
    cy.contains('button', 'Login').click();

    cy.location('pathname').should('eq', '/user-dashboard');
    cy.contains('Hello, Jordan').should('be.visible');
    cy.window().then((window) => {
      const storedUser = JSON.parse(window.localStorage.getItem('currentUser') || '{}');
      expect(storedUser.username).to.equal('jordan');
      expect(storedUser).not.to.have.property('passwordHash');
      expect(window.localStorage.getItem('authToken')).not.to.be.null;
    });

    cy.intercept('GET', '**/api/session').as('sessionCheck');
    cy.reload();
    cy.wait('@sessionCheck').its('response.statusCode').should('eq', 200);
    cy.contains('Hello, Jordan').should('be.visible');

    cy.visit('/admin/users');
    cy.location('pathname').should('eq', '/user-dashboard');

    cy.intercept('POST', '**/api/logout').as('logoutRequest');
    cy.contains('button', 'Logout').click();
    cy.wait('@logoutRequest').then(({ request, response }) => {
      expect(response?.statusCode).to.equal(200);
      const authHeader = request.headers['authorization'] || request.headers['Authorization'];
      expect(authHeader).to.match(/^Bearer \S+$/);

      // The token sent to logout must no longer open a server session.
      cy.request({
        method: 'GET',
        url: 'http://localhost:3000/api/session',
        headers: { Authorization: String(authHeader) },
        failOnStatusCode: false,
      }).its('status').should('eq', 401);
    });

    cy.location('pathname').should('eq', '/login');
    cy.window().then((window) => {
      expect(window.localStorage.getItem('currentUser')).to.be.null;
      expect(window.localStorage.getItem('authToken')).to.be.null;
    });

    cy.visit('/profile');
    cy.location('pathname').should('eq', '/login');
  });

  it('shows a useful message when the password is wrong', () => {
    cy.visit('/login');
    cy.get('#login-username').type('jordan');
    cy.get('#login-password').type('wrong-password');
    cy.contains('button', 'Login').click();

    cy.get('[role="alert"]').should('contain.text', 'Username or password is incorrect.');
    cy.location('pathname').should('eq', '/login');
    cy.window().then((window) => {
      expect(window.localStorage.getItem('currentUser')).to.be.null;
      expect(window.localStorage.getItem('authToken')).to.be.null;
    });
  });
});
