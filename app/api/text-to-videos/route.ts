import { NextRequest, NextResponse } from 'next/server';

const KLING_API_DOMAIN = 'https://api.klingai.com';

// Helper function to ensure we always return JSON
const errorResponse = (message: string, status: number = 500, details: any = null) => {
  return new NextResponse(
    JSON.stringify({
      code: status,
      message: message,
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

    if (!body.prompt) {
      return errorResponse('Prompt is required', 400);
    }

    if (body.prompt.length > 2500 || (body.negative_prompt && body.negative_prompt.length > 2500)) {
      return errorResponse('Prompt or negative prompt exceeds 2500 characters', 400);
    }

    // Generate authentication token
    const token = await generateKlingToken();

    // Validate and prepare request body
    const requestBody = {
      model_name: body.model_name || 'kling-v1',
      prompt: body.prompt,
      negative_prompt: body.negative_prompt,
      cfg_scale: body.cfg_scale !== undefined ? body.cfg_scale : 0.5,
      mode: body.mode || 'std',
      aspect_ratio: body.aspect_ratio || '16:9',
      duration: body.duration || '5',
      camera_control: body.camera_control
    };

    console.log('Sending request to Kling API:', {
      ...requestBody,
      prompt: requestBody.prompt.substring(0, 50) + '...' // Log truncated prompt for privacy
    });

    // Initial request to start video generation
    const klingResponse = await fetch(`${KLING_API_DOMAIN}/v1/videos/text2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await klingResponse.json();
    console.log('Kling API Response:', responseData);

    // Check for API-level errors
    if (responseData.code !== 0) {
      return errorResponse(
        responseData.message || 'Failed to generate video',
        responseData.code || 500,
        responseData
      );
    }

    // Map the response to match frontend expectations
    const processingTime = responseData.data?.created_at ? 
      `${Math.floor((Date.now() - responseData.data.created_at) / 1000)}s` : '0s';

    const videoUrl = responseData.data?.task_result?.videos?.[0]?.url || null;
    
    // Add more detailed status messages based on processing time
    let statusMessage = '';
    const processingSecs = Math.floor((Date.now() - (responseData.data?.created_at || Date.now())) / 1000);
    
    if (responseData.data?.task_status === 'processing') {
      if (processingSecs < 60) {
        statusMessage = 'Initializing video generation...';
      } else if (processingSecs < 120) {
        statusMessage = 'Creating video frames...';
      } else if (processingSecs < 180) {
        statusMessage = 'Rendering video sequences...';
      } else {
        statusMessage = 'Still processing... This may take a few more minutes.';
      }
    } else if (responseData.data?.task_status === 'failed') {
      statusMessage = responseData.data?.task_status_msg || 'Video generation failed. Please try again.';
    }

    return new NextResponse(JSON.stringify({
      code: responseData.code,
      message: responseData.message,
      request_id: responseData.request_id,
      data: {
        task_id: responseData.data?.task_id,
        task_status: responseData.data?.task_status,
        task_status_msg: statusMessage,
        task_result: responseData.data?.task_result || {},
        created_at: responseData.data?.created_at,
        updated_at: responseData.data?.updated_at
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const taskId = request.url.split('/').pop();
    if (!taskId) {
      return errorResponse('Task ID is required', 400);
    }

    const token = await generateKlingToken();

    console.log('Checking status for task:', taskId);

    const klingResponse = await fetch(`${KLING_API_DOMAIN}/v1/videos/text2video/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const responseData = await klingResponse.json();
    console.log('Kling API Status Response:', responseData);

    // Check for API-level errors
    if (responseData.code !== 0) {
      return errorResponse(
        responseData.message || 'Failed to get video status',
        responseData.code || 500,
        responseData
      );
    }

    // Map the response to match frontend expectations
    const processingTime = responseData.data?.created_at ? 
      `${Math.floor((Date.now() - responseData.data.created_at) / 1000)}s` : '0s';

    const videoUrl = responseData.data?.task_result?.videos?.[0]?.url || null;
    
    // Add more detailed status messages based on processing time
    let statusMessage = '';
    const processingSecs = Math.floor((Date.now() - (responseData.data?.created_at || Date.now())) / 1000);
    
    if (responseData.data?.task_status === 'processing') {
      if (processingSecs < 60) {
        statusMessage = 'Initializing video generation...';
      } else if (processingSecs < 120) {
        statusMessage = 'Creating video frames...';
      } else if (processingSecs < 180) {
        statusMessage = 'Rendering video sequences...';
      } else {
        statusMessage = 'Still processing... This may take a few more minutes.';
      }
    } else if (responseData.data?.task_status === 'failed') {
      statusMessage = responseData.data?.task_status_msg || 'Video generation failed. Please try again.';
    }

    return new NextResponse(JSON.stringify({
      code: responseData.code,
      message: responseData.message,
      request_id: responseData.request_id,
      data: {
        task_id: responseData.data?.task_id,
        task_status: responseData.data?.task_status,
        task_status_msg: statusMessage,
        task_result: responseData.data?.task_result || {},
        created_at: responseData.data?.created_at,
        updated_at: responseData.data?.updated_at
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Video status check error:', error);
    return errorResponse('Internal server error', 500);
  }
}
