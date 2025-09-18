import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <GradientSpinner />
        </div>
    );
};

const GradientSpinner = () => (
    <div className="relative">
        <svg width={0} height={0} className="absolute">
            <defs>
                <linearGradient
                    id="spinner_gradient"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                >
                    <stop offset="0%" stopColor="#e01cd5" />
                    <stop offset="100%" stopColor="#1CB5E0" />
                </linearGradient>
            </defs>
        </svg>
        <Loader2
            className="w-8 h-8 animate-spin"
            style={{ stroke: 'url(#spinner_gradient)' }}
        />
    </div>
);

export default LoadingScreen;
