declare namespace Cypress {
    interface Chainable {
        /**
         * Custom command to log in a user.
         * @example cy.login('user@example.com', 'password')
         */
        login(email: string, password: string): Chainable<void>;
    }
}
