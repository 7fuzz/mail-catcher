'use client'

import { useState } from 'react'
import { Modal } from '@/components/atoms/Modal'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: any;
}

export const UserModal = ({ isOpen, onClose, onSubmit, initialData }: UserModalProps) => {
  const [isPending, setIsPending] = useState(false);

  async function handleAction(formData: FormData) {
    setIsPending(true);
    await onSubmit(formData);
    setIsPending(false);
    onClose();
  }

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
          defaultValue={initialData?.role || 'VIEWER'}
          options={[
            { label: 'Viewer', value: 'VIEWER' },
            { label: 'Admin', value: 'ADMIN' }
          ]}
        />
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
