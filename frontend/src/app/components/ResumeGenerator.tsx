import { FileText, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const sampleBullets = [
  "Developed full-stack web applications using React, Node.js, and PostgreSQL, serving over 10,000+ users",
  "Implemented RESTful APIs and microservices architecture, improving system scalability by 40%",
  "Led development of e-commerce platform with payment integration, resulting in $500K+ in transactions",
  "Collaborated with cross-functional teams using Agile methodologies to deliver features on schedule",
  "Optimized database queries and implemented caching strategies, reducing page load time by 60%"
];

export function ResumeGenerator() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2>Resume Content Generator</h2>
          <p className="text-sm text-gray-600">AI-generated bullet points based on your profile and matched jobs</p>
        </div>
      </div>

      <div className="space-y-3">
        {sampleBullets.map((bullet, index) => (
          <div
            key={index}
            className="group relative bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-blue-600 mt-1">•</span>
              <p className="flex-1 text-gray-800">{bullet}</p>
              <button
                onClick={() => copyToClipboard(bullet, index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white rounded-lg"
              >
                {copiedIndex === index ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> These bullets are tailored to emphasize the skills from your academic profile that match job requirements.
        </p>
      </div>
    </div>
  );
}
