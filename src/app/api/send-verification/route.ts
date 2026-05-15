import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const SECRET = process.env.VERIFICATION_SECRET;

function requireSecret(): string {
    if (!SECRET) {
        throw new Error('VERIFICATION_SECRET is required. Add it to .env.local.');
    }
    return SECRET;
}

function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(code: string, email: string, expiresAt: number): string {
    const hmac = crypto.createHmac('sha256', requireSecret());
    hmac.update(`${code}|${email.toLowerCase()}|${expiresAt}`);
    return hmac.digest('hex');
}

export async function POST(request: NextRequest) {
    try {
        const { email, name } = await request.json();

        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!normalizedEmail) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        if (!normalizedEmail.endsWith('@ub.edu.ph')) {
            return NextResponse.json(
                { error: 'Please use your @ub.edu.ph email address.' },
                { status: 400 }
            );
        }

        const code = generateCode();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        const token = signToken(code, normalizedEmail, expiresAt);

        // Configure Gmail SMTP transport
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Send verification email
        await transporter.sendMail({
            from: `"Internly" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: 'Your Internly Verification Code',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #34d399, #10b981); display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; color: white;">I</div>
                    </div>
                    <h2 style="color: #1e1e2e; margin-bottom: 8px; text-align: center; font-size: 22px;">Verify your email</h2>
                    <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 24px;">
                        Hi ${name || 'there'}, use the code below to verify your Internly account:
                    </p>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 0 auto 24px;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #10b981; font-family: monospace;">${code}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; text-align: center;">This code expires in 10 minutes.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        If you didn&apos;t request this code, you can safely ignore this email.
                    </p>
                </div>
            `,
        });

        return NextResponse.json({ token, expiresAt });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Failed to send verification email:', errorMessage);
        return NextResponse.json(
            { error: `Failed to send verification email: ${errorMessage}` },
            { status: 500 }
        );
    }
}
