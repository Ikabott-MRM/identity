# Identity API — instalación SELF-HOST

- **Repo:** https://github.com/Ikabott-MRM/identity  
- **Puerto:** 3000  
- **Contacto:** manuel.rico.tech@gmail.com  
- **SSM:** si está en EC2, use [pilot-onboarding-e2e.md § AWS](../pilot-onboarding-e2e.md#requisitos-para-instalar-con-agente-en-aws)

## Prerrequisitos

- Node.js 18+ (20 recomendado), npm, Git, Docker + Compose
- Cuentas: Pinata (JWT), Gmail app password
- Opcional: wallet Rootstock testnet

## Pasos

```bash
git clone https://github.com/Ikabott-MRM/identity.git
cd identity
git checkout dev
npm install
docker compose up -d database
cp .env.example .env
# Humano completa secretos en .env (nunca inventar valores reales)
npx knex migrate:up
npm run api-key:create -- "Emisor Web piloto" "<pwd-cifrado>"
npm run api-key:create -- "Mobile piloto" "<pwd-cifrado>"
# Guardar plaintext de las keys una sola vez
docker compose up -d dwn-server ssi-service
# GATEWAY_URI apunta al DWN del compose (ver .env.example / docker-compose)
npm run start:dev
# o: npm run build && npm run start:prod
# o Docker: docker compose up -d --build
```

## Secretos a generar (humano)

| Secreto | Cómo |
|---------|------|
| `DB_PASSWORD` | Contraseña MySQL fuerte |
| `MAIL_PASSWORD` | Gmail → Contraseñas de aplicaciones |
| `PINATA_JWT_TOKEN` / `PINATA_GATEWAY` | pinata.cloud |
| `SECRET_PWD` | `openssl rand -base64 24` |
| API keys | CLI `api-key:create` |
| `WEB3_PRIVATE_KEY` (opc.) | Wallet testnet nueva |

## Verificación

```bash
curl http://localhost:3000/api
curl -H "x-api-key: $KEY" http://localhost:3000/issuerAgent/issuerPubK
```

## Siguiente

[emisor-arquitectura-instalacion.md](./emisor-arquitectura-instalacion.md)
