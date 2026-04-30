import { Clock, Zap, Monitor, Briefcase, Rocket } from "lucide-react";

const categories = [
  { icon: Clock, label: "New Matches", count: "24 New Opportunities" },
  { icon: Zap, label: "High Match", count: "18 Jobs (90%+ Match)" },
  { icon: Monitor, label: "Remote", count: "156 Remote Roles" },
  { icon: Briefcase, label: "Entry Level", count: "43 Junior Positions" },
  { icon: Rocket, label: "Tech Startups", count: "89 Startup Roles" }
];

export function HeroSection() {
  return (
    <div className="bg-gradient-to-br from-[#5b7bd5] to-[#7c9df5] text-white px-6 py-10">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="mb-2">Your Career Matches</h1>
        <p className="text-white/90 mb-8">Connecting your academic journey to real opportunities</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <button
                key={index}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all rounded-xl p-5 text-left group"
              >
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-sm opacity-90 mb-1">{category.count}</div>
                <div className="font-semibold">{category.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
