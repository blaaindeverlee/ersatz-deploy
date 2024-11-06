// import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Scene from "./scene";
import Hand from "./hand";
import { Results as FaceMeshResults } from "@mediapipe/face_mesh";
import { Results as HandMeshResults } from "@mediapipe/hands";
import BoundingFrameDisplay from "./bounding-frame";
import HandBlob from "./blob";

interface ThreeDRendererProps {
  faceResults?: FaceMeshResults | null;
  handResults?: HandMeshResults | null;
}

const ThreeDRenderer: React.FC<ThreeDRendererProps> = ({
  // faceResults = null,
  handResults = null,
}: ThreeDRendererProps) => {
  return (
    <Scene>
      <BoundingFrameDisplay>
        <Hand results={handResults} />
        <HandBlob results={handResults} />
      </BoundingFrameDisplay>
    </Scene>
  );
};

export default ThreeDRenderer;
