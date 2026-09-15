# ControlCodmilla

Panel de administración para el sitio web de **Coodmilla**.  
CRUD de Noticias, Documentos PDF (DIAN-ESAL), Carrusel y Trabajadores.

## Stack

- **Frontend:** Next.js (panel en puerto 3001)
- **Backend de datos:** Supabase (Postgres + Auth + Storage)

El backend Spring Boot + MySQL quedó obsoleto para despliegue; el código en `backend/` se puede archivar.

## Requisitos

- Node.js 18+
- Proyecto Supabase con el schema de `../supabase/migrations/001_initial.sql`
- Usuario admin en Supabase Auth

## Arranque

```bash
# Configura .env.local (ver .env.example)
cd frontend
pnpm install
pnpm run dev
```

Panel: `http://localhost:3001`  
Login: email + password del usuario de Supabase Auth.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/login` | Acceso |
| `/` | Dashboard |
| `/noticias` | CRUD noticias |
| `/documentos` | CRUD PDFs |
| `/carrusel` | CRUD carrusel |
| `/trabajadores` | CRUD trabajadores |

Ver `../DEPLOY.md` y `../supabase/README.md`.
