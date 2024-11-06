"use client";

import React, { useEffect, useRef, useState } from "react";
import * as mpFM from "@mediapipe/face_mesh";
import * as mpHands from "@mediapipe/hands";
import * as controls from "@mediapipe/control_utils";
import DeviceDetector from "device-detector-js";
import * as drawingUtils from "@mediapipe/drawing_utils";
// import styles from "./style.module.scss";

const FaceMesh: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fmControlsRef = useRef<HTMLDivElement>(null);
  const hControlsRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initRef = useRef(false);

  const fmConfig = {
    locateFile: (file: string) => {
      return (
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@` +
        `${mpFM.VERSION}/${file}`
      );
    },
  };

  const hConfig = {
    locateFile: (file: string) => {
      return (
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@` +
        `${mpHands.VERSION}/${file}`
      );
    },
  };

  useEffect(() => {
    if (initRef.current) return; // Skip re-render (better than disabling react strict mode)
    initRef.current = true;
    if (typeof window === "undefined") return;

    const testSupport = (
      supportedDevices: { client?: string; os?: string }[]
    ) => {
      const deviceDetector = new DeviceDetector();
      const detectedDevice = deviceDetector.parse(navigator.userAgent);
      if (!detectedDevice.client || !detectedDevice.os) {
        alert("Failed to detect device, model may not work");
        return;
      }

      let isSupported = false;
      for (const device of supportedDevices) {
        if (device.client !== undefined) {
          const re = new RegExp(`^${device.client}$`);
          if (!re.test(detectedDevice.client.name)) {
            continue;
          }
        }
        if (device.os !== undefined) {
          const re = new RegExp(`^${device.os}$`);
          if (!re.test(detectedDevice.os.name)) {
            continue;
          }
        }
        isSupported = true;
        break;
      }
      if (!isSupported) {
        alert(
          `This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
            `is not well supported at this time, continue at your own risk.`
        );
      }
    };

    testSupport([{ client: "Chrome" }]);

    const fmSolutionOptions = {
      selfieMode: true,
      enableFaceGeometry: false,
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    const handsSolutionOptions = {
      selfieMode: true,
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    const fpsControl = new controls.FPS();

    const onResultsFM = (results: mpFM.Results) => {
      setIsLoaded(true);

      fpsControl.tick();

      const canvasCtx = canvasRef.current?.getContext("2d");
      if (!canvasCtx) return;

      canvasCtx.save();
      canvasCtx.clearRect(
        0,
        0,
        canvasRef.current!.width,
        canvasRef.current!.height
      );
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasRef.current!.width,
        canvasRef.current!.height
      );
      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpFM.FACEMESH_TESSELATION,
            { color: "#C0C0C070", lineWidth: 1 }
          );
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpFM.FACEMESH_RIGHT_EYE,
            { color: "#FF3030" }
          );
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpFM.FACEMESH_RIGHT_EYEBROW,
            { color: "#FF3030" }
          );
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpFM.FACEMESH_LEFT_EYE,
            { color: "#30FF30" }
          );
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpFM.FACEMESH_LEFT_EYEBROW,
            { color: "#30FF30" }
          );
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpFM.FACEMESH_FACE_OVAL,
            { color: "#E0E0E0" }
          );
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpFM.FACEMESH_LIPS,
            {
              color: "#E0E0E0",
            }
          );
          if (fmSolutionOptions.refineLandmarks) {
            drawingUtils.drawConnectors(
              canvasCtx,
              landmarks,
              mpFM.FACEMESH_RIGHT_IRIS,
              { color: "#FF3030" }
            );
            drawingUtils.drawConnectors(
              canvasCtx,
              landmarks,
              mpFM.FACEMESH_LEFT_IRIS,
              { color: "#30FF30" }
            );
          }
        }
      }
      canvasCtx.restore();
    };

    const onResultsH = (results: mpHands.Results) => {
      // fpsControl.tick();

      const canvasCtx = canvasRef.current?.getContext("2d");
      if (!canvasCtx) return;

      if (results.multiHandLandmarks && results.multiHandedness) {
        for (
          let index = 0;
          index < results.multiHandLandmarks.length;
          index++
        ) {
          const classification = results.multiHandedness[index];
          const isRightHand = classification.label === "Right";
          const landmarks = results.multiHandLandmarks[index];
          drawingUtils.drawConnectors(
            canvasCtx,
            landmarks,
            mpHands.HAND_CONNECTIONS,
            { color: isRightHand ? "#00FF00" : "#FF0000" }
          );
          drawingUtils.drawLandmarks(canvasCtx, landmarks, {
            color: isRightHand ? "#00FF00" : "#FF0000",
            fillColor: isRightHand ? "#FF0000" : "#00FF00",
            radius: (data) => {
              return drawingUtils.lerp(data.from?.z ?? 0, -0.15, 0.1, 10, 1);
            },
          });
        }
      }
      canvasCtx.restore();

      // 3D grid
      // if (results.multiHandWorldLandmarks) {
      //   // We only get to call updateLandmarks once, so we need to cook the data to
      //   // fit. The landmarks just merge, but the connections need to be offset.
      //   const landmarks = results.multiHandWorldLandmarks.reduce(
      //     (prev, current) => [...prev, ...current],
      //     []
      //   );
      //   const colors = [];
      //   let connections = [];
      //   for (
      //     let loop = 0;
      //     loop < results.multiHandWorldLandmarks.length;
      //     ++loop
      //   ) {
      //     const offset = loop * mpHands.HAND_CONNECTIONS.length;
      //     const offsetConnections = mpHands.HAND_CONNECTIONS.map(
      //       (connection) => [connection[0] + offset, connection[1] + offset]
      //     );
      //     connections = connections.concat(offsetConnections);
      //     const classification = results.multiHandedness[loop];
      //     colors.push({
      //       list: offsetConnections.map((unused, i) => i + offset),
      //       color: classification.label,
      //     });
      //   }
      //   grid.updateLandmarks(landmarks, connections, colors);
      // } else {
      //   grid.updateLandmarks([]);
      // }
    };

    const faceMesh = new mpFM.FaceMesh(fmConfig);
    faceMesh.setOptions(fmSolutionOptions);
    faceMesh.onResults(onResultsFM);

    const hands = new mpHands.Hands(hConfig);
    hands.setOptions(handsSolutionOptions);
    hands.onResults(onResultsH);

    if (fmControlsRef.current) {
      new controls.ControlPanel(fmControlsRef.current, fmSolutionOptions)
        .add([
          new controls.StaticText({ title: "MediaPipe Face Mesh" }),
          fpsControl,
          new controls.Toggle({ title: "Selfie Mode", field: "selfieMode" }),
          new controls.SourcePicker({
            onFrame: async (
              input: controls.InputImage,
              size: controls.Rectangle
            ) => {
              const aspect = size.height / size.width;
              let width: number, height: number;
              if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
              } else {
                width = window.innerWidth;
                height = width * aspect;
              }
              canvasRef.current!.width = width;
              canvasRef.current!.height = height;
              await faceMesh.send({ image: input });
            },
          }),
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
        .on((options: mpFM.Options) => {
          videoRef.current?.classList.toggle("selfie", options.selfieMode);
          faceMesh.setOptions(options);
        });
    }

    if (hControlsRef.current) {
      new controls.ControlPanel(hControlsRef.current, handsSolutionOptions)
        .add([
          new controls.StaticText({ title: "MediaPipe Hands" }),
          fpsControl,
          new controls.Toggle({ title: "Selfie Mode", field: "selfieMode" }),
          new controls.SourcePicker({
            onFrame: async (
              input: controls.InputImage,
              size: controls.Rectangle
            ) => {
              const aspect = size.height / size.width;
              let width: number, height: number;
              if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
              } else {
                width = window.innerWidth;
                height = width * aspect;
              }
              canvasRef.current!.width = width;
              canvasRef.current!.height = height;
              await faceMesh.send({ image: input });
            },
          }),
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
        .on((options: mpFM.Options) => {
          videoRef.current?.classList.toggle("selfie", options.selfieMode);
          hands.setOptions(options);
        });
    }

    // Clean up function
    return () => {
      if (faceMesh) {
        faceMesh.close();
      }
    };
  }, []);

  return (
    <div className="">
      <div className="">
        <canvas
          ref={canvasRef}
          className=""
          width="1280px"
          height="720px"
        ></canvas>
      </div>
      <div className={`${isLoaded ? "" : ""}`}>
        <div className=""></div>
        <div className="">Loading</div>
      </div>
      <a
        className=""
        href="http://www.mediapipe.dev"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            bottom: 0,
            right: "10px",
          }}
        >
          <span className="">MediaPipe</span>
        </div>
      </a>
      <div ref={fmControlsRef} className=""></div>
      <div ref={hControlsRef} className=""></div>
    </div>
  );
};

export default FaceMesh;
