// import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Scene from "./scene";
import Hand from "./hand";
import { Results as FaceMeshResults } from "@mediapipe/face_mesh";
import { Results as HandMeshResults } from "@mediapipe/hands";
import BoundingFrameDisplay from "./bounding-frame";
import HandBlob from "./blob";
import { GestureValues } from "./hand-gesture-analysis";

interface ThreeDRendererProps {
  faceResults?: FaceMeshResults | null;
  handResults?: HandMeshResults | null;
  handGestures?: GestureValues | null;
}

const ThreeDRenderer: React.FC<ThreeDRendererProps> = ({
  // faceResults = null,
  handResults = null,
  handGestures = null,
}: ThreeDRendererProps) => {
  return (
    <Scene>
      <BoundingFrameDisplay>
        <Hand results={handResults} />
        <HandBlob results={handResults} gestureValues={handGestures} />
      </BoundingFrameDisplay>
    </Scene>
  );
};

export default ThreeDRenderer;
