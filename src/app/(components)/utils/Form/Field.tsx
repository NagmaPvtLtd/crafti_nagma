"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

type FieldProps = {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  action?: ReactNode;
  required?: boolean;
  children: ReactElement<{
    id?: string;
    invalid?: boolean;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
  className?: string;
};

export default function Field({
  label,
  error,
  hint,
  action,
  required,
  children,
  className = "",
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const child = isValidElement(children)
    ? cloneElement(children, {
        id,
        invalid: Boolean(error),
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={`block ${className}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-xs font-semibold tracking-wider text-stone-700 uppercase"
        >
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-rose-500">
              *
            </span>
          )}
        </label>
        {action}
      </div>

      {child}

      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
