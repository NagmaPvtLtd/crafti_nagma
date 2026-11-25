"use client";

import Field from "./Field";
import TextInput from "./TextInput";
import { inputClass } from "./fieldStyles";

export type DimensionFormValue = {
  length: string;
  width: string;
  height: string;
  unit: "cm" | "in";
};

export const emptyDimensions: DimensionFormValue = {
  length: "",
  width: "",
  height: "",
  unit: "cm",
};

/**
 * Optional Length / Width / Height inputs sharing one unit. Empty fields are
 * stored as NULL; no automatic unit conversion happens when the unit changes.
 */
export default function DimensionFields({
  value,
  onChange,
}: {
  value: DimensionFormValue;
  onChange: (value: DimensionFormValue) => void;
}) {
  const setField = (key: keyof DimensionFormValue, next: string) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Length" hint="Optional. Empty means not measured.">
          <TextInput
            type="number"
            min={0}
            step="0.01"
            value={value.length}
            onChange={(e) => setField("length", e.target.value)}
            placeholder="—"
            className="tabular-nums"
          />
        </Field>
        <Field label="Width">
          <TextInput
            type="number"
            min={0}
            step="0.01"
            value={value.width}
            onChange={(e) => setField("width", e.target.value)}
            placeholder="—"
            className="tabular-nums"
          />
        </Field>
        <Field label="Height">
          <TextInput
            type="number"
            min={0}
            step="0.01"
            value={value.height}
            onChange={(e) => setField("height", e.target.value)}
            placeholder="—"
            className="tabular-nums"
          />
        </Field>
      </div>

      <div className="max-w-55">
        <Field
          label="Unit"
          hint="Applies to all three measurements. Changing the unit does not convert the numbers."
        >
          <select
            value={value.unit}
            onChange={(e) =>
              onChange({ ...value, unit: e.target.value as "cm" | "in" })
            }
            className={`${inputClass(false)} cursor-pointer`}
          >
            <option value="cm">Centimetres (cm)</option>
            <option value="in">Inches (in)</option>
          </select>
        </Field>
      </div>
    </div>
  );
}
