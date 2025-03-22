import { NextRequest, NextResponse } from "next/server";

//images to video
const KLING_API_DOMAIN = 'https://api.klingai.com';

// Helper function to ensure we always return JSON
const errorResponse = (message: string, status: number = 500, details: any = null, request_id: string = '') => {
    return new NextResponse(
        JSON.stringify({
            code: status,
            message: message,
            request_id: request_id,
            data: details
        }),
        {
            status,
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
};

// Helper function to base64url encode
function base64UrlEncode(str: string | Uint8Array): string {
    let bytes;
    if (typeof str === 'string') {
        bytes = new TextEncoder().encode(str);
    } else {
        bytes = str;
    }

    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('');
    return btoa(binString)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Generate JWT token for Kling AI authentication
async function generateKlingToken() {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;

    if (!accessKey || !secretKey) {
        throw new Error('Kling AI credentials not configured');
    }

    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const payload = {
        iss: accessKey,
        exp: now + 1800, // 30 minutes from now
        nbf: now - 5 // 5 seconds ago
    };

    const encoder = new TextEncoder();
    const headerBase64 = base64UrlEncode(JSON.stringify(header));
    const payloadBase64 = base64UrlEncode(JSON.stringify(payload));

    const dataToSign = `${headerBase64}.${payloadBase64}`;
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(dataToSign)
    );

    return `${dataToSign}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.image && !body.image_tail) {
            return errorResponse('At least one of image or image_tail is required', 400);
        }

        if (body.prompt && body.prompt.length > 2500) {
            return errorResponse('Prompt exceeds 2500 characters', 400);
        }

        if (body.negative_prompt && body.negative_prompt.length > 2500) {
            return errorResponse('Negative prompt exceeds 2500 characters', 400);
        }

        // Check for mutually exclusive parameters
        const hasMask = body.static_mask || body.dynamic_masks;
        const hasImageTail = body.image_tail;
        const hasCameraControl = body.camera_control;

        if ((hasMask && hasImageTail) || (hasMask && hasCameraControl) || (hasImageTail && hasCameraControl)) {
            return errorResponse('image_tail, static_mask/dynamic_masks, and camera_control cannot be used together', 400);
        }

        if (body.duration && !['5', '10'].includes(body.duration)) {
            return errorResponse('Duration must be "5" or "10"', 400);
        }

        if (body.cfg_scale !== undefined && (body.cfg_scale < 0 || body.cfg_scale > 1)) {
            return errorResponse('cfg_scale must be between 0 and 1', 400);
        }

        // Generate authentication token
        const token = await generateKlingToken();

        // Prepare request body with only the fields that are provided
        const requestBody: any = {
            model_name: body.model_name || 'kling-v1',
        };

        // Add optional fields if they exist
        if (body.image) requestBody.image = body.image;
        if (body.image_tail) requestBody.image_tail = body.image_tail;
        if (body.prompt) requestBody.prompt = body.prompt;
        if (body.negative_prompt) requestBody.negative_prompt = body.negative_prompt;
        if (body.cfg_scale !== undefined) requestBody.cfg_scale = body.cfg_scale;
        if (body.mode) requestBody.mode = body.mode;
        if (body.static_mask) requestBody.static_mask = body.static_mask;
        if (body.dynamic_masks) requestBody.dynamic_masks = body.dynamic_masks;
        if (body.camera_control) requestBody.camera_control = body.camera_control;
        if (body.duration) requestBody.duration = body.duration;
        if (body.callback_url) requestBody.callback_url = body.callback_url;
        if (body.external_task_id) requestBody.external_task_id = body.external_task_id;

        console.log('Sending request to Kling API image-to-video endpoint:', {
            ...requestBody,
            // Don't log the full image data to avoid console clutter
            image: requestBody.image ? '[BASE64_OR_URL_DATA]' : undefined,
            image_tail: requestBody.image_tail ? '[BASE64_OR_URL_DATA]' : undefined,
            static_mask: requestBody.static_mask ? '[BASE64_OR_URL_DATA]' : undefined,
            dynamic_masks: requestBody.dynamic_masks ? '[MASKED_DATA]' : undefined,
            prompt: requestBody.prompt ? requestBody.prompt.substring(0, 50) + '...' : undefined
        });

        // Initial request to start video generation 
        const klingResponse = await fetch(`${KLING_API_DOMAIN}/v1/videos/image2video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!klingResponse.ok) {
            console.error('Kling API Error Response:', await klingResponse.text());
            return errorResponse(
                `Failed to create image-to-video task: ${klingResponse.statusText}`,
                klingResponse.status
            );
        }

        const responseData = await klingResponse.json();
        console.log('Kling API Response:', responseData);

        // Check for API-level errors
        if (responseData.code !== 0) {
            return errorResponse(
                responseData.message || 'Failed to generate video',
                responseData.code || 500,
                responseData,
                responseData.request_id || ''
            );
        }

        return new NextResponse(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        console.error('Image to video generation error:', error);
        return errorResponse('Internal server error', 500, error.message);
    }
}



