/* eslint-disable @typescript-eslint/no-unused-expressions */
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Results } from "@mediapipe/hands";
import * as THREE from "three";
import { GestureValues } from "./hand-gesture-analysis";

// Vertex Shader
const vertexShader = `
uniform float uTime;
uniform vec3 uHandPoints[21];
uniform float uOpenness;
uniform float uPitch;

varying vec2 vUv;
varying float vDistortion;

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vUv = uv;
  
  // Start with the original position
  vec3 pos = position;
  
  // Calculate uniform stretch factor
  float stretchAmount = 1.0 + uOpenness * 0.5; // Range 0.5 to 1.5
  
  // Apply uniform stretch to all axes
  pos *= stretchAmount;
  
  // Apply noise-based deformation
  float noiseFreq = 1.5;
  float noiseAmp = 0.15;
  vec3 noisePos = vec3(pos.x * noiseFreq + uTime, pos.y, pos.z);
  pos += snoise(noisePos) * noiseAmp * vec3(1.0); // Apply noise in all directions
  
  // Apply hand point influence with reduced effect
  for(int i = 0; i < 21; i++) {
    vec3 handPoint = uHandPoints[i];
    float dist = distance(pos, handPoint);
    float influence = smoothstep(0.3, 0.0, dist) * 0.05;
    pos += normalize(handPoint - pos) * influence;
  }

  vDistortion = snoise(noisePos);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// Fragment Shader
const fragmentShader = `
uniform float uTime;

varying vec2 vUv;
varying float vDistortion;

void main() {
  vec3 color = vec3(0.8, 0.3, 0.5);
  color += vDistortion * 0.1;
  gl_FragColor = vec4(color, 1.0);
}
`;

interface BlobProps {
  handPoints: THREE.Vector3[];
  gestureValues: GestureValues | null;
}

const Blob: React.FC<BlobProps> = ({ handPoints, gestureValues }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const clock = useRef(new THREE.Clock()); // Create local clock reference

  const uniformsRef = useRef({
    uTime: { value: 0 },
    uHandPoints: { value: handPoints },
    uOpenness: { value: 0 },
    uPitch: { value: 0 }, //lol remove this shit
  });

  useEffect(() => {
    uniformsRef.current.uHandPoints.value = handPoints;
    uniformsRef.current.uOpenness.value =
      gestureValues?.leftHand?.openness || 0;
    uniformsRef.current.uPitch.value = gestureValues?.leftHand?.wristZone || 0;
  }, [handPoints, gestureValues]);

  useFrame(() => {
    if (mesh.current) {
      const elapsedTime = clock.current.getElapsedTime();

      // Map wrist zone (-1 to 1) to rotation speed (0.05 to 0.5)
      const baseRotationSpeed = 0.1;
      const rotationSpeed = uniformsRef.current.uPitch.value
        ? THREE.MathUtils.mapLinear(
            uniformsRef.current.uPitch.value,
            -1,
            1,
            0.05,
            0.5
          )
        : baseRotationSpeed;

      // Apply rotation with mapped speed
      mesh.current.rotation.y = elapsedTime * rotationSpeed;

      // Update other uniforms
      uniformsRef.current.uTime.value = elapsedTime;
      uniformsRef.current.uHandPoints.value = handPoints;

      if (gestureValues?.leftHand) {
        uniformsRef.current.uOpenness.value = gestureValues.leftHand.openness;
      } else {
        uniformsRef.current.uOpenness.value = 0;
      }

      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniformsNeedUpdate = true;
    }
  }),
    [gestureValues];

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniformsRef.current}
      />
    </mesh>
  );
};

interface HandBlobProps {
  results: Results | null;
  gestureValues: GestureValues | null;
}

const HandBlob: React.FC<HandBlobProps> = ({ results, gestureValues }) => {
  const handPoints = useMemo(() => {
    if (results?.multiHandLandmarks?.[0]) {
      return results.multiHandLandmarks[0].map(
        (point) =>
          new THREE.Vector3(
            (point.x - 0.5) * 2,
            -(point.y - 0.5) * 2,
            -point.z * 2
          )
      );
    }
    return Array(21).fill(new THREE.Vector3());
  }, [results, gestureValues]);

  return <Blob handPoints={handPoints} gestureValues={gestureValues} />;
};

export default HandBlob;
