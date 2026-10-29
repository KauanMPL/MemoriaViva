# Memória Viva — app Expo refatorado

Aplicativo React Native/Expo separado por responsabilidades, preservando a interface e os fluxos presentes no código original.

## Estrutura

- `App.js`: inicialização, sessão, navegação principal e estado global.
- `src/services/api.js`: URL da API, cores, helpers e cliente HTTP.
- `src/theme/styles.js`: estilos compartilhados.
- `src/components/ui.js`: componentes reutilizáveis.
- `src/components/AppLayout.js`: cabeçalho, abas e layout autenticado.
- `src/screens/Onboarding.js`: boas-vindas, login/cadastro, recuperação e criação da família.
- `src/screens/Memories.js`: dashboard, timeline, formulário e detalhes das memórias.
- `src/screens/Account.js`: membros e configurações.

## Executar no Windows

1. Instale Node.js LTS.
2. Na pasta do projeto, execute `npm install`.
3. Configure `EXPO_PUBLIC_API_URL` com a URL acessível do backend. Crie `.env` a partir de `.env.example`.
4. Execute `npx expo start`.

## Backend obrigatório

Este app é cliente de uma API REST. Os endpoints `/api/auth/*`, `/api/families/*`, `/api/chapters/*` e os endpoints de membros/mídia chamados no código precisam existir no backend. O arquivo original continha uma URL pública fixa como fallback; ela foi mantida como fallback no código. Para execução local, configure a URL correta do seu backend.

- Android Emulator: normalmente `http://10.0.2.2:PORTA`.
- iOS Simulator: normalmente `http://localhost:PORTA`.
- Celular físico: use o IP LAN do computador, por exemplo `http://192.168.x.x:PORTA`.
- Expo Web: `http://localhost:PORTA` se backend e frontend estiverem no mesmo computador.

Não coloque segredos ou chaves privadas no app mobile.
