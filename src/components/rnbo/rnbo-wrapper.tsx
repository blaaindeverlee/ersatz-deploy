import { Results } from "@mediapipe/hands";
import React from "react";
import HandGestureAnalysis from "@/components/three/hand-gesture-analysis";
import RNBODevice from "./rnbo-device";
import { GestureValues } from "@/components/three/hand-gesture-analysis";

const RNBOWrapper = (results: Results | null) => {
  const onGestureChange = (gesture: GestureValues) => {};

  return (
    <>
      <HandGestureAnalysis
        results={results}
        onGestureChange={onGestureChange}
      />
      <RNBODevice />
    </>
  );
};

export default RNBOWrapper;
