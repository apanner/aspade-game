"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const SettingsRadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("space-y-1", className)}
      {...props}
      ref={ref}
    />
  )
})
SettingsRadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const SettingsRadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "flex items-center justify-between w-full p-4 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-5 h-5 rounded-full border-2 border-slate-600 bg-slate-700 flex items-center justify-center">
            <RadioGroupPrimitive.Indicator className="flex items-center justify-center w-full h-full rounded-full bg-blue-500 border-2 border-blue-500">
              <Check className="h-3 w-3 text-white" />
            </RadioGroupPrimitive.Indicator>
          </div>
        </div>
        <div className="flex-1">
          {props.children}
        </div>
      </div>
    </RadioGroupPrimitive.Item>
  )
})
SettingsRadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

// Settings-style toggle component
const SettingsToggle = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    label: string;
    description?: string;
    enabled?: boolean;
  }
>(({ className, label, description, enabled = false, ...props }, ref) => {
  return (
    <div className="flex items-center justify-between w-full p-4 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 transition-colors backdrop-blur-sm">
      <div className="flex-1">
        <div className="font-medium text-slate-200">{label}</div>
        {description && (
          <div className="text-sm text-slate-400 mt-1">{description}</div>
        )}
      </div>
      <div className="relative">
        <div className={cn(
          "w-12 h-6 rounded-full transition-colors duration-200 ease-in-out",
          enabled ? "bg-blue-500" : "bg-slate-600"
        )}>
          <div className={cn(
            "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out",
            enabled ? "translate-x-6" : "translate-x-0"
          )} />
        </div>
      </div>
    </div>
  )
})
SettingsToggle.displayName = "SettingsToggle"

// Settings-style checkbox component
const SettingsCheckbox = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    label: string;
    description?: string;
    checked?: boolean;
  }
>(({ className, label, description, checked = false, ...props }, ref) => {
  return (
    <div className="flex items-center justify-between w-full p-4 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 transition-colors backdrop-blur-sm">
      <div className="flex-1">
        <div className="font-medium text-slate-200">{label}</div>
        {description && (
          <div className="text-sm text-slate-400 mt-1">{description}</div>
        )}
      </div>
      <div className="relative">
        <div className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200",
          checked ? "bg-blue-500 border-blue-500" : "bg-slate-700 border-slate-600"
        )}>
          {checked && (
            <Check className="h-3 w-3 text-white" />
          )}
        </div>
      </div>
    </div>
  )
})
SettingsCheckbox.displayName = "SettingsCheckbox"

export { SettingsRadioGroup, SettingsRadioGroupItem, SettingsToggle, SettingsCheckbox } 