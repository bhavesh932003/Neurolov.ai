import { NextRequest, NextResponse } from 'next/server';

//image to video[taskId]
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

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId;
    if (!taskId) {
      return errorResponse('Task ID is required', 400);
    }

    // Generate authentication token
    const token = await generateKlingToken();

    console.log('Checking status for image-to-video task:', taskId);

    // Query task status
    const klingResponse = await fetch(`${KLING_API_DOMAIN}/v1/videos/image2video/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!klingResponse.ok) {
      console.error('Kling API Error Response:', await klingResponse.text());
      return errorResponse(
        `Failed to get image-to-video task status: ${klingResponse.statusText}`,
        klingResponse.status
      );
    }

    const responseData = await klingResponse.json();
    
    // Log the response
    console.log('Kling API Status Response:', {
      taskId,
      status: responseData.data?.task_status,
      statusMsg: responseData.data?.task_status_msg,
      hasVideos: responseData.data?.task_result?.videos?.length > 0,
      videoUrl: responseData.data?.task_result?.videos?.[0]?.url || null,
      processingTime: responseData.data?.created_at ? 
        `${Math.floor((Date.now() - responseData.data.created_at) / 1000)}s` : '0s'
    });

    // Add more detailed status messages based on processing time
    let statusMessage = responseData.data?.task_status_msg || '';
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
    
    // Add the enhanced status message to the response
    if (responseData.data) {
      responseData.data.task_status_msg = statusMessage;
    }

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error querying image-to-video status:', error);
    return errorResponse('Internal server error', 500, error.message);
  }
}