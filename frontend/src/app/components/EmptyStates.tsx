import { Building2, BookOpen } from "lucide-react";

export function SavedCompanies() {
  return (
    <div className="bg-gray-50 px-6 py-8">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="mb-6">Saved Companies</h2>

        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="mb-2">Saved Companies will appear here</h3>
            <p className="text-gray-600 mb-6">
              Follow companies you're interested in to stay updated on their latest job openings
            </p>
            <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              Explore Companies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SavedArticles() {
  return (
    <div className="bg-white px-6 py-8">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="mb-6">Saved Articles</h2>

        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="mb-2">Saved Articles will appear here</h3>
            <p className="text-gray-600 mb-6">
              Bookmark career advice and industry insights to read later
            </p>
            <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              Explore Articles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
