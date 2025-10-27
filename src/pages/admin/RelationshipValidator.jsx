// 📁 SAVE TO: src/pages/admin/RelationshipValidator.jsx
// Relationship Validator - Admin tool for managing user relationships

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';

function RelationshipValidator() {
  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState([]);

  useEffect(() => {
    loadRelationships();
  }, []);

  const loadRelationships = async () => {
    try {
      setLoading(true);
      
      // Load users and their relationships
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('Loaded users:', users.length);
      
      setRelationships(users);
      setLoading(false);
    } catch (err) {
      console.error('Error loading relationships:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Relationship Validator
        </h1>
        <p className="text-gray-600 mt-2">
          Validate and manage organizational relationships
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">Component Under Construction</p>
            <p className="text-sm text-yellow-700 mt-1">
              This admin tool is being developed. It will help validate manager/direct report
              relationships and peer-to-peer connections.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users Overview</h2>
        <p className="text-gray-600">Total users: {relationships.length}</p>
        
        <div className="mt-4 space-y-2">
          {relationships.slice(0, 10).map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{user.displayName || user.email}</p>
                <p className="text-sm text-gray-600">{user.pillar || 'No pillar assigned'}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RelationshipValidator;