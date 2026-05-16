'use client'

import { useState } from 'react'
import { Mail, Shield, Plus, Edit2, Trash2 } from "lucide-react"
import { Tabs } from "@/components/molecules/Tabs"
import { ManagementLayout } from "@/components/templates/ManagementLayout"
import { InboxModal } from "@/components/molecules/InboxModal"
import { UserModal } from "@/components/molecules/UserModal"
import { Button } from "@/components/atoms/Button"
import { Table, THead, TBody, TH, TR, TD } from "@/components/atoms/Table"
import { Badge } from "@/components/atoms/Badge"

interface SettingsClientProps {
  credentials: any[];
  webUsers: any[];
  onInboxSubmit: (formData: FormData) => Promise<void>;
  onUserSubmit: (formData: FormData) => Promise<void>;
  onDeleteCredential: (formData: FormData) => Promise<void>;
  onDeleteUser: (formData: FormData) => Promise<void>;
  currentUserId: string;
}

export default function SettingsClient({ 
  credentials, 
  webUsers, 
  onInboxSubmit,
  onUserSubmit,
  onDeleteCredential,
  onDeleteUser,
  currentUserId
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('inboxes')
  
  // Modal states
  const [inboxModal, setInboxModal] = useState<{ open: boolean, data?: any }>({ open: false })
  const [userModal, setUserModal] = useState<{ open: boolean, data?: any }>({ open: false })

  const tabs = [
    { id: 'inboxes', label: 'SMTP Inboxes', icon: <Mail size={16} /> },
    { id: 'users', label: 'Web Users & Access', icon: <Shield size={16} /> },
  ]

  const InboxTable = (
    <Table>
      <THead>
        <TR>
          <TH>SMTP User</TH>
          <TH>Status</TH>
          <TH>Emails</TH>
          <TH>Storage</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {credentials.map((cred) => (
          <TR key={cred.credentialId}>
            <TD className="font-medium">{cred.smtpUser}</TD>
            <TD>
              <Badge variant={cred.isActive ? 'success' : 'danger'}>
                {cred.isActive ? 'Active' : 'Disabled'}
              </Badge>
            </TD>
            <TD className="text-text-muted">
              {cred._count.emails} / {cred.maxEmails}
            </TD>
            <TD className="text-text-muted">{cred.maxSizeMb} MB</TD>
            <TD className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setInboxModal({ open: true, data: cred })} className="text-brand-primary">
                  <Edit2 size={14} />
                </Button>
                <form action={onDeleteCredential}>
                  <input type="hidden" name="id" value={cred.credentialId} />
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </Button>
                </form>
              </div>
            </TD>
          </TR>
        ))}
        {credentials.length === 0 && (
          <TR><TD colSpan={5} className="text-center py-8 text-text-muted italic">No inboxes configured.</TD></TR>
        )}
      </TBody>
    </Table>
  )

  const UserTable = (
    <Table>
      <THead>
        <TR>
          <TH>Username</TH>
          <TH>Role</TH>
          <TH>Accessible Inboxes</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {webUsers.map((user) => (
          <TR key={user.id}>
            <TD className="font-medium">{user.username}</TD>
            <TD>
              <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>
                {user.role === 'ADMIN' ? 'System Admin' : 'Mailbox User'}
              </Badge>
            </TD>
            <TD>
              {user.role === 'ADMIN' ? (
                <span className="text-xs text-text-muted italic">All inboxes (Full access)</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {user.inboxAccess.map((acc: any) => (
                    <Badge key={acc.credentialId} variant="info" className="text-[10px] py-0 px-1.5 h-5">
                      {acc.credential.smtpUser}
                    </Badge>
                  ))}
                  {user.inboxAccess.length === 0 && (
                    <span className="text-xs text-red-400 italic">No inboxes assigned</span>
                  )}
                </div>
              )}
            </TD>
            <TD className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setUserModal({ open: true, data: user })} className="text-brand-primary">
                  <Edit2 size={14} />
                </Button>
                {user.id !== currentUserId && (
                  <form action={onDeleteUser}>
                    <input type="hidden" name="id" value={user.id} />
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10">
                      <Trash2 size={14} />
                    </Button>
                  </form>
                )}
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )

  return (
    <ManagementLayout 
      title="Management Dashboard" 
      description="Centrally manage SMTP credentials, user accounts, and accessibility."
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        {activeTab === 'inboxes' && (
          <Button onClick={() => setInboxModal({ open: true, data: undefined })} className="gap-2">
            <Plus size={16} /> Add Inbox
          </Button>
        )}
        {activeTab === 'users' && (
          <Button onClick={() => setUserModal({ open: true, data: undefined })} className="gap-2">
            <Plus size={16} /> Create User
          </Button>
        )}
      </div>
      
      <div className="animate-in fade-in duration-300">
        {activeTab === 'inboxes' && InboxTable}
        {activeTab === 'users' && UserTable}
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
        availableInboxes={credentials}
      />
    </ManagementLayout>
  )
}
