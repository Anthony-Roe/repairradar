# Next.js Module Generation Request for RepairRadar

## Module Overview
- Name: dashboard
- Component Name: Dashboard
- Description: multi-ask dashboard containing all modules using ModuleManager to get a list of modules
- Target Directory: src/shared/modules/dashboard

## Technical Requirements
### Core Features
- Framework: Next.js 13+ with App Router
- TypeScript: Required
- Styling: Tailwind CSS with shadcn/ui components
- Database: Prisma ORM with model dashboard
- API: REST endpoints with Next.js API routes

### File Structure
1. components/
   - DashboardPage.tsx (Main component)
2. types.ts (Type definitions)
3. api/
   - route.ts (API handlers)

### Dependencies
- None

### Integration with ModuleManager
- Add to `moduleComponents` in `src/shared/modules/moduleManager.ts`:
  ```typescript
  "dashboard": () => import("@/shared/modules/dashboard/components/DashboardPage")
  ```
- Must accept `tenant: string` prop as per RawModule interface

### Component Requirements
- Use Tailwind CSS and shadcn/ui components (Card, Button, Input, Select, etc.)
- Implement responsive design
- Export default component named DashboardPage
- Handle authentication via `useSession` from next-auth/react
- Implement tenant-specific data fetching
- Integrate with Prisma via fetch to /api/dashboard
- Include loading states with Loader2 from lucide-react
- Use toast notifications via sonner
- Include ClientToaster component

### Type Definitions
- Interface: Dashboard
- Properties:
  - id: string
  - tenantId: string
  
  - Add additional fields specific to the Prisma model

### API Requirements
- Path: /api/dashboard
- Methods:
  - GET: Fetch all dashboard records for the tenant
  - POST: Create new dashboard record
  - PUT: Update existing record (support soft delete/restore)
  - DELETE: Hard delete (admin only)
- Authentication: Use getServerSession with authOptions from '@/app/api/auth/[...nextauth]/route'
- Tenant validation: Verify subdomain/tenantId
- Error handling: Return JSON responses with status codes

## Implementation Guidelines
- Use ES modules syntax
- Follow Next.js conventions
- Use absolute imports with '@/shared/*' alias
- Implement soft delete pattern (deletedAt field)
- Match existing module patterns (e.g., assets, calls)
- Use consistent CRUD operations and UI patterns

## Example Output Structure
```
src/shared/modules/dashboard/
├── components/
│   └── DashboardPage.tsx
├── types.ts
│── api/
│   └── route.ts
```

## Additional Notes
- Ensure compatibility with TenantConfig and ModuleManager
- Use consistent error handling and toast notifications
- Match UI/UX patterns from existing modules (e.g., assets, work-orders)
