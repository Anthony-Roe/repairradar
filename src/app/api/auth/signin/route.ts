import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // Restrict to POST method
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  // Extract email and password from request body
  let email, password;
  try {
    const body = await req.json();
    email = body.email;
    password = body.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  console.log('Received sign-in request:', { email, password });
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  try {
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json({ error: 'No session returned' }, { status: 401 });
    }

    // Set authentication cookies
    const { access_token, refresh_token } = data.session;
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    const cookiesToSet = [
      {
        name: 'sb-access-token',
        value: access_token,
        options: { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 }, // 7 days
      },
      {
        name: 'sb-refresh-token',
        value: refresh_token,
        options: { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 }, // 30 days
      },
    ];

    // Create response and manually set cookies
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      },
      { status: 200 }
    );

    // Set cookies using NextResponse
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}