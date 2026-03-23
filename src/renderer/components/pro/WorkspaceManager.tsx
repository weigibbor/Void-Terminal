import { ProGate } from '../ProGate';
import { useAppStore } from "../stores/app-store";
import { useState, useEffect } from 'react';

interface Workspace {
  id: string;
  name: string;
  layout: string;
  last_opened: number | null;
}

export function WorkspaceManager({ onClose }: { onClose: () => void }) {
  const [workspaces] = useState<Workspace[]>([]);
  const [newName, setNewName] = useState('');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-void-base border border-void-border rounded-void-2xl shadow-2xl animate-palette-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-void-border">
          <h2 className="text-lg text-void-text font-medium">Workspaces</h2>
          <button onClick={onClose} className="text-void-text-ghost hover:text-void-text-muted">x</button>
        </div>

        {/* Save current */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-void-border/50">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name"
            className="flex-1 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-3 py-1.5"
          />
          <button className="bg-accent text-void-base text-sm px-3 py-1.5 rounded-void font-medium">
            Save Current
          </button>
        </div>

        {/* List */}
        <div className="max-h-60 overflow-y-auto px-5 py-3 space-y-2">
          {workspaces.map((ws) => (
            <div key={ws.id} className="flex items-center gap-3 p-3 bg-void-input rounded-void-lg hover:border-void-border border border-transparent cursor-pointer">
              <div className="flex-1">
                <div className="text-sm text-void-text">{ws.name}</div>
              </div>
              <button className="text-2xs text-accent">Load</button>
            </div>
          ))}
          {workspaces.length === 0 && (
            <p className="text-center text-2xs text-void-text-ghost py-4">No saved workspaces</p>
          )}
        </div>
      </div>
    </div>
  );
}
