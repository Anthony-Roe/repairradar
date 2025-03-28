import { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the access token from cookies
  const token = req.cookies["sb-access-token"];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Get authenticated user
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const userId = userData.user.id; // Supabase Auth user ID

  // Fetch user data from `users` table
  const { data: user, error: dbError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single(); // Assuming `id` is the primary key

  if (dbError) {
    return res.status(500).json({ error: "Failed to fetch user" });
  }

  return res.status(200).json({ user });
}
