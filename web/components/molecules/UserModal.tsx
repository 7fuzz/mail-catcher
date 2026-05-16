'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/atoms/Modal'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { Badge } from '@/components/atoms/Badge'
import { Check, X, Plus } from 'lucide-react'

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: any;
  availableInboxes: any[];
}

export const UserModal = ({ isOpen, onClose, onSubmit, initialData, availableInboxes }: UserModalProps) => {
  const [isPending, setIsPending] = useState(false);
  const [role, setRole] = useState(initialData?.role || 'MAILBOX');
  const [selectedInboxes, setSelectedInboxes] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setRole(initialData.role);
      setSelectedInboxes(initialData.inboxAccess?.map((a: any) => a.credentialId) || []);
    } else {
      setRole('MAILBOX');
      setSelectedInboxes([]);
    }
  }, [initialData, isOpen]);

  async function handleAction(formData: FormData) {
    setIsPending(true);
    // Append selected inboxes as a JSON string or multiple entries
    formData.append('inboxIds', JSON.stringify(selectedInboxes));
    await onSubmit(formData);
    setIsPending(false);
    onClose();
  }

  const toggleInbox = (id: string) => {
    setSelectedInboxes(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? 'Edit User' : 'Create New User'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" form="user-form" disabled={isPending}>
            {isPending ? 'Saving...' : initialData ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <form id="user-form" action={handleAction} className="space-y-4">
        {initialData && <input type="hidden" name="id" value={initialData.id} />}
        <Input 
          label="Username" 
          name="username" 
          defaultValue={initialData?.username} 
          required 
          placeholder="e.g. johndoe"
        />
        <Select 
          label="Role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { label: 'Mailbox User (Restricted)', value: 'MAILBOX' },
            { label: 'System Admin (Full Access)', value: 'ADMIN' }
          ]}
        />
        
        {role === 'MAILBOX' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Assigned Inboxes</label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-border-subtle rounded-md p-2 bg-bg-main/50">
              {availableInboxes.map(inbox => (
                <button
                  key={inbox.credentialId}
                  type="button"
                  onClick={() => toggleInbox(inbox.credentialId)}
                  className={`flex items-center justify-between p-2 rounded text-sm transition-colors ${
                    selectedInboxes.includes(inbox.credentialId)
                      ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30'
                      : 'hover:bg-bg-sidebar border border-transparent'
                  }`}
                >
                  <span>{inbox.smtpUser}</span>
                  {selectedInboxes.includes(inbox.credentialId) ? <Check size={14} /> : <Plus size={14} className="opacity-30" />}
                </button>
              ))}
              {availableInboxes.length === 0 && (
                <p className="text-xs text-text-muted italic p-2 text-center">No inboxes available to assign.</p>
              )}
            </div>
          </div>
        )}

        <Input 
          label={initialData ? "Change Password (Optional)" : "Password"} 
          name="password" 
          type="password" 
          required={!initialData}
          placeholder={initialData ? "Leave empty to keep current" : "••••••••"}
        />
      </form>
    </Modal>
  );
};
