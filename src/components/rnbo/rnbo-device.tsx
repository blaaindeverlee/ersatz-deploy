"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createDevice, Device } from "@rnbo/js";
import ParameterSlider from "@/components/rnbo/parameter-slider";

export interface Parameter {
  id: number;
  key: string;
  name: string;
  value: number;
  min: number;
  max: number;
  steps: number;
  unit: string;
  type: number;
}
interface RNBODeviceProps {
  onDeviceReady?: (
    device: Device,
    paramNameToId: (name: string, parameters: Parameter[]) => number,
    handleParameterChange: (id: number, value: number) => void,
    parameters: Parameter[]
  ) => void;
}

const RNBODevice: React.FC<RNBODeviceProps> = ({ onDeviceReady }) => {
  // const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mute, setMute] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [context, setContext] = useState<AudioContext | undefined>();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [showControls, setShowControls] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Group parameters by type
  // const parameterGroups = {
  //   main: ["ipVolume", "ipPitch", "ipSpeed"],
  //   delay: ["ipDelayMix", "ipDelayTime", "ipDelayFeedback"],
  //   reverb: ["iReverbTime", "ipReverbRoomSize", "gigaverb/revtime"],
  //   grain: ["ipGrainLimit", "ipPosition", "ipSampleSize"],
  // };

  useEffect(() => {
    if (!parameters.length) return;
    handleParameterChange(paramNameToId("ipDelayTime", parameters), 0); // Set default volume
  }, [parameters]);

  const paramNameToId = (name: string, parameters: Parameter[]): number => {
    const parameter = parameters.find((p) => p.name === name);
    return parameter ? parameter.id : -1;
  };

  const handleParameterChange = useCallback(
    (parameterId: number, value: number) => {
      if (!device) return;

      try {
        // Ensure the value is within bounds
        const param = device.parameters[parameterId];
        if (param) {
          const boundedValue = Math.max(param.min, Math.min(param.max, value));
          param.value = boundedValue;

          // Update local state
          setParameters((prev) =>
            prev.map((p) =>
              p.id === parameterId ? { ...p, value: boundedValue } : p
            )
          );
        }
      } catch (error) {
        console.error("Error updating parameter:", parameterId, error);
      }
    },
    [device]
  );

  useEffect(() => {
    if (!context) {
      return;
    }

    const initializeRNBO = async () => {
      try {
        const response = await fetch("/main.export.json");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Expected JSON response but got " + contentType);
        }

        const patcher = await response.json();

        const createdDevice = await createDevice({ context, patcher });

        createdDevice.node.connect(context.destination);

        await initLoadBuffer(context, createdDevice);

        setDevice(createdDevice);
        const params = getDeviceParameters(createdDevice);
        setParameters(params); // Set parameters when device is ready

        // setIsLoaded(true);

        console.log(getDeviceParameters(createdDevice));
      } catch (error) {
        console.error("Error initializing RNBO:", error);
      }
    };

    initializeRNBO();

    // Cleanup on unmount
    return () => {
      if (device) {
        device.node.disconnect();
      }
      if (context) {
        context.close();
      }
    };
  }, [context]);

  useEffect(() => {
    if (!device) return;
    onDeviceReady?.(device, paramNameToId, handleParameterChange, parameters);
  }, [device]);

  const deb = () => {
    console.log(context?.state);
  };

  const initLoadBuffer = async (context: AudioContext, device: Device) => {
    try {
      // Fetch audio file
      const response = await fetch("/media/sample.mp3"); // Adjust path as needed
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);

      // Load into RNBO device buffer named 'mygrain'
      await device.setDataBuffer("thegrain", audioBuffer);
      console.log("Buffer loaded successfully");
    } catch (error) {
      console.error("Error loading buffer:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && context && device) {
      const arrayBuffer = await file.arrayBuffer();
      await loadBuffer(context, device, arrayBuffer);
    }
  };

  const loadBuffer = async (
    context: AudioContext,
    device: Device,
    arrayBuffer: ArrayBuffer
  ) => {
    try {
      const audioBuffer = await context.decodeAudioData(arrayBuffer);

      // Load into RNBO device buffer named 'thegrain'
      await device.setDataBuffer("thegrain", audioBuffer);
      console.log("Buffer loaded successfully");
    } catch (error) {
      console.error("Error loading buffer:", error);
    }
  };

  const startPatch = () => {
    const context = new AudioContext();
    // const WAContext =
    //   window.AudioContext || (window as any).webkitAudioContext;
    // const context = new WAContext();
    // contextRef.current = context;
    context.resume();
    setContext(context);
    // setIsLoaded(true);
  };

  const handlePlayPause = async () => {
    if (!context) {
      startPatch();
      setIsPlaying(true);
      return;
    }

    try {
      if (context.state === "suspended") {
        await context.resume();
      }

      const ipStateId = paramNameToId("ipState", parameters);

      if (isPlaying) {
        handleParameterChange(ipStateId, 0);
      } else {
        handleParameterChange(ipStateId, 1);
        // handleParameterChange(paramNameToId("ipDelayTime", parameters), 0); // set delay time to 0
      }

      setIsPlaying(!isPlaying);
      // Add your RNBO-specific play/pause logic here
    } catch (error) {
      console.error("Error toggling playback:", error);
    }
  };

  const handleMute = async () => {
    if (!device || !context) return;
    if (mute) {
      await context.suspend();
    } else {
      await context.resume();
    }
    setMute(!mute);
  };

  const getDeviceParameters = (device: Device) => {
    if (!device) return [];

    const paramList: Parameter[] = [];

    // RNBO parameters are accessed as an object
    Object.entries(device.parameters).forEach(([key, param], index) => {
      paramList.push({
        id: index, // Use the actual parameter name as ID
        key: key,
        name: param.name,
        value: param.value,
        min: param.min,
        max: param.max,
        steps: param.steps,
        unit: param.unit,
        type: param.type,
      });
    });

    return paramList;
  };

  // const handleParameterChange = (parameterId: string, value: any) => {
  //   if (!device) return;
  //   device.parameters.get(parameterId).value = value;
  // };

  return (
    <div className="p-4 w-full h-full">
      {/* Parameter Controls */}
      <div
        className={`absolute top-10 right-4 bg-white rounded-lg shadow-lg 
        transition-all duration-300 ease-in-out ${
          showControls ? "w-96" : "w-12"
        }`}
      >
        <button
          className="absolute top-16 right-4 p-5 rounded-md bg-gray-300 hover:bg-blue-50"
          onClick={() => setShowControls(!showControls)}
        >
          {showControls ? (
            <span className="h-4 w-4">→</span>
          ) : (
            <span className="h-4 w-4 p-4">parameters</span>
          )}
        </button>

        <div
          className={`p-4 ${
            showControls ? "overflow-y-scroll max-h-[90vh]" : "hidden"
          }`}
        >
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded">
            Parameters loaded: {parameters.length}
          </div>

          <p className="text-lg font-bold mb-4">Parameters</p>

          <div className="mb-6">
            <div className="space-y-4">
              {parameters.map((param) => (
                <ParameterSlider
                  key={param.id}
                  parameter={param}
                  onChange={handleParameterChange}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 flex-row justify-evenly space-x-4">
        <button
          onClick={handlePlayPause}
          className={`px-4 py-2 text-white rounded ${
            isPlaying
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isPlaying ? "Stop Audio Engine" : "Start Audio Engine"}
        </button>

        <button
          onClick={handleMute}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Mute
        </button>

        <button
          onClick={deb}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          debug
        </button>

        <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className=""
        />
      </div>
    </div>
  );
};

export default RNBODevice;
