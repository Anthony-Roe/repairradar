# RepairRadar Module Generation Request

## Module Specifications
- Name: dashboard
- Component: DashboardPage
- Description: multi-task view with all modules
- Database Model: [RESEARCH AND DETERMINE if this module needs database storage]
- Dependencies: assets, calls, preventative-maintenance, work-orders (already exists in project)

## Technical Requirements
### Architecture Decisions Needed
- API Routes: Required (implement Next.js API routes)
- State Management: [RESEARCH AND DETERMINE if Zustand or React Context is more appropriate]
- Form Handling: [RESEARCH AND DETERMINE if React Hook Form is needed]

### File Structure Guidance
```
dashboard/
├── components/
│   ├── DashboardPage.tsx
│   └── [DETERMINE if additional subcomponents are needed]
├── types.ts
├── [RESEARCH if hooks.ts is needed for custom hooks]
├── api/
│   └── route.ts
└── README.md
```

### Research-Based Implementation
1. Analyze the module description "multi-task view with all modules" and:
   - Determine optimal data structure
   - Identify required CRUD operations
   - Design appropriate UI components

2. Based on your analysis:


3. Create component structure:
```tsx
// DashboardPage.tsx
"use client";
import { useTenantData } from "@/shared/lib/hooks";
import { useassetsData } from "@/shared/modules/assets/hooks";
import { usecallsData } from "@/shared/modules/calls/hooks";
import { usepreventative-maintenanceData } from "@/shared/modules/preventative-maintenance/hooks";
import { usework-ordersData } from "@/shared/modules/work-orders/hooks";


export default function DashboardPage({ tenant }: { tenant: string }) {
  // [RESEARCH AND IMPLEMENT data fetching logic]
  return (
    <div className="space-y-4">
      {/* [DESIGN appropriate UI based on module purpose] */}
    </div>
  );
}
```

## Research Directives
1. If database need is unspecified:
   - Analyze the module's data persistence requirements
   - Recommend appropriate Prisma models if needed
   - Or suggest client-side state if sufficient

2. If API need is unspecified:
   - Determine if server-side processing is required
   - Identify necessary API endpoints
   - Or confirm client-side only implementation

3. For all unspecified aspects:
   - Make reasonable assumptions based on module purpose
   - Document your decisions in code comments
   - Suggest alternatives if appropriate

## Quality Requirements
- Comprehensive JSDoc explaining research decisions
- TypeScript interfaces reflecting data needs
- [RESEARCH appropriate error handling patterns]
- [DETERMINE optimal loading state implementations]
- Mobile-responsive design by default
