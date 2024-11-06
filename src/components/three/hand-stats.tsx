import { Results } from "@mediapipe/hands";
import { useEffect } from "react";

interface HandStatsProps {
  results: Results | null;
}

const HandStats = ({ results }: HandStatsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        console.log("Space key pressed");
        console.log(results);
      } else {
        console.log(
          `Key: ${event.key} with keycode ${event.keyCode} has been pressed`
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [results]);

  if (!results) {
    return null;
  }
  const { multiHandLandmarks, multiHandWorldLandmarks } = results;
  if (!multiHandLandmarks || !multiHandWorldLandmarks) {
    return null;
  }
  if (multiHandLandmarks.length < 2 || multiHandWorldLandmarks.length < 2) {
    return null;
  }
  const leftHand = multiHandLandmarks[0];
  const leftHandRoot = leftHand[0];
  const rightHand = multiHandLandmarks[1];
  const rightHandRoot = rightHand[0];

  const leftHandWorld = multiHandWorldLandmarks[0];
  const leftHandWorldRoot = leftHandWorld[0];
  const rightHandWorld = multiHandWorldLandmarks[1];
  const rightHandWorldRoot = rightHandWorld[0];

  // console.log("Left Hand Root (Normalized):", leftHandRoot.z);
  // console.log("Right Hand Root (Normalized):", rightHandRoot.z);
  // console.log("Left Hand Root (World):", leftHandWorldRoot.z);
  // console.log("Right Hand Root (World):", rightHandWorldRoot.z);

  return (
    <div className="absolute">
      <h1>
        Left Hand (Normalized):
        <h2 className="text-red-500">
          <p>x :{leftHandRoot?.x}</p>
          <p>y :{leftHandRoot?.y}</p>
          <p>z :{leftHandRoot?.z}</p>
        </h2>
      </h1>
      <h1>
        Right Hand (Normalized):
        <h2 className="text-red-500">
          <p>x :{rightHandRoot?.x}</p>
          <p>y :{rightHandRoot?.y}</p>
          <p>z :{rightHandRoot?.z}</p>
        </h2>
      </h1>
      <h1>
        Left Hand (World):
        <h2 className="text-blue-500">
          <p>x :{leftHandWorldRoot?.x}</p>
          <p>y :{leftHandWorldRoot?.y}</p>
          <p>z :{leftHandWorldRoot?.z}</p>
        </h2>
      </h1>
      <h1>
        Right Hand (World):
        <h2 className="text-blue-500">
          <p>x :{rightHandWorldRoot?.x}</p>
          <p>y :{rightHandWorldRoot?.y}</p>
          <p>z :{rightHandWorldRoot?.z}</p>
        </h2>
      </h1>
    </div>
  );
};

export default HandStats;
