import React, { useMemo, useEffect } from "react";
import { Results, NormalizedLandmark } from "@mediapipe/hands";
import * as THREE from "three";
// import { boundingFrame } from "./bounding-frame";

const jsx = false;

interface HandGestureAnalysisProps {
  results: Results | null;
  onGestureChange?: (gesture: GestureValues) => void;
}

export type GestureValues = {
  leftHand: {
    openness: number;
    thumbProximity: number;
    wristZone: number;
  } | null;
  rightHand: {
    openness: number;
    thumbProximity: number;
    wristZone: number;
  } | null;
  handAngleDifference: number | null;
};

const HandGestureAnalysis: React.FC<HandGestureAnalysisProps> = ({
  results,
  onGestureChange,
}) => {
  const gestureValues = useMemo(() => {
    if (
      !results ||
      !results.multiHandWorldLandmarks ||
      !results.multiHandedness ||
      results.multiHandedness.length < 2 ||
      results.multiHandWorldLandmarks.length < 2
    ) {
      return {
        leftHand: null,
        rightHand: null,
        handAngleDifference: null,
      };
    }

    const [leftHandWorld, rightHandWorld] =
      results.multiHandedness[0].label === "Left"
        ? [
            results.multiHandWorldLandmarks[0],
            results.multiHandWorldLandmarks[1],
          ]
        : [
            results.multiHandWorldLandmarks[1],
            results.multiHandWorldLandmarks[0],
          ];

    const [leftHand, rightHand] =
      results.multiHandedness[0].label === "Left"
        ? [results.multiHandLandmarks[0], results.multiHandLandmarks[1]]
        : [results.multiHandLandmarks[1], results.multiHandLandmarks[0]];

    const gestureValues = {
      leftHand: {
        openness: calculateHandOpenness(leftHandWorld),
        thumbProximity: calculateThumbProximity(leftHandWorld),
        wristZone: calculateWristZonePosition(leftHand),
      },
      rightHand: {
        openness: calculateHandOpenness(rightHandWorld),
        thumbProximity: calculateThumbProximity(rightHandWorld),
        wristZone: calculateWristZonePosition(rightHand),
      },
      handAngleDifference: calculateHandAngleDifference(
        rightHandWorld,
        leftHandWorld
      ),
    };

    // Call onGestureChange with updated gesture values
    // if (onGestureChange) {
    //   onGestureChange(gestureValues);
    // }

    return gestureValues;
  }, [results]);

  useEffect(() => {
    if (onGestureChange && gestureValues) {
      onGestureChange(gestureValues);
    }
  }, [gestureValues, onGestureChange]);

  return jsx ? (
    <div className="absolute bottom-20 w-48 p-4">
      {gestureValues.leftHand && (
        <div>
          <p className="text-blue-500">Left Hand</p>
          <p>Openness: {gestureValues.leftHand.openness.toFixed(1)}</p>
          <p>
            Thumb Proximity: {gestureValues.leftHand.thumbProximity.toFixed(1)}
          </p>
          <p>Wrist Zone: {gestureValues.leftHand.wristZone.toFixed(1)}</p>
        </div>
      )}
      {gestureValues.rightHand && (
        <div>
          <p className="text-red-500">Right Hand</p>
          <p>Openness: {gestureValues.rightHand.openness.toFixed(1)}</p>
          <p>
            Thumb Proximity: {gestureValues.rightHand.thumbProximity.toFixed(1)}
          </p>
          <p>Wrist Zone: {gestureValues.rightHand.wristZone.toFixed(1)}</p>
        </div>
      )}
      {gestureValues.handAngleDifference !== null && (
        <div>
          <p>Hand Angle Difference</p>
          <p>{gestureValues.handAngleDifference.toFixed(2)}</p>
        </div>
      )}
    </div>
  ) : null;
};

function calculateHandAngleDifference(
  leftHand: NormalizedLandmark[],
  rightHand: NormalizedLandmark[]
): number {
  // Create vectors for both hands on XZ plane
  const leftWrist = new THREE.Vector2(leftHand[0].x, leftHand[0].z);
  const leftMiddle = new THREE.Vector2(leftHand[9].x, leftHand[9].z);
  const rightWrist = new THREE.Vector2(rightHand[0].x, rightHand[0].z);
  const rightMiddle = new THREE.Vector2(rightHand[9].x, rightHand[9].z);

  // Calculate direction vectors
  const leftVector = new THREE.Vector2()
    .subVectors(leftMiddle, leftWrist)
    .normalize();
  const rightVector = new THREE.Vector2()
    .subVectors(rightMiddle, rightWrist)
    .normalize();

  // Calculate angle between vectors using dot product
  const dotProduct = leftVector.dot(rightVector);
  const angle = Math.acos(THREE.MathUtils.clamp(dotProduct, -1, 1));

  // Calculate cross product sign (for 2D vectors)
  // positive -> counterclockwise, negative -> clockwise
  const crossProductSign = Math.sign(
    leftVector.x * rightVector.y - leftVector.y * rightVector.x
  );

  let r = angle * crossProductSign;
  r = THREE.MathUtils.clamp(r, -Math.PI, Math.PI);
  return THREE.MathUtils.mapLinear(r, -Math.PI, Math.PI, -1, 1);
}

function calculateHandOpenness(landmarks: NormalizedLandmark[]): number {
  // Calculate openness for each finger (excluding thumb)
  const fingerOpenness = [
    calculateFingerOpenness(landmarks, 5, 6, 0), // Index
    calculateFingerOpenness(landmarks, 9, 10, 0), // Middle
    calculateFingerOpenness(landmarks, 13, 14, 0), // Ring
    calculateFingerOpenness(landmarks, 17, 18, 0), // Pinky
  ];

  // Average the openness of all fingers
  const averageOpenness =
    fingerOpenness.reduce((sum, val) => sum + val, 0) / fingerOpenness.length;

  // Map the average openness to a range of -1 to 1
  return THREE.MathUtils.mapLinear(averageOpenness, 0, Math.PI / 2, -1, 1);

  // const fingerNames = ["Index", "Middle", "Ring", "Pinky"];

  // // Create formatted string with finger names and their openness values
  // const formattedResults = fingerOpenness
  //   .map((openness, index) => {
  //     return `${fingerNames[index]} Finger: ${openness.toFixed(2)} radians`;
  //   })
  //   .join("\n");

  // return formattedResults;

  // return averageOpenness;
}

function calculateFingerOpenness(
  landmarks: NormalizedLandmark[],
  mcpIndex: number,
  pipIndex: number,
  wristIndex: number
): number {
  // Create vectors from landmarks
  const mcp = new THREE.Vector3(
    landmarks[mcpIndex].x,
    landmarks[mcpIndex].y,
    landmarks[mcpIndex].z
  );
  const pip = new THREE.Vector3(
    landmarks[pipIndex].x,
    landmarks[pipIndex].y,
    landmarks[pipIndex].z
  );
  const wrist = new THREE.Vector3(
    landmarks[wristIndex].x,
    landmarks[wristIndex].y,
    landmarks[wristIndex].z
  );

  // Create vectors for angle calculation
  const mcpToPip = new THREE.Vector3().subVectors(mcp, pip);
  const wristToMcp = new THREE.Vector3().subVectors(wrist, mcp);

  // Project vectors onto YZ plane by setting X to 0
  mcpToPip.x = 0;
  wristToMcp.x = 0;

  // Normalize vectors after projection
  mcpToPip.normalize();
  wristToMcp.normalize();

  // Calculate angle between projected vectors
  let angle = mcpToPip.angleTo(wristToMcp);

  // Clamp the angle between 0 and 90 degrees
  angle = THREE.MathUtils.clamp(angle, 0, Math.PI / 2);

  return angle;
}

function calculateThumbProximity(landmarks: NormalizedLandmark[]): number {
  const thumb = new THREE.Vector3(
    landmarks[4].x,
    landmarks[4].y,
    landmarks[4].z
  );
  const indexTip = new THREE.Vector3(
    landmarks[8].x,
    landmarks[8].y,
    landmarks[8].z
  );
  const middleTip = new THREE.Vector3(
    landmarks[12].x,
    landmarks[12].y,
    landmarks[12].z
  );
  const ringTip = new THREE.Vector3(
    landmarks[16].x,
    landmarks[16].y,
    landmarks[16].z
  );
  const pinkyTip = new THREE.Vector3(
    landmarks[20].x,
    landmarks[20].y,
    landmarks[20].z
  );

  const distances = [
    thumb.distanceTo(indexTip),
    thumb.distanceTo(middleTip),
    thumb.distanceTo(ringTip),
    thumb.distanceTo(pinkyTip),
  ];

  const averageDistance =
    distances.reduce((sum, val) => sum + val, 0) / distances.length;

  const maxObservedDistance = 0.18;
  const minObservedDistance = 0.05;

  // Map the distance and clamp between -1 and 1
  const mapped = THREE.MathUtils.mapLinear(
    averageDistance,
    maxObservedDistance,
    minObservedDistance,
    -1,
    1
  );

  return THREE.MathUtils.clamp(mapped, -1, 1);
}

function calculateWristZonePosition(landmarks: NormalizedLandmark[]): number {
  //sometimes dectection model switches left and right hands
  const wrist = new THREE.Vector3(
    landmarks[0].x,
    landmarks[0].y,
    landmarks[0].z
  );

  let r = 0;

  // Left side of screen (0 to 0.5)
  if (wrist.x <= 0.5) {
    if (wrist.x <= 0.25) {
      r = THREE.MathUtils.mapLinear(wrist.x, 0, 0.25, -1, 0);
    } else {
      r = THREE.MathUtils.mapLinear(wrist.x, 0.25, 0.5, 0, 1);
    }
  }
  // Right side of screen (0.5 to 1)
  else {
    if (wrist.x <= 0.75) {
      r = THREE.MathUtils.mapLinear(wrist.x, 0.5, 0.75, 0, 1);
    } else {
      r = THREE.MathUtils.mapLinear(wrist.x, 0.75, 1, 0, -1);
    }
  }

  return THREE.MathUtils.clamp(r, -1, 1);
}

export default HandGestureAnalysis;
