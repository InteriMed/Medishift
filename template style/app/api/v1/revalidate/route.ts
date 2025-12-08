import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * On-Demand Revalidation API
 * 
 * This endpoint allows external systems (CMS, webhooks) to trigger
 * ISR revalidation for specific paths or tags.
 * 
 * Usage:
 * POST /api/v1/revalidate?secret=YOUR_SECRET
 * Body: { "path": "/blog/post-slug" } or { "tag": "blog-posts" }
 */

export async function POST(request: NextRequest) {
    try {
        // 1. Validate secret
        const secret = request.nextUrl.searchParams.get('secret');

        if (!secret || secret !== process.env.REVALIDATE_SECRET) {
            console.error('[Revalidation] Invalid or missing secret');
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid or missing secret',
                    timestamp: new Date().toISOString()
                },
                { status: 401 }
            );
        }

        // 2. Parse request body
        const body = await request.json();
        const { path, tag } = body;

        if (!path && !tag) {
            console.error('[Revalidation] Missing path or tag in request body');
            return NextResponse.json(
                {
                    success: false,
                    message: 'Either "path" or "tag" must be provided',
                    timestamp: new Date().toISOString()
                },
                { status: 400 }
            );
        }

        // 3. Perform revalidation
        const revalidated: { path?: string; tag?: string } = {};

        if (path) {
            console.log(`[Revalidation] Revalidating path: ${path}`);
            revalidatePath(path);
            revalidated.path = path;
        }

        if (tag) {
            console.log(`[Revalidation] Revalidating tag: ${tag}`);
            revalidateTag(tag);
            revalidated.tag = tag;
        }

        // 4. Return success response
        console.log('[Revalidation] Success:', revalidated);
        return NextResponse.json({
            success: true,
            revalidated,
            timestamp: new Date().toISOString(),
            message: 'Revalidation successful'
        });

    } catch (error) {
        console.error('[Revalidation] Error:', error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Internal server error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

// Optional: GET endpoint for health check
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret');

    if (!secret || secret !== process.env.REVALIDATE_SECRET) {
        return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
        );
    }

    return NextResponse.json({
        status: 'operational',
        endpoint: '/api/v1/revalidate',
        methods: ['POST'],
        timestamp: new Date().toISOString()
    });
}
