import React from 'react';
import RoutineSheet from './RoutineSheet';
import { db } from '../../lib/db';

export default function RoutineEditModal({ routine, isOpen, onClose }) {
  if (!isOpen || !routine) return null;

  const handleSave = async (updatedData) => {
    await db.notes.update(routine.id, {
      title: updatedData.title,
      color: updatedData.color || routine.color || 'default',
      content: {
        ...(routine.content || {}),
        ...(updatedData.content || {}),
      },
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <RoutineSheet
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      routine={routine}
    />
  );
}
