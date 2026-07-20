# SSI-Citizen-App — instalación SELF-HOST

- **Repo:** https://github.com/Ikabott-MRM/SSI-Citizen-App  
- **Package Android:** `com.ssi.driverlicensemobile`  
- **Contacto:** manuel.rico.tech@gmail.com  
- **Prerreq:** Identity arriba + API key móvil

## Secretos / variables

| Variable | Cómo |
|----------|------|
| `EXPO_PUBLIC_API_BASE_URL` | URL Identity (LAN / `10.0.2.2:3000` emulador) |
| `EXPO_PUBLIC_API_KEY` | `npm run api-key:create -- "Citizen App piloto" …` en Identity |
| `EXPO_PUBLIC_WEB3_*` | Opcional; mismo contrato que Identity |
| `EXPO_PUBLIC_IPFS_GATEWAY_BASE_URL` | Gateway lectura (sin JWT), ej. Pinata |
| `google-services.json` | Firebase Console → app Android → descargar a raíz del repo |

## Pasos

```bash
git clone https://github.com/Ikabott-MRM/SSI-Citizen-App.git
cd SSI-Citizen-App
npm install
cp .env.example .env
# Completar EXPO_PUBLIC_* 
# Colocar google-services.json (package com.ssi.driverlicensemobile)
npx expo start
# o: eas build --profile preview --platform android
```

## Verificación

- Crear DID sin 401
- Solicitud visible en Emisor
- Tras approve: credencial + QR

## Siguiente

[verifier-arquitectura-instalacion.md](./verifier-arquitectura-instalacion.md)
