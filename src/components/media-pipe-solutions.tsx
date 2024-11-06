"use client";

import React, { useEffect, useRef, useState } from "react";
import * as mpFaceMesh from "@mediapipe/face_mesh";
import * as mpHands from "@mediapipe/hands";
import * as mpDrawing from "@mediapipe/drawing_utils";
import * as mpCamera from "@mediapipe/camera_utils";
import * as controls from "@mediapipe/control_utils";
import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import Scene from "@/components/three/scene";
import HandModel from "@/components/three/hand";
import HandStats from "@/components/three/hand-stats";
import Render from "@/components/three/render";

import RNBODevice from "./rnbo/rnbo-device";
import RNBOWrapper from "./rnbo/rnbo-wrapper";

interface CustomFaceGeometry {
  mesh: {
    vertexBufferList: number[][][];
    normalBufferList?: number[][][];
    texCoordBufferList?: number[][][];
    indexBufferList: number[][];
  };
}

class MediaPipeSolutions {
  faceDetection: boolean;
  handsDetection: boolean;
  faceMesh: mpFaceMesh.FaceMesh | null = null;
  hands: mpHands.Hands | null = null;
  camera: mpCamera.Camera | null = null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  faceGeometry: THREE.BufferGeometry | null;
  handLandmarks: number[][][] | null;
  setFaceResults: React.Dispatch<
    React.SetStateAction<mpFaceMesh.Results | null>
  >;
  setHandResults: React.Dispatch<React.SetStateAction<mpHands.Results | null>>;

  constructor(
    canvasRef: React.RefObject<HTMLCanvasElement>,
    videoRef: React.RefObject<HTMLVideoElement>,
    faceDetection: boolean = true,
    handsDetection: boolean = true,
    setFaceResults: React.Dispatch<
      React.SetStateAction<mpFaceMesh.Results | null>
    >,
    setHandResults: React.Dispatch<React.SetStateAction<mpHands.Results | null>>
  ) {
    this.canvasRef = canvasRef;
    this.videoRef = videoRef;
    this.faceDetection = faceDetection;
    this.handsDetection = handsDetection;
    this.setFaceResults = setFaceResults;
    this.setHandResults = setHandResults;

    if (this.faceDetection) {
      this.faceMesh = new mpFaceMesh.FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${mpFaceMesh.VERSION}/${file}`;
        },
      });
      this.setupFaceMesh();
    }

    if (this.handsDetection) {
      this.hands = new mpHands.Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
        },
      });
      this.setupHands();
    }

    this.faceGeometry = null;
    this.handLandmarks = null;
  }

  setupFaceMesh() {
    if (!this.faceMesh) return;

    this.faceMesh.setOptions({
      selfieMode: true,
      enableFaceGeometry: false,
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceMesh.onResults(this.onFaceMeshResults.bind(this));
  }

  setupHands() {
    if (!this.hands) return;

    this.hands.setOptions({
      selfieMode: true,
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults(this.onHandsResults.bind(this));
  }

  onFaceMeshResults(results: mpFaceMesh.Results) {
    this.setFaceResults(results);
    const canvasElement = this.canvasRef.current;
    if (!canvasElement) return;

    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        mpDrawing.drawConnectors(
          canvasCtx,
          landmarks,
          mpFaceMesh.FACEMESH_TESSELATION,
          { color: "#C0C0C070", lineWidth: 1 }
        );
        mpDrawing.drawConnectors(
          canvasCtx,
          landmarks,
          mpFaceMesh.FACEMESH_RIGHT_EYE,
          { color: "#FF3030" }
        );
        mpDrawing.drawConnectors(
          canvasCtx,
          landmarks,
          mpFaceMesh.FACEMESH_LEFT_EYE,
          { color: "#30FF30" }
        );
        mpDrawing.drawConnectors(
          canvasCtx,
          landmarks,
          mpFaceMesh.FACEMESH_FACE_OVAL,
          { color: "#E0E0E0" }
        );
      }
    }
    canvasCtx.restore();

    // Save face geometry to pass to three js scene
    if (results.multiFaceGeometry && results.multiFaceGeometry.length > 0) {
      const faceGeometry = results
        .multiFaceGeometry[0] as unknown as CustomFaceGeometry;
      // Create a Three.js BufferGeometry from the face geometry data
      const geometry = new THREE.BufferGeometry();

      // Set vertices
      const vertices = new Float32Array(
        faceGeometry.mesh.vertexBufferList[0].flat()
      );
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

      // Set normals
      if (
        faceGeometry.mesh.normalBufferList &&
        faceGeometry.mesh.normalBufferList.length > 0
      ) {
        const normals = new Float32Array(
          faceGeometry.mesh.normalBufferList[0].flat()
        );
        geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      }

      // Set UVs
      if (
        faceGeometry.mesh.texCoordBufferList &&
        faceGeometry.mesh.texCoordBufferList.length > 0
      ) {
        const uvs = new Float32Array(
          faceGeometry.mesh.texCoordBufferList[0].flat()
        );
        geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      }

      // Set indices
      const indices = new Uint32Array(faceGeometry.mesh.indexBufferList[0]);
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));

      this.faceGeometry = geometry;
    } else {
      this.faceGeometry = null;
    }
  }

  onHandsResults(results: mpHands.Results) {
    this.setHandResults(results);
    const canvasElement = this.canvasRef.current;
    if (!canvasElement) return;

    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        mpDrawing.drawConnectors(
          canvasCtx,
          landmarks,
          mpHands.HAND_CONNECTIONS,
          { color: "#00FF00", lineWidth: 5 }
        );
        mpDrawing.drawLandmarks(canvasCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });
      }
    }
    canvasCtx.restore();
  }

  async startCamera() {
    if (!this.videoRef.current) return;

    const constraints = {
      video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
      },
    };

    const fallbackConstraints = {
      video: {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
      },
    };

    try {
      await this.setupCamera(constraints);
      console.log("Webcam resolution: 1920x1080");
    } catch (error) {
      console.error("Error accessing the camera:", error);
      try {
        await this.setupCamera(fallbackConstraints);
        console.log("Webcam resolution: 1280x720");
      } catch (fallbackError) {
        console.error(
          "Error accessing the camera with fallback resolution:",
          fallbackError
        );
      }
    }
  }

  private async setupCamera(constraints: MediaStreamConstraints) {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.videoRef.current!.srcObject = stream;
    this.videoRef.current!.play();

    const sendFrame = async () => {
      if (this.videoRef.current) {
        if (this.faceDetection && this.faceMesh) {
          await this.faceMesh.send({ image: this.videoRef.current });
        }
        if (this.handsDetection && this.hands) {
          await this.hands.send({ image: this.videoRef.current });
        }
      }
      requestAnimationFrame(sendFrame);
    };

    this.videoRef.current!.onloadedmetadata = () => {
      sendFrame();
    };
  }

  setUpControls(
    fmControlsRef: React.RefObject<HTMLDivElement>,
    hControlsRef: React.RefObject<HTMLDivElement>
  ) {
    const fpsControl = new controls.FPS();

    if (this.faceDetection && fmControlsRef.current) {
      new controls.ControlPanel(fmControlsRef.current, {
        selfieMode: true,
        enableFaceGeometry: false,
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
        .add([
          new controls.StaticText({ title: "MediaPipe Face Mesh" }),
          fpsControl,
          new controls.Toggle({ title: "Selfie Mode", field: "selfieMode" }),
          new controls.Slider({
            title: "Max Number of Faces",
            field: "maxNumFaces",
            range: [1, 4],
            step: 1,
          }),
          new controls.Toggle({
            title: "Refine Landmarks",
            field: "refineLandmarks",
          }),
          new controls.Slider({
            title: "Min Detection Confidence",
            field: "minDetectionConfidence",
            range: [0, 1],
            step: 0.01,
          }),
          new controls.Slider({
            title: "Min Tracking Confidence",
            field: "minTrackingConfidence",
            range: [0, 1],
            step: 0.01,
          }),
        ])
        .on((options: mpFaceMesh.Options) => {
          this.videoRef.current?.classList.toggle("selfie", options.selfieMode);
          this.faceMesh?.setOptions(options);
        });
    }

    if (this.handsDetection && hControlsRef.current) {
      new controls.ControlPanel(hControlsRef.current, {
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
        .add([
          new controls.StaticText({ title: "MediaPipe Hands" }),
          fpsControl,
          new controls.Toggle({ title: "Selfie Mode", field: "selfieMode" }),
          new controls.Slider({
            title: "Max Number of Hands",
            field: "maxNumHands",
            range: [1, 4],
            step: 1,
          }),
          new controls.Slider({
            title: "Model Complexity",
            field: "modelComplexity",
            discrete: ["Lite", "Full"],
          }),
          new controls.Slider({
            title: "Min Detection Confidence",
            field: "minDetectionConfidence",
            range: [0, 1],
            step: 0.01,
          }),
          new controls.Slider({
            title: "Min Tracking Confidence",
            field: "minTrackingConfidence",
            range: [0, 1],
            step: 0.01,
          }),
        ])
        .on((options: mpHands.Options) => {
          this.videoRef.current?.classList.toggle("selfie", options.selfieMode);
          this.hands?.setOptions(options);
        });
    }
  }
}

export default function MediaPipeComponent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const solutionsRef = useRef<MediaPipeSolutions | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fmControlsRef = useRef<HTMLDivElement>(null);
  const hControlsRef = useRef<HTMLDivElement>(null);
  const [showFMControls, setShowFMControls] = useState(false);
  const [showHControls, setShowHControls] = useState(false);
  const [faceResults, setFaceResults] = useState<mpFaceMesh.Results | null>(
    null
  );
  const [handResults, setHandResults] = useState<mpHands.Results | null>(null);

  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      solutionsRef.current = new MediaPipeSolutions(
        canvasRef,
        videoRef,
        false, // Enable face detection
        true, // Enable hands detection
        setFaceResults,
        setHandResults
      );
      solutionsRef.current.setUpControls(fmControlsRef, hControlsRef);
      solutionsRef.current.startCamera().then(() => {
        setIsLoaded(true);
      });
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-100">
      <div id="three-js" className="z-10 w-full h-full">
        <Render handResults={handResults} />
      </div>
      <div className="absolute top-0 left-0 h-full w-full">
        <RNBOWrapper results={handResults} />
      </div>
      <div className="absolute top-0 left-0 inset-0 h-fit w-fit">
        <canvas
          ref={canvasRef}
          className="w-80 h-auto border-cyan-950 object-cover"
          width="1280"
          height="720"
        ></canvas>
        <HandStats results={handResults} />
      </div>
      <div className="absolute inset-0 pointer-events-none -z-10">
        <video
          ref={videoRef}
          className="w-full h-full object-cover hidden"
          playsInline
          muted
        ></video>
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          isLoaded ? "hidden" : ""
        }`}
      >
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-lg font-semibold text-gray-700">
            Loading
          </div>
        </div>
      </div>
      <div
        className={`absolute top-4 left-4 bg-white rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
          showFMControls ? "w-84" : "w-12"
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => setShowFMControls(!showFMControls)}
        >
          {showFMControls ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <div
          ref={fmControlsRef}
          className={`p-4 ${showFMControls ? "overflow-y-scroll" : "hidden"}`}
        ></div>
      </div>
      <div
        className={`absolute top-4 right-4 bg-white rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
          showHControls ? "w-84" : "w-12"
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => setShowHControls(!showHControls)}
        >
          {showHControls ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        <div
          ref={hControlsRef}
          className={`p-4 ${showHControls ? "overflow-y-scroll" : "hidden"}`}
        ></div>
      </div>
    </div>
  );
}
