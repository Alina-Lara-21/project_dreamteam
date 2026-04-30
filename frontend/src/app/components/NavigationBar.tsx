import { Search, User, Bell } from "lucide-react";
import { Link } from "react-router";

export function NavigationBar() {
  return (
    <nav className="bg-[#1a2332] text-white px-6 py-4">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-bold text-xl hover:text-blue-300 transition-colors flex items-center gap-2">
            <span className="text-2xl">🌉</span>
            The Bridge
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-blue-300 transition-colors">Dashboard</Link>
            <Link to="/academic-profile" className="hover:text-blue-300 transition-colors">Build Profile</Link>
            <Link to="/jobs" className="hover:text-blue-300 transition-colors">Recommended Roles</Link>
            <Link to="/saved" className="hover:text-blue-300 transition-colors">Saved</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/jobs" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Search className="w-5 h-5" />
          </Link>

          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <Link to="/profile" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
