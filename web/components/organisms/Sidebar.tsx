'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Mail, Inbox, Settings, LogOut, User as UserIcon } from "lucide-react"
import { NavItem } from "../molecules/NavItem"
import { ThemeToggle } from "../molecules/ThemeToggle"
import { signOut } from "next-auth/react"
import { Button } from "../atoms/Button"
import Link from "next/link"

interface SidebarProps {
  inboxes: any[]
  selectedInboxId?: string
  user: any
  isAdmin: boolean
  onCloseMobile?: () => void
}

export const Sidebar = ({ inboxes, selectedInboxId, user, isAdmin, onCloseMobile }: SidebarProps) => {
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

  const handleMobileClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && onCloseMobile) {
      onCloseMobile()
    }
  }

  return (
    <aside 
      ref={sidebarRef}
      style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
      className="bg-bg-sidebar border-r border-border-subtle flex flex-col flex-shrink-0 h-full relative w-[280px] md:w-[var(--sidebar-width)]"
    >
      {/* Resize Handle */}
      <div 
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-brand-primary/30 transition-colors z-50 hidden md:block ${
          isResizing ? 'bg-brand-primary w-1' : ''
        }`}
        onMouseDown={startResizing}
      />

      <div className="p-4 border-b border-border-subtle flex items-center justify-between h-[65px]">
        <div className="flex items-center gap-2 font-bold text-xl text-brand-primary">
          <Mail size={24} />
          <span>Mail Catcher</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex-1 overflow-y-auto p-4 text-text-main">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2 px-3">
          <Inbox size={14} /> Inboxes
        </h2>
        <nav className="space-y-1">
          <NavItem
            href="/?inbox=all"
            active={selectedInboxId === 'all'}
            icon={<Mail size={16} />}
            onClick={handleMobileClick}
          >
            All Inboxes
          </NavItem>
          <div className="my-2 border-t border-border-subtle/30" />
          
          {inboxes.map((inbox) => (
            <Link 
              key={inbox.credentialId} 
              href={`/?inbox=${inbox.credentialId}`}
              onClick={handleMobileClick}
              className={`flex flex-col px-3 py-3 rounded-md transition-colors border border-transparent mb-1 group ${
                selectedInboxId === inbox.credentialId 
                  ? "bg-brand-primary/10 border-brand-primary/20 shadow-sm" 
                  : "hover:bg-bg-main hover:border-border-subtle"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Mail size={14} className={selectedInboxId === inbox.credentialId ? "text-brand-primary" : "text-text-muted group-hover:text-text-main"} />
                <span className={`text-sm truncate font-semibold ${selectedInboxId === inbox.credentialId ? "text-brand-primary" : "text-text-main"}`}>
                  {inbox.smtpUser}
                </span>
              </div>
              
              <div className="w-full">
                <div className="flex justify-between items-center text-[10px] text-text-muted mb-1.5 opacity-80">
                  <span>{inbox.emailCount} / {inbox.maxEmails} mails</span>
                  <span>{inbox.usedSizeMb} / {inbox.maxSizeMb} MB</span>
                </div>
                <div className="w-full bg-border-subtle/50 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      parseFloat(inbox.usedSizeMb) / inbox.maxSizeMb > 0.9 ? 'bg-red-500' : 'bg-brand-primary'
                    }`}
                    style={{ width: `${Math.min(100, (parseFloat(inbox.usedSizeMb) / inbox.maxSizeMb) * 100)}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
          
          {inboxes.length === 0 && (
            <p className="px-3 text-xs text-text-muted italic">No inboxes found.</p>
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-border-subtle space-y-2">
        {isAdmin && (
          <NavItem href="/settings" icon={<Settings size={16} />} onClick={handleMobileClick}>
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
