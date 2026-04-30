import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

interface SkillRadarChartProps {
  userSkills: string[];
  requiredSkills: string[];
}

export function SkillRadarChart({ userSkills, requiredSkills }: SkillRadarChartProps) {
  // Create data for the radar chart
  const allSkills = Array.from(new Set([...requiredSkills]));

  const data = allSkills.map((skill, index) => ({
    skill: skill,
    required: 100,
    current: userSkills.includes(skill) ? 100 : 0,
    id: `skill-${index}` // Add unique ID for each data point
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="mb-4">Skill Coverage Visualization</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" key="polar-grid" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            key="polar-angle"
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} key="polar-radius" />
          <Radar
            name="Required"
            dataKey="required"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.2}
            key="radar-required"
          />
          <Radar
            name="Your Skills"
            dataKey="current"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
            key="radar-current"
          />
          <Legend key="legend" />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 text-center mt-4">
        Blue shows your current skills. Red shows all required skills for this role.
      </p>
    </div>
  );
}
