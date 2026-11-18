"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { inputClass } from "./fieldStyles";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid = false, className = "", ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={`${inputClass(invalid)} min-h-24 resize-y leading-relaxed ${className}`}
        {...rest}
      />
    );
  },
);

export default Textarea;
