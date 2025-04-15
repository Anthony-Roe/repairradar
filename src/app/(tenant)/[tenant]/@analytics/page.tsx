// src/app/(tenant)/[tenant]/@dashboard/error.tsx
"use client";

import { Button, Card, CardHeader, CardTitle } from "@/components/ui";
import { Link } from "lucide-react";
import { useEffect } from "react";

export default function MainPage() {

  return (
    <div className="p-6">
        <Card>
      <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Assets
            <Button asChild>
              <Link href={`/@modal/(.)asset/new`}>Add Asset</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        </Card>
    </div>
  );
}