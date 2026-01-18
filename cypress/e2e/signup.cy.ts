describe('Signup Flow', () => {
    it('should sign up a new user successfully', () => {
        const email = `testuser_${Date.now()}@example.com`;
        const password = 'Password123!';

        cy.visit('/signup');

        cy.get('input[placeholder="e.g. Acme Construction"]').type('Test Corp');
        cy.get('input[placeholder="e.g. acme-construction"]').type(`test-corp-${Date.now()}`);
        cy.get('input[placeholder="admin@company.com"]').type(email);
        cy.get('input[placeholder="••••••••"]').type(password);

        cy.get('button').contains('Register Organization').click();

        // Verify success message
        cy.contains('Registration Submitted', { timeout: 15000 }).should('be.visible');
        cy.contains('verification link').should('be.visible');
    });
});
