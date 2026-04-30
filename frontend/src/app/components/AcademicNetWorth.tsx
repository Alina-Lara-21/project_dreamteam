import { TrendingUp, DollarSign, Award } from "lucide-react";

export function AcademicNetWorth() {
  const projectedSalary = {
    low: 120000,
    mid: 145000,
    high: 180000
  };

  const formatSalary = (num: number) => {
    return `$${(num / 1000).toFixed(0)}k`;
  };

  const percentage = ((projectedSalary.mid - projectedSalary.low) / (projectedSalary.high - projectedSalary.low)) * 100;

  return (
    null
  );
}
