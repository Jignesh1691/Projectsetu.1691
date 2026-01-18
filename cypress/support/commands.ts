Cypress.Commands.add('login', (email: string, password: string) => {
    cy.visit('/login');
    cy.get('#email').should('be.visible').clear().type(email, { delay: 50 });
    cy.get('#password').should('be.visible').clear().type(password, { delay: 50 });
    cy.get('button[type="submit"]').click();
});
