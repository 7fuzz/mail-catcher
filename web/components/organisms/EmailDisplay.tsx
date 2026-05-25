'use client'

import React, { useState, useRef } from 'react'
import { Sun, Moon, User as UserIcon, Clock, Tag, Trash2, ArrowLeft } from "lucide-react"
import { Button } from '../atoms/Button'
import Link from 'next/link'

interface EmailDisplayProps {
  email: any
  attachments: any[]
  onDelete: (formData: FormData) => Promise<void>
  backUrl?: string
}

export const EmailDisplay = ({ email, attachments, onDelete, backUrl = "/" }: EmailDisplayProps) => {
  const [viewMode, setViewMode] = useState<'themed' | 'original'>('themed')
  const [isDeleting, setIsDeleting] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this email? This will also remove all its attachments.')) {
      setIsDeleting(true)
      const formData = new FormData()
      formData.append('emailId', email.emailId)
      await onDelete(formData)
    }
  }

  const adjustIframeHeight = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        const height = iframeRef.current.contentWindow.document.documentElement.scrollHeight;
        iframeRef.current.style.height = `${Math.max(height, 600) + 20}px`;
      } catch (e) {
        console.error("Could not resize iframe", e);
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 border-b border-border-subtle flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="w-full">
          <div className="flex items-center gap-3 mb-4">
            <Link 
              href={backUrl}
              className="md:hidden p-1.5 -ml-1.5 hover:bg-bg-main rounded-md text-text-muted hover:text-brand-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-text-main leading-tight truncate">{email.subject}</h1>
          </div>
          <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-xs md:text-sm">
            <span className="text-text-muted flex items-center gap-1"><UserIcon size={14} /> From:</span>
            <span className="font-medium text-text-main truncate">{email.sender}</span>
            <span className="text-text-muted flex items-center gap-1"><Clock size={14} /> Date:</span>
            <span className="text-text-main">{new Date(email.createdAt).toLocaleString()}</span>
            <span className="text-text-muted flex items-center gap-1"><Tag size={14} /> To:</span>
            <span className="text-text-main truncate">{email.recipient}</span>
          </div>
        </div>
        <div className="flex gap-2 self-end md:self-start">
          <div className="flex bg-bg-main p-1 rounded-lg border border-border-subtle">
            <button
              onClick={() => setViewMode('themed')}
              className={`px-3 py-1 text-[10px] md:text-xs font-medium rounded-md transition-colors ${
                viewMode === 'themed' ? 'bg-brand-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'
              }`}
            >
              Themed
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-3 py-1 text-[10px] md:text-xs font-medium rounded-md transition-colors ${
                viewMode === 'original' ? 'bg-brand-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'
              }`}
            >
              Original
            </button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:bg-red-500/10 hover:text-red-500 ml-2"
            title="Delete Email"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-bg-main">
        {/* Attachments at the Top */}
        {attachments.length > 0 && (
          <div className="mb-6 pb-6 border-b border-border-subtle mx-auto max-w-4xl">
            <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
              Attachments ({attachments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att: any) => (
                <a 
                  key={att.attachmentId} 
                  href={att.url} 
                  download={att.name}
                  className="flex flex-col gap-1 p-3 border border-border-subtle rounded bg-bg-card hover:bg-bg-sidebar hover:border-brand-primary transition-colors cursor-pointer min-w-[120px] md:min-w-[150px]"
                >
                  <span className="text-xs md:text-sm text-brand-primary font-medium truncate max-w-[150px] md:max-w-[200px]" title={att.name}>
                    {att.name}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {(att.size / 1024).toFixed(1)} KB
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Email Body */}
        {viewMode === 'original' && email.bodyHtml ? (
          <div className="min-w-full inline-block align-middle">
            <div className="bg-white rounded-lg shadow-sm border border-border-subtle min-w-full md:min-w-[650px] overflow-hidden mx-auto max-w-4xl">
              <iframe 
                ref={iframeRef}
                srcDoc={email.bodyHtml} 
                className="w-full border-none block"
                style={{ minHeight: '600px' }}
                onLoad={adjustIframeHeight}
                title="Original Email Content"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-4 md:p-8 shadow-sm border border-border-subtle min-h-full mx-auto max-w-4xl">
            {email.bodyHtml ? (
              <div 
                className="prose prose-sm md:prose-base prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }} 
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-xs md:text-sm text-slate-800">
                {email.bodyText}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
