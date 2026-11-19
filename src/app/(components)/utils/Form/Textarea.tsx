"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { inputClass } from "./fieldStyles";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid, className = "", ...rest }, ref) {
    const ariaInvalid = rest["aria-invalid"];
    const isInvalid =
      invalid ?? (ariaInvalid === true || ariaInvalid === "true");

    return (
      <textarea
        ref={ref}
        className={`${inputClass(isInvalid)} min-h-24 resize-y leading-relaxed ${className}`}
        {...rest}
      />
    );
  },
);

export default Textarea;
