'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, RotateCw, X, Trash2 } from 'lucide-react'
import { Input } from '../atoms/Input'
import { Button } from '../atoms/Button'
import { Pagination } from './Pagination'

interface EmailListControlsProps {
  totalPages: number
  currentPage: number
  onClearInbox: (formData: FormData) => Promise<void>
  selectedInboxId: string
}

export const EmailListControls = ({ totalPages, currentPage, onClearInbox, selectedInboxId }: EmailListControlsProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const currentSearch = searchParams.get('search') || ''

  useEffect(() => {
    // Skip the first run if the searchTerm matches the URL
    if (searchTerm === currentSearch) return

    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchTerm) {
        params.set('search', searchTerm)
      } else {
        params.delete('search')
      }
      params.set('page', '1') // Reset to page 1 on search
      router.push(`/?${params.toString()}`)
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, router]) // Removed searchParams to prevent loops

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleClearInbox = async () => {
    const message = selectedInboxId === 'all' 
      ? 'Are you sure you want to clear ALL accessible inboxes? This cannot be undone.'
      : 'Are you sure you want to clear this inbox? This will delete all emails and their attachments.';
    
    if (confirm(message)) {
      setIsClearing(true)
      const formData = new FormData()
      formData.append('inboxId', selectedInboxId)
      await onClearInbox(formData)
      setIsClearing(false)
    }
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/?${params.toString()}`)
  }

  const clearSearch = () => {
    setSearchTerm('')
  }

  return (
    <div className="flex flex-col border-b border-border-subtle bg-bg-sidebar">
      <div className="p-4 flex gap-2 items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 text-sm bg-bg-main border border-border-subtle rounded-md focus:ring-2 focus:ring-brand-primary focus:border-transparent text-text-main placeholder:text-text-muted transition-all"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-main"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            className="flex-shrink-0"
            title="Refresh"
          >
            <RotateCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearInbox}
            disabled={isClearing}
            className="flex-shrink-0 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            title="Clear Inbox"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
