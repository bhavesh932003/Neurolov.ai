'use client';

// import { useEffect, useRef } from 'react';
// import '@google/model-viewer';

// declare global {
//   namespace JSX {
//     interface IntrinsicElements {
//       'model-viewer': any;
//     }
//   }
// }

// interface ModelViewerProps {
//   src: string;
//   alt: string;
//   poster?: string;
//   className?: string;
// }

// export default function ModelViewer({ src, alt, poster, className = '' }: ModelViewerProps) {
//   const modelViewerRef = useRef(null);

//   return (
//     <model-viewer
//       ref={modelViewerRef}
//       src={src}
//       alt={alt}
//       poster={poster}
//       loading="eager"
//       camera-controls
//       auto-rotate
//       shadow-intensity="1"
//       environment-image="neutral"
//       exposure="0.75"
//       ar={false}
//       ar-modes="none"
//       ar-scale="fixed"
//       className={`w-full h-[400px] bg-muted/50 rounded-lg ${className}`}
//     />
//   );
// }



import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

function Model({ src }) {
  const modelRef = useRef();
  const gltf = useLoader(GLTFLoader, src);

  useEffect(() => {
    if (modelRef.current) {
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const yOffset = -box.min.y;
      modelRef.current.position.y += yOffset;
    }
  }, [gltf]);

  return <primitive object={gltf.scene} ref={modelRef} dispose={null} scale={1.5} />;
}

export default function ModelViewer({ src, className = '' }) {
  return (
    <Canvas 
      className={`w-full h-full ${className}`}
      camera={{ position: [0, 2, 5], fov: 50 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls enableZoom enablePan enableRotate />
      
      <Suspense fallback={null}>
        {src ? <Model src={src} /> : null}
      </Suspense>
      
      <Environment preset="city" />

      <Grid 
        position={[0, 0, 0]}  
        sectionSize={1}
        cellSize={0.5}
        infiniteGrid
        fadeDistance={30}
        fadeStrength={1}
        cellColor="#4a4a4a"
        sectionColor="black"
 
      />
    </Canvas>
  );
}
  