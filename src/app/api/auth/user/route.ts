import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data: { session }, error: err } = await supabase.auth.getSession();
    if (err || !session?.user) return NextResponse.json({ error: "Unauthorized" });
    const user = session.user;

    // Fetch user profile from database
    const { data: profile, error: dbError } = await supabase
      .from("users")
      .select("id, email, created_at, updated_at") // Specify columns instead of *
      .eq("id", user.id)
      .single();

    if (dbError || !profile) {
      return NextResponse.json({ 
        error: "Failed to retrieve user profile",
        details: dbError?.message 
      });
    }

    // Return successful response
    return NextResponse.json({ 
      user: {
        ...profile,
        email: user.email // Include authenticated email from Supabase Auth
      }
    });

  } catch (error) {
    console.error("User API error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? String(error) : undefined
    });
  }
}