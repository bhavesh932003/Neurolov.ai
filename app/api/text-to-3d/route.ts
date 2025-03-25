import { NextRequest, NextResponse } from 'next/server';

// Helper function to ensure we always return JSON
const errorResponse = (message: string, status: number = 500, details: any = null) => {
  return new NextResponse(
    JSON.stringify({
      error: message,
      details: details
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};

// Helper function to poll the fetch result URL
async function pollFetchResult(fetchUrl: string, maxAttempts: number = 30, delayMs: number = 2000): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();

      if (data.status === 'success' && data.output && data.output.length > 0) {
        return data;
      }

      if (data.status === 'failed' || data.status === 'error') {
        throw new Error(data.message || 'Generation failed');
      }

      // If still processing, wait and try again
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error('Error polling fetch result:', error);
      throw error;
    }
  }

  throw new Error('Timeout waiting for 3D model generation');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get API key from environment variable
    const modelslabApiKey = process.env.NEXT_PUBLIC_MODELSLAB_API_KEY;

    if (!modelslabApiKey) {
      console.error('ModelsLab API key not found in environment variables');
      return errorResponse('ModelsLab API key not configured', 500);
    }

    if (!body.prompt) {
      return errorResponse('Prompt is required', 400);
    }

    const modelLabsBody = {
      key: modelslabApiKey,
      prompt: body.prompt,
      resolution: body.resolution || 256,
      output_format: body.output_format || 'glb',
      render: body.render || false,
      negative_prompt: body.negative_prompt || '',
      guidance_scale: body.guidance_scale || 1.0,
      num_inference_steps: body.num_inference_steps || 10,
      ss_guidance_strength: body.ss_guidance_strength || 7.5,
      ss_sampling_steps: body.ss_sampling_steps || 12,
      slat_guidance_strength: body.slat_guidance_strength || 3.0,
      slat_sampling_steps: body.slat_sampling_steps || 12,
      mesh_simplify: body.mesh_simplify || 0.90,
      foreground_ratio: body.foreground_ratio || 0.85,
      remove_bg: body.remove_bg || false,
      chunk_size: body.chunk_size || 8192,
      seed: body.seed || 0,
      temp: body.temp || 'no',
      webhook: null,
      track_id: null
    };

    // Initial request to start 3D generation
    try {
      console.log('Sending 3D generation request:', modelLabsBody);
      const modelLabsResponse = await fetch('https://modelslab.com/api/v6/3d/text_to_3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelLabsBody)
      });

      if (!modelLabsResponse.ok) {
        throw new Error(`HTTP error! status: ${modelLabsResponse.status}`);
      }

      const initialData = await modelLabsResponse.json();
      console.log('ModelsLab Response:', initialData);

      // If processing, poll the fetch_result URL and append the API key to it
      if (initialData.status === 'processing' && initialData.fetch_result) {
        // Append the API key as a query parameter
        const fetchUrlWithKey = `${initialData.fetch_result}?key=${modelslabApiKey}`;
        // Increase ETA (doubling the provided ETA or defaulting to 60 seconds)
        const updatedEta = initialData.eta ? initialData.eta * 2 : 60;
        return NextResponse.json({
          status: 'processing',
          fetchUrl: fetchUrlWithKey,
          eta: updatedEta,
          id: initialData.id,
          meta: initialData.meta,
          futureLinks: initialData.future_links || []
        });
      }

      // If immediate success (unlikely), return the result
      if (initialData.status === 'success' && initialData.output && initialData.output.length > 0) {
        return NextResponse.json({
          status: 'success',
          modelUrl: initialData.output[0],
          proxyUrl: initialData.proxy_links?.[0] || initialData.output[0],
          generationTime: initialData.generationTime,
          id: initialData.id,
          meta: initialData.meta
        });
      }

      throw new Error('Invalid response format from ModelsLab API');
    } catch (error: any) {
      console.error('3D generation error:', error);
      return errorResponse(error.message || 'Failed to generate 3D model', 500);
    }
  } catch (error: any) {
    console.error('Request processing error:', error);
    return errorResponse('Failed to process request', 400);
  }
}
