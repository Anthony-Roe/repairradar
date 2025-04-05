import {createClient} from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  try {
    const { data: {user}, error: err } = await supabase.auth.getUser();
    if (err) return NextResponse.json({ error: "Unauthorized" });
    if (!user) return NextResponse.json({error: "Please login"});
    
  } catch (error) {
    console.error("User API error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? String(error) : undefined
    });
  }
}
