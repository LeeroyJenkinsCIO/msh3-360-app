import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Simple Banner */}
      <div className="bg-msh-blue text-white rounded-lg p-4 mb-6 text-center">
        <p className="text-lg font-semibold">We're busy MSH'n — the Dashboard is under construction 🚧</p>
      </div>

      {/* First Row - Three Pillars */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card borderColor="culture">
          <h3 className="text-xl font-bold text-culture mb-2">Culture</h3>
          <p className="text-sm text-neutral mb-3 italic">How we show up</p>
          <p className="text-sm text-neutral-dark">
            Collaboration, communication, accountability, and alignment with SNB values. The foundation of team dynamics and organizational health.
          </p>
        </Card>

        <Card borderColor="competencies">
          <h3 className="text-xl font-bold text-competencies mb-2">Competencies</h3>
          <p className="text-sm text-neutral mb-3 italic">What we know</p>
          <p className="text-sm text-neutral-dark">
            Technical and functional skills that enable reliable, high-quality work. The expertise that drives excellence and innovation.
          </p>
        </Card>

        <Card borderColor="execution">
          <h3 className="text-xl font-bold text-execution mb-2">Execution</h3>
          <p className="text-sm text-neutral mb-3 italic">What we deliver</p>
          <p className="text-sm text-neutral-dark">
            The ability to translate plans into results that move the business forward. Turning strategy into measurable outcomes.
          </p>
        </Card>
      </div>

      {/* Second Row - MSH³ Framework Content */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card borderColor="msh-blue">
          <h3 className="text-xl font-bold text-msh-blue mb-2">Alignment Model</h3>
          <p className="text-sm text-neutral mb-3 italic">Contribution × Growth</p>
          <p className="text-sm text-neutral-dark mb-3">
            Evaluated across two dimensions:
          </p>
          <ul className="text-sm text-neutral-dark space-y-1">
            <li><span className="font-semibold">Contribution:</span> Current impact and value delivery</li>
            <li><span className="font-semibold">Growth:</span> Learning agility and future potential</li>
          </ul>
        </Card>

        <Card borderColor="msh-indigo">
          <h3 className="text-xl font-bold text-msh-indigo mb-2">Point System</h3>
          <p className="text-sm text-neutral mb-3 italic">Simple, consistent scale</p>
          <p className="text-sm text-neutral-dark mb-3">
            Each dimension rated 0-2:
          </p>
          <ul className="text-sm text-neutral-dark space-y-1">
            <li><span className="font-semibold">0:</span> Below expectations</li>
            <li><span className="font-semibold">1:</span> Meets expectations</li>
            <li><span className="font-semibold">2:</span> Exceeds expectations</li>
          </ul>
        </Card>

        <Card borderColor="msh-purple">
          <h3 className="text-xl font-bold text-msh-purple mb-2">MSH³ Philosophy</h3>
          <p className="text-sm text-neutral mb-3 italic">Coach, Grow, Align</p>
          <p className="text-sm text-neutral-dark mb-3">
            Development framework built on:
          </p>
          <ul className="text-sm text-neutral-dark space-y-1">
            <li><span className="font-semibold">Mindset:</span> Attitude and approach</li>
            <li><span className="font-semibold">Skillset:</span> Capabilities and knowledge</li>
            <li><span className="font-semibold">Habits:</span> Consistent behaviors</li>
          </ul>
        </Card>
      </div>

      {/* IS Standard Footer */}
      <div className="bg-competencies text-white rounded-lg p-6 text-center shadow-lg">
        <p className="text-lg font-bold mb-2">The IS Standard</p>
        <p className="text-sm mb-3">
          One Team • Trusted Data • MSH³ at the Speed of Scale
        </p>
        <p className="text-sm italic">
          We stretch, not stress. We grow, not just go. We are IS 2.0.
        </p>
      </div>
    </div>
  );
}