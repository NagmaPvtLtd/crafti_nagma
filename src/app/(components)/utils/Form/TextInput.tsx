"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { inputClass } from "./fieldStyles";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ invalid = false, className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`${inputClass(invalid)} ${className}`}
        {...rest}
      />
    );
  },
);

export default TextInput;
