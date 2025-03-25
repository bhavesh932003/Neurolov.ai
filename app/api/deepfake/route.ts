import { NextRequest, NextResponse } from 'next/server';

// Helper function to return JSON error responses
const errorResponse = (message: string, status: number = 500, details: any = null) => {
  return new NextResponse(
    JSON.stringify({ error: message, details }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

// Helper function to poll for results from ModelsLab API
async function pollForResults(fetchUrl: string, apiKey: string, maxAttempts = 100, delayMs = 5000): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`Polling attempt ${attempt + 1}/${maxAttempts}`);
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey })
      });
      if (!response.ok) {
        throw new Error(`HTTP error during polling! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Poll response:', {
        status: data.status,
        hasOutput: !!data.output,
        outputLength: data.output?.length,
        eta: data.eta
      });
      if (data.status === 'success' && data.output && data.output.length > 0) {
        return data;
      } else if (data.status === 'failed' || data.status === 'error') {
        throw new Error(data.message || 'Generation failed during polling');
      }
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error('Polling error:', error);
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Timeout waiting for deepfake generation. Please try again.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get API key from environment variables
    const modelslabApiKey = process.env.NEXT_PUBLIC_MODELSLAB_API_KEY;
    if (!modelslabApiKey) {
      console.error('ModelsLab API key not found in environment variables');
      return errorResponse('ModelsLab API key not configured', 500);
    }

    // Validate required field: operation
    const { operation } = body;
    if (!operation) {
      return errorResponse('Operation type is required', 400);
    }

    // Prepare request body with API key included
    const requestBody = { key: modelslabApiKey, ...body };
    // Remove the operation field as it's only used for routing locally
    delete requestBody.operation;

    // Validate required fields and determine endpoint based on the operation type
    let endpoint: string;
    switch (operation) {
      case 'single_face_swap':
        if (!body.init_image || !body.target_image) {
          return errorResponse('Initial and target images are required for single face swap', 400);
        }
        endpoint = 'single_face_swap';
        break;
      case 'multiple_face_swap':
        if (!body.init_image || !body.target_image) {
          return errorResponse('Initial and target images are required for multiple face swap', 400);
        }
        endpoint = 'multiple_face_swap';
        break;
      case 'single_video_swap':
        if (!body.init_video || !body.target_image) {
          return errorResponse('Initial video and target image are required for video face swap', 400);
        }
        endpoint = 'single_video_swap';
        break;
      case 'specific_video_swap':
        if (!body.init_video || !body.target_image || !body.reference_image) {
          return errorResponse('Initial video, target image, and reference image are required for specific video swap', 400);
        }
        endpoint = 'specific_video_swap';
        break;
      default:
        return errorResponse('Invalid operation type', 400);
    }

    console.log('Making request to ModelsLab API:', endpoint);
    const modelLabsResponse = await fetch(`https://modelslab.com/api/v6/deepfake/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!modelLabsResponse.ok) {
      const errorText = await modelLabsResponse.text();
      console.error('ModelsLab API error response:', errorText);
      throw new Error(`HTTP error! status: ${modelLabsResponse.status}`);
    }

    const data = await modelLabsResponse.json();
    console.log('ModelsLab API response data:', data);

    // If the API returns a processing status with a fetch_result URL, poll continuously
    if (data.status === 'processing' && data.fetch_result) {
      console.log('Deepfake generation in progress, polling for final result...');
      const finalData = await pollForResults(data.fetch_result, modelslabApiKey);
      return NextResponse.json({
        status: 'success',
        output: finalData.output[0],
        proxyUrl: finalData.proxy_links?.[0] || finalData.output[0],
        generationTime: finalData.generationTime,
        id: finalData.id,
        meta: finalData.meta
      });
    }

    // Handle response for a "success" status (with output available)
    if (data.status === 'success' && data.output && data.output.length > 0) {
      return NextResponse.json({
        status: 'success',
        output: data.output[0],
        proxyUrl: data.proxy_links?.[0] || data.output[0],
        generationTime: data.generationTime,
        id: data.id,
        meta: data.meta
      });
    }

    // If the response format is unexpected, throw an error
    console.error('Unexpected response format:', data);
    throw new Error('Invalid response format from ModelsLab API');

  } catch (error: any) {
    console.error('Error in deepfake API route:', error);
    return errorResponse(error.message || 'Failed to process request', 500);
  }
}
