describe('02 - Proteção de Rotas e Redirecionamento de Acesso', () => {
  const rotasProtegidas = [
    '/dashboard',
    '/dispositivo',
    '/categoria',
    '/historico',
    '/desempenho',
    '/perfil',
    '/configuracoes',
  ];

  rotasProtegidas.forEach((rota) => {
    it(`Deve redirecionar para /login ao tentar acessar ${rota} sem autenticação`, () => {
      cy.visit(rota);
      cy.url({ timeout: 10000 }).should('include', '/login');
      cy.get('input[type="email"]').should('be.visible');
    });
  });
});
