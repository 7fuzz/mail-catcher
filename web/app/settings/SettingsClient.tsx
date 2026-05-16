'use client'

import { useState } from 'react'
import { Mail, Shield, Key } from "lucide-react"
import { Tabs } from "@/components/molecules/Tabs"
import { ManagementLayout } from "@/components/templates/ManagementLayout"

interface SettingsClientProps {
  inboxSection: React.ReactNode;
  userSection: React.ReactNode;
  accessSection: React.ReactNode;
}

export default function SettingsClient({ inboxSection, userSection, accessSection }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('inboxes')

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
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      
      <div className="animate-in fade-in duration-300">
        {activeTab === 'inboxes' && inboxSection}
        {activeTab === 'users' && userSection}
        {activeTab === 'access' && accessSection}
      </div>
    </ManagementLayout>
  )
}
