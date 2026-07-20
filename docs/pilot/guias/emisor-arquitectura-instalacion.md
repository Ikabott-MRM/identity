# IDA-Emisor-Web — instalación SELF-HOST

- **Repo:** https://github.com/Ikabott-MRM/IDA-Emisor-Web  
- **Puerto local:** 3001  
- **Contacto:** manuel.rico.tech@gmail.com  
- **Prerreq:** Identity SELF-HOST arriba + API key de emisor

## Secretos a generar

| Variable | Cómo |
|----------|------|
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `IDENTITY_API_KEY` | `npm run api-key:create` en Identity |
| `COGNITO_*` | User Pool + app client propios (CLI abajo) |
| `NEXT_PUBLIC_API_BASE_URL` | URL Identity (LAN o público) |
| `NEXTAUTH_URL` | URL del portal (`http://localhost:3001` local) |

## Cognito (resumen)

```bash
aws cognito-idp create-user-pool --pool-name "ida-emisor-web-pilot" \
  --auto-verified-attributes email --username-attributes email \
  --policies "PasswordPolicy={MinimumLength=12,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}" \
  --region us-east-1
# Domain + client con callback http://localhost:3001/api/auth/callback/cognito
# Detalle: IDA-Emisor-Web/docs/COGNITO_AUTH.md
```

**Warning prod:** con `NODE_ENV=production` hay Cognito hardcodeado en algunos archivos; para piloto use env en desarrollo o parchee a `process.env`.

## Pasos

```bash
git clone https://github.com/Ikabott-MRM/IDA-Emisor-Web.git
cd IDA-Emisor-Web
npm install
cp .env.example .env
# Completar .env con secretos generados
npx next dev -p 3001
```

## Verificación

- Login Cognito → `/`
- Lista de solicitudes carga
- Aprobar pending completa emisión en Identity

## Siguiente

[citizen-arquitectura-instalacion.md](./citizen-arquitectura-instalacion.md)
