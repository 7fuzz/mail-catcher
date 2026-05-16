'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  const [width, setWidth] = useState(256) // Default 16rem (w-64)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Load saved width
  useEffect(() => {
    const savedWidth = localStorage.getItem('sidebar-width')
    if (savedWidth) {
      setWidth(parseInt(savedWidth, 10))
    }
  }, [])

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX
        if (newWidth >= 200 && newWidth <= 480) { // Constraints
          setWidth(newWidth)
        }
      }
    },
    [isResizing]
  )

  useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing])

  // Save width when it changes
  useEffect(() => {
    if (width !== 256) {
      localStorage.setItem('sidebar-width', width.toString())
    }
  }, [width])

  return (
    <aside 
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className="bg-bg-sidebar border-r border-border-subtle flex flex-col flex-shrink-0 h-full relative"
    >
      {/* Resize Handle */}
      <div 
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-brand-primary/30 transition-colors z-50 ${
          isResizing ? 'bg-brand-primary w-1' : ''
        }`}
        onMouseDown={startResizing}
      />

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
          <NavItem
            href="/?inbox=all"
            active={selectedInboxId === 'all'}
            icon={<Mail size={16} />}
          >
            All Inboxes
          </NavItem>
          <div className="my-2 border-t border-border-subtle/30" />
          {inboxes.map((inbox) => (
            <div 
              key={inbox.credentialId} 
              className={`flex flex-col px-3 py-2 rounded-md transition-colors ${
                selectedInboxId === inbox.credentialId ? "bg-brand-primary/10" : "hover:bg-bg-main"
              }`}
            >
              <NavItem
                href={`/?inbox=${inbox.credentialId}`}
                active={selectedInboxId === inbox.credentialId}
                className="!px-0 !py-0 !bg-transparent font-bold !text-text-main"
              >
                {inbox.smtpUser}
              </NavItem>
              
              <div className="w-full mt-2">
                <div className="flex justify-between items-center text-[10px] text-text-muted mb-1">
                  <span>{inbox.emailCount} / {inbox.maxEmails} mails</span>
                  <span>{inbox.usedSizeMb} / {inbox.maxSizeMb} MB</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-border-subtle h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      parseFloat(inbox.usedSizeMb) / inbox.maxSizeMb > 0.9 ? 'bg-red-500' : 'bg-brand-primary'
                    }`}
                    style={{ width: `${Math.min(100, (parseFloat(inbox.usedSizeMb) / inbox.maxSizeMb) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
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
