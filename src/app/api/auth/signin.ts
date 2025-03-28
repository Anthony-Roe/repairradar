import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";
import { serialize } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  if (!data.session) {
    return res.status(401).json({ error: "No session returned" });
  }

  // Set authentication cookies
  const { access_token, refresh_token } = data.session;
  res.setHeader("Set-Cookie", [
    serialize("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }),
    serialize("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    }),
  ]);

  return res.status(200).json({ message: "Login successful" });
}
