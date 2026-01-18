describe('Authentication Flow', () => {
    it('should login successfully with valid credentials', () => {
        cy.login('admin@acme.com', 'Password123!');
        cy.url({ timeout: 15000 }).should('include', '/dashboard');
        cy.contains('Admin User').should('be.visible');
    });

    it('should show error with invalid credentials', () => {
        cy.visit('/login');

        cy.get('input[placeholder="name@company.com"]').type('admin@acme.com');
        cy.get('input[placeholder="••••••••"]').type('WrongPassword');

        cy.get('button').contains('Sign In').click();

        // Verify error message
        cy.contains('Invalid email or password').should('be.visible');
    });
});
