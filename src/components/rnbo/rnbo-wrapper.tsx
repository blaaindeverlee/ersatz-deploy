// rnbo-wrapper.tsx
import { Results } from "@mediapipe/hands";
import React, { useCallback, useRef } from "react";
import HandGestureAnalysis from "@/components/three/hand-gesture-analysis";
import RNBODevice from "./rnbo-device";
import { GestureValues } from "@/components/three/hand-gesture-analysis";
import { Device } from "@rnbo/js";
import { Parameter } from "./rnbo-device";
import { debounce } from "lodash";

interface RNBOWrapperProps {
  results: Results | null;
  onGestureChangeParent: (gesture: GestureValues) => void;
}

interface DeviceHandler {
  device: Device;
  paramNameToId: (name: string, parameters: Parameter[]) => number;
  handleParameter: (id: number, value: number) => void;
  parameters: Parameter[];
}

const RNBOWrapper: React.FC<RNBOWrapperProps> = ({
  results,
  onGestureChangeParent,
}) => {
  const deviceHandlerRef = useRef<DeviceHandler | null>(null);
  const gestureQueueRef = useRef<GestureValues | null>(null);

  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };

  const updateParameters = useCallback(
    debounce((gesture: GestureValues) => {
      const handler = deviceHandlerRef.current;
      if (!handler) return;

      const { paramNameToId, handleParameter, parameters } = handler;

      try {
        const ipStateId = paramNameToId("ipState", parameters);

        // Check if hands are detected
        const handsDetected = gesture.leftHand || gesture.rightHand;

        // Update ipState based on hand detection
        handleParameter(ipStateId, handsDetected ? 1 : 0);

        if (gesture.leftHand) {
          const updates = [
            {
              id: paramNameToId("ipSampleSize", parameters),
              value: clamp(gesture.leftHand.openness, -1, 1),
            },
            {
              id: paramNameToId("ipPitch", parameters),
              value: clamp(gesture.leftHand.wristZone, -1, 1),
            },
            {
              id: paramNameToId("ipDelayReverbDry", parameters),
              value: clamp(gesture.leftHand.thumbProximity, -1, 1),
            },
          ];

          updates.forEach(({ id, value }) => {
            if (id !== -1) {
              // Only update if parameter exists
              handleParameter(id, value);
            }
          });
        }

        if (gesture.rightHand) {
          const updates = [
            {
              id: paramNameToId("ipSpeed", parameters),
              value: clamp(gesture.rightHand.openness, -1, 1),
            },

            // updating ipPosition crashed engine, probably becuase the order the values are calcualted or something idk lol
            // {
            //   id: paramNameToId("ipPosition", parameters),
            //   value: clamp(gesture.rightHand.wristZone, -1, 1),
            // },

            {
              id: paramNameToId("ipDelayFeedback", parameters),
              value: clamp(gesture.rightHand.thumbProximity, -1, 1),
            },
          ];

          updates.forEach(({ id, value }) => {
            if (id !== -1) {
              // Only update if parameter exists
              handleParameter(id, value);
            }
          });
        }
      } catch (error) {
        console.error("Error updating parameters:", error);
      }
    }, 0), // Debounce to roughly 60fps
    []
  );

  const handleDeviceReady = useCallback(
    (
      device: Device,
      paramNameToId: (name: string, parameters: Parameter[]) => number,
      handleParameterChange: (id: number, value: number) => void,
      parameters: Parameter[]
    ) => {
      deviceHandlerRef.current = {
        device,
        paramNameToId,
        handleParameter: handleParameterChange,
        parameters,
      };

      // Process any queued gesture updates
      if (gestureQueueRef.current) {
        updateParameters(gestureQueueRef.current);
        gestureQueueRef.current = null;
      }
    },
    [updateParameters]
  );

  const onGestureChange = useCallback(
    (gesture: GestureValues) => {
      onGestureChangeParent(gesture);

      if (!deviceHandlerRef.current) {
        // Queue the gesture update for when device is ready
        gestureQueueRef.current = gesture;
        return;
      }

      updateParameters(gesture);
    },
    [updateParameters, onGestureChangeParent]
  );

  return (
    <>
      <HandGestureAnalysis
        results={results}
        onGestureChange={onGestureChange}
      />
      <RNBODevice onDeviceReady={handleDeviceReady} />
    </>
  );
};

export default RNBOWrapper;
