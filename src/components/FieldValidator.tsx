import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldValidatorProps {
    children: React.ReactNode;
    isValid?: boolean; // true = valid, false = invalid/rejected, undefined = not validated yet
    onValidate?: (isValid: boolean) => void; // Callback when manager clicks check/x
    canValidate?: boolean; // If true, shows the validation controls (for managers)
    showValidation?: boolean; // If true, shows the border/icon status (for everyone)
    className?: string;
    isMissing?: boolean; // If true, this field was flagged as missing/corrected needed
}

export const FieldValidator: React.FC<FieldValidatorProps> = ({
    children,
    isValid,
    onValidate,
    canValidate = false,
    showValidation = true,
    className,
    isMissing = false,
}) => {

    // Status color logic
    let borderColor = "border-gray-200 dark:border-[#444746]"; // Default
    if (showValidation) {
        if (isValid === true) borderColor = "border-green-500 ring-1 ring-green-500/20";
        else if (isValid === false) borderColor = "border-red-500 ring-1 ring-red-500/20";
        else if (isMissing) borderColor = "border-orange-500 ring-1 ring-orange-500/20";
    }

    return (
        <div className={cn("relative group", className)}>
            <div className={cn("relative rounded-lg transition-all duration-200", showValidation && isValid !== undefined ? "" : "")}>
                {/* 
                   We wrap the children (Input) to add borders/icons. 
                   Typically children is an <input> or <select> which has its own border.
                   We might want to override that or just place icons absolutely.
                   For this implementation, we assume children has its own styling, 
                   and we just add specific indicators or wrap it.
                */}
                <div className={cn("relative", isMissing ? "animate-pulse-subtle" : "")}>
                    {children}

                    {/* Status Icon Overlay (Right side inside input) */}
                    {showValidation && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                            {isValid === true && <Check size={16} className="text-green-500" />}
                            {(isValid === false || isMissing) && <AlertCircle size={16} className={isMissing ? "text-orange-500" : "text-red-500"} />}
                        </div>
                    )}
                </div>

                {/* Validation Controls (Manager Only) - Floating on hover or persistent if invalid */}
                {canValidate && onValidate && (
                    <div className={cn(
                        "absolute -right-20 top-1/2 -translate-y-1/2 flex gap-1 bg-white dark:bg-surface shadow-sm border border-gray-100 dark:border-[#444746] rounded-lg p-1 transition-opacity",
                        // Show if hovering container OR if currently invalid/valid (so they can toggle)
                        "opacity-0 group-hover:opacity-100 z-10"
                    )}>
                        <button
                            type="button"
                            onClick={() => onValidate(true)}
                            className={cn(
                                "p-1.5 rounded hover:bg-green-50 transition-colors",
                                isValid === true ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-green-600"
                            )}
                            title="Mark Valid"
                        >
                            <Check size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onValidate(false)}
                            className={cn(
                                "p-1.5 rounded hover:bg-red-50 transition-colors",
                                isValid === false ? "text-red-600 bg-red-50" : "text-gray-400 hover:text-red-600"
                            )}
                            title="Mark Invalid / Missing"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>
            {isMissing && (
                <p className="text-[10px] text-orange-600 font-medium mt-0.5 ml-1">Correção solicitada</p>
            )}
        </div>
    );
};
