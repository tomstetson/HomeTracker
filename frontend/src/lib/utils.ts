import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getStatusColor(status: string): string {
  const colors = {
    backlog: 'bg-gray-100 text-gray-800 border-gray-300',
    planning: 'bg-blue-100 text-blue-800 border-blue-300',
    'in-progress': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'on-hold': 'bg-orange-100 text-orange-800 border-orange-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  }
  return colors[status.toLowerCase() as keyof typeof colors] || colors.backlog
}





