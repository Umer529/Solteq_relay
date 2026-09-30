"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = "", wrapperClassName = "", type: _type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className={`password-input-wrap ${wrapperClassName}`}>
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={`password-input-field ${className}`}
          {...props}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          title={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
          disabled={props.disabled}
        >
          {showPassword ? (
            <EyeOff size={16} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
