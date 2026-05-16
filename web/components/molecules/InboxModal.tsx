'use client'

import { useState } from 'react'
import { Modal } from '@/components/atoms/Modal'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'

interface InboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: any;
}

export const InboxModal = ({ isOpen, onClose, onSubmit, initialData }: InboxModalProps) => {
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
      title={initialData ? 'Edit Inbox' : 'Add New Inbox'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" form="inbox-form" disabled={isPending}>
            {isPending ? 'Saving...' : initialData ? 'Save Changes' : 'Create Inbox'}
          </Button>
        </>
      }
    >
      <form id="inbox-form" action={handleAction} className="space-y-4">
        {initialData && <input type="hidden" name="id" value={initialData.credentialId} />}
        <Input 
          label="SMTP Username" 
          name="user" 
          defaultValue={initialData?.smtpUser} 
          required 
          placeholder="e.g. staging-server"
        />
        <Input 
          label={initialData ? "New Password (Optional)" : "SMTP Password"} 
          name="pass" 
          type="password" 
          required={!initialData}
          placeholder={initialData ? "Leave empty to keep current" : "••••••••"}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Max Emails" 
            name="maxEmails" 
            type="number" 
            defaultValue={initialData?.maxEmails || 100} 
          />
          <Input 
            label="Max Size (MB)" 
            name="maxSizeMb" 
            type="number" 
            defaultValue={initialData?.maxSizeMb || 50} 
          />
        </div>
        <Select 
          label="Status"
          name="isActive"
          defaultValue={initialData?.isActive?.toString() || 'true'}
          options={[
            { label: 'Active (Receiving emails)', value: 'true' },
            { label: 'Disabled (Blocking emails)', value: 'false' }
          ]}
        />
      </form>
    </Modal>
  );
};
