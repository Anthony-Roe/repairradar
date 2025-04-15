"use client";

import { useEffect } from "react";

export function RealTimeUpdates({ tenant }: { tenant: string }) {
  useEffect(() => {
    const eventSource = new EventSource(`/api/${tenant}/dashboard/events`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Real-time update:", data);
      // Update state or trigger revalidation here
    };

    eventSource.onerror = () => {
      console.error("SSE error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [tenant]);

  return null;
}