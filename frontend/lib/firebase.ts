import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Preencha em frontend/.env.local (Firebase Console > Configurações do projeto > Seus apps > Web)
const app = getApps()[0] ?? initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

export const auth = getAuth(app);

/* Como o login funciona neste projeto
   - CADASTRO: feito pelo backend em 2 etapas (POST /auth/cadastro envia o código por e-mail;
     POST /auth/confirmar cria a conta no Firebase). Depois, o login é normal.
   - LOGIN:    signInWithEmailAndPassword(auth, email, senha)  +  api.get('/me')
   - ESQUECI:  sendPasswordResetEmail(auth, email)  (direto no Firebase)
   - SAIR:     signOut(auth)  (veja lib/auth.ts)
   Veja app/cadastro, app/login, app/esqueci-senha e app/(app)/layout.tsx (guarda das telas logadas). */
