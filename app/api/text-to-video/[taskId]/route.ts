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

    // Query task status
    const response = await fetch(`${KLING_API_DOMAIN}/v1/videos/text2video/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Kling API Error Response:', await response.text());
      const errorData = await response.json().catch(() => ({ message: 'Invalid response from Kling API' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the complete raw response
    console.log('Raw Kling API Response:', JSON.stringify(data, null, 2));

    // Add processing time tracking
    const processingTime = data.data?.created_at ? Math.floor((Date.now() - data.data.created_at) / 1000) : 0;
    
    console.log('Kling API Status Response:', {
      taskId,
      status: data.data?.task_status,
      result: data.data?.task_result,
      processingTime: `${processingTime}s`,
      hasVideos: data.data?.task_result?.videos?.length > 0,
      hasVideoUrl: Boolean(data.data?.task_result?.video_url),
      videoUrl: data.data?.task_result?.videos?.[0]?.url || data.data?.task_result?.video_url || null
    });

    // If the task is complete but we don't have a video URL, log a warning
    if ((data.data?.task_status === 'SUCCEED' || data.data?.task_status === 'succeed') && 
        !data.data?.task_result?.videos?.[0]?.url && 
        !data.data?.task_result?.video_url) {
      console.warn('Task succeeded but no video URL found:', {
        taskId,
        taskResult: data.data?.task_result
      });
    }

    // Check if we need to transform the response
    if (data.data?.task_status === 'SUCCEED' || data.data?.task_status === 'succeed') {
      if (data.data?.task_result) {
        // Ensure the response has the expected format
        if (!data.data.task_result.videos && data.data.task_result.video_url) {
          // Case 1: video_url exists but not in videos array
          data.data.task_result = {
            videos: [{
              url: data.data.task_result.video_url
            }]
          };
        } else if (data.data.task_result.videos?.length === 0 && data.data.task_result.url) {
          // Case 2: url exists at root level
          data.data.task_result.videos = [{
            url: data.data.task_result.url
          }];
        }
        
        // Log the transformed response
        console.log('Transformed response:', {
          status: data.data.task_status,
          videoUrl: data.data.task_result?.videos?.[0]?.url
        });
      }
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error querying video status:', error);
    return errorResponse(error.message || 'Internal server error', error.status || 500);
  }
}
