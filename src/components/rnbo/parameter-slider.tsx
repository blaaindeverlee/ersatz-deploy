import { Parameter } from "@/components/rnbo/rnbo-device";

interface ParameterSliderProps {
  parameter: Parameter;
  onChange: (id: number, value: number) => void;
}

const ParameterSlider: React.FC<ParameterSliderProps> = ({
  parameter,
  onChange,
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between">
        <label className="text-sm">{parameter.name}</label>
        <span className="text-sm">{parameter.value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={parameter.min}
        max={parameter.max}
        step={(parameter.max - parameter.min) / 100}
        value={parameter.value}
        onChange={(e) => onChange(parameter.id, parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
};

export default ParameterSlider;
