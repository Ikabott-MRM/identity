# Piloto SSI — Onboarding E2E

- **Modo:** SELF-HOST  
- **Contacto:** manuel.rico.tech@gmail.com  
- **Empiece aquí (humano):** [index.html](./index.html)  
- **Índice agente:** [AGENTE.md](./AGENTE.md)

## Guías por componente

1. [Identity](./guias/identity-arquitectura-instalacion.md)
2. [Emisor](./guias/emisor-arquitectura-instalacion.md)
3. [Citizen](./guias/citizen-arquitectura-instalacion.md)
4. [Verifier](./guias/verifier-arquitectura-instalacion.md)

## Requisitos para instalar con agente en AWS

Enfoque validado: el humano deja AWS CLI + SSM listos; el agente ejecuta comandos remotos en EC2 (como en `docs/identity/AWS_SSM_SETUP.md`).

### A. Humano (una vez)

1. Instalar AWS CLI donde corre el agente.
2. Credenciales con SSM:
   - `aws configure`, o
   - SSO: `aws configure sso --profile <perfil>` → `aws sso login --profile <perfil>`
3. Instalar Session Manager plugin (para `start-session`).
4. EC2 con SSM Agent, rol `AmazonSSMManagedInstanceCore`, red a endpoints SSM.
5. Entregar al agente (sin pegar secrets en el chat si es posible):
   - `AWS_PROFILE`
   - `AWS_REGION` (ej. `us-east-1`)
   - `EC2_INSTANCE_ID` (`i-…`)
   - Ruta remota Identity (ej. `/home/ubuntu/identity`)
6. IAM mínimo: `ssm:StartSession`, `ssm:SendCommand`, `ssm:GetCommandInvocation`, `ssm:DescribeInstanceInformation`, `ssm:ListCommandInvocations` (+ opcional `ec2:DescribeInstances`).

### B. Preflight del agente

```bash
aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION"
aws ssm describe-instance-information --profile "$AWS_PROFILE" --region "$AWS_REGION"
aws ssm send-command \
  --profile "$AWS_PROFILE" --region "$AWS_REGION" \
  --instance-ids "$EC2_INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["whoami","pwd","docker --version || true"]' \
  --output text
```

Leer salida con `aws ssm list-command-invocations --command-id <ID> --details`.

### C. Qué corre el agente

| Paso | Dónde | Guía |
|------|-------|------|
| Identity | EC2 vía SSM | `guias/identity-arquitectura-instalacion.md` |
| Emisor | Local o misma EC2 :3001 | `guias/emisor-arquitectura-instalacion.md` |
| Citizen / Verifier | Workstation / EAS | `guias/citizen` y `guias/verifier` |
| Smoke | Todo el stack | sección abajo |

### D. Prompt mínimo

```
Instala el piloto SSI SELF-HOST.
Lee docs/pilot/index.html (contexto), docs/pilot/AGENTE.md y docs/pilot/pilot-onboarding-e2e.md.
Guías en docs/pilot/guias/ (Identity → Emisor → Citizen → Verifier).
Usa AWS SSM: profile=$AWS_PROFILE region=$AWS_REGION instance=$EC2_INSTANCE_ID
Ruta remota Identity: /home/ubuntu/identity
No inventes secretos: pídemelos o genera placeholders y dime qué debo crear.
Contacto: manuel.rico.tech@gmail.com
```

## Orden de instalación (SELF-HOST)

1. Identity API — MySQL + DWN + env + migraciones + API keys + emisor. Puerto **3000**.
2. IDA-Emisor-Web — Cognito propio + `IDENTITY_API_KEY` + portal **3001**.
3. SSI-Citizen-App — API key móvil + `google-services.json` + build apuntando a Identity.
4. SSI-Verifier-App — misma base URL + API key + import `issuerPubK`.
5. Smoke test E2E.

## Checklist de secretos (sin valores)

| Componente | Ítem | Cómo generar |
|------------|------|--------------|
| Identity | `DB_PASSWORD` | Contraseña fuerte MySQL |
| Identity | `MAIL_USER` / `MAIL_PASSWORD` | Gmail app password (2FA) |
| Identity | `PINATA_JWT_TOKEN` + gateway | pinata.cloud → API Keys |
| Identity | `SECRET_PWD` + sales email | `openssl rand -base64 24`; conservar sales del email de init |
| Identity | API key Emisor | `npm run api-key:create -- "Emisor Web piloto" …` |
| Identity | API key móvil | `npm run api-key:create -- "Mobile piloto" …` |
| Identity | `WEB3_*` (opc.) | Wallet testnet + contrato |
| Emisor | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| Emisor | Cognito pool + client secret | AWS CLI / Console (pool propio) |
| Citizen | `google-services.json` | Firebase (package Android) |
| Citizen / Verifier | `EXPO_PUBLIC_API_*` | URL Identity + key móvil |

Nunca pegue secretos reales en docs, tickets o repos.

## Smoke test E2E

1. **Health Identity:** `curl http://<host>:3000/api` y `curl -H "x-api-key: $KEY" http://<host>:3000/issuerAgent/issuerPubK`
2. **Citizen — Solicitar:** DID → imagen → schema → enviar (pending).
3. **Emisor — Aprobar:** Cognito → pending → formulario → approve.
4. **Citizen — Presentar:** Credentials → QR.
5. **Verifier — Verificar:** Import key → scanner → QR → válida.

## Notas de red

- Emisor e Identity no comparten puerto local → Emisor en **3001**.
- Teléfono físico → IP LAN del host, no `localhost`.
- Emulador Android → `10.0.2.2:3000`.
- CORS Identity: permitir origen del portal (`CORS_ORIGIN`).
