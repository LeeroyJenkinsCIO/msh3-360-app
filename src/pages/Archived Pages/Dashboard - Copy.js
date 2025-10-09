import React from 'react';
import { Card } from '../components/ui';

export default function Dashboard({ currentUser }) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Simple Banner */}
      <div className="bg-blue-600 text-white rounded-lg p-4 mb-6 text-center">
        <p className="text-lg font-semibold">We're busy MSH'n — the Dashboard is under construction 🚧</p>
      </div>

      {/* First Row - Three Pillars */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card borderColor="blue">
          <h3 className="text-xl font-bold text-blue-700 mb-2">Culture</h3>
          <p className="text-sm text-gray-600 mb-3 italic">How we show up</p>
          <p className="text-sm text-gray-700">
            Collaboration, communication, accountability, and alignment with SNB values. The foundation of team dynamics and organizational health.
          </p>
        </Card>

        <Card borderColor="green">
          <h3 className="text-xl font-bold text-green-700 mb-2">Competencies</h3>
          <p className="text-sm text-gray-600 mb-3 italic">What we know</p>
          <p className="text-sm text-gray-700">
            Technical and functional skills that enable reliable, high-quality work. The expertise that drives excellence and innovation.
          </p>
        </Card>

        <Card borderColor="purple">
          <h3 className="text-xl font-bold text-purple-700 mb-2">Execution</h3>
          <p className="text-sm text-gray-600 mb-3 italic">What we deliver</p>
          <p className="text-sm text-gray-700">
            The ability to translate plans into results that move the business forward. Turning strategy into measurable outcomes.
          </p>
        </Card>
      </div>

      {/* Second Row - MSH³ Framework Content */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card borderColor="indigo">
          <h3 className="text-xl font-bold text-indigo-700 mb-2">Assessment Model</h3>
          <p className="text-sm text-gray-600 mb-3 italic">Contribution × Growth</p>
          <p className="text-sm text-gray-700 mb-3">
            Performance evaluated across two dimensions:
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><span className="font-semibold">Contribution:</span> Current impact and value delivery</li>
            <li><span className="font-semibold">Growth:</span> Learning agility and future potential</li>
          </ul>
        </Card>

        <Card borderColor="amber">
          <h3 className="text-xl font-bold text-amber-700 mb-2">Scoring System</h3>
          <p className="text-sm text-gray-600 mb-3 italic">Simple, consistent scale</p>
          <p className="text-sm text-gray-700 mb-3">
            Each dimension rated 0-2:
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><span className="font-semibold">0:</span> Below expectations</li>
            <li><span className="font-semibold">1:</span> Meets expectations</li>
            <li><span className="font-semibold">2:</span> Exceeds expectations</li>
          </ul>
        </Card>

        <Card borderColor="teal">
          <h3 className="text-xl font-bold text-teal-700 mb-2">MSH³ Philosophy</h3>
          <p className="text-sm text-gray-600 mb-3 italic">Coach, Grow, Align</p>
          <p className="text-sm text-gray-700 mb-3">
            Performance management built on:
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><span className="font-semibold">Mindset:</span> Attitude and approach</li>
            <li><span className="font-semibold">Skillset:</span> Capabilities and knowledge</li>
            <li><span className="font-semibold">Habits:</span> Consistent behaviors</li>
          </ul>
        </Card>
      </div>

      {/* IS Standard Footer */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg p-6 text-center shadow-lg">
        <p className="text-lg font-bold mb-2">The IS Standard</p>
        <p className="text-sm text-amber-50 mb-3">
          One Team • Trusted Data • MSH³ at the Speed of Scale
        </p>
        <p className="text-sm text-amber-100 italic">
          We stretch, not stress. We grow, not just go. We are IS 2.0.
        </p>
      </div>
    </div>
  );
}