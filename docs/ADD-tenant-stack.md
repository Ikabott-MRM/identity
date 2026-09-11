# ADD — SSI Tenant Stack (todos los tenants)

| Campo | Valor |
|-------|--------|
| **Tipo** | Architecture Design Document (ADD) |
| **Alcance** | Despliegue SaaS siloed: **1 cliente = 1 stack CloudFormation** |
| **Audiencia** | Ingeniería, onboarding de tenants, presentaciones |
| **Estado** | v1 (piloto) — 2026-09 |
| **Cuenta AWS** | `870318143452` (perfil `ssi-admin`) |
| **Plantilla** | [`infra/tenant-stack/template.yaml`](../infra/tenant-stack/template.yaml) |
| **Runbook** | [`tenant-stack-onboarding.md`](./tenant-stack-onboarding.md) |

> Este ADD describe la **arquitectura de despliegue y límites** compartida por Geyser, AvalDAO y cualquier tenant futuro.  
> No reemplaza el PRD de producto ni los ADRs puntuales (A+B documentos, schemas por marca).

---

## 1. Contexto y objetivo

SSI (Sovereign Self Identity) permite a un **emisor institucional** acreditar sujetos con **credenciales verificables (VC)**, que el titular guarda y presenta, y que un **verificador** comprueba (idealmente offline).

Objetivo del stack v1: **provisionar un tenant completo y aislado** sin refactors multi-tenant in-process (`tenant_id` en una sola API compartida).

---

## 2. Principio rector

```
1 cliente  =  1 stack CloudFormation  =  1 Identity EC2 + Cognito + Amplify Emisor + secrets
```

| Decisión | Razón |
|---------|--------|
| Siloed (elegido) | Aislamiento de datos/claves, blast radius acotado, branding y schemas por cliente |
| Multi-tenant in-app (diferido) | Menor costo unitario, pero acopla seguridad y release entre clientes |

**Consecuencia:** destruir el stack de un tenant no debe afectar a otro.

---

## 3. Vista de contexto (C4 L1)

```
                    ┌─────────────────────────────────────────┐
                    │           Tenant <slug> (AWS)           │
  Ciudadano APK ───►│  Identity API (EC2 + EIP / DNS)         │◄── Emisor web
  Verificador APK ─►│  MySQL local · docs en disco            │     (Amplify+Cognito)
                    │  Secrets Manager runtime                │
                    └───────────────┬─────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
         DHT / Pkarr            IPFS (Pinata)         (opc.) Rootstock
         (DID resolve)          (VC cifradas)         (piloto anclas)
```

Apps móviles y Firebase App Distribution / EAS **no** forman parte del stack CFN v1: se construyen y firman fuera, apuntando al `ApiHostname` y `apiKeyMobile` del tenant.

---

## 4. Componentes

### 4.1 Dentro del stack (CloudFormation)

| Componente | Tecnología | Rol |
|------------|------------|-----|
| **Identity** | EC2 desde **Golden AMI** + nginx/TLS | API NestJS: DID, requests, emisión VC, documentos A+B, sesión verificador |
| **EIP (+ Route53 opcional)** | EC2 EIP / R53 | Hostname estable de API (`ApiHostname`) |
| **MySQL** | En la misma instancia (v1) | Estado operativo: requests, settings, no es el store de la VC |
| **Cognito** | User Pool + Client + Domain | Login operadores Emisor |
| **Amplify Emisor** | App + branch `main` | Portal Next.js; env de branding + `API_BASE_URL` |
| **Secrets Manager** | `ssi/tenant/<slug>/runtime` (+ auxiliares) | API keys, JWT secrets, Pinata, mail, verifier/DID-auth/doc signing |
| **SSM Association** | `tenant-post-deploy.sh` | Migrations, generación de secretos vacíos, wire Amplify env |

### 4.2 Fuera del stack (por tenant, manual / EAS)

| Componente | Rol |
|------------|-----|
| **Ciudadano (Expo)** | Crea DID, solicita credencial, guarda VC |
| **Verificador (Expo)** | Importa pubkey emisor, valida VC (+ photoHash), código de empresa |
| **EAS / App Distribution** | Build y distribución; `EXPO_PUBLIC_*` inyectados por env (nunca en `eas.json`) |
| **Firebase (ssi-ida)** | Apps por tenant para distribución (no runtime SSI) |
| **DNS externo** | Si no se usa la zona Route53 del stack |

### 4.3 Dependencias compartidas (cuenta / globales)

| Recurso | Nota |
|---------|------|
| **Golden AMI** | Imagen sin datos de tenant; rebasear cuando Identity cambia de forma “baked” |
| **Service Catalog (opcional)** | Producto que lanza el mismo `template.yaml` |
| **Pinata / DHT gateway** | Credenciales por tenant en runtime secret; gateway URI parametrizable |

---

## 5. Flujos lógicos (producto)

1. **Alta de identidad:** Ciudadano → `POST /issuerAgent/did` (API key móvil) → DID `did:dht:…`.
2. **Solicitud:** Ciudadano sube evidencia → Identity guarda request + documento (disco) → estado `pending`.
3. **Emisión:** Operador Emisor (Cognito) aprueba → Identity firma VC, incluye claims de producto (`photoHash`, `document_id` cuando aplica) → cifra y pinea en IPFS.
4. **Presentación / verificación:** Titular presenta VC (QR/JWT) → Verificador valida firma con pubkey del emisor; opcionalmente compara hash de foto; sesión corta con **código de empresa**.

Detalle de documentos firmados: [`design-did-auth-signed-documents-A-B.md`](./design-did-auth-signed-documents-A-B.md).  
Piloto verificador: [`geyser-verifier-pilot.md`](./geyser-verifier-pilot.md).

---

## 6. Límites de confianza y secretos

| Límite | Qué lo cruza | Control |
|--------|--------------|---------|
| Internet → Identity | Ciudadano / Verificador / Emisor proxy | TLS, `x-api-key` de tenant, rate/SG 80/443 |
| Sujeto (DID) → Identity | Acciones sobre “lo mío” | Capa A: JWT proof-of-DID (además de API key) |
| Emisor → Identity | Approve/reject, company code | Cognito en portal + API key Emisor en server |
| Verificador → fotos | Descarga evidencia | Código de empresa + sesión JWT corta + URL HMAC (B) |
| Tenant A ↔ Tenant B | Nada | Stacks y secrets separados |

**Regla de higiene:** claves de apps en **EAS Environment Variables** / Secrets Manager; no en repo (`eas.json` / `app.config.js`).

---

## 7. Personalización por tenant (sin romper el ADD)

El mismo ADD admite variación **paramétrica**, no de forma:

| Dimensión | Cómo |
|-----------|------|
| Branding | Env Amplify / `tenantBrand` en apps — [`tenant-branding.md`](./tenant-branding.md) |
| Schemas de credencial | Defaults de stack: `associate`; builds de marca pueden filtrar (ej. Geyser: `donor` + `fundraiser`) |
| Hostnames | `ApiHostname`, `PortalHostname`, zona R53 |
| AMI | Parámetro `AmiId` (siempre golden, sin datos) |

---

## 8. Decisiones (ADR resumidos)

| ID | Decisión | Estado |
|----|----------|--------|
| ADR-01 | Siloed CFN por cliente, no multi-tenant in-app | Aceptada (v1) |
| ADR-02 | Identity en EC2 desde Golden AMI (no ECS/Lambda v1) | Aceptada |
| ADR-03 | Emisor en Amplify + Cognito | Aceptada |
| ADR-04 | Ciudadano/Verificador fuera del stack v1 | Aceptada |
| ADR-05 | Documentos: A+B (DID auth + URL HMAC), no cifrado al DID | Aceptada (piloto) |
| ADR-06 | VC ancla foto vía `photoHash` para verificación offline | Aceptada (piloto) |

---

## 9. Fuera de alcance v1

- Auto-provision de proyectos EAS / APKs en el CFN  
- Billing / control plane multi-tenant  
- Refactor `tenant_id` en una sola API compartida  
- Citizen/Verifier iOS producción (TestFlight) como parte del stack  
- Alta disponibilidad Identity (ASG multi-AZ)

---

## 10. Diagrama de despliegue (L2 resumido)

```
[CFN ssi-tenant-<slug>]
  ├─ EC2 (Golden AMI) ── SSM post-deploy ──► .env + migrations + keys
  │     └─ Identity :443 ── MySQL ── /documents
  ├─ EIP ──► ApiHostname
  ├─ Cognito User Pool
  ├─ Amplify App (IDA-Emisor-Web) ── env branding + API URL
  └─ Secrets Manager  ssi/tenant/<slug>/runtime
```

---

## 11. Documentos relacionados

| Doc | Uso |
|-----|-----|
| [`tenant-stack-onboarding.md`](./tenant-stack-onboarding.md) | Cómo lanzar / verificar un tenant |
| [`GOLDEN_AMI_IDENTITY.md`](./GOLDEN_AMI_IDENTITY.md) | Cómo hornear la AMI |
| [`infra/tenant-stack/README.md`](../infra/tenant-stack/README.md) | Deploy manual CFN |
| [`SSI-System-Architecture.md`](./SSI-System-Architecture.md) | Flujos API / VC (producto, no solo stack) |
| [`tenant-branding.md`](./tenant-branding.md) | Checklist de marca por cliente |

---

## 12. Criterios de “arquitectura OK” al onboardear

1. Stack `CREATE_COMPLETE`; post-deploy SSM OK.  
2. `GET /requests` con key Emisor → 200.  
3. Portal Amplify con branding del tenant (no default IOVF/Zijin).  
4. Runtime secret poblado; `apiKeyMobile` solo en EAS del tenant.  
5. Flujo request → approve → VC; Verificador valida con pubkey + (si aplica) photoHash / company code.
