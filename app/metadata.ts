import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Neurolov.ai - Decentralized GPU Compute & AI Agents",
  description: "Join Neurolov Swarm Network to rent GPUs and run AI models on Solana. Participate in the NLOV Token Presale.",
  openGraph: {
    title: "Neurolov.ai - Decentralized GPU Compute & AI Agents",
    description: "GPU rental and AI agent network powered by Solana. Earn crypto by sharing your GPU.",
    url: "https://neurolov.ai",
    siteName: "Neurolov.ai",
    images: [
      {
        url: "https://neurolov.ai/og-image.png", // ✅ Uses the added OG image
        width: 1200,
        height: 630,
        alt: "Neurolov - Decentralized AI Compute Network",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neurolov.ai - Decentralized GPU Compute & AI Agents",
    description: "Join Neurolov Swarm Network to rent GPUs and run AI models on Solana. Participate in the NLOV Token Presale.",
    images: ["https://neurolov.ai/og-image.png"], // ✅ Twitter preview image
  },
};
