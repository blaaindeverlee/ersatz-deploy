import React, { ReactNode, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type BoundingFrame = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
};

export const boundingFrame: BoundingFrame = {
  xMin: -5,
  xMax: 5,
  yMin: -5,
  yMax: 5,
  zMin: -5,
  zMax: 5,
};

type BoundingFrameProps = {
  children?: ReactNode;
};

const BoundingFrameDisplay: React.FC<BoundingFrameProps> = ({ children }) => {
  const { xMin, xMax, yMin, yMax, zMin, zMax } = boundingFrame;

  const boxGeometry = useMemo(() => {
    const width = xMax - xMin;
    const height = yMax - yMin;
    const depth = zMax - zMin;
    return new THREE.BoxGeometry(width, height, depth);
  }, [boundingFrame]);

  const wireframeMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: "black", linewidth: 5 }),
    []
  );

  const wireframe = useMemo(() => {
    const edges = new THREE.EdgesGeometry(boxGeometry);
    return new THREE.LineSegments(edges, wireframeMaterial);
  }, [boxGeometry, wireframeMaterial]);

  useFrame(() => {
    wireframe.position.set(
      (xMax + xMin) / 2,
      (yMax + yMin) / 2,
      (zMax + zMin) / 2
    );
  });

  return (
    <>
      <primitive object={wireframe} />
      {children}
    </>
  );
};

export default BoundingFrameDisplay;
