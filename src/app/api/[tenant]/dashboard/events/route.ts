import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

// Server-side secret for internal validation
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'your-secret-here';

export async function GET(req: NextRequest, { params }: { params: { tenant: string } }) {
  const isInternalCall = req.headers.get('x-internal-token') === INTERNAL_SECRET;
  if (!isInternalCall) {
    await requireAuth();
  }

  const { tenant } = await params;
  const encoder = new TextEncoder();
  const url = new URL(req.nextUrl);
  url.pathname = `/api/${tenant}/dashboard`;

  const stream = new ReadableStream({
  /* The `stream` in the code snippet is used to create a readable stream in Node.js. In this
  context, it is being used to handle server-sent events (SSE) for real-time updates. The `stream`
  is initialized with an async `start` function that sets up the SSE connection, fetches updates
  from a specified URL, and sends events to the client. */
    async start(controller) {
      let isClosed = false;
      controller.enqueue(encoder.encode('event: connect\n\n')); // Initiate SSE connection
      const sendEvent = (data: object) => {
        if (isClosed) return; // Skip if stream is closed
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          controller.error(undefined)
          console.error('SSE send error:', error);
        }
      };

      const fetchUpdates = async () => {
        try {
          const res = await fetch(url);
          const data = await res.json();
          sendEvent({ ...data.tenant, timestamp: new Date().toISOString() });
        } catch (error) {
          sendEvent({ type: 'error', message: 'Update failed' });
        }
      };

      // Initial fetch
      await fetchUpdates();

      // Poll every 5 seconds
      const updateInterval = setInterval(() => {
        if (!isClosed) fetchUpdates(); // Only fetch if stream is active
      }, 5000);

      // Keep-alive every 30 seconds
      const keepAliveInterval = setInterval(() => {
        if (!isClosed) sendEvent({ type: 'ping', timestamp: new Date().toISOString() });
      }, 30000); // Adjusted back to 30s (was 3000 in your snippet)

      // Cleanup when stream closes
      return () => {
        isClosed = true;
        clearInterval(updateInterval);
        clearInterval(keepAliveInterval);
        controller.close(); // Explicitly close the controller
      };
    },

    cancel() {
      console.log(`Stream cancelled for tenant: ${tenant}`);
    },
    pull(controller) {
      controller
    },
  },
  {
    highWaterMark: 10, // Control buffer size
  },


);

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export const config = {
  api: { bodyParser: false },
};