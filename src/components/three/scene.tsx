"use client";

import React, { ReactNode, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface SceneProps {
  children?: ReactNode;
}

const Scene: React.FC<SceneProps> = ({ children }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && controlsRef.current) {
        controlsRef.current.reset();
        controlsRef.current.update();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <Canvas style={{ background: "black" }}>
      <directionalLight position={[0, 5, 0]} intensity={1} />
      {children}
      <OrbitControls ref={controlsRef} />
      <Stats />
    </Canvas>
  );
};

export default Scene;
