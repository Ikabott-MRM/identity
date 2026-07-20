# Piloto SSI — Guía para agentes (SELF-HOST)

**Idioma:** español  
**Modo:** SELF-HOST (el implementador genera todos los secretos)  
**Contacto:** manuel.rico.tech@gmail.com  

**Punto de entrada humano:** [index.html](./index.html)  
**Runbook:** [pilot-onboarding-e2e.md](./pilot-onboarding-e2e.md)

## Archivos

| Archivo | Uso |
|---------|-----|
| `index.html` | Empiece aquí (humano) |
| `AGENTE.md` (este) | Contrato e índice para agentes |
| `pilot-onboarding-e2e.md` | AWS SSM, secretos, smoke test |
| `guias/*.md` | Pasos por componente |

**Contrato:** no invente secretos. Si faltan, pida al humano que los genere (checklist en E2E) o deje placeholders y liste qué crear.

## Orden de trabajo

1. Confirmar modo SELF-HOST y contacto.
2. Si Identity va en EC2 → [requisitos AWS SSM](./pilot-onboarding-e2e.md#requisitos-para-instalar-con-agente-en-aws).
3. [guias/identity-arquitectura-instalacion.md](./guias/identity-arquitectura-instalacion.md)
4. [guias/emisor-arquitectura-instalacion.md](./guias/emisor-arquitectura-instalacion.md)
5. [guias/citizen-arquitectura-instalacion.md](./guias/citizen-arquitectura-instalacion.md)
6. [guias/verifier-arquitectura-instalacion.md](./guias/verifier-arquitectura-instalacion.md)
7. Smoke → [pilot-onboarding-e2e.md](./pilot-onboarding-e2e.md#smoke-test-e2e)

## Repos públicos

- https://github.com/Ikabott-MRM/identity
- https://github.com/Ikabott-MRM/IDA-Emisor-Web
- https://github.com/Ikabott-MRM/SSI-Citizen-App
- https://github.com/Ikabott-MRM/SSI-Verifier-App

## Referencia ops (Identity en AWS)

`docs/identity/AWS_SSM_SETUP.md` y `docs/identity/SSM_RUNBOOK.md`.
