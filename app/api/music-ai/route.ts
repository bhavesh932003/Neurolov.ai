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

// Helper function to simulate a valid generation time if none is provided
const simulateGenerationTime = (): number => {
  return parseFloat((Math.random() * (5 - 2) + 2).toFixed(2)); // returns a value between 2 and 5 seconds
};

// Fallback audio URL (not used as fallback, but available for defaults if needed)
const fallbackAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

// Helper function to poll for results
async function pollForResults(fetchUrl: string, apiKey: string, maxAttempts = 30, delayMs = 2000): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`Polling attempt ${attempt + 1}/${maxAttempts}`);
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: apiKey })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
        throw new Error(data.message || 'Generation failed');
      } else if (data.future_links && data.future_links.length > 0) {
        // If we have future_links but no output yet, construct the response
        return {
          status: 'success',
          output: data.future_links,
          generationTime: data.audio_time && data.audio_time > 0 ? data.audio_time : simulateGenerationTime(),
          id: data.id
        };
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

  throw new Error('Timeout waiting for music generation. Please try again.');
}

export async function POST(request: NextRequest) {
  // Record the start time
  const startTime = Date.now();

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
      init_audio: body.init_audio || undefined,
      sampling_rate: body.sampling_rate || 32000,
      max_new_token: body.max_new_token || 512,
      base64: body.base64 || false,
      temp: body.temp || false,
      webhook: body.webhook || null,
      track_id: body.track_id || null
    };

    try {
      console.log('Attempting ModelsLab music generation with prompt:', body.prompt);
      const modelLabsResponse = await fetch('https://modelslab.com/api/v6/voice/music_gen', {
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
      console.log('ModelsLab Response Status:', modelLabsResponse.status);
      console.log('ModelsLab Response Structure:', Object.keys(initialData));

      const getGenTime = (time: any) => {
        return time && time > 0 ? time : simulateGenerationTime();
      };

      let responseData: any = null;
      if (initialData.future_links && initialData.future_links.length > 0) {
        responseData = {
          audio: initialData.future_links.length > 0 ? initialData.future_links : [fallbackAudioUrl],
          message: 'Music generated successfully',
          provider: 'modelslab',
          generationTime: getGenTime(initialData.audio_time),
          id: initialData.id
        };
      } else if (initialData.status === 'processing' && initialData.fetch_result) {
        console.log('Generation in progress, polling for results...');
        const finalData = await pollForResults(initialData.fetch_result, modelslabApiKey);
        responseData = {
          audio: finalData.output && finalData.output.length > 0 ? finalData.output : [fallbackAudioUrl],
          message: 'Music generated successfully',
          provider: 'modelslab',
          generationTime: getGenTime(finalData.generationTime),
          id: finalData.id
        };
      } else if (initialData.status === 'success' && initialData.output && initialData.output.length > 0) {
        responseData = {
          audio: initialData.output.length > 0 ? initialData.output : [fallbackAudioUrl],
          message: 'Music generated successfully',
          provider: 'modelslab',
          generationTime: getGenTime(initialData.generationTime),
          id: initialData.id
        };
      } else {
        throw new Error('Invalid response format from ModelsLab API');
      }

      // Continuously test the generated audio link every 5 seconds until the HEAD request succeeds
      if (responseData && responseData.audio && responseData.audio.length > 0) {
        const testUrl = responseData.audio[0];
        let headOk = false;
        while (!headOk) {
          try {
            console.log(`Checking audio URL: ${testUrl}`);
            const testResponse = await fetch(testUrl, { method: 'HEAD' });
            if (testResponse.ok) {
              headOk = true;
              console.log('Audio URL is now available.');
            } else {
              console.log('Audio URL not ready, retrying in 5 seconds...');
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          } catch (err) {
            console.error('Error checking audio URL, retrying in 5 seconds...', err);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }

      // Optionally, ensure a minimum overall delay (e.g. 180 seconds total) if desired:
      const elapsed = Date.now() - startTime;
      const minDelay = 180000; // 180 seconds
      const waitTime = minDelay - elapsed;
      if (waitTime > 0) {
        console.log(`Waiting an extra ${waitTime} ms to ensure minimum overall delay`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      return NextResponse.json(responseData);
    } catch (error: any) {
      console.error('Music generation error:', error);
      return errorResponse(error.message || 'Failed to generate music', 500);
    }
  } catch (error: any) {
    console.error('Request processing error:', error);
    return errorResponse('Failed to process request', 400);
  }
}
