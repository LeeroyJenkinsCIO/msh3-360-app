import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

const PillarsManager = () => {
  const [pillars, setPillars] = useState([]);
  const [editingPillar, setEditingPillar] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newPillar, setNewPillar] = useState({
    name: '',
    key: '',
    description: '',
    icon: '',
    color: ''
  });

  useEffect(() => {
    loadPillars();
  }, []);

  const loadPillars = async () => {
    try {
      const pillarsSnapshot = await getDocs(collection(db, 'pillars'));
      const pillarsList = pillarsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPillars(pillarsList);
    } catch (error) {
      console.error('Error loading pillars:', error);
    }
  };

  const handleAddPillar = async () => {
    if (!newPillar.name.trim() || !newPillar.key.trim()) {
      alert('Name and Key are required');
      return;
    }

    try {
      await addDoc(collection(db, 'pillars'), newPillar);
      setIsAdding(false);
      setNewPillar({ name: '', key: '', description: '', icon: '', color: '' });
      loadPillars();
    } catch (error) {
      console.error('Error adding pillar:', error);
      alert('Error adding pillar. Please try again.');
    }
  };

  const handleUpdatePillar = async (pillarId) => {
    try {
      const pillarToUpdate = pillars.find(p => p.id === pillarId);
      const { id, ...pillarData } = pillarToUpdate;
      await updateDoc(doc(db, 'pillars', pillarId), pillarData);
      setEditingPillar(null);
      loadPillars();
    } catch (error) {
      console.error('Error updating pillar:', error);
      alert('Error updating pillar. Please try again.');
    }
  };

  const handleDeletePillar = async (pillarId) => {
    if (window.confirm('Are you sure you want to delete this pillar? This may affect assessments.')) {
      try {
        await deleteDoc(doc(db, 'pillars', pillarId));
        loadPillars();
      } catch (error) {
        console.error('Error deleting pillar:', error);
        alert('Error deleting pillar. Please try again.');
      }
    }
  };

  const updatePillarField = (pillarId, field, value) => {
    setPillars(pillars.map(pillar => 
      pillar.id === pillarId ? { ...pillar, [field]: value } : pillar
    ));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Manage Assessment Pillars</h3>
          <p className="text-sm text-gray-600">Configure the domains/pillars used in assessments</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Pillar
        </button>
      </div>

      {/* Add New Pillar Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-3">Add New Pillar</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newPillar.name}
                onChange={(e) => setNewPillar({ ...newPillar, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Culture"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key (for code)</label>
              <input
                type="text"
                value={newPillar.key}
                onChange={(e) => setNewPillar({ ...newPillar, key: e.target.value.toLowerCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="culture"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newPillar.description}
                onChange={(e) => setNewPillar({ ...newPillar, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="How we show up"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={newPillar.icon}
                onChange={(e) => setNewPillar({ ...newPillar, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="🎭"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                value={newPillar.color}
                onChange={(e) => setNewPillar({ ...newPillar, color: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="purple"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddPillar}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Pillar
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewPillar({ name: '', key: '', description: '', icon: '', color: '' });
              }}
              className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pillars Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="text-left py-3 px-4 font-semibold">Name</th>
              <th className="text-left py-3 px-4 font-semibold">Key</th>
              <th className="text-left py-3 px-4 font-semibold">Description</th>
              <th className="text-left py-3 px-4 font-semibold">Icon</th>
              <th className="text-left py-3 px-4 font-semibold">Color</th>
              <th className="text-right py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pillars.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">
                  No pillars found. Click "Add Pillar" to create your first assessment pillar.
                </td>
              </tr>
            ) : (
              pillars.map(pillar => (
                <tr key={pillar.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {editingPillar === pillar.id ? (
                      <input
                        type="text"
                        value={pillar.name}
                        onChange={(e) => updatePillarField(pillar.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{pillar.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingPillar === pillar.id ? (
                      <input
                        type="text"
                        value={pillar.key}
                        onChange={(e) => updatePillarField(pillar.id, 'key', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="text-gray-600 font-mono text-sm">{pillar.key}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingPillar === pillar.id ? (
                      <input
                        type="text"
                        value={pillar.description || ''}
                        onChange={(e) => updatePillarField(pillar.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="text-gray-600">{pillar.description}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingPillar === pillar.id ? (
                      <input
                        type="text"
                        value={pillar.icon || ''}
                        onChange={(e) => updatePillarField(pillar.id, 'icon', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="text-2xl">{pillar.icon}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingPillar === pillar.id ? (
                      <input
                        type="text"
                        value={pillar.color || ''}
                        onChange={(e) => updatePillarField(pillar.id, 'color', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="text-gray-600">{pillar.color}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {editingPillar === pillar.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdatePillar(pillar.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPillar(null);
                            loadPillars();
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingPillar(pillar.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePillar(pillar.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PillarsManager;