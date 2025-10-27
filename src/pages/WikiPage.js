import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui';

export default function WikiPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Simple Banner */}
      <div className="bg-msh-blue text-white rounded-lg p-4 mb-4 text-center">
        <p className="text-lg font-semibold">MSH³ Wiki — Your guide to Mindset, Skillset, and Habits 📚</p>
      </div>

      {/* First Row - Three Pillars */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card borderColor="culture">
          <h3 className="text-lg font-bold text-culture mb-1">Culture</h3>
          <p className="text-xs text-neutral mb-2 italic">How we show up</p>
          <p className="text-xs text-neutral-dark">
            Collaboration, communication, accountability, and alignment with SNB values. The foundation of team dynamics.
          </p>
        </Card>

        <Card borderColor="competencies">
          <h3 className="text-lg font-bold text-competencies mb-1">Competencies</h3>
          <p className="text-xs text-neutral mb-2 italic">What we know</p>
          <p className="text-xs text-neutral-dark">
            Technical and functional skills that enable reliable, high-quality work. The expertise that drives excellence.
          </p>
        </Card>

        <Card borderColor="execution">
          <h3 className="text-lg font-bold text-execution mb-1">Execution</h3>
          <p className="text-xs text-neutral mb-2 italic">What we deliver</p>
          <p className="text-xs text-neutral-dark">
            The ability to translate plans into results. Turning strategy into measurable outcomes.
          </p>
        </Card>
      </div>

      {/* Second Row - Point System + Nine-Box + Assessment Cycles */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card borderColor="msh-blue">
          <h3 className="text-lg font-bold text-msh-blue mb-2">Point System</h3>
          <p className="text-xs text-neutral mb-2 italic">Simple 0-2 scale</p>
          <div className="space-y-1.5 text-xs text-neutral-dark">
            <div className="flex items-start gap-2">
              <span className="font-bold text-red-600 min-w-[20px]">0:</span>
              <span>Below expectations</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-yellow-600 min-w-[20px]">1:</span>
              <span>Meets expectations</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-green-600 min-w-[20px]">2:</span>
              <span>Exceeds expectations</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-semibold text-neutral-dark mb-1">Each pillar has 2 dimensions:</p>
            <p className="text-xs text-neutral-dark">
              <span className="font-semibold">Contribution</span> (0-2) + <span className="font-semibold">Growth</span> (0-2)
            </p>
          </div>
        </Card>

        <Card borderColor="msh-indigo">
          <h3 className="text-lg font-bold text-msh-indigo mb-2">Nine-Box Model</h3>
          <p className="text-xs text-neutral mb-2 italic">Contribution × Growth</p>
          <div className="bg-gray-50 rounded-lg p-2 mb-2">
            <div className="grid grid-cols-3 gap-1 text-center text-xs font-semibold mb-1">
              <div className="bg-green-100 text-green-800 rounded px-1 py-0.5">High</div>
              <div className="bg-yellow-100 text-yellow-800 rounded px-1 py-0.5">Mid</div>
              <div className="bg-red-100 text-red-800 rounded px-1 py-0.5">Low</div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center text-xs">
              <div className="text-green-700">5-6</div>
              <div className="text-yellow-700">3-4</div>
              <div className="text-red-700">0-2</div>
            </div>
          </div>
          <p className="text-xs text-neutral-dark mb-1">
            <span className="font-semibold">Composite Score:</span> Sum of all 6 ratings (0-12)
          </p>
          <p className="text-xs text-neutral italic">
            Example: Culture(1+2) + Comp(2+1) + Exec(1+2) = 9 → High
          </p>
        </Card>

        <Card borderColor="msh-purple">
          <h3 className="text-lg font-bold text-msh-purple mb-2">Assessment Cycles</h3>
          <p className="text-xs text-neutral mb-2 italic">3-month cycles, year-round</p>
          <div className="space-y-2">
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-xs font-semibold text-blue-900 mb-1">1×1 Months</p>
              <p className="text-xs text-blue-800">Monthly peer check-ins</p>
              <p className="text-xs text-blue-700 font-mono">Oct, Nov, Jan, Feb, Apr, May, Jul, Aug</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="text-xs font-semibold text-purple-900 mb-1">360° Months</p>
              <p className="text-xs text-purple-800">Multi-rater feedback</p>
              <p className="text-xs text-purple-700 font-mono">Dec, Mar, Jun, Sep</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Third Row - What Gets Assessed */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card borderColor="culture">
          <h3 className="text-sm font-bold text-culture mb-2">Culture Assessment</h3>
          <div className="space-y-2 text-xs text-neutral-dark">
            <div>
              <p className="font-semibold text-culture">Contribution (0-2)</p>
              <p>How you show up today</p>
            </div>
            <div>
              <p className="font-semibold text-culture">Growth (0-2)</p>
              <p>How you're developing culture skills</p>
            </div>
          </div>
        </Card>

        <Card borderColor="competencies">
          <h3 className="text-sm font-bold text-competencies mb-2">Competencies Assessment</h3>
          <div className="space-y-2 text-xs text-neutral-dark">
            <div>
              <p className="font-semibold text-competencies">Contribution (0-2)</p>
              <p>Your technical impact right now</p>
            </div>
            <div>
              <p className="font-semibold text-competencies">Growth (0-2)</p>
              <p>Skills you're actively building</p>
            </div>
          </div>
        </Card>

        <Card borderColor="execution">
          <h3 className="text-sm font-bold text-execution mb-2">Execution Assessment</h3>
          <div className="space-y-2 text-xs text-neutral-dark">
            <div>
              <p className="font-semibold text-execution">Contribution (0-2)</p>
              <p>Results delivered this period</p>
            </div>
            <div>
              <p className="font-semibold text-execution">Growth (0-2)</p>
              <p>Capability improvement trajectory</p>
            </div>
          </div>
        </Card>
      </div>

      {/* IS Standard Footer */}
      <div className="bg-competencies text-white rounded-lg p-4 text-center shadow-lg">
        <p className="text-base font-bold mb-1">The IS Standard</p>
        <p className="text-sm mb-2">
          One Team • Trusted Data • MSH³ at the Speed of Scale
        </p>
        <p className="text-sm italic">
          We stretch, not stress. We grow, not just go. We are IS 2.0.
        </p>
      </div>
    </div>
  );
}