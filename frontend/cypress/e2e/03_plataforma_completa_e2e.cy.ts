describe('03 - Fluxo Completo da Plataforma C.A.S.A. (E2E Autenticado)', () => {
  beforeEach(() => {
    cy.loginMock();
  });

  it('Deve acessar o Dashboard e exibir métricas e status do dispositivo', () => {
    cy.visitarAutenticado('/dashboard');
    cy.get('main', { timeout: 10000 }).should('be.visible');
    cy.contains(/Personalize o seu dispositivo|Conectar Dispositivo|Visão Geral/).should('be.visible');
  });

  it('Deve acessar a tela /dispositivo e renderizar o Simulador Físico com botões e modos', () => {
    cy.visitarAutenticado('/dispositivo');
    
    // Se estiver em modo bloqueado por ausência de dispositivo vinculado, clica no modo desenvolvedor
    cy.get('body').then(($body) => {
      if ($body.text().includes('Acessar sem conexão')) {
        cy.contains('Acessar sem conexão').click();
      }
    });

    cy.contains('Simulador do Aparelho Físico C.A.S.A.', { timeout: 10000 }).should('be.visible');
    
    // Verifica controles do modo Ouvir Sons vs Modo Editar
    cy.contains('Ouvir Sons').should('be.visible');
    cy.contains('Modo Editar').should('be.visible');

    // Alterna para Modo Editar
    cy.contains('Modo Editar').click();

    // Verifica que na lista inferior cada ação possui seu indicador de Botão Físico
    cy.contains('Botão 1').should('be.visible');
    cy.contains('Botão 2').should('be.visible');
  });

  it('Deve acessar a rota /categoria e redirecionar para a gestão de categorias no /dispositivo', () => {
    cy.visitarAutenticado('/categoria');
    cy.url({ timeout: 10000 }).should('include', '/dispositivo');
  });

  it('Deve acessar a tela de Histórico e exibir filtros de busca e períodos', () => {
    cy.visitarAutenticado('/historico');
    cy.get('main', { timeout: 10000 }).should('be.visible');
    cy.get('main').contains('Histórico').should('be.visible');
    cy.get('input[type="text"]').should('be.visible');
  });

  it('Deve acessar a tela de Desempenho e exibir opções de análise e relatório', () => {
    cy.visitarAutenticado('/desempenho');
    cy.get('main', { timeout: 10000 }).should('be.visible');
    cy.get('main').contains('Desempenho').should('be.visible');
    cy.get('select').should('be.visible');
  });

  it('Deve acessar a tela de Perfil e carregar dados do usuário', () => {
    cy.visitarAutenticado('/perfil');
    cy.get('main', { timeout: 10000 }).should('be.visible');
    cy.get('main').contains('Meu Perfil').should('be.visible');
    cy.get('input').should('be.visible');
  });

  it('Deve acessar a tela de Configurações e permitir visualizar opções de acessibilidade', () => {
    cy.visitarAutenticado('/configuracoes');
    cy.get('main', { timeout: 10000 }).should('be.visible');
    cy.get('main').contains('Configurações').should('be.visible');
    cy.contains('Acessibilidade').should('be.visible');
  });
});
