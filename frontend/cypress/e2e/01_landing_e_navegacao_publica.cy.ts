describe('01 - Landing Page e Rotas Públicas', () => {
  it('Deve carregar a página inicial (Landing Page) com sucesso', () => {
    cy.visit('/');
    cy.contains('C.A.S.A.', { timeout: 10000 }).should('be.visible');
    cy.get('a[href="/login"]').should('exist');
    cy.get('a[href="/cadastro"]').should('exist');
  });

  it('Deve carregar a página de Login com formulário e campos interativos', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').should('be.visible').type('teste@projeto-casa.com');
    cy.get('input[type="password"]').should('be.visible').type('senha123456');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('Esqueci a minha senha').should('be.visible');
    cy.contains('Cadastrar-se').should('be.visible');
  });

  it('Deve carregar a página de Cadastro com todos os campos necessários', () => {
    cy.visit('/cadastro');
    cy.get('input[placeholder*="nome"]').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('Deve carregar a página de Esqueci Minha Senha', () => {
    cy.visit('/esqueci-senha');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('Voltar para o Login').should('be.visible');
  });
});
