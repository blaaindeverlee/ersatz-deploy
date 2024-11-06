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
        // controlsRef.current.target.set(0, 0, 0);
        // controlsRef.current.object.position.set(0, 0, 0);
        controlsRef.current.update();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <Canvas>
      <ambientLight intensity={0.1} />
      <directionalLight position={[0, 0, 5]} color="red" />
      <axesHelper args={[10]} />
      {children}
      <OrbitControls ref={controlsRef} />
      <Stats />
    </Canvas>
  );
};

export default Scene;
