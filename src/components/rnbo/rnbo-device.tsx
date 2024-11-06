"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createDevice, Device } from "@rnbo/js";
import ParameterSlider from "@/components/rnbo/parameter-slider";

export interface Parameter {
  id: any;
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
    paramNameToId: (name: string, parameters: Parameter[]) => string,
    handleParameterChange: (id: string, value: number) => void,
    parameters: Parameter[]
  ) => void;
}

const RNBODevice: React.FC<RNBODeviceProps> = ({ onDeviceReady }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mute, setMute] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [context, setContext] = useState<AudioContext | undefined>();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [showControls, setShowControls] = useState(false);

  // Group parameters by type
  const parameterGroups = {
    main: ["ipVolume", "ipPitch", "ipSpeed"],
    delay: ["ipDelayMix", "ipDelayTime", "ipDelayFeedback"],
    reverb: ["iReverbTime", "ipReverbRoomSize", "gigaverb/revtime"],
    grain: ["ipGrainLimit", "ipPosition", "ipSampleSize"],
  };

  const paramNameToId = (name: string, parameters: Parameter[]): string => {
    const parameter = parameters.find((p) => p.name === name);
    return parameter ? parameter.id : -1;
  };

  const handleParameterChange = useCallback(
    (parameterId: string, value: number) => {
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

        await loadBuffer(context, createdDevice);

        setDevice(createdDevice);
        const params = getDeviceParameters(createdDevice);
        setParameters(params); // Set parameters when device is ready

        setIsLoaded(true);

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

  const loadBuffer = async (context: AudioContext, device: Device) => {
    try {
      // Fetch audio file
      const response = await fetch("/media/sample.wav"); // Adjust path as needed
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);

      // Load into RNBO device buffer named 'mygrain'
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
    setIsLoaded(true);
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
    Object.entries(device.parameters).forEach(([key, param]) => {
      paramList.push({
        id: key, // Use the actual parameter name as ID
        name: param.name || key,
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
          className="relative top-10 right-4 rounded-full hover:bg-gray-100"
          onClick={() => setShowControls(!showControls)}
        >
          {showControls ? (
            <span className="h-4 w-4">→</span>
          ) : (
            <span className="h-4 w-4">←</span>
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

      {/* Play/Pause Controls */}
      <button
        onClick={handlePlayPause}
        className="absolute bottom-4 left-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isPlaying ? "Stop" : "Start"}
      </button>

      <button
        onClick={handleMute}
        className="absolute bottom-4 left-24 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Mute
      </button>

      <button
        onClick={deb}
        className="absolute bottom-4 left-44 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        debug
      </button>
    </div>
  );
};

export default RNBODevice;
