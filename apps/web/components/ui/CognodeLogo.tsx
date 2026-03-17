import React from 'react';

export const CognodeLogo = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
    return (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            {/* Outer Square */}
            <rect 
                x="2.5" 
                y="2.5" 
                width="19" 
                height="19" 
                stroke="currentColor" 
                strokeWidth="1.5"
            />
            {/* Inner Dot */}
            <circle 
                cx="12" 
                cy="12" 
                r="3.5" 
                fill="var(--amber, #D97706)" 
            />
        </svg>
    )
}
