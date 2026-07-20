# SSI-Verifier-App — instalación SELF-HOST

- **Repo:** https://github.com/Ikabott-MRM/SSI-Verifier-App  
- **Contacto:** manuel.rico.tech@gmail.com  
- **Prerreq:** Identity arriba; misma base URL que Citizen

## Secretos / variables

| Variable | Cómo |
|----------|------|
| `EXPO_PUBLIC_API_BASE_URL` | URL Identity SELF-HOST |
| `EXPO_PUBLIC_API_KEY` | Key móvil (puede reutilizar la de Citizen) |

Sin Web3, Pinata ni Firebase en esta app.

## Pasos

```bash
git clone https://github.com/Ikabott-MRM/SSI-Verifier-App.git
cd SSI-Verifier-App
npm install
cp .env.example .env
# EXPO_PUBLIC_API_BASE_URL=...
# EXPO_PUBLIC_API_KEY=...
npx expo start
# EAS: ver SSI-Verifier-App/EAS_ENV_SETUP.md
```

## Verificación

1. Import issuer public key desde Identity
2. Escanear QR de Citizen → credencial válida
3. JWT alterado → invalid

## Siguiente

[Smoke E2E](../pilot-onboarding-e2e.md#smoke-test-e2e)
