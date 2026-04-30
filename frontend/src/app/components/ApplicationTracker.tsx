import { Inbox, Send, Video, Gift } from "lucide-react";

const columns = [
  { title: "Saved", icon: Inbox, count: 0, color: "text-blue-600" },
  { title: "Applied", icon: Send, count: 0, color: "text-green-600" },
  { title: "Interviewing", icon: Video, count: 0, color: "text-purple-600" },
  { title: "Offer", icon: Gift, count: 0, color: "text-orange-600" }
];

export function ApplicationTracker() {
  return (
    <div className="bg-gray-50 px-6 py-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2>Application Tracker</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors">
              Job Status
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors">
              Last 100 Days
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column, index) => {
            const Icon = column.icon;
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 min-h-[280px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${column.color}`} />
                    <h3>{column.title}</h3>
                  </div>
                  <span className="text-sm text-gray-500">{column.count}</span>
                </div>

                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Inbox className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    Saved jobs will appear here
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
