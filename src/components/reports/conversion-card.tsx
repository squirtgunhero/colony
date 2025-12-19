import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface ConversionCardProps {
  rate: number;
  closed: number;
  total: number;
}

export function ConversionCard({ rate, closed, total }: ConversionCardProps) {
  // Calculate the circle progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (rate / 100) * circumference;

  return (
    <Card className="h-full overflow-hidden bg-white border-neutral-200 relative">
      <div className="absolute -left-4 -top-4 w-16 h-16 rounded-full bg-neutral-100 blur-xl" />

      <div className="relative h-full p-4 flex flex-col items-center justify-center">
        <div className="absolute top-3 left-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/5">
            <Zap className="h-4 w-4 text-neutral-700" />
          </div>
        </div>

        {/* Circular Progress */}
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-neutral-200"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="text-neutral-900 transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-neutral-900">{rate}%</span>
          </div>
        </div>

        <p className="text-neutral-500 text-xs mt-2 text-center">
          {closed}/{total} converted
        </p>
      </div>
    </Card>
  );
}
