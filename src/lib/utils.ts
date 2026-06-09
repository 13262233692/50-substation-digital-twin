import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DeviceType } from "@/shared/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function deviceTypeName(type: DeviceType): string {
  switch (type) {
    case DeviceType.Breaker:
      return '断路器'
    case DeviceType.Disconnector:
      return '隔离开关'
    case DeviceType.Transformer:
      return '变压器'
    default:
      return '未知'
  }
}

export function deviceStatusColor(isOpen: boolean, alarm: boolean, fault: boolean): string {
  if (fault) return '#ef4444'
  if (alarm) return '#f97316'
  if (isOpen) return '#22c55e'
  return '#3b82f6'
}

export function formatCurrent(val: number): string {
  return `${val.toFixed(1)} A`
}

export function formatVoltage(val: number): string {
  return `${val} V`
}
