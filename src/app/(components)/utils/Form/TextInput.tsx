"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { inputClass } from "./fieldStyles";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ invalid, className = "", ...rest }, ref) {
    const ariaInvalid = rest["aria-invalid"];
    const isInvalid =
      invalid ?? (ariaInvalid === true || ariaInvalid === "true");

    return (
      <input
        ref={ref}
        className={`${inputClass(isInvalid)} ${className}`}
        {...rest}
      />
    );
  },
);

export default TextInput;
