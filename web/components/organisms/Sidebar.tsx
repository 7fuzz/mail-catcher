'use client'

import { Mail, Inbox, Settings, LogOut, User as UserIcon } from "lucide-react"
import { NavItem } from "../molecules/NavItem"
import { ThemeToggle } from "../molecules/ThemeToggle"
import { signOut } from "next-auth/react"
import { Button } from "../atoms/Button"

interface SidebarProps {
  inboxes: any[]
  selectedInboxId?: string
  user: any
  isAdmin: boolean
}

export const Sidebar = ({ inboxes, selectedInboxId, user, isAdmin }: SidebarProps) => {
  return (
    <aside className="w-64 bg-bg-sidebar border-r border-border-subtle flex flex-col flex-shrink-0 h-full">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl text-brand-primary">
          <Mail size={24} />
          <span>Mail Catcher</span>
        </div>
        <ThemeToggle />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2 px-3">
          <Inbox size={14} /> Inboxes
        </h2>
        <nav className="space-y-1">
          {inboxes.map((inbox) => (
            <NavItem 
              key={inbox.credentialId}
              href={`/?inbox=${inbox.credentialId}`}
              active={selectedInboxId === inbox.credentialId}
            >
              {inbox.smtpUser}
            </NavItem>
          ))}
          {inboxes.length === 0 && (
            <p className="px-3 text-xs text-text-muted italic">No inboxes found.</p>
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-border-subtle space-y-2">
        {isAdmin && (
          <NavItem href="/settings" icon={<Settings size={16} />}>
            Settings
          </NavItem>
        )}
        <div className="flex items-center gap-2 p-3 text-sm text-text-muted border-t border-border-subtle/50 mt-2 pt-2">
          <UserIcon size={16} />
          <span className="truncate">{user?.name}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-3 text-red-500 hover:bg-red-500/10 hover:text-red-500"
          onClick={() => signOut()}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  )
}
