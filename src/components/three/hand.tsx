import React, { useRef, useMemo } from "react";
import { Landmark, Results } from "@mediapipe/hands";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { boundingFrame } from "./bounding-frame";

interface HandModelProps {
  results: Results | null;
}

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
  [0, 5],
  [5, 9],
  [9, 13],
  [13, 17], // Palm
];

const HandModel: React.FC<HandModelProps> = ({ results }) => {
  const leftHandPointsRef = useRef<THREE.Points>(null);
  const rightHandPointsRef = useRef<THREE.Points>(null);
  const leftHandLinesRef = useRef<THREE.LineSegments>(null);
  const rightHandLinesRef = useRef<THREE.LineSegments>(null);

  const leftHandGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const rightHandGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const leftHandLinesGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const rightHandLinesGeometry = useMemo(() => new THREE.BufferGeometry(), []);

  const lineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: "green", linewidth: 2 }),
    []
  );

  // const getCenterPoint = (
  //   landmarks: Landmark[]
  // ): { centerX: number; centerY: number; centerZ: number } => {
  //   const numLandmarks = landmarks.length;

  //   if (numLandmarks === 0) {
  //     return { centerX: 0, centerY: 0, centerZ: 0 };
  //   }

  //   const sum = landmarks.reduce(
  //     (acc, landmark) => {
  //       acc.x += landmark.x;
  //       acc.y += landmark.y;
  //       acc.z += landmark.z;
  //       return acc;
  //     },
  //     { x: 0, y: 0, z: 0 }
  //   );

  //   return {
  //     centerX: sum.x / numLandmarks,
  //     centerY: sum.y / numLandmarks,
  //     centerZ: sum.z / numLandmarks,
  //   };
  // };

  const normalizeHandLandmarks = (landmarks: Landmark[]) => {
    // Get reference points (wrist and middle finger MCP)
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];

    // Calculate current hand size (distance between wrist and middle MCP)
    const referenceDistance = Math.sqrt(
      Math.pow(middleMCP.x - wrist.x, 2) +
        Math.pow(middleMCP.y - wrist.y, 2) +
        Math.pow(middleMCP.z - wrist.z, 2)
    );

    // Define target size (adjust this value to change overall hand size)
    const targetSize = 0.1;

    // Calculate scale factor
    const scaleFactor = targetSize / referenceDistance;

    // Apply scaling relative to wrist position
    return landmarks.map((landmark) => ({
      x: (landmark.x - wrist.x) * scaleFactor + wrist.x,
      y: (landmark.y - wrist.y) * scaleFactor + wrist.y,
      z: (landmark.z - wrist.z) * scaleFactor + wrist.z,
    }));
  };

  const mapToFrame = (landmark: Landmark) => {
    const x = THREE.MathUtils.mapLinear(
      landmark.x,
      0,
      1,
      boundingFrame.xMin,
      boundingFrame.xMax
    );
    const y = THREE.MathUtils.mapLinear(
      landmark.y,
      0,
      1,
      boundingFrame.yMax,
      boundingFrame.yMin
    );
    const z = THREE.MathUtils.mapLinear(
      landmark.z,
      -0.1,
      0.1,
      boundingFrame.zMin,
      boundingFrame.zMax
    );
    return [x, y, z];
  };

  useFrame(() => {
    if (results && results.multiHandLandmarks) {
      const { multiHandLandmarks, multiHandedness } = results;

      const updateHand = (
        landmarks: Landmark[],
        handedness: string,
        pointsGeometry: THREE.BufferGeometry,
        linesGeometry: THREE.BufferGeometry,
        pointsRef: React.RefObject<THREE.Points>,
        linesRef: React.RefObject<THREE.LineSegments>
      ) => {
        let positions = new Float32Array();
        if (landmarks.length > 0) {
          if (pointsRef.current && linesRef.current) {
            pointsRef.current.visible = true;
            linesRef.current.visible = true;
          }
          // const normalizedLandmarks = normalizeHandLandmarks(landmarks);
          // positions = new Float32Array(normalizedLandmarks.flatMap(mapToFrame));
          positions = new Float32Array(landmarks.flatMap(mapToFrame));

          pointsGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
          );
          pointsGeometry.attributes.position.needsUpdate = true;

          const linePositions = new Float32Array(
            HAND_CONNECTIONS.flatMap(([i, j]) => {
              const [x1, y1, z1] = positions.slice(i * 3, (i + 1) * 3);
              const [x2, y2, z2] = positions.slice(j * 3, (j + 1) * 3);
              return [x1, y1, z1, x2, y2, z2];
            })
          );
          linesGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(linePositions, 3)
          );
          linesGeometry.attributes.position.needsUpdate = true;

          // if (pointsRef.current && linesRef.current) {
          //   const depth = handedness === "Left" ? 0 : -0.1; // Offset right hand slightly to avoid overlap
          //   pointsRef.current.position.set(0, 0, depth);
          //   linesRef.current.position.set(0, 0, depth);
          // }
        } else {
          if (pointsRef.current && linesRef.current) {
            pointsRef.current.visible = false;
            linesRef.current.visible = false;
          }
        }
      };

      updateHand(
        multiHandLandmarks[0] || [],
        multiHandedness[0]?.label || "Left",
        leftHandGeometry,
        leftHandLinesGeometry,
        leftHandPointsRef,
        leftHandLinesRef
      );
      updateHand(
        multiHandLandmarks[1] || [],
        multiHandedness[1]?.label || "Right",
        rightHandGeometry,
        rightHandLinesGeometry,
        rightHandPointsRef,
        rightHandLinesRef
      );
    }
  });

  return (
    <>
      <points ref={leftHandPointsRef} geometry={leftHandGeometry}>
        <pointsMaterial
          attach="material"
          color="blue"
          size={5}
          sizeAttenuation={false}
        />
      </points>
      <lineSegments
        ref={leftHandLinesRef}
        geometry={leftHandLinesGeometry}
        material={lineMaterial}
      />

      <points ref={rightHandPointsRef} geometry={rightHandGeometry}>
        <pointsMaterial
          attach="material"
          color="red"
          size={5}
          sizeAttenuation={false}
        />
      </points>
      <lineSegments
        ref={rightHandLinesRef}
        geometry={rightHandLinesGeometry}
        material={lineMaterial}
      />
    </>
  );
};

export default HandModel;
