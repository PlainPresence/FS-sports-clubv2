import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
}

export default function Shimmer({ className, children }: ShimmerProps) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200px_100%]",
        "animate-[shimmer_2s_linear_infinite]",
        className
      )}
      style={{
        animation: 'shimmer 2s linear infinite',
        backgroundImage: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200px 100%',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {children}
    </div>
  );
}
