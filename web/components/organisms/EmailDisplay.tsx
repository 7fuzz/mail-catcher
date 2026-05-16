'use client'

import React, { useState } from 'react'
import { Sun, Moon, User as UserIcon, Clock, Tag, Trash2 } from "lucide-react"
import { Button } from '../atoms/Button'

interface EmailDisplayProps {
  email: any
  attachments: any[]
  onDelete: (formData: FormData) => Promise<void>
}

export const EmailDisplay = ({ email, attachments, onDelete }: EmailDisplayProps) => {
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this email? This will also remove all its attachments.')) {
      setIsDeleting(true)
      const formData = new FormData()
      formData.append('emailId', email.emailId)
      await onDelete(formData)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border-subtle flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-text-main mb-4">{email.subject}</h1>
          <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
            <span className="text-text-muted flex items-center gap-1"><UserIcon size={14} /> From:</span>
            <span className="font-medium text-text-main">{email.sender}</span>
            <span className="text-text-muted flex items-center gap-1"><Clock size={14} /> Date:</span>
            <span className="text-text-main">{new Date(email.createdAt).toLocaleString()}</span>
            <span className="text-text-muted flex items-center gap-1"><Tag size={14} /> To:</span>
            <span className="text-text-main">{email.recipient}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
            title="Delete Email"
          >
            <Trash2 size={18} />
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
            className="flex gap-2 bg-bg-card"
          >
            {previewTheme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{previewTheme === 'light' ? 'Dark' : 'Light'} Preview</span>
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-bg-main">
        <div className={`rounded-lg p-8 shadow-sm border border-border-subtle min-h-full transition-colors duration-200 ${
          previewTheme === 'light' ? 'bg-white' : 'bg-slate-950'
        }`}>
          {email.bodyHtml ? (
            <div 
              className={`prose max-w-none ${
                previewTheme === 'light' ? 'prose-slate' : 'prose-invert'
              }`}
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }} 
            />
          ) : (
            <pre className={`whitespace-pre-wrap font-sans ${
              previewTheme === 'light' ? 'text-slate-800' : 'text-slate-200'
            }`}>
              {email.bodyText}
            </pre>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border-subtle">
            <h3 className="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
              Attachments ({attachments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att: any) => (
                <a 
                  key={att.attachmentId} 
                  href={att.url} 
                  download={att.name}
                  className="flex flex-col gap-1 p-3 border border-border-subtle rounded bg-bg-card hover:bg-bg-sidebar hover:border-brand-primary transition-colors cursor-pointer min-w-[150px]"
                >
                  <span className="text-sm text-brand-primary font-medium truncate max-w-[200px]" title={att.name}>
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
      </div>
    </div>
  )
}
