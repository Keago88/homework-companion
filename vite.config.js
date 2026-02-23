import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __firebase_config: JSON.stringify({
      apiKey: 'demo-api-key',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo-project',
      storageBucket: 'demo.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abc123'
    }),
    __app_id: JSON.stringify('study-companion-b2c'),
    __initial_auth_token: JSON.stringify(null)
  }
});
