// Each test starts with the same users, groups, and requests in fabulari_e2e.
beforeEach(() => {
  cy.task('seedE2eDatabase');
});
