'use client'

import { useState } from 'react'
import { Mail, Shield, Key, Plus } from "lucide-react"
import { Tabs } from "@/components/molecules/Tabs"
import { ManagementLayout } from "@/components/templates/ManagementLayout"
import { InboxModal } from "@/components/molecules/InboxModal"
import { UserModal } from "@/components/molecules/UserModal"
import { Button } from "@/components/atoms/Button"

interface SettingsClientProps {
  inboxTable: (onEdit: (inbox: any) => void) => React.ReactNode;
  userTable: (onEdit: (user: any) => void) => React.ReactNode;
  accessSection: React.ReactNode;
  onInboxSubmit: (formData: FormData) => Promise<void>;
  onUserSubmit: (formData: FormData) => Promise<void>;
}

export default function SettingsClient({ 
  inboxTable, 
  userTable, 
  accessSection,
  onInboxSubmit,
  onUserSubmit 
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('inboxes')
  
  // Modal states
  const [inboxModal, setInboxModal] = useState<{ open: boolean, data?: any }>({ open: false })
  const [userModal, setUserModal] = useState<{ open: boolean, data?: any }>({ open: false })

  const tabs = [
    { id: 'inboxes', label: 'SMTP Inboxes', icon: <Mail size={16} /> },
    { id: 'users', label: 'Web Users', icon: <Shield size={16} /> },
    { id: 'access', label: 'Access Control', icon: <Key size={16} /> },
  ]

  return (
    <ManagementLayout 
      title="Management Dashboard" 
      description="Centrally manage SMTP credentials, user accounts, and accessibility."
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        {activeTab === 'inboxes' && (
          <Button onClick={() => setInboxModal({ open: true })} className="gap-2">
            <Plus size={16} /> Add Inbox
          </Button>
        )}
        {activeTab === 'users' && (
          <Button onClick={() => setUserModal({ open: true })} className="gap-2">
            <Plus size={16} /> Create User
          </Button>
        )}
      </div>
      
      <div className="animate-in fade-in duration-300">
        {activeTab === 'inboxes' && inboxTable((inbox) => setInboxModal({ open: true, data: inbox }))}
        {activeTab === 'users' && userTable((user) => setUserModal({ open: true, data: user }))}
        {activeTab === 'access' && accessSection}
      </div>

      <InboxModal 
        isOpen={inboxModal.open} 
        onClose={() => setInboxModal({ open: false })} 
        onSubmit={onInboxSubmit} 
        initialData={inboxModal.data}
      />

      <UserModal 
        isOpen={userModal.open} 
        onClose={() => setUserModal({ open: false })} 
        onSubmit={onUserSubmit} 
        initialData={userModal.data}
      />
    </ManagementLayout>
  )
}
