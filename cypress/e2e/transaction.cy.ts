describe('Transaction Workflow', () => {
    // Login before each test
    beforeEach(() => {
        cy.login('admin@acme.com', 'Password123!');
        cy.url({ timeout: 15000 }).should('include', '/dashboard');
    });

    it('should create a new expense transaction', () => {
        // Navigate to transactions page
        cy.visit('/transactions');

        // Open create dialog
        cy.contains('button', 'Add Transaction').click();

        // Fill Amount
        cy.get('input[placeholder="0.00"]').type('500');

        // Fill Description
        cy.get('textarea[placeholder="e.g. Rebar purchase"]').type('Test Expense');

        // Select Project (Combobox)
        // Click trigger
        cy.contains('button', 'Select a project').click();
        // Wait for popover and click option
        cy.contains('Alpha Project').click();

        // Select Ledger (Combobox)
        // Click trigger
        cy.contains('button', 'Select a ledger').click();
        // Wait for popover and click option
        cy.contains('General Expenses').click();

        // Submit form (Force click if it's covered by toast/popover, or wait)
        // Using contains with selector for precision
        cy.contains('button', 'Add Transaction').click();

        // Verify success by checking if the new transaction appears in the table
        // Adjust selector to be specific to the row or cell if needed
        cy.contains('Test Expense').should('be.visible');
        cy.contains('500').should('be.visible');
    });
});
