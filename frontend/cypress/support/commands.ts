// Custom Cypress commands
declare namespace Cypress {
  interface Chainable {
    loginMock(): Chainable<void>;
    visitarAutenticado(url: string): Chainable<void>;
  }
}

Cypress.Commands.add('loginMock', () => {
  cy.intercept('GET', '**/me', {
    statusCode: 200,
    body: {
      uid: 'user_teste_cypress',
      nome: 'Usuário Teste Cypress',
      email: 'teste@projeto-casa.com',
      notificacoes_ativas: true,
      modo_escuro: false,
      tamanho_fonte: 16,
      alto_contraste: false,
      feedback_sonoro: true,
    },
  }).as('getMe');

  cy.intercept('GET', '**/dispositivos', {
    statusCode: 200,
    body: [
      {
        mac: 'AA:BB:CC:DD:EE:FF',
        nome: 'ESP32 - C.A.S.A.',
        codigo: 'ESP32-EEFF',
        online: true,
        bateria_pct: 95,
        sinal_wifi: -58,
        ssid: 'Rede-Casa',
        ip: '192.168.1.150',
        firmware: 'v2.8.0',
        statusOnline: true,
        volume: 80,
      },
    ],
  }).as('getDispositivos');

  cy.intercept('GET', '**/categorias', {
    statusCode: 200,
    body: [
      {
        id: 'cat_1',
        nome: 'Casa',
        slug: 'casa',
        ordem: 0,
        emoji: '🏠',
        botoes: [
          { id: 'btn_1', rotulo: 'Água', ordem: 0, tipo_audio: 'feminino' },
          { id: 'btn_2', rotulo: 'Comer', ordem: 1, tipo_audio: 'feminino' },
          { id: 'btn_3', rotulo: 'Dormir', ordem: 2, tipo_audio: 'feminino' },
          { id: 'btn_4', rotulo: 'Banheiro', ordem: 3, tipo_audio: 'feminino' },
          { id: 'btn_5', rotulo: 'Brincar', ordem: 4, tipo_audio: 'feminino' },
        ],
      },
      {
        id: 'cat_2',
        nome: 'Escola',
        slug: 'escola',
        ordem: 1,
        emoji: '🏫',
        botoes: [
          { id: 'btn_6', rotulo: 'Caderno', ordem: 0, tipo_audio: 'feminino' },
          { id: 'btn_7', rotulo: 'Lanche', ordem: 1, tipo_audio: 'feminino' },
        ],
      },
      {
        id: 'cat_3',
        nome: 'Sentimentos',
        slug: 'sentimentos',
        ordem: 2,
        emoji: '⭐',
        botoes: [
          { id: 'btn_8', rotulo: 'Feliz', ordem: 0, tipo_audio: 'feminino' },
        ],
      },
    ],
  }).as('getCategorias');
});

Cypress.Commands.add('visitarAutenticado', (url: string) => {
  cy.visit(url, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem('cypress_mock_auth', 'true');
    },
  });
});
