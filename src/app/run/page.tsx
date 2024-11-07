import React from "react";
import dynamic from "next/dynamic";
// import Scene from "@/components/three/scene";

// const FaceMesh = dynamic(() => import("@/components/media-pipe"), {
//   ssr: false,
// });

const MediaPipeSolutions = dynamic(
  () => import("@/components/media-pipe-solutions"),
  {
    ssr: false,
  }
);

const page = () => {
  return (
    <>
      <MediaPipeSolutions />
    </>
  );
};

export default dynamic(() => Promise.resolve(page), {
  ssr: false,
});
