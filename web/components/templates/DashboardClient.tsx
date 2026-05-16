'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar } from "../organisms/Sidebar"
import { EmailListControls } from "../molecules/EmailListControls"
import { EmailDisplay } from "../organisms/EmailDisplay"
import { Mail, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Link from "next/link"

interface DashboardClientProps {
  inboxes: any[]
  selectedInboxId: string | undefined
  user: any
  isAdmin: boolean
  totalEmails: number
  isAllInboxes: boolean
  emails: any[]
  selectedEmailId: string | undefined
  selectedEmail: any
  attachments: any[]
  searchTerm: string
  currentPage: number
  totalPages: number
  onClearInbox: (formData: FormData) => Promise<void>
  onDeleteEmail: (formData: FormData) => Promise<void>
}

export const DashboardClient = ({
  inboxes,
  selectedInboxId,
  user,
  isAdmin,
  totalEmails,
  isAllInboxes,
  emails,
  selectedEmailId,
  selectedEmail,
  attachments,
  searchTerm,
  currentPage,
  totalPages,
  onClearInbox,
  onDeleteEmail
}: DashboardClientProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [listWidth, setListWidth] = useState(384) // Default 24rem (w-96)
  const [isResizing, setIsResizing] = useState(false)

  // Load saved states
  useEffect(() => {
    const savedSidebar = localStorage.getItem('sidebar-open')
    if (savedSidebar !== null) setIsSidebarOpen(savedSidebar === 'true')
    
    const savedListWidth = localStorage.getItem('list-width')
    if (savedListWidth) setListWidth(parseInt(savedListWidth, 10))
  }, [])

  // Persist states
  useEffect(() => {
    localStorage.setItem('sidebar-open', isSidebarOpen.toString())
  }, [isSidebarOpen])

  useEffect(() => {
    localStorage.setItem('list-width', listWidth.toString())
  }, [listWidth])

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        // We calculate based on the sidebar being present or not
        const sidebarWidth = isSidebarOpen ? (parseInt(localStorage.getItem('sidebar-width') || '256')) : 0
        const newWidth = e.clientX - sidebarWidth
        if (newWidth >= 280 && newWidth <= 600) {
          setListWidth(newWidth)
        }
      }
    },
    [isResizing, isSidebarOpen]
  )

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize)
      window.addEventListener("mouseup", stopResizing)
    }
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden text-text-main">
      {isSidebarOpen && (
        <Sidebar 
          inboxes={inboxes} 
          selectedInboxId={selectedInboxId} 
          user={user} 
          isAdmin={isAdmin} 
        />
      )}

      {/* Email List */}
      <div 
        style={{ width: `${listWidth}px` }}
        className="bg-bg-card border-r border-border-subtle flex flex-col flex-shrink-0 overflow-hidden relative"
      >
        <div className="p-4 border-b border-border-subtle bg-bg-sidebar flex justify-between items-center h-[65px]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-bg-main rounded-md text-text-muted hover:text-brand-primary transition-colors"
              title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <h2 className="font-semibold text-brand-primary truncate">
              {isAllInboxes ? 'All Inboxes' : 'Messages'}
            </h2>
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">{totalEmails} total</span>
        </div>
        
        <EmailListControls 
          totalPages={totalPages} 
          currentPage={currentPage} 
          onClearInbox={onClearInbox}
          selectedInboxId={selectedInboxId as string}
        />

        <div className="flex-1 overflow-y-auto">
          {emails.map((email: any) => {
            const currentParams = new URLSearchParams()
            if (selectedInboxId) currentParams.set('inbox', selectedInboxId)
            currentParams.set('email', email.emailId)
            if (searchTerm) currentParams.set('search', searchTerm)
            if (currentPage > 1) currentParams.set('page', currentPage.toString())

            return (
              <Link
                key={email.emailId}
                href={`/?${currentParams.toString()}`}
                className={`block p-4 border-b border-border-subtle hover:bg-bg-main transition-colors ${
                  selectedEmailId === email.emailId ? "bg-brand-primary/5 border-l-4 border-l-brand-primary" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold text-text-main truncate flex-1 mr-2">{email.sender}</span>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm text-text-main font-medium truncate mb-1">{email.subject}</div>
                <div className="text-xs text-text-muted truncate line-clamp-2">{email.bodyText?.substring(0, 100)}</div>
                {isAllInboxes && (
                  <div className="mt-2 text-[10px] text-brand-primary/70 font-medium uppercase tracking-tighter">
                    Inbox: {inboxes.find(i => i.credentialId === email.credentialId)?.smtpUser || 'Unknown'}
                  </div>
                )}
              </Link>
            )
          })}
          {emails.length === 0 && (
            <div className="p-8 text-center text-text-muted text-sm italic">
              {searchTerm ? "No emails match your search." : "No emails caught yet."}
            </div>
          )}
        </div>

        {/* Resize Handle for List */}
        <div 
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-brand-primary/30 transition-colors z-50 ${
            isResizing ? 'bg-brand-primary w-1' : ''
          }`}
          onMouseDown={startResizing}
        />
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col bg-bg-card overflow-hidden">
        {selectedEmail ? (
          <EmailDisplay 
            email={selectedEmail} 
            attachments={attachments} 
            onDelete={onDeleteEmail}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted bg-bg-main">
            <Mail size={48} className="mb-4 opacity-20" />
            <p>Select an email to read its content</p>
          </div>
        )}
      </div>
    </div>
  )
}
