import { Skeleton } from "@/components/ui/skeleton";

// src/components/data-fetching-states.tsx
export function LoadingState() {
    return (
      <div className="flex flex-col space-y-3">
        <Skeleton className="h-[125px] w-[250px] rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
    </div>
    );
  }
  
  export function ErrorState({ error }: { error: Error }) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded">
        <p>Error: {error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-100 rounded"
        >
          Retry
        </button>
      </div>
    );
  }