'use client';

import React, { useState, useEffect } from 'react';
import ReactConfetti from 'react-confetti';

export const Confetti = ({ active = false, duration = 3000, recycle = false }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isActive, setIsActive] = useState(active);
  
  // Set up window dimensions for the confetti
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    // Initial dimensions
    if (typeof window !== 'undefined') {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateDimensions);
      }
    };
  }, []);
  
  // Handle active state change
  useEffect(() => {
    setIsActive(active);
    
    // Auto-hide confetti after duration if not set to recycle
    if (active && !recycle) {
      const timer = setTimeout(() => {
        setIsActive(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [active, duration, recycle]);
  
  // Don't render anything if not active
  if (!isActive) {
    return null;
  }
  
  return (
    <ReactConfetti
      width={dimensions.width}
      height={dimensions.height}
      recycle={recycle}
      numberOfPieces={250}
      gravity={0.20}
      colors={[
        '#f44336', // red
        '#e91e63', // pink
        '#9c27b0', // purple
        '#673ab7', // deep purple
        '#3f51b5', // indigo
        '#2196f3', // blue
        '#03a9f4', // light blue
        '#00bcd4', // cyan
        '#009688', // teal
        '#4caf50', // green
        '#8bc34a', // light green
        '#cddc39', // lime
        '#ffeb3b', // yellow
        '#ffc107', // amber
        '#ff9800', // orange
        '#ff5722'  // deep orange
      ]}
      tweenDuration={5000}
      initialVelocityY={10}
      initialVelocityX={5}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    />
  );
};