// app/api/process-attached-image/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, attached_image, prompt } = body;
    
    // By default, return the attached image unchanged.
    let responsePayload: any = {
      status: "success",
      output: [attached_image],
      message: `No processing performed.`
    };

    if (action === "enhance") {
      // Retrieve the ModelsLab API key from environment variables.
      const modelslabApiKey = process.env.NEXT_PUBLIC_MODELSLAB_API_KEY;
      if (!modelslabApiKey) {
        return NextResponse.json({ error: 'ModelsLab API key not configured' }, { status: 500 });
      }
      
      // Build the payload for the Super Resolution endpoint.
      // Here we use an upscale factor of 4 as an example. Adjust parameters as needed.
      const enhancePayload = {
        key: modelslabApiKey,
        init_image: attached_image,
        upscale_factor: 4  // This field name is based on the docs; adjust if necessary.
      };

      // Call the ModelsLab Super Resolution API.
      const enhanceResponse = await fetch("https://modelslab.com/api/v6/image_editing/super_resolution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(enhancePayload)
      });
      
      const enhanceData = await enhanceResponse.json();
      if (!enhanceResponse.ok) {
        throw new Error(enhanceData.error || "Enhancement failed");
      }
      
      // Return the full JSON response from ModelsLab, which should include status,
      // generationTime, id, output, proxy_links, meta, etc.
      return NextResponse.json(enhanceData);
    } else if (action === "edit_prompt" && prompt) {
      // Simulate an edit prompt operation using dummyimage.com.
      // (In a real implementation, you would call an appropriate editing API.)
      responsePayload = {
        status: "success",
        generationTime: 0,
        id: 0,
        output: [
          `https://dummyimage.com/1024x1024/cccccc/000.png&text=${encodeURIComponent(prompt)}`
        ],
        proxy_links: `https://dummyimage.com/1024x1024/cccccc/000.png&text=${encodeURIComponent(prompt)}`,
        meta: {
          init_image: attached_image,
          prompt: prompt,
          upscale_factor: 1
        },
        message: `Image processed with ${action}`
      };
      return NextResponse.json(responsePayload);
    }
    
    // For other actions, simply return the attached image as a fallback.
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error processing attached image:', error);
    return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
  }
}
